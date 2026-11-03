"use client";

import { useEffect, useState } from "react";
import type { Portfolio } from "@/lib/content";

/**
 * Portfolios as dropdown rows: title, one-line description and manager always
 * visible; the full write-up and focus areas open underneath. A link to
 * /portfolios#<slug> opens that portfolio.
 */
export default function PortfolioList({ portfolios }: { portfolios: Portfolio[] }) {
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    const fromHash = () => {
      const slug = decodeURIComponent(window.location.hash.slice(1));
      if (portfolios.some((p) => p.slug === slug)) setOpen(slug);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [portfolios]);

  return (
    <ul className="cs-pf">
      {portfolios.map((p) => {
        const isOpen = open === p.slug;
        return (
          <li key={p.slug} id={p.slug} className={`cs-pf__item scroll-mt-32 ${isOpen ? "is-open" : ""}`}>
            <h2>
              <button
                type="button"
                className="cs-pf__head"
                aria-expanded={isOpen}
                aria-controls={`${p.slug}-panel`}
                onClick={() => setOpen(isOpen ? null : p.slug)}
              >
                <span className="cs-pf__title">{p.title}</span>
                <span className="cs-pf__desc">{p.description}</span>
                {p.manager && <span className="cs-pf__pm">Portfolio manager: {p.manager}</span>}
                <span className="cs-arrow cs-pf__chev" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M12 16.207 4.646 8.854l.708-.708L12 14.793l6.646-6.647.708.708L12 16.207Z" />
                  </svg>
                </span>
              </button>
            </h2>
            <div id={`${p.slug}-panel`} role="region" aria-label={p.title} hidden={!isOpen} className="cs-pf__body">
              {p.body?.split("\n\n").map((para, j) => <p key={j}>{para}</p>)}
              {p.tech.length > 0 && (
                <p className="cs-pf__tags">
                  <span className="sr-only">Focus areas: </span>
                  {p.tech.join(" | ")}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
