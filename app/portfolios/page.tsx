import type { Metadata } from "next";
import { PageIntro, Wrap } from "@/components/ui";
import { getPortfolios } from "@/lib/content";

export const metadata: Metadata = {
  alternates: { canonical: "/portfolios" },
  title: "Portfolios — QUANTT",
  description:
    "QUANTT's 2026–2027 portfolios: the quantitative trading and research strategies our desks are building this year.",
};

export default function PortfoliosPage() {
  const portfolios = getPortfolios();

  return (
    <>
      <PageIntro
        title="This Year’s Portfolios"
        lede={
          <p>
            Each portfolio is a live strategy with its own thesis, data, and tooling. Here is what
            every desk is building for 2026–2027.
          </p>
        }
      />

      <section aria-label="Portfolios" className="cs-section">
        <Wrap>
          {portfolios.map((portfolio) => (
            <article
              key={portfolio.slug}
              id={portfolio.slug}
              aria-labelledby={`${portfolio.slug}-title`}
              className="cs-row cs-grid cs-split cs-reveal scroll-mt-32"
            >
              <h2 id={`${portfolio.slug}-title`} className="cs-row__title">
                {portfolio.title}
              </h2>
              <div>
                <p className="cs-lede">{portfolio.description}</p>
                {portfolio.manager && (
                  <p className="cs-meta mt-4 text-meta">Portfolio manager: {portfolio.manager}</p>
                )}
                {portfolio.body && (
                  <div className="mt-6 max-w-[65ch] space-y-4 text-base leading-relaxed text-body">
                    {portfolio.body.split("\n\n").map((para, j) => (
                      <p key={j}>{para}</p>
                    ))}
                  </div>
                )}
                {portfolio.tech.length > 0 && (
                  <p className="cs-meta mt-6 text-meta">
                    <span className="sr-only">Focus areas: </span>
                    {portfolio.tech.join(" | ")}
                  </p>
                )}
              </div>
            </article>
          ))}
        </Wrap>
      </section>
    </>
  );
}
