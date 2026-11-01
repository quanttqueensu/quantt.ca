// Events: everyone signed in can list them; the Ops & Marketing and admin logins can create, edit and delete.
// Exemption reasons are only included for those two logins.
import { authorized, canManageEvents, json } from "../core.js";
import { listEvents, cleanEvent, saveEvent, deleteEvent, people, isInvited, saveReminderSettings, cleanAnnouncement, sendAnnouncement } from "../events.js";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const denied = () => json({ error: "Wrong password" }, 401);
const managersOnly = () => json({ error: "Only the Ops & Marketing and admin logins can change events." }, 403);
const fail = (e) => json({ error: e.message || "Something went wrong." }, 500);

export async function onRequestGet({ request, env }) {
  if (!authorized(request, env)) return denied();
  const p = new URL(request.url).searchParams;
  const id = p.get("id");
  const from = p.get("from"), to = p.get("to");
  if (!id && (!DATE.test(from || "") || !DATE.test(to || ""))) return json({ error: "Send from and to dates." }, 400);
  try {
    const manage = canManageEvents(request, env);
    // "to" is inclusive: everything starting before the next day.
    const next = to && new Date(Date.parse(to + "T00:00:00Z") + 86400000).toISOString().slice(0, 10);
    const [events, all] = await Promise.all([listEvents(env, { id, from, to: next }), people(env)]);
    for (const e of events) {
      // Names this event is for (null = everyone).
      e.invited = e.invite ? all.filter((p) => isInvited(e, p)).map((p) => p.name) : null;
      if (!manage) { e.responses = e.responses.map(({ reason, ...r }) => r); delete e.remindersSent; }
    }
    return json({ events, people: all });
  } catch (e) { return fail(e); }
}

async function save(request, env, id) {
  if (!authorized(request, env)) return denied();
  if (!canManageEvents(request, env)) return managersOnly();
  const body = await request.json().catch(() => null);
  const { event, error } = cleanEvent(body);
  if (error) return json({ error }, 400);
  try {
    const saved = await saveEvent(env, id, event, typeof body?.updatedAt === "string" ? body.updatedAt : null);
    if (!saved) return json({ error: "That event no longer exists." }, 404);
    if (saved.conflict) return json({ error: "Someone else changed this event while you were editing it. Close this window and open the event again to see their changes." }, 409);
    // "Use as default for new events" in the event form.
    if (body?.saveDefault && body?.reminderCfg) await saveReminderSettings(env, body.reminderCfg);
    // "Email an announcement" in the new event form. The event is saved either way; a failed email is reported, not fatal.
    const announce = !id && cleanAnnouncement(body?.announce);
    if (announce) {
      try {
        const [ev] = await listEvents(env, { id: saved });
        return json({ id: saved, announced: await sendAnnouncement(env, ev, announce) }, 201);
      } catch (e) { return json({ id: saved, announceError: e.message || "The announcement email couldn't be sent." }, 201); }
    }
    return json({ id: saved }, id ? 200 : 201);
  } catch (e) { return fail(e); }
}

export const onRequestPost = ({ request, env }) => save(request, env, null);
export function onRequestPut({ request, env }) {
  const id = new URL(request.url).searchParams.get("id");
  return id ? save(request, env, id) : json({ error: "Say which event to change." }, 400);
}

export async function onRequestDelete({ request, env }) {
  if (!authorized(request, env)) return denied();
  if (!canManageEvents(request, env)) return managersOnly();
  try {
    const ok = await deleteEvent(env, new URL(request.url).searchParams.get("id"));
    return ok ? json({ removed: true }) : json({ error: "That event no longer exists." }, 404);
  } catch (e) { return fail(e); }
}
