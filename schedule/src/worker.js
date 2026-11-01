// Cloudflare Worker entry: /api/* goes to the handlers, everything else is a static file from public/.
// The cron trigger (wrangler.toml) sends event reminder emails.
import * as members from "./api/members.js";
import * as busy from "./api/busy.js";
import * as session from "./api/session.js";
import * as roster from "./api/roster.js";
import * as order from "./api/order.js";
import * as events from "./api/events.js";
import * as attendance from "./api/attendance.js";
import * as review from "./api/review.js";
import * as reminders from "./api/reminders.js";
import { runReminders } from "./events.js";

const routes = {
  "/api/members": members, "/api/busy": busy, "/api/session": session, "/api/roster": roster, "/api/order": order,
  "/api/events": events, "/api/attendance": attendance, "/api/review": review, "/api/reminders": reminders,
};
const METHOD = { GET: "onRequestGet", POST: "onRequestPost", PUT: "onRequestPut", DELETE: "onRequestDelete" };

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    const mod = routes[pathname];
    if (mod) {
      const handler = mod[METHOD[request.method]];
      if (!handler) return new Response("Method not allowed", { status: 405 });
      return handler({ request, env });
    }
    if (pathname.startsWith("/api/")) return new Response("Not found", { status: 404 });
    return env.ASSETS.fetch(request);
  },
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(runReminders(env).then((sent) => { if (sent.length) console.log("reminders sent", JSON.stringify(sent)); }));
  },
};
