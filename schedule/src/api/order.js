// Sidebar order: admins drag names into place; everyone sees the same order. Only names are stored.
import { authorized, isAdmin, json } from "../core.js";

const KEY = "order";

export async function onRequestGet({ request, env }) {
  if (!authorized(request, env)) return json({ error: "Wrong password" }, 401);
  const order = await env.SCHEDULE_KV.get(KEY, "json");
  return json({ order: Array.isArray(order) ? order : [] });
}

export async function onRequestPost({ request, env }) {
  if (!authorized(request, env)) return json({ error: "Wrong password" }, 401);
  if (!isAdmin(request, env)) return json({ error: "Only admins can reorder the list." }, 403);
  const body = await request.json().catch(() => null);
  const order = body?.order;
  if (!Array.isArray(order) || order.length > 500 || !order.every((n) => typeof n === "string" && n.length <= 100)) {
    return json({ error: "Send the list of names in order." }, 400);
  }
  await env.SCHEDULE_KV.put(KEY, JSON.stringify(order));
  return json({ order });
}
