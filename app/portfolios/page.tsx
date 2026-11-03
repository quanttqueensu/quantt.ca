import type { Metadata } from "next";
import PortfolioList from "@/components/PortfolioList";
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
      />

      <section aria-label="Portfolios" className="cs-section">
        <Wrap>
          <PortfolioList portfolios={portfolios} />
        </Wrap>
      </section>
    </>
  );
}
