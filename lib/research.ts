import fs from "fs";
import path from "path";
import matter from "gray-matter";
import yaml from "js-yaml";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";

/**
 * Research articles: members' written research (equity research, sector notes), read on the
 * site like a blog post instead of as a PDF. One Markdown file per article in content/research/,
 * figures in public/research/<slug>/. The wording is the author's; only the display is ours.
 */
export interface ResearchArticle {
  slug: string;
  title: string;
  /** Sector or topic, e.g. "Mining". */
  sector?: string;
  /** ISO date the piece was written; drives the order. */
  date: string;
  /** Shown instead of the full date when only the month is known, e.g. "July 2026". */
  dateLabel?: string;
  authors: string[];
  company?: string;
  ticker?: string;
  /** The author's call, e.g. "Buy". Only when the piece states one. */
  rating?: string;
  /** Thumbnail on the list; defaults to the first figure. */
  cover?: string;
  /** Optional original file, offered as a download. */
  pdf?: string;
  body: string;
}

/** A valuation range drawn from a ```valuation block (YAML) in the article body. */
export interface Valuation {
  title?: string;
  current: number;
  points: { price: number; change?: string }[];
}

export type ArticlePart = { kind: "html"; html: string } | { kind: "valuation"; data: Valuation };

export interface Heading {
  id: string;
  text: string;
}

const dir = path.join(process.cwd(), "content", "research");

export function getResearchArticles(): ResearchArticle[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .map((file) => {
      const { data, content } = matter(fs.readFileSync(path.join(dir, file), "utf-8"));
      const a = data as Partial<ResearchArticle>;
      return {
        ...a,
        slug: a.slug || file.replace(/\.md$/, ""),
        title: a.title ?? "",
        date: String(a.date ?? ""),
        authors: a.authors ?? [],
        body: content.trim(),
      } as ResearchArticle;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getResearchArticle(slug: string): ResearchArticle | undefined {
  return getResearchArticles().find((a) => a.slug === slug);
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function formatArticleDate(a: Pick<ResearchArticle, "date" | "dateLabel">, short = false): string {
  if (a.dateLabel) return a.dateLabel;
  const [y, m, d] = a.date.split("-").map(Number);
  if (!y || !m) return a.date;
  const month = short ? MONTHS[m - 1].slice(0, 3) : MONTHS[m - 1];
  return d ? `${month} ${d}, ${y}` : `${month} ${y}`;
}

const plain = (md: string) =>
  md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^\|.*$/gm, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/[#*_\\`]/g, "");

export function readingMinutes(a: ResearchArticle): number {
  const words = plain(a.body).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 238));
}

/** The opening paragraph, for the list. */
export function leadParagraph(a: ResearchArticle): string {
  const first = a.body.split(/\n\s*\n/).find((p) => p.trim() && !/^(#|!\[|```|\|)/.test(p.trim()));
  return first ? plain(first).trim() : "";
}

export function coverImage(a: ResearchArticle): string | undefined {
  return a.cover || a.body.match(/!\[[^\]]*\]\(([^)\s]+)/)?.[1];
}

export const slugify = (s: string) =>
  s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeStringify);

/** Body HTML in parts (valuation blocks become components), plus the section headings. */
export function renderArticle(a: ResearchArticle): { parts: ArticlePart[]; headings: Heading[] } {
  const headings: Heading[] = [];
  const seen = new Map<string, number>();
  const chunks = a.body.split(/```valuation\n([\s\S]*?)```/);
  const parts: ArticlePart[] = chunks.map((chunk, i) => {
    if (i % 2 === 1) return { kind: "valuation", data: yaml.load(chunk) as Valuation };
    let html = String(processor.processSync(chunk));
    html = html.replace(/<h2>([\s\S]*?)<\/h2>/g, (_m, inner: string) => {
      const text = inner.replace(/<[^>]+>/g, "");
      const base = slugify(text);
      const n = (seen.get(base) ?? 0) + 1;
      seen.set(base, n);
      const id = n > 1 ? `${base}-${n}` : base;
      headings.push({ id, text });
      return `<h2 id="${id}">${inner}</h2>`;
    });
    // Reference list entries get anchors; citations in the text link to them.
    html = html.replace(/<p>\[(\d+)\] /g, '<p class="ra-ref" id="ref-$1"><span class="ra-ref__n">[$1]</span>');
    html = html.replace(/(?<!ra-ref__n">)\[(\d+)\]/g, '<a class="ra-cite" href="#ref-$1">[$1]</a>');
    html = html.replace(/<p><img ([^>]*)><\/p>/g, '<figure class="ra-figure"><img loading="lazy" $1></figure>');
    html = html.replace(/<tr>(\s*<td[^>]*>Sector Averages<\/td>)/g, '<tr class="ra-avg">$1');
    html = html.replace(/<table>/g, '<div class="ra-table"><table>').replace(/<\/table>/g, "</table></div>");
    return { kind: "html", html };
  });
  return { parts, headings };
}
