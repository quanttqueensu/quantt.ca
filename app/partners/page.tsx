import type { Metadata } from "next";
import PartnerCard from "@/components/PartnerCard";
import { Button, PageIntro, Split, Wrap } from "@/components/ui";
import { getPartners, getSiteConfig } from "@/lib/content";

export const metadata: Metadata = {
  alternates: { canonical: "/partners" },
  title: "Partners — QUANTT",
  description:
    "QUANTT partners with leading financial institutions to provide real-world quantitative finance experience.",
};

export default function PartnersPage() {
  const partners = getPartners();
  const { media } = getSiteConfig();

  return (
    <>
      <PageIntro
        title="Partners"
        lede={
          <p>
            Firms that partner with QUANTT work with students who research, build, and trade
            quantitative strategies.
          </p>
        }
        cta={
          <Button href="mailto:quantt@clubs.queensu.ca" variant="accent">
            Become a Partner
          </Button>
        }
        photo={{
          src: media?.partners,
          alt: "QUANTT members gathered in a campus atrium",
          position: "object-[center_40%]",
        }}
      />

      <section aria-labelledby="current-title" className="cs-section">
        <Wrap>
          <h2 id="current-title" className="cs-h2 cs-h2--md cs-reveal mb-12">
            Current Partners
          </h2>
          <ul className="cs-logos cs-reveal">
            {partners.current.map((p) => (
              <PartnerCard key={p.name} partner={p} />
            ))}
          </ul>
        </Wrap>
      </section>

      <section className="cs-band cs-band--flat on-blue" aria-labelledby="partner-cta">
        <Wrap>
          <Split
            onBlue
            title={<span id="partner-cta">Partner with QUANTT for 2026–2027</span>}
            lede={<p>Contact the executive team to discuss a partnership.</p>}
            cta={
              <Button href="mailto:quantt@clubs.queensu.ca" variant="accent" className="mt-8">
                Email the Team
              </Button>
            }
          />
        </Wrap>
      </section>

      {partners.past.length > 0 && (
        <section aria-labelledby="past-title" className="cs-section">
          <Wrap>
            <h2 id="past-title" className="cs-h2 cs-h2--md cs-reveal mb-12">
              Past Partners
            </h2>
            <ul className="cs-logos cs-reveal">
              {partners.past.map((p) => (
                <PartnerCard key={p.name} partner={p} past />
              ))}
            </ul>
          </Wrap>
        </section>
      )}
    </>
  );
}
