import Link from "next/link";
import Hero from "@/components/Hero";
import LatestWin from "@/components/LatestWin";
import PartnerLogos from "@/components/PartnerLogos";
import PricePaths from "@/components/PricePaths";
import ResearchList from "@/components/ResearchList";
import UpcomingEvents from "@/components/UpcomingEvents";
import { Button, ListPanel, Section, Split, Stats, Wrap } from "@/components/ui";
import { getFeaturedAchievement, getPartners, getPortfolios, getTeamYears } from "@/lib/content";

export default function Home() {
  const portfolios = getPortfolios();
  const featured = getFeaturedAchievement();
  const partners = getPartners().current;
  // "A, B, and C" instead of "A, B, C".
  const partnerList = new Intl.ListFormat("en", { type: "conjunction" }).format(partners.map((p) => p.name));

  // The most recent year that published papers.
  const paperYear = getTeamYears().find(
    (year) => Object.keys(year.config.researchPapers ?? {}).length > 0
  );
  const paperLinks = paperYear?.config.researchPapers ?? {};
  const details = paperYear?.config.researchPaperDetails ?? {};
  const winner = paperYear?.config.winner;
  // Winner first, then the rest in config order.
  const papers = Object.keys(paperLinks)
    .sort((a, b) => Number(b === winner) - Number(a === winner))
    .map((team) => ({ team, pdf: paperLinks[team], detail: details[team] }));

  return (
    <>
      <Hero />

      {featured && <LatestWin win={featured} />}

      <Wrap>
        <Stats
          strip
          items={[
            { value: portfolios.length, label: "Portfolios this year" },
            { value: papers.length, label: `Papers published in ${paperYear?.config.year ?? "our last year"}` },
            { value: partners.length, label: "Industry partners" },
          ]}
        />
      </Wrap>

      <Section>
        <Split
          title="Research and Portfolios"
          lede={
            <p>
              Members design, build, and run live quantitative strategies across equities, rates,
              credit, options, and energy, and publish the results.
            </p>
          }
          cta={<Button href="/portfolios">Explore the Portfolios</Button>}
        />
      </Section>

      {paperYear && (
        <section className="cs-research" aria-labelledby="papers-title">
          <Wrap>
            <div className="cs-research__head cs-reveal">
              <div>
                <h2 id="papers-title" className="cs-h2">
                  Published Research
                </h2>
                <p>
                  Each project team publishes a research paper on its strategy.
                  {winner && ` The ${paperYear.config.year} competition winner was ${winner}.`}
                </p>
              </div>
              <Link href="/competition" className="cs-link whitespace-nowrap">
                Explore the Papers
              </Link>
            </div>
            <ResearchList papers={papers} />
          </Wrap>
        </section>
      )}

      <Section>
        <Split
          title="Curriculum"
          lede={
            <p>
              Coverage of asset classes and strategy types, coding and problem solving, and the
              infrastructure behind a strategy, from data to automation. Grounded in math and
              probability, with Green Book problems and market-making games, and taught alongside
              portfolio work.
            </p>
          }
          cta={<Button href="/education">Explore the Curriculum</Button>}
        />
      </Section>

      <div className="cs-section">
        <ListPanel
          title={
            <>
              2026–2027
              <br />
              Portfolios
            </>
          }
          intro={<p>{portfolios.length} desks, each with its own thesis, data, and tooling.</p>}
          items={portfolios.map((p) => ({
            href: `/portfolios#${p.slug}`,
            title: p.title,
            byline: p.tech.slice(0, 2),
          }))}
        />
      </div>

      <Section label="Partners">
        <h2 className="cs-h2 cs-reveal">Our Partners</h2>
        <PartnerLogos partners={partners} />
      </Section>

      <section className="cs-band cs-band--flat cs-band--texture on-blue" aria-labelledby="partners-title">
        <PricePaths />
        <Wrap>
          <div className="cs-grid cs-split cs-reveal">
            <h2 id="partners-title" className="cs-h2 cs-h2--on-blue">
              Partnerships
            </h2>
            <div>
              <p className="cs-lede">
                QUANTT works with {partnerList}. We welcome new partners for the 2026–2027 year.
              </p>
              <Button href="/partners" variant="accent" className="mt-8">
                Explore Partnerships
              </Button>
            </div>
          </div>
        </Wrap>
      </section>

      <UpcomingEvents />
    </>
  );
}
