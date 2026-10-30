import { describe, it, expect } from "vitest";
import { editable } from "@/worker/github.js";

describe("admin editor file access", () => {
  it("allows content files and uploads", () => {
    for (const p of [
      "content/partners.yml",
      "content/team/2026-2027/ethan-solnik.md",
      "public/images/partners/tradermath.svg",
      "public/achievements/fiam-2026/team.jpg",
      "public/papers/Pairs Trading.pdf",
    ]) expect(editable(p), p).toBe(true);
  });

  it("keeps code, config and path tricks out of reach", () => {
    for (const p of [
      "wrangler.jsonc",
      "worker/index.js",
      "app/page.tsx",
      "package.json",
      "public/_redirects",
      "content/../wrangler.jsonc",
      "public/images/x.html",
      "public/images//x.png",
      ".github/workflows/x.yml",
      null,
    ]) expect(editable(p), String(p)).toBe(false);
  });
});
