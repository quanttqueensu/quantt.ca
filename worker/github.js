// GitHub access for the admin editor. Every save is one commit on main, which Workers Builds deploys.
// GITHUB_TOKEN (Worker secret): fine-grained token with Contents read/write on GITHUB_REPO only.
// GITHUB_REPO (optional variable): "owner/name", default quanttqueensu/quantt.ca.
//
// A save is two steps, so no request carries every photo at once: each upload first becomes a git blob (blob(), one
// request per file), then commit() makes one commit from the blob shas and the text files, and moves main to it.

const API = "https://api.github.com";
const BRANCH = "main";

// What the editor may read and write. Code, config and everything else in the repo stay out of reach.
const EDITABLE = [/^content\/[\w./-]+\.(ya?ml|md)$/, /^public\/(images|achievements|papers|gallery)\/[\w./ ()&-]+\.(png|jpe?g|webp|gif|svg|pdf)$/i];

export function editable(path) {
  return typeof path === "string" && !path.includes("..") && !path.includes("//") && EDITABLE.some((re) => re.test(path));
}

// "2026-12-01 17:00:00 UTC" (or "... -0800"), GitHub's token expiry header, as an ISO time. null if absent or unreadable.
export function tokenExpiry(header) {
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})\s*(UTC|Z|[+-]\d{2}:?\d{2})?$/.exec((header || "").trim());
  if (!m) return null;
  const zone = !m[3] || m[3] === "UTC" ? "Z" : m[3].replace(/^([+-]\d{2})(\d{2})$/, "$1:$2");
  const t = new Date(`${m[1]}T${m[2]}${zone}`);
  return Number.isNaN(t.getTime()) ? null : t.toISOString();
}

export class GitHub {
  constructor(env) {
    if (!env.GITHUB_TOKEN) throw new Error("GITHUB_TOKEN isn't set on the Worker.");
    this.token = env.GITHUB_TOKEN;
    this.repo = env.GITHUB_REPO || "quanttqueensu/quantt.ca";
    // When GITHUB_TOKEN stops working, from GitHub's response header (fine-grained tokens always have one).
    this.tokenExpires = null;
  }

  async call(path, init = {}) {
    const res = await fetch(`${API}/repos/${this.repo}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${this.token}`,
        accept: init.raw ? "application/vnd.github.raw+json" : "application/vnd.github+json",
        "user-agent": "quantt-website-admin",
        "x-github-api-version": "2022-11-28",
        ...(init.body ? { "content-type": "application/json" } : {}),
      },
    });
    this.tokenExpires = tokenExpiry(res.headers.get("github-authentication-token-expiration")) ?? this.tokenExpires;
    if (res.status === 401) {
      const err = new Error("GitHub token expired or revoked: ask the site admin to replace GITHUB_TOKEN on the quantt-website Worker.");
      err.status = 401;
      err.code = "github-token";
      throw err;
    }
    if (!res.ok) {
      const err = new Error(`GitHub ${res.status}: ${(await res.text()).slice(0, 300)}`);
      err.status = res.status;
      throw err;
    }
    return init.raw ? res.text() : res.json();
  }

  async head() {
    return (await this.call(`/git/ref/heads/${BRANCH}`)).object.sha;
  }

  // { head, files: { path: blobSha } } for every editable file on main.
  async files() {
    const head = await this.head();
    const commit = await this.call(`/git/commits/${head}`);
    const tree = await this.call(`/git/trees/${commit.tree.sha}?recursive=1`);
    const files = {};
    for (const e of tree.tree) if (e.type === "blob" && editable(e.path)) files[e.path] = e.sha;
    return { head, tree: commit.tree.sha, files, tokenExpires: this.tokenExpires };
  }

  async read(path) {
    return this.call(`/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${BRANCH}`, { raw: true });
  }

  // Stores one uploaded file as a git blob and returns its sha. Safe to repeat: the same bytes give the same sha.
  async blob(base64) {
    return (await this.call("/git/blobs", { method: "POST", body: JSON.stringify({ content: base64, encoding: "base64" }) })).sha;
  }

  // changes: [{ path, text } | { path, blob } | { path, delete: true }], each with `sha`: the blob the editor loaded
  // (null for a new file), and `blob`: an upload's sha from blob(). A file someone else changed since then stops the
  // whole save; the error's `stale` lists those files.
  async commit(changes, message, author) {
    for (let attempt = 0; ; attempt++) {
      const now = await this.files();
      const stale = changes.filter((c) => c.sha !== undefined && (now.files[c.path] ?? null) !== c.sha).map((c) => c.path);
      if (stale.length) {
        const err = new Error(`Changed by someone else since you opened it: ${stale.join(", ")}.`);
        err.status = 409;
        err.stale = stale;
        throw err;
      }
      const entries = [];
      for (const c of changes) {
        if (c.delete) {
          if (now.files[c.path]) entries.push({ path: c.path, mode: "100644", type: "blob", sha: null });
        } else if (c.blob !== undefined) {
          entries.push({ path: c.path, mode: "100644", type: "blob", sha: c.blob });
        } else {
          entries.push({ path: c.path, mode: "100644", type: "blob", content: c.text });
        }
      }
      const tree = await this.call("/git/trees", { method: "POST", body: JSON.stringify({ base_tree: now.tree, tree: entries }) });
      const date = new Date().toISOString();
      const commit = await this.call("/git/commits", {
        method: "POST",
        body: JSON.stringify({ message, tree: tree.sha, parents: [now.head], author: { ...author, date } }),
      });
      try {
        await this.call(`/git/refs/heads/${BRANCH}`, { method: "PATCH", body: JSON.stringify({ sha: commit.sha, force: false }) });
        return { sha: commit.sha, url: commit.html_url };
      } catch (e) {
        // main moved between reading it and saving: start again from the new head.
        if (e.status !== 422 || attempt >= 2) throw e;
      }
    }
  }

  // The Cloudflare build's check on a commit: "building", "live", "failed" or "unknown".
  // Workers Builds reports as a check run or a commit status; read whichever the token is allowed to see.
  // An expired token is an error, not "unknown".
  async deploy(sha) {
    const unseen = (fallback) => (e) => { if (e.code === "github-token") throw e; return fallback; };
    const runs = (await this.call(`/commits/${sha}/check-runs`).catch(unseen({}))).check_runs || [];
    if (runs.length) {
      if (runs.some((r) => r.status !== "completed")) return "building";
      return runs.every((r) => ["success", "neutral", "skipped"].includes(r.conclusion)) ? "live" : "failed";
    }
    const status = await this.call(`/commits/${sha}/status`).catch(unseen(null));
    if (!status?.total_count) return "unknown";
    return { pending: "building", success: "live" }[status.state] || "failed";
  }
}
