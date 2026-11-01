// Busy grid for one week: for each member, the class (if any) in every half hour, 8 AM to 10 PM Toronto time.
import { authorized, json, loadMembers, fetchFeed, parseICS, busyGrid, parseWeek, icsKey, loadRoster, findInRoster } from "../core.js";

export async function onRequestGet({ request, env }) {
  if (!authorized(request, env)) return json({ error: "Wrong password" }, 401);
  const params = new URL(request.url).searchParams;
  const monday = parseWeek(params.get("week"));
  const fresh = params.get("fresh") === "1";
  const [members, roster] = await Promise.all([loadMembers(env), loadRoster(env)]);
  const results = await Promise.all(members.map(async (m) => {
    const lead = !!findInRoster(roster, m.name)?.lead;
    try {
      const text = m.file ? await env.SCHEDULE_KV.get(icsKey(m.id)) : await fetchFeed(m.url, fresh);
      if (!text) throw new Error("missing calendar");
      const events = parseICS(text);
      return { id: m.id, name: m.name, team: m.team || null, lead, ok: true, busy: busyGrid(events, monday) };
    } catch {
      return { id: m.id, name: m.name, team: m.team || null, lead, ok: false, busy: null };
    }
  }));
  const d = new Date(monday * 86400000);
  // People from the contacts import who have not shared a calendar yet.
  const linked = new Set(members.map((m) => findInRoster(roster, m.name)).filter(Boolean));
  const pending = roster.filter((p) => !linked.has(p)).map((p) => ({ name: p.name, team: p.team || null, lead: !!p.lead }));
  return json({ week: d.toISOString().slice(0, 10), members: results, pending });
}
