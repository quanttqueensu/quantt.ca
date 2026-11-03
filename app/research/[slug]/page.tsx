import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ArticleToc from "@/components/ArticleToc";
import { Avatar, Disclaimer, ValuationRange } from "@/components/ResearchBits";
import { getTeamYears } from "@/lib/content";
import {
  coverImage,
  formatArticleDate,
  getResearchArticle,
  getResearchArticles,
  leadParagraph,
  readingMinutes,
  renderArticle,
} from "@/lib/research";

export const dynamicParams = false;

export function generateStaticParams() {
  return getResearchArticles().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const a = getResearchArticle(slug);
  if (!a) return {};
  return {
    alternates: { canonical: `/research/${a.slug}` },
    title: `${a.title} — QUANTT`,
    description: leadParagraph(a).slice(0, 200),
    openGraph: { type: "article", title: a.title, ...(coverImage(a) ? { images: [coverImage(a)!] } : {}) },
  };
}

export default async function ResearchArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = getResearchArticle(slug);
  if (!a) notFound();

  const { parts, headings } = renderArticle(a);
  const roster = getTeamYears().flatMap((y) => y.members);
  const roleOf = (name: string) => roster.find((m) => m.name === name)?.role;
  const minutes = readingMinutes(a);

  return (
    <article className="ra">
      <div className="cs-wrap ra-grid">
        <header className="ra-head">
          <Link href="/competition#articles" className="ra-back">
            Research
          </Link>
          <p className="ra-kicker">
            {a.sector && <span>{a.sector}</span>}
            <time dateTime={a.date}>{formatArticleDate(a)}</time>
          </p>
          <h1 className="ra-title">{a.title}</h1>
        </header>

        <aside className="ra-rail" aria-label="About this article">
          <ul className="ra-authors">
            {a.authors.map((name) => (
              <li key={name}>
                <Avatar name={name} />
                <span>
                  <b>{name}</b>
                  {roleOf(name) && <small>{roleOf(name)}</small>}
                </span>
              </li>
            ))}
          </ul>
          <dl className="ra-facts">
            <div>
              <dt>Published</dt>
              <dd>{formatArticleDate(a)}</dd>
            </div>
            <div>
              <dt>Length</dt>
              <dd>{minutes} min read</dd>
            </div>
            {a.company && (
              <div>
                <dt>Company</dt>
                <dd>
                  {a.company}
                  {a.ticker && <span className="ra-ticker">{a.ticker}</span>}
                </dd>
              </div>
            )}
            {a.rating && (
              <div>
                <dt>Rating</dt>
                <dd className="ra-rating">{a.rating}</dd>
              </div>
            )}
          </dl>
          <p className="ra-note">
            Not financial advice. <a href="#disclaimer">Disclaimer</a>
          </p>
          {headings.length > 2 && <ArticleToc headings={headings} />}
          {a.pdf && (
            <a className="ra-pdf" href={encodeURI(a.pdf)} target="_blank" rel="noopener noreferrer">
              Download PDF
            </a>
          )}
        </aside>

        <div className="ra-body">
          {parts.map((p, i) =>
            p.kind === "html" ? (
              <div key={i} dangerouslySetInnerHTML={{ __html: p.html }} />
            ) : (
              <ValuationRange key={i} data={p.data} />
            ),
          )}
          <Disclaimer disclosure={a.disclosure} />
        </div>
      </div>
    </article>
  );
}
