import { afterEach, describe, expect, it, vi } from "vitest";
import { GitHub, tokenExpiry } from "@/worker/github.js";

vi.mock("@/worker/admin.html", () => ({ default: "<!doctype html>" }));
const { default: worker } = await import("@/worker/index.js");

const MAIN = "a".repeat(40);
const TREE = "b".repeat(40);
const OLD = "c".repeat(40);
const UPLOAD = "d".repeat(40);

// A fake GitHub API: main has content/config.yml and an SVG logo at OLD. Records every request.
function fakeGitHub(opts: { status?: number; expires?: string; moved?: boolean } = {}) {
  const calls: { method: string; path: string; body?: Record<string, unknown> }[] = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
    const path = url.replace(/^https:\/\/api\.github\.com\/repos\/[^/]+\/[^/]+/, "");
    const method = init.method || "GET";
    calls.push({ method, path, body: init.body ? JSON.parse(String(init.body)) : undefined });
    const headers: Record<string, string> = opts.expires ? { "github-authentication-token-expiration": opts.expires } : {};
    if (opts.status) return new Response("{}", { status: opts.status, headers });
    const reply = (data: unknown) => new Response(JSON.stringify(data), { headers });
    if (path === "/git/ref/heads/main") return reply({ object: { sha: MAIN } });
    if (path === `/git/commits/${MAIN}`) return reply({ tree: { sha: TREE } });
    if (path.startsWith(`/git/trees/${TREE}`)) return reply({
        tree: [
          { type: "blob", path: "content/config.yml", sha: opts.moved ? UPLOAD : OLD },
          { type: "blob", path: "public/images/partners/x.svg", sha: OLD },
        ],
      });
    if (path === "/git/blobs") return reply({ sha: UPLOAD });
    if (path === "/git/trees") return reply({ sha: "e".repeat(40) });
    if (path === "/git/commits") return reply({ sha: "f".repeat(40), html_url: "https://github.com/x" });
    if (path === "/git/refs/heads/main") return reply({});
    return new Response("{}", { status: 404 });
  });
  return calls;
}

const env = (extra = {}) => ({
  GITHUB_TOKEN: "t",
  AUTH: { whoami: async () => ({ id: 1, name: "Ed", email: "ed@queensu.ca", roles: { website: "admin" } }) },
  ...extra,
});
const post = (path: string, body: unknown) =>
  new Request(`https://quantt.ca/admin/api${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://quantt.ca", "cf-access-jwt-assertion": "jwt" },
    body: JSON.stringify(body),
  });
const commit = (changes: unknown[]) => worker.fetch(post("/commit", { message: "m", changes }), env());

afterEach(() => vi.unstubAllGlobals());

describe("publishing from the admin", () => {
  it("uploads a file as a blob on its own, then commits only its sha", async () => {
    const calls = fakeGitHub();
    const b = await worker.fetch(post("/blob", { base64: "aGVsbG8=" }), env());
    expect(await b.json()).toEqual({ sha: UPLOAD });

    const r = await commit([{ path: "public/gallery/x/01.jpg", sha: null, blob: UPLOAD }]);
    expect(r.status).toBe(200);
    const tree = calls.find((c) => c.method === "POST" && c.path === "/git/trees")!.body!;
    expect(tree.tree).toEqual([{ path: "public/gallery/x/01.jpg", mode: "100644", type: "blob", sha: UPLOAD }]);
    expect(calls.filter((c) => c.path === "/git/blobs")).toHaveLength(1);
  });

  it("refuses content the site build can't read", async () => {
    const calls = fakeGitHub();
    const r = await commit([{ path: "content/config.yml", sha: OLD, text: "recruiting: maybe\n" }]);
    expect(r.status).toBe(400);
    expect((await r.json()).error).toMatch(/would break the site build.*recruiting must be true or false/);
    expect(calls.some((c) => c.method !== "GET")).toBe(false);
  });

  it("refuses deleting a file every build reads", async () => {
    fakeGitHub();
    const r = await commit([{ path: "content/config.yml", sha: OLD, delete: true }]);
    expect((await r.json()).error).toMatch(/can't be deleted/);
  });

  it("refuses SVG uploads and blobs for content files", async () => {
    fakeGitHub();
    expect((await commit([{ path: "public/images/partners/x.svg", sha: null, blob: UPLOAD }])).status).toBe(400);
    expect((await commit([{ path: "content/events.yml", sha: null, blob: UPLOAD }])).status).toBe(400);
    // Deleting an existing SVG is still fine.
    expect((await commit([{ path: "public/images/partners/x.svg", sha: OLD, delete: true }])).status).toBe(200);
  });

  it("names the files someone else changed on a conflict", async () => {
    fakeGitHub({ moved: true });
    const r = await commit([{ path: "content/config.yml", sha: OLD, text: "recruiting: false\n" }]);
    expect(r.status).toBe(409);
    expect((await r.json()).stale).toEqual(["content/config.yml"]);
  });

  it("says plainly when the GitHub token has expired", async () => {
    fakeGitHub({ status: 401 });
    const r = await worker.fetch(new Request("https://quantt.ca/admin/api/files", { headers: { "cf-access-jwt-assertion": "jwt" } }), env());
    const j = await r.json();
    expect(j.code).toBe("github-token");
    expect(j.error).toMatch(/replace GITHUB_TOKEN/);
  });

  it("reports when the token expires", async () => {
    fakeGitHub({ expires: "2026-12-01 17:00:00 UTC" });
    const files = await new GitHub(env()).files();
    expect(files.tokenExpires).toBe("2026-12-01T17:00:00.000Z");
    expect(tokenExpiry("2026-12-01 09:00:00 -0800")).toBe("2026-12-01T17:00:00.000Z");
    expect(tokenExpiry("")).toBeNull();
    expect(tokenExpiry("soon")).toBeNull();
  });
});
