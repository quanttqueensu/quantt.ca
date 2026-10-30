"use client";

import { useState } from "react";
import type { AchievementMedia } from "@/lib/content";

export interface WinRow {
  id: string;
  year: string;
  result: string;
  competition: string;
  url?: string;
  team: { name: string; linkedin?: string }[];
  summary?: string;
  media: AchievementMedia[];
}

const newTab = { target: "_blank", rel: "noopener noreferrer" } as const;

/** One line per result; a result with a summary, photos or files opens them in place. */
export default function AchievementsList({ rows }: { rows: WinRow[] }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="cs-wins">
      {rows.map((w) => {
        const photos = w.media.filter((m) => m.type === "image");
        const files = w.media.filter((m) => m.type !== "image");
        const hasMore = Boolean(w.summary) || w.media.length > 0;
        const isOpen = open === w.id;
        return (
          <article key={w.id} aria-label={`${w.competition}, ${w.result}, ${w.year}`}>
            <div className={`cs-win ${isOpen ? "is-open" : ""}`}>
              <span className="cs-win__year">{w.year}</span>
              <span className={`cs-win__place ${/^1st\b/i.test(w.result) ? "cs-win__place--first" : ""}`}>{w.result}</span>
              <h3 className="cs-win__name">
                {w.url ? (
                  <a href={w.url} {...newTab}>
                    {w.competition}
                  </a>
                ) : (
                  w.competition
                )}
              </h3>
              <p className="cs-win__team">
                {w.team.map((m, i) => (
                  <span key={m.name}>
                    {i > 0 && ", "}
                    {m.linkedin ? (
                      <a href={m.linkedin} {...newTab} aria-label={`${m.name} on LinkedIn (opens in new tab)`}>
                        {m.name}
                      </a>
                    ) : (
                      m.name
                    )}
                  </span>
                ))}
              </p>
              <span className="cs-win__end">
                {hasMore && (
                  <button
                    type="button"
                    className="cs-win__toggle"
                    aria-expanded={isOpen}
                    aria-controls={`win-${w.id}`}
                    aria-label={`${isOpen ? "Hide" : "Show"} details for ${w.competition}`}
                    onClick={() => setOpen(isOpen ? null : w.id)}
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                      <path d="M5 8l5 5 5-5" />
                    </svg>
                  </button>
                )}
              </span>
            </div>
            {hasMore && isOpen && (
              <div id={`win-${w.id}`} className="cs-win__detail">
                <div className="cs-win__text">
                  {w.summary && <p className="cs-win__summary">{w.summary}</p>}
                  {files.length > 0 && (
                    <div className="cs-win__files">
                      {files.map((m) => (
                        <a key={m.url} href={m.type === "pdf" ? encodeURI(m.url) : m.url} {...newTab}>
                          <b>{m.type === "pdf" ? "PDF" : "Link"}</b>
                          {m.title ?? m.caption ?? m.url}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                {photos.length > 0 && (
                  <div className="cs-win__photos">
                    {photos.map((m) => (
                      <a key={m.url} href={encodeURI(m.url)} {...newTab} aria-label={`${m.caption ?? m.title ?? "Photo"} (opens in new tab)`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={encodeURI(m.url)} alt={m.caption ?? m.title ?? ""} loading="lazy" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
