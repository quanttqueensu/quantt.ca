// Reminder emails: the default reminders for new events, who has an email on file, a test email, and "send now" for one event.
// Only the Ops & Marketing and admin logins. Email addresses are never returned, only which names lack one.
import { authorized, canManageEvents, json, loadEmails, normName } from "../core.js";
import { loadReminderSettings, saveReminderSettings, emailReady, people, listEvents, sendReminder, sendTest, db } from "../events.js";

const guard = (request, env) => !authorized(request, env) ? json({ error: "Wrong password" }, 401)
  : !canManageEvents(request, env) ? json({ error: "Only the Ops & Marketing and admin logins can change reminders." }, 403) : null;

export async function onRequestGet({ request, env }) {
  const no = guard(request, env); if (no) return no;
  try {
    const [settings, all, emails] = await Promise.all([loadReminderSettings(env), people(env), loadEmails(env)]);
    const have = new Set(Object.keys(emails).map(normName));
    return json({ settings, ready: emailReady(env), withEmail: all.filter((p) => have.has(normName(p.name))).length, missing: all.filter((p) => !have.has(normName(p.name))).map((p) => p.name) });
  } catch (e) { return json({ error: e.message || "Something went wrong." }, 500); }
}

export async function onRequestPost({ request, env }) {
  const no = guard(request, env); if (no) return no;
  const body = await request.json().catch(() => null);
  try {
    if (body?.test) {
      const to = String(body.test).trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return json({ error: "Enter an email address for the test." }, 400);
      await sendTest(env, to);
      return json({ sent: 1 });
    }
    if (body?.sendNow) {
      const [ev] = await listEvents(env, { id: String(body.sendNow) });
      if (!ev) return json({ error: "That event no longer exists." }, 404);
      const n = await sendReminder(env, ev, { audience: body.audience === "pending" ? "pending" : "all" });
      const DB = await db(env);
      await DB.prepare("INSERT OR REPLACE INTO reminders_sent (event_id, hours, sent_at, recipients) VALUES (?, 0, ?, ?)").bind(ev.id, new Date().toISOString(), n).run();
      return json({ sent: n });
    }
    return json({ settings: await saveReminderSettings(env, body) });
  } catch (e) { return json({ error: e.message || "Something went wrong." }, e.message?.includes("RESEND_API_KEY") ? 400 : 500); }
}
