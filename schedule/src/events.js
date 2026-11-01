// Events, attendance and reminder emails. Stored in D1 (binding DB); times are Toronto wall clock ("2026-10-15T18:00").
import { loadMembers, loadRoster, loadEmails, toToronto, dayNum, newId, normName } from "./core.js";

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, title TEXT NOT NULL, start TEXT NOT NULL, end TEXT NOT NULL,
    location TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '', mandatory INTEGER NOT NULL DEFAULT 1,
    reminders INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS events_start ON events (start)`,
  // status: going | exempt (asked to miss a required event) | no (can't go to an optional one). review: pending | approved | denied.
  `CREATE TABLE IF NOT EXISTS responses (event_id TEXT NOT NULL, name TEXT NOT NULL, status TEXT NOT NULL,
    reason TEXT NOT NULL DEFAULT '', review TEXT, at TEXT NOT NULL, PRIMARY KEY (event_id, name))`,
  `CREATE TABLE IF NOT EXISTS reminders_sent (event_id TEXT NOT NULL, hours INTEGER NOT NULL, sent_at TEXT NOT NULL,
    recipients INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (event_id, hours))`,
  `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
];

// Columns added after the first release. Only missing ones are added, and a failure is retried on the next request
// rather than leaving the table without a column that saves depend on.
const COLUMNS = { reminder_cfg: "TEXT", invite: "TEXT", announced_at: "TEXT", announced_to: "INTEGER" };

let ready = null;
export function db(env) {
  if (!env.DB) throw new Error("The events database isn't connected yet.");
  ready ||= env.DB.batch(SCHEMA.map((s) => env.DB.prepare(s)))
    .then(async () => {
      const have = new Set((await env.DB.prepare("PRAGMA table_info(events)").all()).results.map((c) => c.name));
      for (const [col, type] of Object.entries(COLUMNS)) {
        if (!have.has(col)) await env.DB.prepare(`ALTER TABLE events ADD COLUMN ${col} ${type}`).run();
      }
    })
    .catch((e) => { ready = null; throw e; });
  return ready.then(() => env.DB);
}

/* ---------- time ---------- */
const WALL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
export const validWall = (s) => typeof s === "string" && WALL.test(s);
// Minutes since the epoch on the Toronto wall clock, so wall times compare and subtract directly.
export function wallMinutes(s) {
  const m = WALL.exec(s);
  return dayNum(+m[1], +m[2], +m[3]) * 1440 + +m[4] * 60 + +m[5];
}
export function nowWall() {
  const t = toToronto(new Date());
  const d = new Date(t.day * 86400000);
  return `${d.toISOString().slice(0, 10)}T${String(Math.floor(t.min / 60)).padStart(2, "0")}:${String(t.min % 60).padStart(2, "0")}`;
}

/* ---------- people (names from the contacts import and the calendars) ---------- */
export async function people(env) {
  const [roster, members] = await Promise.all([loadRoster(env), loadMembers(env)]);
  const seen = new Map();
  for (const p of [...roster, ...members]) if (p.name && !seen.has(normName(p.name))) seen.set(normName(p.name), { name: p.name, team: p.team || null });
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/* ---------- events ---------- */
const clip = (v, n) => String(v ?? "").trim().slice(0, n);

export function cleanEvent(body) {
  const e = {
    title: clip(body?.title, 120),
    start: String(body?.start || ""),
    end: String(body?.end || ""),
    location: clip(body?.location, 160),
    description: clip(body?.description, 4000),
    mandatory: body?.mandatory === false ? 0 : 1,
    reminders: body?.reminders === false ? 0 : 1,
    // No reminderCfg means "use the saved defaults" (read when the cron runs).
    reminder_cfg: body?.reminderCfg ? JSON.stringify(cleanReminderCfg(body.reminderCfg)) : null,
    invite: cleanInvite(body?.invite),
  };
  if (!e.title) return { error: "Give the event a title." };
  if (!validWall(e.start) || !validWall(e.end)) return { error: "Pick a date, start time and end time." };
  if (wallMinutes(e.end) <= wallMinutes(e.start)) return { error: "The event has to end after it starts." };
  return { event: e };
}

// Who an event is for: null means everyone; otherwise teams and/or named people.
// A team like "Quantitative Trading" also covers its sub-teams ("Quantitative Trading: <PM>").
function cleanInvite(b) {
  const list = (v, n) => [...new Set((Array.isArray(v) ? v : []).map((x) => clip(x, 80)).filter(Boolean))].slice(0, n);
  const teams = list(b?.teams, 40), names = list(b?.people, 300);
  return teams.length || names.length ? JSON.stringify({ teams, people: names }) : null;
}
export function isInvited(ev, person) {
  if (!ev.invite) return true;
  const team = person?.team || "";
  return ev.invite.people.some((n) => normName(n) === normName(person?.name)) || ev.invite.teams.some((t) => team === t || team.startsWith(t + ": "));
}

export function rowToEvent({ reminder_cfg, invite, ...r }) {
  let cfg = null, inv = null;
  try { cfg = reminder_cfg ? cleanReminderCfg(JSON.parse(reminder_cfg)) : null; } catch { /* fall back to defaults */ }
  try { inv = invite ? JSON.parse(invite) : null; } catch { /* everyone */ }
  return { ...r, mandatory: !!r.mandatory, reminders: !!r.reminders, reminderCfg: cfg, invite: inv };
}

export async function listEvents(env, { from, to, id }) {
  const DB = await db(env);
  let rows;
  if (id) rows = (await DB.prepare("SELECT * FROM events WHERE id = ?").bind(id).all()).results;
  else rows = (await DB.prepare("SELECT * FROM events WHERE start < ? AND end >= ? ORDER BY start LIMIT 200").bind(to, from).all()).results;
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const resp = (await DB.prepare(`SELECT * FROM responses WHERE event_id IN (${ids.map(() => "?").join(",")}) ORDER BY name`).bind(...ids).all()).results;
  const sent = (await DB.prepare(`SELECT * FROM reminders_sent WHERE event_id IN (${ids.map(() => "?").join(",")}) ORDER BY sent_at`).bind(...ids).all()).results;
  return rows.map((r) => ({
    ...rowToEvent(r),
    responses: resp.filter((x) => x.event_id === r.id).map(({ event_id, ...x }) => x),
    remindersSent: sent.filter((x) => x.event_id === r.id).map(({ event_id, ...x }) => x),
  }));
}

// updatedAt (optional): the version the editor started from. If someone saved the event since, nothing is
// overwritten and "conflict" comes back, so two people editing at once can't silently undo each other.
export async function saveEvent(env, id, e, updatedAt) {
  const DB = await db(env);
  const at = new Date().toISOString();
  if (!id) {
    id = newId();
    await DB.prepare(`INSERT INTO events (id, title, start, end, location, description, mandatory, reminders, reminder_cfg, invite, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, e.title, e.start, e.end, e.location, e.description, e.mandatory, e.reminders, e.reminder_cfg, e.invite, at, at).run();
    return id;
  }
  const old = await DB.prepare("SELECT start, updated_at FROM events WHERE id = ?").bind(id).first();
  if (!old) return null;
  if (updatedAt && updatedAt !== old.updated_at) return { conflict: true };
  const stmts = [DB.prepare(`UPDATE events SET title = ?, start = ?, end = ?, location = ?, description = ?, mandatory = ?, reminders = ?, reminder_cfg = ?, invite = ?, updated_at = ? WHERE id = ? AND updated_at = ?`)
    .bind(e.title, e.start, e.end, e.location, e.description, e.mandatory, e.reminders, e.reminder_cfg, e.invite, at, id, old.updated_at)];
  // A moved event gets its reminders again, counted from the new time.
  if (old.start !== e.start) stmts.push(DB.prepare("DELETE FROM reminders_sent WHERE event_id = ?").bind(id));
  const res = await DB.batch(stmts);
  if (!(res[0].meta?.changes > 0)) return { conflict: true };
  return id;
}

export async function deleteEvent(env, id) {
  const DB = await db(env);
  const res = await DB.batch([
    DB.prepare("DELETE FROM events WHERE id = ?").bind(id),
    DB.prepare("DELETE FROM responses WHERE event_id = ?").bind(id),
    DB.prepare("DELETE FROM reminders_sent WHERE event_id = ?").bind(id),
  ]);
  return (res[0].meta?.changes ?? 0) > 0;
}

/* ---------- reminder settings ---------- */
// Each event has its own list of reminders, like Google Calendar notifications:
//   reminders: [{ minutes: 1440, audience: "all" | "pending" }]   "Email 1 day before, to everyone not excused / only non-responders"
//   followUp:  { days: 2, time: "09:00" } | null                  "Every 2 days at 9 AM, email people who haven't responded"
// The saved "reminders" setting is only the default for new events.
const MAX_MINUTES = 4 * 7 * 1440;
const DEFAULT_REMINDERS = { reminders: [{ minutes: 3 * 1440, audience: "all" }, { minutes: 1440, audience: "all" }, { minutes: 120, audience: "all" }], followUp: null };
export function cleanReminderCfg(b) {
  // Older saves used { hours: [...], audience, nudgeDays, nudgeHour }.
  const raw = Array.isArray(b?.reminders) ? b.reminders
    : Array.isArray(b?.hours) ? b.hours.map((h) => ({ minutes: h * 60, audience: b.audience }))
    : DEFAULT_REMINDERS.reminders;
  const byMin = new Map();
  for (const r of raw.slice(0, 20)) {
    const m = Math.round(+r?.minutes);
    if (!Number.isFinite(m) || m < 0 || m > MAX_MINUTES) continue;
    const aud = r?.audience === "pending" ? "pending" : "all";
    // Two reminders at the same time: the wider audience wins.
    byMin.set(m, byMin.get(m) === "all" ? "all" : aud);
  }
  const reminders = [...byMin].sort((x, y) => y[0] - x[0]).map(([minutes, audience]) => ({ minutes, audience }));
  let f = b?.followUp ?? (b?.nudgeDays ? { days: b.nudgeDays, time: `${String(b.nudgeHour ?? 9).padStart(2, "0")}:00` } : null);
  const days = Math.round(+f?.days), time = /^([01]\d|2[0-3]):[0-5]\d$/.test(f?.time || "") ? f.time : "09:00";
  const followUp = f && days >= 1 && days <= 30 ? { days, time } : null;
  return { reminders, followUp };
}

export async function loadReminderSettings(env) {
  const DB = await db(env);
  const row = await DB.prepare("SELECT value FROM settings WHERE key = 'reminders'").first();
  try { return row ? cleanReminderCfg(JSON.parse(row.value)) : DEFAULT_REMINDERS; } catch { return DEFAULT_REMINDERS; }
}

export async function saveReminderSettings(env, body) {
  const value = cleanReminderCfg(body);
  const DB = await db(env);
  await DB.prepare("INSERT INTO settings (key, value) VALUES ('reminders', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value").bind(JSON.stringify(value)).run();
  return value;
}

/* ---------- reminder emails (Resend) ---------- */
export const emailReady = (env) => !!env.RESEND_API_KEY;
const appUrl = (env) => (env.APP_URL || "https://calendar.quantt.ca").replace(/\/$/, "");

// Everyone with an email on file, minus people who are excused or said they can't come.
// audience "pending" keeps only people who haven't responded at all.
export async function recipients(env, ev, audience = "all") {
  const [all, emails] = await Promise.all([people(env), loadEmails(env)]);
  const byNorm = new Map(Object.entries(emails).map(([n, e]) => [normName(n), e]));
  const out = new Set(ev.responses.filter((r) => r.status === "no" || (r.status === "exempt" && r.review !== "denied")).map((r) => normName(r.name)));
  const answered = new Set(ev.responses.map((r) => normName(r.name)));
  return all.filter((p) => isInvited(ev, p) && !out.has(normName(p.name)) && byNorm.has(normName(p.name)) && (audience !== "pending" || !answered.has(normName(p.name)))).map((p) => ({ name: p.name, email: byNorm.get(normName(p.name)), response: ev.responses.find((r) => normName(r.name) === normName(p.name)) }));
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const clock = (s) => { const h = +s.slice(11, 13), m = s.slice(14, 16); return `${((h + 11) % 12) + 1}${m === "00" ? "" : ":" + m} ${h < 12 ? "AM" : "PM"}`; };
export function whenText(ev) {
  const [y, mo, d] = ev.start.slice(0, 10).split("-").map(Number);
  const wd = WEEKDAYS[(((dayNum(y, mo, d) + 3) % 7) + 7) % 7];
  const sameDay = ev.start.slice(0, 10) === ev.end.slice(0, 10);
  return `${wd}, ${MONTHS[mo - 1]} ${d}, ${clock(ev.start)} – ${sameDay ? clock(ev.end) : ev.end.slice(0, 10) + " " + clock(ev.end)}`;
}
// "today", "tomorrow" or "on Tuesday, October 20", from the actual time left rather than the reminder setting.
function leadText(ev) {
  const days = Math.floor(wallMinutes(ev.start) / 1440) - Math.floor(wallMinutes(nowWall()) / 1440);
  return days <= 0 ? `today at ${clock(ev.start)}` : days === 1 ? `tomorrow at ${clock(ev.start)}` : `on ${whenText(ev).split(",").slice(0, 2).join(",")}`;
}
const escHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// announce: { subject, message } for the email sent when an event is created; its note goes above the event details.
function message(env, ev, person, nudge, announce) {
  const link = `${appUrl(env)}/#event=${encodeURIComponent(ev.id)}`;
  const first = person.name.split(" ")[0];
  const going = person.response?.status === "going";
  const subject = announce ? announce.subject || `New event: ${ev.title} ${leadText(ev)}`
    : nudge ? `Please respond: ${ev.title} ${leadText(ev)}` : `Reminder: ${ev.title} ${leadText(ev)}`;
  const note = announce?.message || "";
  const ask = going ? "You're marked as going."
    : nudge ? `You haven't responded yet. ${ev.mandatory ? "Attendance is required, so if you can't make it, open the event and request an exemption with a reason." : "Let us know if you're coming."}`
    : ev.mandatory ? "Attendance is required. If you can't make it, open the event and request an exemption with a reason."
    : "Let us know if you're coming.";
  const lines = [`Hi ${first},`, "", ...(note ? [note, ""] : []), `${ev.title}`, whenText(ev), ev.location ? `Location: ${ev.location}` : "", ev.description ? `\n${ev.description}` : "", "", ask, link, "", "QUANTT Operations & Marketing"].filter((l, i, a) => l !== "" || a[i - 1] !== "");
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1f1f1f;line-height:1.5">
<p>Hi ${escHtml(first)},</p>
${note ? `<p style="white-space:pre-line">${escHtml(note)}</p>` : ""}
<p style="font-size:18px;margin:0 0 4px"><b>${escHtml(ev.title)}</b></p>
<p style="margin:0">${escHtml(whenText(ev))}</p>
${ev.location ? `<p style="margin:0">${escHtml(ev.location)}</p>` : ""}
${ev.description ? `<p style="white-space:pre-line">${escHtml(ev.description)}</p>` : ""}
<p>${escHtml(ask)}</p>
<p><a href="${escHtml(link)}" style="display:inline-block;background:#0b57d0;color:#fff;text-decoration:none;padding:10px 20px;border-radius:20px">${going ? "View event" : ev.mandatory ? "Respond or request an exemption" : "Respond"}</a></p>
<p style="color:#747775;font-size:12px">QUANTT Operations &amp; Marketing</p></div>`;
  return { from: env.EMAIL_FROM || "QUANTT <events@quantt.ca>", to: [person.email], subject, text: lines.join("\n"), html, ...(env.EMAIL_REPLY_TO ? { reply_to: env.EMAIL_REPLY_TO } : {}) };
}

async function sendBatch(env, msgs) {
  for (let i = 0; i < msgs.length; i += 100) {
    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify(msgs.slice(i, i + 100)),
    });
    if (!res.ok) throw new Error(`The email service refused the reminder (${res.status}): ${(await res.text()).slice(0, 200)}`);
  }
}

// A sample reminder to one address, so Ops can check how the emails look.
export async function sendTest(env, to) {
  if (!emailReady(env)) throw new Error("Reminder emails aren't set up yet (RESEND_API_KEY is missing).");
  const t = wallMinutes(nowWall()) + 2 * 1440, d = new Date(Math.floor(t / 1440) * 86400000).toISOString().slice(0, 10);
  const ev = { id: "test", title: "Sample event", start: `${d}T18:00`, end: `${d}T19:00`, location: "Goodes Hall", description: "This is a test of QUANTT reminder emails.", mandatory: true, responses: [] };
  await sendBatch(env, [message(env, ev, { name: "there", email: to })]);
}

export async function sendReminder(env, ev, { audience = "all", nudge = false } = {}) {
  if (!emailReady(env)) throw new Error("Reminder emails aren't set up yet (RESEND_API_KEY is missing).");
  const list = await recipients(env, ev, nudge ? "pending" : audience);
  await sendBatch(env, list.map((p) => message(env, ev, p, nudge)));
  return list.length;
}

export function cleanAnnouncement(b) {
  if (!b || typeof b !== "object") return null;
  return { subject: clip(b.subject, 150), message: clip(b.message, 4000) };
}

// The announcement email when an event is created: everyone invited who has an email on file.
export async function sendAnnouncement(env, ev, announce) {
  if (!emailReady(env)) throw new Error("Email sending isn't connected yet (RESEND_API_KEY is missing).");
  const list = await recipients(env, ev, "all");
  await sendBatch(env, list.map((p) => message(env, ev, p, false, announce)));
  const DB = await db(env);
  await DB.prepare("UPDATE events SET announced_at = ?, announced_to = ? WHERE id = ?").bind(new Date().toISOString(), list.length, ev.id).run();
  return list.length;
}

// Cron: for each upcoming event, send the closest reminder that is due and not sent yet; earlier missed ones are skipped.
export async function runReminders(env) {
  if (!env.DB || !emailReady(env)) return [];
  const defaults = await loadReminderSettings(env);
  const now = nowWall(), nowMin = wallMinutes(now);
  // Look far enough ahead for the longest reminder (1 week) and for "please respond" emails.
  const days = 60;
  const horizon = new Date((Math.floor(nowMin / 1440) + days) * 86400000).toISOString().slice(0, 10);
  const events = (await listEvents(env, { from: now.slice(0, 10), to: horizon })).filter((e) => e.reminders && wallMinutes(e.start) > nowMin);
  const done = [];
  const DB = await db(env);
  // reminders_sent.hours holds the reminder's minutes before the event (0 = "send now", negative = a follow-up's day).
  for (const ev of events) {
    const cfg = ev.reminderCfg || defaults;
    const startMin = wallMinutes(ev.start);
    const sent = new Set(ev.remindersSent.map((r) => r.hours));
    const due = cfg.reminders.filter((r) => r.minutes > 0 && startMin - r.minutes <= nowMin && !sent.has(r.minutes));
    if (!due.length) {
      const nudged = await followUp(env, DB, ev, cfg, nowMin);
      if (nudged) done.push(nudged);
      continue;
    }
    const r = due.reduce((a, b) => (b.minutes < a.minutes ? b : a));
    let n = 0;
    try { n = await sendReminder(env, ev, { audience: r.audience }); } catch (e) { console.log("reminder failed", ev.id, e.message); continue; }
    const at = new Date().toISOString();
    await DB.batch(due.map((x) => DB.prepare("INSERT OR IGNORE INTO reminders_sent (event_id, hours, sent_at, recipients) VALUES (?, ?, ?, ?)").bind(ev.id, x.minutes, at, x === r ? n : 0)));
    done.push({ id: ev.id, minutes: r.minutes, recipients: n });
  }
  return done;
}

// Follow-up emails to people who haven't answered, every followUp.days days at followUp.time, counted from the event's creation.
// Stored in reminders_sent with hours = -(day number). Skipped on the event's own day and within 20 hours of another reminder.
async function followUp(env, DB, ev, cfg, nowMin) {
  const f = cfg.followUp;
  if (!f) return null;
  const today = Math.floor(nowMin / 1440), at = +f.time.slice(0, 2) * 60 + +f.time.slice(3);
  if (nowMin % 1440 < at || Math.floor(wallMinutes(ev.start) / 1440) <= today) return null;
  const nudges = ev.remindersSent.filter((r) => r.hours < 0).map((r) => -r.hours);
  const created = toToronto(new Date(ev.created_at)).day;
  const last = nudges.length ? Math.max(...nudges) : created;
  if (today - last < f.days) return null;
  if (ev.remindersSent.some((r) => r.hours >= 0 && Date.now() - Date.parse(r.sent_at) < 20 * 3600 * 1000)) return null;
  let n = 0;
  try { n = await sendReminder(env, ev, { nudge: true }); } catch (e) { console.log("follow-up failed", ev.id, e.message); return null; }
  await DB.prepare("INSERT OR IGNORE INTO reminders_sent (event_id, hours, sent_at, recipients) VALUES (?, ?, ?, ?)").bind(ev.id, -today, new Date().toISOString(), n).run();
  return { id: ev.id, followUp: true, recipients: n };
}
