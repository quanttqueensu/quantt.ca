import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { changeErrors, contentErrors, frontMatter, loadYaml } from "@/lib/schema.js";
import { renderArticle, type ResearchArticle } from "@/lib/research";

const walk = (d: string): string[] =>
  fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));

describe("content checks (shared by the build and the admin)", () => {
  it("passes every file in content/", () => {
    for (const f of walk("content")) expect(contentErrors(f.split(path.sep).join("/"), fs.readFileSync(f, "utf-8")), f).toEqual([]);
  });

  it("keeps unquoted dates as strings", () => {
    expect(loadYaml("date: 2026-09-30")).toEqual({ date: "2026-09-30" });
    expect(frontMatter("---\ndate: 2026-09-30\n---\nBody").data).toEqual({ date: "2026-09-30" });
  });

  it("flags shapes the pages can't use", () => {
    expect(contentErrors("content/config.yml", "recruiting: yes please")).toEqual(["recruiting must be true or false"]);
    expect(contentErrors("content/partners.yml", "current: []")).toEqual(["past must be a list"]);
    expect(contentErrors("content/events.yml", '- title: "Talk"\n  date: "Sept 3"')[0]).toMatch(/events\[1\]\.date must be a date/);
    expect(contentErrors("content/events.yml", "")).toEqual([]);
    expect(contentErrors("content/team/2026-2027/config.yml", "year: 2026")[0]).toMatch(/^year/);
    expect(contentErrors("content/portfolios/x.md", "---\ntitle: X\n---\n")).toEqual(["tech must be a list of tags"]);
    expect(contentErrors("content/research/x.md", "---\ntitle: X\ndate: 2026-02-26\n---\n```valuation\ncurrent: lots\npoints: []\n```\n")).toEqual([
      "valuation block 1.current must be a number",
    ]);
    expect(contentErrors("content/achievements.yml", "achievements:\n  - competition: [")[0]).toMatch(/isn't valid YAML/);
    expect(contentErrors("content/team/_TEMPLATE.md", "---\nnot: [valid\n---\n")).toEqual([]);
  });

  it("checks a save as the build will read it", () => {
    expect(changeErrors([{ path: "content/events.yml", delete: true }])).toEqual([
      "content/events.yml can't be deleted: the site reads it on every build",
    ]);
    expect(changeErrors([{ path: "content/research/a.md", delete: true }, { path: "public/images/a.png", blob: "x" }])).toEqual([]);
    expect(changeErrors([{ path: "content/config.yml", text: "recruiting: 1\n" }])).toEqual(["content/config.yml: recruiting must be true or false"]);
  });
});

describe("research article HTML", () => {
  it("keeps simple markup and drops scripts", () => {
    const a = { slug: "x", title: "X", date: "2026-01-01", authors: [], body: 'H<sub>2</sub>O <img src="/a.png" onerror="alert(1)"><script>alert(1)</script>' } as ResearchArticle;
    const html = renderArticle(a).parts.map((p) => (p.kind === "html" ? p.html : "")).join("");
    expect(html).toContain("<sub>2</sub>");
    expect(html).not.toMatch(/script|onerror/);
  });
});
