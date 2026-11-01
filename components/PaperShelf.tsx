import Image from "next/image";

export interface ShelfPaper {
  key: string;
  pdf: string;
  /** First-page image; without one the cover shows the heading on a plain card. */
  cover?: string;
  /** Short tag on the cover, e.g. "Winner" or "1st place". */
  tag?: string;
  heading: string;
  /** What the tag means, in full, e.g. "Won QUANTT's 2025-2026 project competition". */
  note?: string;
  title?: string;
  meta?: string;
}

/** A grid of paper covers, each opening its PDF. */
export default function PaperShelf({ papers }: { papers: ShelfPaper[] }) {
  return (
    <ul className="cs-shelf">
      {papers.map((p) => (
        <li key={p.key}>
          <a href={encodeURI(p.pdf)} target="_blank" rel="noopener noreferrer">
            <div className="cs-shelf__cover">
              {p.cover ? (
                <Image src={p.cover} alt="" width={850} height={1100} sizes="(max-width: 640px) 45vw, (max-width: 1100px) 30vw, 260px" />
              ) : (
                <span className="cs-shelf__blank" aria-hidden="true">{p.heading}</span>
              )}
              {p.tag && <span className="cs-shelf__tag">{p.tag}</span>}
            </div>
            <h3 className="cs-shelf__heading">{p.heading}</h3>
            {p.note && <p className="cs-shelf__note">{p.note}</p>}
            {p.title && <p className="cs-shelf__title">{p.title}</p>}
            {p.meta && <p className="cs-shelf__meta">{p.meta}</p>}
            <span className="sr-only"> (PDF, opens in new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
