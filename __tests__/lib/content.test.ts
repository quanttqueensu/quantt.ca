import { describe, it, expect } from "vitest";
import {
  getSiteConfig,
  getEvents,
  getPartners,
  getTeamMembers,
  getTeamYears,
  getPortfolios,
  getEducationChapters,
  getAchievements,
  isRecruitingOpen,
} from "@/lib/content";

describe("content loading", () => {
  it("loads site config", () => {
    const config = getSiteConfig();
    expect(config).toHaveProperty("recruiting");
    expect(typeof config.recruiting).toBe("boolean");
  });

  it("never ships an expired recruiting deadline", () => {
    const config = getSiteConfig();
    if (config.recruiting && config.recruitingUntil) {
      expect(new Date(`${config.recruitingUntil}T23:59:59`).getTime()).toBeGreaterThanOrEqual(
        Date.now()
      );
    }
  });

  it("loads achievements newest year first, each with the required fields", () => {
    const list = getAchievements();
    expect(Array.isArray(list)).toBe(true);
    for (const a of list) {
      expect(a.competition).toBeTruthy();
      expect(a.result).toBeTruthy();
      expect(a.year).toMatch(/^\d{4}/);
    }
    const years = list.map((a) => a.year);
    expect(years).toEqual([...years].sort().reverse());
  });

  it("loads events as array", () => {
    const events = getEvents();
    expect(Array.isArray(events)).toBe(true);
    if (events.length > 0) {
      expect(events[0]).toHaveProperty("title");
      expect(events[0]).toHaveProperty("date");
    }
  });

  it("loads partners with current and past", () => {
    const partners = getPartners();
    expect(partners).toHaveProperty("current");
    expect(partners).toHaveProperty("past");
    expect(Array.isArray(partners.current)).toBe(true);
  });

  it("loads team members sorted by order", () => {
    const members = getTeamMembers();
    expect(Array.isArray(members)).toBe(true);
    if (members.length > 1) {
      expect(members[0].order).toBeLessThanOrEqual(members[1].order);
    }
  });

  it("loads research papers keyed by project team", () => {
    const year = getTeamYears().find((y) => y.config.year === "2025-2026");
    expect(year).toBeDefined();
    const papers = year!.config.researchPapers ?? {};
    for (const team of year!.config.projectTeams ?? []) {
      expect(papers[team]).toMatch(/^\/papers\/.+\.pdf$/);
    }
  });

  it("loads portfolios sorted by order with slugs", () => {
    const portfolios = getPortfolios();
    expect(Array.isArray(portfolios)).toBe(true);
    expect(portfolios.length).toBe(7);
    for (const portfolio of portfolios) {
      expect(portfolio).toHaveProperty("title");
      expect(portfolio).toHaveProperty("slug");
      expect(portfolio.slug).toMatch(/^[a-z0-9-]+$/);
      expect(portfolio).toHaveProperty("description");
      expect(portfolio.status).toMatch(/^(active|completed)$/);
    }
    if (portfolios.length > 1) {
      expect(portfolios[0].order).toBeLessThanOrEqual(portfolios[1].order);
    }
  });

  it("loads education chapters sorted by chapter number", () => {
    const chapters = getEducationChapters();
    expect(Array.isArray(chapters)).toBe(true);
    if (chapters.length > 1) {
      expect(chapters[0].chapter).toBeLessThanOrEqual(chapters[1].chapter);
    }
  });
});

describe("isRecruitingOpen", () => {
  const now = new Date("2026-09-30T12:00:00");

  it("is closed when recruiting is off", () => {
    expect(isRecruitingOpen({ recruiting: false }, now)).toBe(false);
  });

  it("is open with no deadline", () => {
    expect(isRecruitingOpen({ recruiting: true }, now)).toBe(true);
  });

  it("stays open through the last day and closes after it", () => {
    expect(isRecruitingOpen({ recruiting: true, recruitingUntil: "2026-09-30" }, now)).toBe(true);
    expect(isRecruitingOpen({ recruiting: true, recruitingUntil: "2026-09-29" }, now)).toBe(false);
  });
});
