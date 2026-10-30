// GitHub access for the admin editor. Every save is one commit on main, which Workers Builds deploys.
// GITHUB_TOKEN (Worker secret): fine-grained token with Contents read/write on GITHUB_REPO only.
// GITHUB_REPO (optional variable): "owner/name", default quanttqueensu/quantt.ca.

const API = "https://api.github.com";
const BRANCH = "main";

// What the editor may read and write. Code, config and everything else in the repo stay out of reach.
const EDITABLE = [/^content\/[\w./-]+\.(ya?ml|md)$/, /^public\/(images|achievements|papers)\/[\w./ ()&-]+\.(png|jpe?g|webp|gif|svg|pdf)$/i];

export function editable(path) {
  return typeof path === "string" && !path.includes("..") && !path.includes("//") && EDITABLE.some((re) => re.test(path));
}

export class GitHub {
  constructor(env) {
    if (!env.GITHUB_TOKEN) throw new Error("GITHUB_TOKEN isn't set on the Worker.");
    this.token = env.GITHUB_TOKEN;
    this.repo = env.GITHUB_REPO || "quanttqueensu/quantt.ca";
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
    return { head, tree: commit.tree.sha, files };
  }

  async read(path) {
    return this.call(`/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${BRANCH}`, { raw: true });
  }

  // changes: [{ path, text } | { path, base64 } | { path, delete: true }], each with `sha`: the blob the editor loaded
  // (null for a new file). A file someone else changed since then stops the whole save.
  async commit(changes, message, author) {
    for (let attempt = 0; ; attempt++) {
      const now = await this.files();
      const stale = changes.filter((c) => c.sha !== undefined && (now.files[c.path] ?? null) !== c.sha).map((c) => c.path);
      if (stale.length) {
        const err = new Error(`Changed by someone else since you opened it: ${stale.join(", ")}. Reload and redo your edit.`);
        err.status = 409;
        throw err;
      }
      const entries = [];
      for (const c of changes) {
        if (c.delete) {
          if (now.files[c.path]) entries.push({ path: c.path, mode: "100644", type: "blob", sha: null });
        } else if (c.base64 !== undefined) {
          const blob = await this.call("/git/blobs", { method: "POST", body: JSON.stringify({ content: c.base64, encoding: "base64" }) });
          entries.push({ path: c.path, mode: "100644", type: "blob", sha: blob.sha });
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
  async deploy(sha) {
    const runs = (await this.call(`/commits/${sha}/check-runs`).catch(() => ({}))).check_runs || [];
    if (runs.length) {
      if (runs.some((r) => r.status !== "completed")) return "building";
      return runs.every((r) => ["success", "neutral", "skipped"].includes(r.conclusion)) ? "live" : "failed";
    }
    const status = await this.call(`/commits/${sha}/status`).catch(() => null);
    if (!status?.total_count) return "unknown";
    return { pending: "building", success: "live" }[status.state] || "failed";
  }
}
