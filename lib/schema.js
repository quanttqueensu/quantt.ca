// What the site build needs from each file in content/. Shared by the build (lib/content.ts, lib/research.ts) and the
// admin Worker (worker/index.js), which refuses a save that would break the next build. Plain JS, no fs, so both can
// import it.
import yaml from "js-yaml";

// Core schema: dates and times stay strings, as the admin writes them.
export const loadYaml = (text) => yaml.load(text, { schema: yaml.CORE_SCHEMA });

/** { data, body } of a Markdown file with YAML front matter. No front matter means data {}. */
export function frontMatter(text) {
  const m = /^---[ \t]*\r?\n(?:([\s\S]*?)\r?\n)?---[ \t]*(?:\r?\n|$)([\s\S]*)$/.exec(text);
  if (!m) return { data: {}, body: text };
  const data = m[1] ? loadYaml(m[1]) : null;
  if (data != null && !isObj(data)) throw new Error("front matter must be key: value lines");
  return { data: data ?? {}, body: m[2] };
}

/** Splits an article body around its ```valuation blocks: odd indexes are the blocks' YAML. */
export const VALUATION_SPLIT = /```valuation\n([\s\S]*?)```/;

// Files the site reads without checking they exist.
export const REQUIRED = ["content/config.yml", "content/events.yml", "content/partners.yml", "content/achievements.yml"];

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const none = (v) => v === undefined || v === null;
const str = (v) => typeof v === "string";
const num = (v) => typeof v === "number" && Number.isFinite(v);
const bool = (v) => typeof v === "boolean";
const strs = (v) => Array.isArray(v) && v.every(str);
const day = (v) => str(v) && /^\d{4}-\d{2}-\d{2}$/.test(v);
const slugLike = (v) => str(v) && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v);

// A small checker: need() for required keys, may() for optional ones (missing or null is fine).
function checker(errors) {
  const at = (where, key) => (where ? `${where}.${key}` : key);
  const test = (obj, where, key, ok, what) => { if (!ok(obj[key])) errors.push(`${at(where, key)} ${what}`); };
  return {
    need: (obj, where, key, ok, what) => test(obj, where, key, ok, what),
    may: (obj, where, key, ok, what) => { if (!none(obj[key])) test(obj, where, key, ok, what); },
    list(obj, where, key, required, each) {
      const v = obj[key];
      if (none(v) && !required) return;
      if (!Array.isArray(v)) return errors.push(`${at(where, key)} must be a list`);
      v.forEach((item, i) => {
        const w = `${at(where, key)}[${i + 1}]`;
        if (!isObj(item)) errors.push(`${w} must be key: value lines`);
        else each(item, w);
      });
    },
  };
}

const STRING = "must be text";
const DAY = 'must be a date like "2026-09-30"';

const RULES = [
  [/^content\/config\.yml$/, (d, c) => {
    c.may(d, "", "recruiting", bool, "must be true or false");
    for (const k of ["recruitingDetails", "recruitingUrl"]) c.may(d, "", k, str, STRING);
    c.may(d, "", "recruitingUntil", day, DAY);
    c.may(d, "", "media", (m) => isObj(m) && Object.values(m).every((v) => none(v) || str(v)), "must be slot: path lines");
  }],
  [/^content\/partners\.yml$/, (d, c) => {
    for (const k of ["current", "past"]) c.list(d, "", k, true, (p, w) => {
      c.need(p, w, "name", str, STRING);
      for (const f of ["logo", "url", "description"]) c.may(p, w, f, str, STRING);
    });
  }],
  [/^content\/achievements\.yml$/, (d, c) => {
    c.list(d, "", "achievements", false, (a, w) => {
      for (const f of ["competition", "result"]) c.need(a, w, f, str, STRING);
      c.need(a, w, "year", (y) => (str(y) || num(y)) && /^\d{4}/.test(String(y)), 'must be a year like "2026"');
      c.may(a, w, "members", strs, "must be a list of names");
      for (const f of ["url", "summary"]) c.may(a, w, f, str, STRING);
      c.may(a, w, "featured", bool, "must be true or false");
      c.may(a, w, "featuredUntil", day, DAY);
      c.list(a, w, "media", false, (m, mw) => {
        c.need(m, mw, "type", (t) => ["image", "pdf", "link"].includes(t), "must be image, pdf or link");
        c.need(m, mw, "url", str, STRING);
        for (const f of ["title", "caption", "cover"]) c.may(m, mw, f, str, STRING);
        c.may(m, mw, "research", bool, "must be true or false");
      });
    });
  }],
  [/^content\/gallery\.yml$/, (d, c) => {
    c.may(d, "", "heroStart", str, STRING);
    c.list(d, "", "events", false, (e, w) => {
      c.need(e, w, "title", str, STRING);
      c.need(e, w, "date", (v) => str(v) && /^\d{4}-\d{2}/.test(v), 'must be a month like "2026-10"');
      for (const f of ["place", "result"]) c.may(e, w, f, str, STRING);
      c.list(e, w, "photos", false, (p, pw) => {
        c.need(p, pw, "src", str, STRING);
        for (const f of ["alt", "position"]) c.may(p, pw, f, str, STRING);
        for (const f of ["hidden", "hero"]) c.may(p, pw, f, bool, "must be true or false");
      });
    });
  }],
  [/^content\/team\/\d{4}-\d{4}\/config\.yml$/, (d, c) => {
    c.need(d, "", "year", (v) => str(v) && /^\d{4}-\d{4}$/.test(v), 'must be like "2026-2027"');
    c.may(d, "", "current", bool, "must be true or false");
    c.may(d, "", "structure", (v) => ["tiered", "corporate"].includes(v), "must be tiered or corporate");
    c.may(d, "", "projectTeams", strs, "must be a list of names");
    c.may(d, "", "winner", str, STRING);
    for (const k of ["researchPapers", "researchPaperDetails"]) c.may(d, "", k, isObj, "must be name: value lines");
    c.list(d, "", "leadershipTiers", false, (t, w) => { c.need(t, w, "key", str, STRING); c.need(t, w, "label", str, STRING); });
    c.list(d, "", "hierarchy", false, (t, w) => {
      c.need(t, w, "tier", str, STRING);
      c.need(t, w, "label", str, STRING);
      c.may(t, w, "teams", strs, "must be a list of names");
      c.list(t, w, "roles", false, (r, rw) => { c.need(r, rw, "title", str, STRING); c.need(r, rw, "short", str, STRING); });
    });
  }],
  [/^content\/team\/\d{4}-\d{4}\/[^/]+\.md$/, (d, c) => {
    for (const f of ["name", "role", "tier"]) c.need(d, "", f, str, STRING);
    for (const f of ["department", "photo", "bio", "linkedin", "lead"]) c.may(d, "", f, str, STRING);
    c.may(d, "", "order", num, "must be a number");
  }],
  [/^content\/portfolios\/[^/]+\.md$/, (d, c) => {
    c.need(d, "", "title", str, STRING);
    c.need(d, "", "tech", strs, "must be a list of tags");
    c.may(d, "", "slug", slugLike, "must be lowercase letters, digits and dashes");
    for (const f of ["manager", "description"]) c.may(d, "", f, str, STRING);
    c.may(d, "", "status", (v) => ["active", "completed"].includes(v), "must be active or completed");
    c.may(d, "", "order", num, "must be a number");
  }],
  [/^content\/education\/[^/]+\.md$/, (d, c) => {
    c.need(d, "", "title", str, STRING);
    c.need(d, "", "chapter", num, "must be a number");
    for (const f of ["topics", "trading_track", "development_track"]) c.may(d, "", f, strs, "must be a list");
  }],
  [/^content\/research\/[^/]+\.md$/, (d, c) => {
    c.need(d, "", "title", str, STRING);
    c.need(d, "", "date", day, DAY);
    c.may(d, "", "authors", strs, "must be a list of names");
    c.may(d, "", "slug", slugLike, "must be lowercase letters, digits and dashes");
    for (const f of ["sector", "dateLabel", "company", "ticker", "rating", "cover", "disclosure", "pdf"]) c.may(d, "", f, str, STRING);
  }],
];

/**
 * Problems with one content file that would break the build or the page it feeds, as short messages. [] when fine.
 * Files starting with "_" are templates the site never reads.
 */
export function contentErrors(path, text) {
  if (path.split("/").pop().startsWith("_")) return [];
  const isMd = path.endsWith(".md");
  let data, body = "";
  try {
    if (isMd) ({ data, body } = frontMatter(text));
    else data = loadYaml(text);
  } catch (e) {
    return [`isn't valid YAML (${String(e.message).split("\n")[0]})`];
  }
  const errors = [];
  const c = checker(errors);
  if (path === "content/events.yml") {
    // A list of events, or nothing.
    if (!none(data)) c.list({ events: data }, "", "events", true, (e, w) => {
      c.need(e, w, "title", str, STRING);
      c.need(e, w, "date", day, DAY);
      for (const f of ["time", "location", "url"]) c.may(e, w, f, str, STRING);
    });
    return errors;
  }
  const rule = RULES.find(([re]) => re.test(path));
  if (!rule) return errors;
  if (!isObj(data)) return ["must be key: value lines"];
  rule[1](data, c);
  if (path.startsWith("content/research/")) {
    body.split(VALUATION_SPLIT).forEach((chunk, i) => {
      if (i % 2 === 0) return;
      const w = `valuation block ${(i + 1) / 2}`;
      let v;
      try { v = loadYaml(chunk); } catch { return errors.push(`${w} isn't valid YAML`); }
      if (!isObj(v)) return errors.push(`${w} must be key: value lines`);
      c.need(v, w, "current", num, "must be a number");
      c.list(v, w, "points", true, (p, pw) => c.need(p, pw, "price", num, "must be a number"));
    });
  }
  return errors;
}

/** contentErrors, as one Error the build stops on. */
export function checkContent(path, text) {
  const errors = contentErrors(path, text);
  if (errors.length) throw new Error(`${path}: ${errors.join("; ")}`);
}

/**
 * Problems with a save from the admin: [{ path, text } | { path, delete: true } | ...]. Text files are checked as the
 * build will read them; files the site always reads can't be deleted.
 */
export function changeErrors(changes) {
  const errors = [];
  for (const c of changes) {
    if (!c.path.startsWith("content/")) continue;
    if (c.delete) {
      if (REQUIRED.includes(c.path)) errors.push(`${c.path} can't be deleted: the site reads it on every build`);
    } else if (typeof c.text === "string") {
      for (const e of contentErrors(c.path, c.text)) errors.push(`${c.path}: ${e}`);
    }
  }
  return errors;
}
