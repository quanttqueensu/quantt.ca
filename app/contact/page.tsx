import type { Metadata } from "next";
import { Button, List, PageIntro, Split, Wrap } from "@/components/ui";
import { getSiteConfig, isRecruitingOpen } from "@/lib/content";

export const metadata: Metadata = {
  alternates: { canonical: "/contact" },
  title: "Contact — QUANTT",
  description: "Get in touch with the QUANTT team at Queen's University.",
};

const channels = [
  { href: "https://www.instagram.com/quanttqueens", title: "Instagram", note: "Recruiting and event announcements" },
  { href: "https://www.linkedin.com/company/quanttqueens/", title: "LinkedIn", note: "Announcements and partner updates" },
  { href: "https://www.facebook.com/QUANTTpage", title: "Facebook", note: "Updates" },
  { href: "https://linktr.ee/quantt", title: "Linktree", note: "Every link in one place" },
];

export default function ContactPage() {
  const config = getSiteConfig();
  const recruiting = isRecruitingOpen(config);

  return (
    <>
      <PageIntro
        title="Contact"
        lede={<p>For partnership, recruiting, or general inquiries, email the executive team.</p>}
        cta={<Button href="mailto:quantt@clubs.queensu.ca">Email quantt@clubs.queensu.ca</Button>}
      />

      {recruiting && (
        <section className="cs-band cs-band--flat on-blue" aria-label="Recruiting">
          <Wrap>
            <Split
              onBlue
              title="Applications Open"
              lede={config.recruitingDetails && <p>{config.recruitingDetails}</p>}
              cta={
                config.recruitingUrl && (
                  <Button href={config.recruitingUrl} variant="accent" className="mt-8">
                    Explore the Portfolios
                  </Button>
                )
              }
            />
          </Wrap>
        </section>
      )}

      <div className="cs-section">
        <Wrap>
          <section className="cs-panel cs-reveal" aria-labelledby="follow-title">
            <div className="cs-panel__intro">
              <h2 id="follow-title" className="cs-h2 cs-h2--md">
                Follow QUANTT
              </h2>
              <p>Announcements go out on these channels first.</p>
            </div>
            <List
              items={channels.map((c) => ({
                href: c.href,
                external: true,
                title: c.title,
                byline: [c.note],
                label: `${c.title}: ${c.note} (opens in new tab)`,
              }))}
            />
          </section>
        </Wrap>
      </div>
    </>
  );
}
