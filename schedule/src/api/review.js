// Exemption review: the Ops & Marketing and admin logins approve or deny a request.
import { authorized, canManageEvents, json } from "../core.js";
import { db } from "../events.js";

export async function onRequestPost({ request, env }) {
  if (!authorized(request, env)) return json({ error: "Wrong password" }, 401);
  if (!canManageEvents(request, env)) return json({ error: "Only the Ops & Marketing and admin logins can review exemptions." }, 403);
  const body = await request.json().catch(() => null);
  const review = body?.review;
  if (!["approved", "denied", "pending"].includes(review)) return json({ error: "Approve or deny the request." }, 400);
  try {
    const DB = await db(env);
    const res = await DB.prepare("UPDATE responses SET review = ? WHERE event_id = ? AND name = ? AND status = 'exempt'")
      .bind(review, String(body?.eventId || ""), String(body?.name || "")).run();
    if (!(res.meta?.changes > 0)) return json({ error: "That request no longer exists." }, 404);
    return json({ ok: true, review });
  } catch (e) { return json({ error: e.message || "Something went wrong." }, 500); }
}
