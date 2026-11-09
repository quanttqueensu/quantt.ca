import fs from "fs";
import path from "path";
import matter from "gray-matter";
import yaml from "js-yaml";
import { isFeatureLive } from "./featured";

const contentDir = path.join(process.cwd(), "content");

export interface SiteConfig {
  recruiting: boolean;
  recruitingDetails?: string;
  /** Internal route (e.g. "/portfolios") or absolute external URL. */
  recruitingUrl?: string;
  /** "YYYY-MM-DD". When set, the banner expires at the end of this day. */
  recruitingUntil?: string;
  /** Optional photo overrides per media slot; each slot has a built-in fallback. */
  media?: Partial<Record<"hero" | "research" | "partners" | "education" | "team", string>>;
}

export interface ResearchPaperDetail {
  title: string;
  date?: string;
  /** First-page render in /public, used as imagery. */
  image?: string;
}

export interface Event {
  title: string;
  date: string;
  time: string;
  location: string;
  url?: string;
}

export interface Partner {
  name: string;
  logo?: string;
  url?: string;
  description: string;
}

export interface PartnersData {
  current: Partner[];
  past: Partner[];
}

/** A photo, PDF or link attached to an achievement, like LinkedIn's media. */
export interface AchievementMedia {
  type: "image" | "pdf" | "link";
  /** Uploads live in /public/achievements/<slug>/ and are served from /achievements/<slug>/. Links are external URLs. */
  url: string;
  title?: string;
  caption?: string;
  /** PDFs only: also list this paper on the Research page. */
  research?: boolean;
  /** PDFs only: image of the first page, shown as the paper's cover on Achievements and Research. */
  cover?: string;
}

export interface Achievement {
  competition: string;
  /** Placing or award, e.g. "1st place", "Finalist". */
  result: string;
  /** Competition year, e.g. "2026". */
  year: string;
  members?: string[];
  url?: string;
  /** Short paragraph under the competition name. */
  summary?: string;
  media?: AchievementMedia[];
  /** Shows this win in the "Latest win" row under the home hero. */
  featured?: boolean;
  /** Last day (YYYY-MM-DD) the win stays featured; blank keeps it up until unticked. */
  featuredUntil?: string;
}

export interface TeamMember {
  name: string;
  role: string;
  tier: string;
  department?: string;
  photo?: string;
  order: number;
  bio: string;
  linkedin?: string;
  /** Trading analysts: the portfolio manager(s) whose desk they sit on. */
  lead?: string;
}

export interface HierarchyRole {
  title: string;
  short: string;
}

export interface HierarchyTier {
  tier: string;
  label: string;
  roles?: HierarchyRole[];
  teams?: string[];
  placeholder?: string;
}

export interface LeadershipTier {
  key: string;
  label: string;
}

export interface TeamYearConfig {
  year: string;
  current: boolean;
  structure: "tiered" | "corporate";
  leadershipTiers?: LeadershipTier[];
  projectTeams?: string[];
  winner?: string;
  researchPapers?: Record<string, string>;
  researchPaperDetails?: Record<string, ResearchPaperDetail>;
  hierarchy?: HierarchyTier[];
}

export interface TeamYear {
  config: TeamYearConfig;
  members: TeamMember[];
}

export interface Portfolio {
  title: string;
  slug: string;
  manager?: string;
  description: string;
  tech: string[];
  status: "active" | "completed";
  order: number;
  body?: string;
}

export interface EducationChapter {
  title: string;
  chapter: number;
  topics?: string[];
  trading_track?: string[];
  development_track?: string[];
  body: string;
}

function readYaml<T>(filename: string): T {
  const filePath = path.join(contentDir, filename);
  const raw = fs.readFileSync(filePath, "utf-8");
  return yaml.load(raw) as T;
}

function readMdDir<T>(dir: string): (T & { body: string })[] {
  const dirPath = path.join(contentDir, dir);
  if (!fs.existsSync(dirPath)) return [];
  const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".md") && !f.startsWith("_"));
  return files.map((file) => {
    const raw = fs.readFileSync(path.join(dirPath, file), "utf-8");
    const { data, content } = matter(raw);
    return { ...(data as T), body: content.trim() };
  });
}

export interface GalleryPhoto {
  src: string;
  /** Grid thumbnail: a "-sm" copy next to the photo when there is one, else the photo. */
  thumb?: string;
  /** Defaults to the set's title. */
  alt?: string;
  /** true keeps the photo off the site (gallery and hero). */
  hidden?: boolean;
  /** false keeps the photo out of the home hero rotation. */
  hero?: boolean;
  /** CSS object-position ("across down") kept in frame when the hero crops the photo. */
  position?: string;
}

export interface GalleryEvent {
  title: string;
  /** "YYYY-MM": orders the sets and is shown as "Month YYYY". */
  date: string;
  place?: string;
  result?: string;
  photos: GalleryPhoto[];
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "2026-10" -> "October 2026". Anything else is shown as written. */
export function monthLabel(date: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(date);
  return m && MONTHS[Number(m[2]) - 1] ? `${MONTHS[Number(m[2]) - 1]} ${m[1]}` : date;
}

const thumbFor = (src: string) => {
  const sm = src.replace(/(\.\w+)$/, "-sm$1");
  return src.startsWith("/") && fs.existsSync(path.join(process.cwd(), "public", sm)) ? sm : src;
};

/** Sets for /gallery, newest month first, hidden photos left out. Missing file means no gallery. */
export function getGallery(): GalleryEvent[] {
  if (!fs.existsSync(path.join(contentDir, "gallery.yml"))) return [];
  const events = readYaml<{ events?: GalleryEvent[] | null }>("gallery.yml").events ?? [];
  return events
    .map((e, i) => ({
      e: {
        ...e,
        date: String(e.date ?? ""),
        photos: (e.photos ?? [])
          .filter((p) => p?.src && !p.hidden)
          .map((p) => ({ ...p, alt: p.alt || e.title, thumb: thumbFor(p.src) })),
      },
      i,
    }))
    .filter(({ e }) => e.photos.length > 0)
    .sort((x, y) => y.e.date.localeCompare(x.e.date) || x.i - y.i)
    .map(({ e }) => e);
}

/** Photos the home hero rotates through: every shown gallery photo not marked `hero: false`. */
export function getHeroPhotos(): GalleryPhoto[] {
  return getGallery().flatMap((e) => e.photos.filter((p) => p.hero !== false));
}

export function getSiteConfig(): SiteConfig {
  return readYaml<SiteConfig>("config.yml");
}

/**
 * Whether the recruiting message should render. A dated message expires at the end
 * of `recruitingUntil`, so a stale deadline can never linger in production.
 */
export function isRecruitingOpen(config: SiteConfig, now = new Date()): boolean {
  if (!config.recruiting) return false;
  if (!config.recruitingUntil) return true;
  return new Date(`${config.recruitingUntil}T23:59:59`) >= now;
}

export function getEvents(): Event[] {
  const events = readYaml<Event[] | null>("events.yml");
  return events ?? [];
}

export function getPartners(): PartnersData {
  return readYaml<PartnersData>("partners.yml");
}

/** Competition results by QUANTT members, newest year first (file order kept within a year). */
export function getAchievements(): Achievement[] {
  const list = readYaml<{ achievements?: Achievement[] | null }>("achievements.yml").achievements ?? [];
  return list
    .map((a, i) => ({ a, i }))
    .sort((x, y) => String(y.a.year).localeCompare(String(x.a.year)) || x.i - y.i)
    .map(({ a }) => ({ ...a, year: String(a.year) }));
}

/** A competition paper ticked "Also show on the Research page", with the win it came from. */
export interface CompetitionPaper {
  achievement: Achievement;
  pdf: AchievementMedia;
}

/** Papers from achievements marked for the Research page, newest year first. */
export function getCompetitionPapers(): CompetitionPaper[] {
  return getAchievements().flatMap((achievement) =>
    (achievement.media ?? [])
      .filter((m) => m.type === "pdf" && m.research && m.url)
      .map((pdf) => ({ achievement, pdf }))
  );
}

/** The win shown under the home hero: the newest one ticked "Feature on homepage", if any. */
export function getFeaturedAchievement(now = new Date()): Achievement | undefined {
  return getAchievements().find((a) => isFeatureLive(a, now));
}

export function getTeamMembers(): TeamMember[] {
  // Legacy: try year-based first, fall back to flat
  const teamDir = path.join(contentDir, "team");
  const years = getTeamYears();
  if (years.length > 0) {
    const current = years.find((y) => y.config.current) ?? years[0];
    return current.members;
  }
  return readMdDir<TeamMember>("team").sort((a, b) => a.order - b.order);
}

export function getTeamYears(): TeamYear[] {
  const teamDir = path.join(contentDir, "team");
  if (!fs.existsSync(teamDir)) return [];

  const entries = fs.readdirSync(teamDir, { withFileTypes: true });
  const yearDirs = entries.filter(
    (e) => e.isDirectory() && /^\d{4}-\d{4}$/.test(e.name)
  );

  const results: TeamYear[] = [];
  for (const dir of yearDirs) {
    const configPath = path.join(teamDir, dir.name, "config.yml");
    if (!fs.existsSync(configPath)) continue;
    const config = yaml.load(
      fs.readFileSync(configPath, "utf-8")
    ) as TeamYearConfig;
    const members = readMdDir<TeamMember>(`team/${dir.name}`).sort(
      (a, b) => a.order - b.order
    );
    results.push({ config, members });
  }
  return results.sort((a, b) => b.config.year.localeCompare(a.config.year));
}

export function getPortfolios(): Portfolio[] {
  const dirPath = path.join(contentDir, "portfolios");
  if (!fs.existsSync(dirPath)) return [];
  const files = fs
    .readdirSync(dirPath)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"));

  return files
    .map((file) => {
      const raw = fs.readFileSync(path.join(dirPath, file), "utf-8");
      const { data, content } = matter(raw);
      const portfolio = { ...(data as Portfolio), body: content.trim() };
      if (!portfolio.slug) {
        portfolio.slug = file.replace(/\.md$/, "");
      }
      return portfolio;
    })
    .sort((a, b) => a.order - b.order);
}

export function getEducationChapters(): EducationChapter[] {
  return readMdDir<EducationChapter>("education").sort(
    (a, b) => a.chapter - b.chapter
  );
}
