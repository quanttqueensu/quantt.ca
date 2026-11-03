import Link from "next/link";
import { Avatar } from "@/components/ResearchBits";
import type { ResearchArticle } from "@/lib/research";
import { formatArticleDate, leadParagraph, readingMinutes } from "@/lib/research";

/** Research articles, newest first, one aligned row each: date, title and opening lines, subject. */
export default function ResearchFeed({ articles }: { articles: ResearchArticle[] }) {
  return (
    <ol className="ra-feed">
      {articles.map((a) => (
        <li key={a.slug}>
          <Link href={`/research/${a.slug}`} className="ra-item">
            <p className="ra-item__date">
              <time dateTime={a.date}>{formatArticleDate(a, true)}</time>
              <small>{readingMinutes(a)} min read</small>
            </p>
            <div className="ra-item__main">
              <h3 className="ra-item__title">{a.title}</h3>
              <p className="ra-item__lead">{leadParagraph(a)}</p>
              <p className="ra-item__by">
                <Avatar name={a.authors[0] ?? "QUANTT"} size={28} />
                <span>{a.authors.join(", ")}</span>
              </p>
            </div>
            <p className="ra-item__side">
              {a.sector && <span className="ra-item__sector">{a.sector}</span>}
              {a.company && (
                <span className="ra-item__co">
                  {a.company}
                  {a.ticker && ` (${a.ticker.replace(/^[A-Z]+:\s*/, "")})`}
                </span>
              )}
              {a.rating && <span className="ra-item__call">{a.rating}</span>}
            </p>
          </Link>
        </li>
      ))}
    </ol>
  );
}
