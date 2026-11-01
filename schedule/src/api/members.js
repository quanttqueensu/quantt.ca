// Members: list (names only), add, remove. Calendar links never leave the server.
import { authorized, isAdmin, json, loadMembers, saveMembers, addMembers, icsKey } from "../core.js";

const publicView = (m) => ({ id: m.id, name: m.name, team: m.team || null });
const denied = () => json({ error: "Wrong password" }, 401);
const adminOnly = () => json({ error: "Only admins can change calendars." }, 403);

export async function onRequestGet({ request, env }) {
  if (!authorized(request, env)) return denied();
  const members = await loadMembers(env);
  return json({ members: members.map(publicView) });
}

export async function onRequestPost({ request, env }) {
  if (!authorized(request, env)) return denied();
  if (!isAdmin(request, env)) return adminOnly();
  let body;
  try { body = await request.json(); } catch { return json({ error: "Send a name and a calendar link." }, 400); }
  const items = Array.isArray(body?.members) ? body.members : [body];
  const { added, error } = await addMembers(env, items);
  if (error) return json({ error }, 400);
  return json({ added: added.map(publicView) }, 201);
}

export async function onRequestDelete({ request, env }) {
  if (!authorized(request, env)) return denied();
  if (!isAdmin(request, env)) return adminOnly();
  const id = new URL(request.url).searchParams.get("id");
  const members = await loadMembers(env);
  const next = members.filter((m) => m.id !== id);
  if (next.length === members.length) return json({ error: "Member not found." }, 404);
  await saveMembers(env, next);
  await env.SCHEDULE_KV.delete(icsKey(id));
  return json({ removed: id });
}
