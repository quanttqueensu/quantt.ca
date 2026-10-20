// Password check for the sign-in screen. Returns which login was used: team, ops or admin.
import { role, json } from "../core.js";

export async function onRequestPost({ request, env }) {
  const r = role(request, env);
  return r ? json({ ok: true, role: r, admin: r === "admin" }) : json({ error: "Wrong password" }, 401);
}
