// quantt.ca: the static site in out/ is served straight from Worker static assets. Only /admin reaches this code
// (run_worker_first in wrangler.jsonc): the content editor, for members with the Website: Admin role on auth.quantt.ca.
//
// Sign-in: Cloudflare Access on quantt.ca/admin (Queen's email one-time PIN), and the shared member directory
// (Worker quantt-auth, service binding AUTH) says who that is and their role. Saves are commits to main on GitHub.
import page from "./admin.html";
import { GitHub, editable } from "./github.js";

const MAX_UPLOAD = 8 * 1024 * 1024;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}

function accessToken(request) {
  const m = (request.headers.get("cookie") || "").match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
  return request.headers.get("cf-access-jwt-assertion") || (m ? m[1] : "");
}

// { name, email } for a website admin, otherwise null. Fails closed: no Access token or no directory means no access.
async function editor(request, env) {
  const token = accessToken(request);
  if (!token || !env.AUTH) return null;
  const who = await env.AUTH.whoami(token).catch(() => null);
  return who?.id && who.roles?.website === "admin" ? { name: who.name || who.email, email: who.email } : null;
}

const denied = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QUANTT Admin</title>
<body style="font:16px system-ui;margin:0;display:grid;place-items:center;min-height:100vh;background:#f5f7fb;color:#0b1f3a">
<div style="max-width:360px;padding:24px;text-align:center"><h1 style="font-size:20px">No editor access</h1>
<p>Ask a QUANTT admin to give you the Website: Admin role on auth.quantt.ca.</p><p><a href="/">Back to quantt.ca</a></p></div>`;

async function api(request, env, url, who) {
  const gh = new GitHub(env);
  const p = url.pathname.replace(/^\/admin\/api/, "");

  if (p === "/me") return json(who);
  if (p === "/files" && request.method === "GET") return json(await gh.files());
  if (p === "/file" && request.method === "GET") {
    const path = url.searchParams.get("path");
    if (!editable(path)) return json({ error: "That file can't be edited here." }, 400);
    return new Response(await gh.read(path), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
  }
  if (p === "/deploy" && request.method === "GET") {
    const sha = url.searchParams.get("sha") || "";
    if (!/^[0-9a-f]{40}$/.test(sha)) return json({ error: "Bad commit." }, 400);
    return json({ state: await gh.deploy(sha) });
  }
  if (p === "/commit" && request.method === "POST") {
    // JSON only, from this page: another site can't post here with the member's Access cookie.
    if (!(request.headers.get("content-type") || "").startsWith("application/json") || request.headers.get("origin") !== url.origin) {
      return json({ error: "Bad request." }, 400);
    }
    const body = await request.json().catch(() => null);
    const changes = Array.isArray(body?.changes) ? body.changes : [];
    if (!changes.length || changes.length > 50) return json({ error: "Nothing to save." }, 400);
    for (const c of changes) {
      if (!editable(c.path)) return json({ error: `Can't save ${c.path}.` }, 400);
      if (c.base64 !== undefined && c.base64.length * 0.75 > MAX_UPLOAD) return json({ error: `${c.path} is over 8 MB.` }, 400);
      if (!c.delete && c.base64 === undefined && typeof c.text !== "string") return json({ error: `No content for ${c.path}.` }, 400);
    }
    const summary = String(body.message || "Edit site content").replace(/\s+/g, " ").slice(0, 100);
    const message = `${summary}\n\nEdited at quantt.ca/admin by ${who.name} <${who.email}>`;
    return json(await gh.commit(changes, message, { name: who.name, email: who.email }));
  }
  return json({ error: "Not found." }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/admin" && !url.pathname.startsWith("/admin/")) return env.ASSETS.fetch(request);

    const who = await editor(request, env);
    const isApi = url.pathname.startsWith("/admin/api/");
    if (!who) return isApi ? json({ error: "Sign in with an editor account." }, 403) : new Response(denied, { status: 403, headers: { "content-type": "text/html; charset=utf-8" } });
    if (!isApi) return new Response(page, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-frame-options": "DENY", "x-robots-tag": "noindex" } });
    try {
      return await api(request, env, url, who);
    } catch (e) {
      return json({ error: e.message }, e.status === 409 ? 409 : 500);
    }
  },
};
