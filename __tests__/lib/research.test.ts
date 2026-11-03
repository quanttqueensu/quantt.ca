import { describe, expect, it } from "vitest";
import { formatArticleDate, getResearchArticles, readingMinutes, renderArticle } from "@/lib/research";

describe("research articles", () => {
  const articles = getResearchArticles();

  it("lists articles newest first, each with a title, date and author", () => {
    expect(articles.length).toBeGreaterThan(0);
    for (const a of articles) {
      expect(a.title).toBeTruthy();
      expect(a.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(a.authors.length).toBeGreaterThan(0);
    }
    const dates = articles.map((a) => a.date);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it("formats dates, preferring a month-only label", () => {
    expect(formatArticleDate({ date: "2026-02-26" })).toBe("February 26, 2026");
    expect(formatArticleDate({ date: "2026-02-26" }, true)).toBe("Feb 26, 2026");
    expect(formatArticleDate({ date: "2026-07-01", dateLabel: "July 2026" })).toBe("July 2026");
  });

  it("renders headings with unique ids, citations that resolve, and valuation blocks", () => {
    for (const a of articles) {
      const { parts, headings } = renderArticle(a);
      const ids = headings.map((h) => h.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(readingMinutes(a)).toBeGreaterThan(0);
      const html = parts.map((p) => (p.kind === "html" ? p.html : "")).join("");
      expect(html).not.toContain("```");
      for (const m of html.matchAll(/href="#ref-(\d+)"/g)) expect(html).toContain(`id="ref-${m[1]}"`);
    }
    const copper = articles.find((a) => a.slug === "industry-4-0-copper");
    if (copper) expect(renderArticle(copper).parts.some((p) => p.kind === "valuation")).toBe(true);
  });
});
