import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import MediaSlot from "@/components/MediaSlot";
import YearTabs from "@/components/YearTabs";
import { PageIntro, Wrap } from "@/components/ui";
import type { TeamMember, TeamYear } from "@/lib/content";
import { getSiteConfig, getTeamYears } from "@/lib/content";

export const metadata: Metadata = {
  alternates: { canonical: "/team" },
  title: "Team — QUANTT",
  description: "Meet the QUANTT leadership team and project teams, by academic year.",
};

/** A group is a split: its title on the left, hairline rows on the right. */
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="cs-row cs-grid cs-split cs-reveal">
      <h2 className="cs-row__title">{title}</h2>
      <div>{children}</div>
    </section>
  );
}

/** Role on the left, person (or placeholder) on the right, 1px rule between rows. */
function Rows({ rows }: { rows: { role: string; name?: string; note?: string; href?: string }[] }) {
  return (
    <dl className="divide-y divide-line-soft border-b border-line-soft">
      {rows.map((r, i) => (
        <div key={`${r.role}-${i}`} className="grid gap-1 py-4 sm:grid-cols-2 sm:gap-4">
          <dt className="text-base text-meta">{r.role}</dt>
          <dd className="text-lg leading-7 tracking-[-0.02em] text-ink">
            {r.href && r.name ? (
              <a href={r.href} target="_blank" rel="noopener noreferrer" className="cs-link">
                {r.name}
                <span className="sr-only"> on LinkedIn (opens in new tab)</span>
              </a>
            ) : (
              (r.name ?? <span className="text-meta">{r.note ?? "To be announced"}</span>)
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

const memberRow = (m: TeamMember, role = m.role) => ({ role, name: m.name, href: m.linkedin });

function TieredView({ year }: { year: TeamYear }) {
  const { config, members } = year;
  const tiers = (config.leadershipTiers ?? [])
    .map(({ key, label }) => ({ label, members: members.filter((m) => m.tier === key) }))
    .filter((t) => t.members.length > 0);

  return (
    <>
      {tiers.map((t) => (
        <Group key={t.label} title={t.label}>
          <Rows rows={t.members.map((m) => memberRow(m))} />
        </Group>
      ))}
      {(config.projectTeams ?? []).length > 0 && (
        <h2 className="cs-h2 cs-h2--md cs-reveal pt-16 pb-10">Project Teams</h2>
      )}
      {(config.projectTeams ?? []).map((team) => {
        const pm = members.find((m) => m.tier === "project-manager" && m.department === team);
        const gms = members.filter((m) => m.tier === "member" && m.department === team);
        return (
          <Group key={team} title={team}>
            <Rows
              rows={[
                ...(pm ? [memberRow(pm, "Project manager")] : []),
                ...gms.map((m) => memberRow(m, "Member")),
              ]}
            />
          </Group>
        );
      })}
      {(config.projectTeams ?? []).length > 0 && (
        <p className="cs-lede mt-2">
          Every project team published a paper.{" "}
          <Link href="/competition" className="cs-link">
            Read the papers
          </Link>
        </p>
      )}
    </>
  );
}

/**
 * Trading desks: each portfolio manager plus the analysts who list them as lead.
 * Analysts with a joint lead ("A & B") put both PMs on one desk.
 */
function buildDesks(pms: TeamMember[], analysts: TeamMember[]) {
  // Leads are matched on first + last name, so "Roan McReynolds" finds "Roan James McReynolds".
  const key = (name: string) => {
    const parts = name.trim().toLowerCase().split(/\s+/);
    return `${parts[0]} ${parts[parts.length - 1]}`;
  };
  const leadsOf = (m: TeamMember) =>
    (m.lead ?? "").split("&").map((n) => n.trim()).filter(Boolean).map(key);
  const placed = new Set<string>();
  const desks: { pms: TeamMember[]; analysts: TeamMember[] }[] = [];

  for (const pm of pms) {
    if (placed.has(key(pm.name))) continue;
    const coLeads = new Set([key(pm.name)]);
    for (const a of analysts) {
      const leads = leadsOf(a);
      if (leads.includes(key(pm.name))) leads.forEach((n) => coLeads.add(n));
    }
    const deskPms = pms.filter((p) => coLeads.has(key(p.name)));
    deskPms.forEach((p) => placed.add(key(p.name)));
    desks.push({
      pms: deskPms,
      analysts: analysts.filter((a) => leadsOf(a).some((n) => coLeads.has(n))),
    });
  }
  return desks;
}

function CorporateView({ year }: { year: TeamYear }) {
  const { config, members } = year;

  return (
    <>
      {(config.hierarchy ?? []).map((tier) => {
        const tierMembers = members.filter((m) => m.tier === tier.tier);

        if (tier.roles) {
          return (
            <Group key={tier.tier} title={tier.label}>
              <Rows
                rows={tier.roles.flatMap((role) => {
                  const people = members.filter((m) => m.role === role.title || m.role === role.short);
                  return people.length
                    ? people.map((m) => memberRow(m, role.title))
                    : [{ role: role.title }];
                })}
              />
            </Group>
          );
        }
        if (tier.teams) {
          // Trading analysts with a lead already appear on their desk above.
          const teams = tier.teams
            .map((team) => ({
              team,
              people: tierMembers.filter((m) => m.department === team && !m.lead),
            }))
            .filter((t) => t.people.length > 0 || !tierMembers.some((m) => m.department === t.team));
          return (
            <Fragment key={tier.tier}>
              <h2 className="cs-h2 cs-h2--md cs-reveal pt-16 pb-10">Analyst Teams</h2>
              {teams.map(({ team, people }) => (
                <Group key={team} title={team}>
                  {people.length ? (
                    <Rows rows={people.map((m) => memberRow(m, "Analyst"))} />
                  ) : (
                    <p className="cs-lede">{tier.placeholder ?? "To be announced"}.</p>
                  )}
                </Group>
              ))}
            </Fragment>
          );
        }
        if (tier.tier === "portfolio-manager" && tierMembers.length > 0) {
          const analysts = members.filter((m) => m.tier === "analyst" && m.lead);
          return (
            <Fragment key={tier.tier}>
              <h2 className="cs-h2 cs-h2--md cs-reveal pt-16 pb-10">Portfolio Teams</h2>
              {buildDesks(tierMembers, analysts).map((desk) => (
                // A joint desk lists each distinct project once.
                <Group
                  key={desk.pms.map((p) => p.name).join("+")}
                  title={[...new Set(desk.pms.map((p) => p.department ?? p.name))].join(" & ")}
                >
                  <Rows
                    rows={[
                      ...desk.pms.map((p) => memberRow(p, "Portfolio manager")),
                      ...desk.analysts.map((a) => memberRow(a, "Analyst")),
                    ]}
                  />
                </Group>
              ))}
            </Fragment>
          );
        }
        if (tierMembers.length > 0) {
          return (
            <Group key={tier.tier} title={tier.label}>
              <Rows rows={tierMembers.map((m) => memberRow(m, m.department ?? m.role))} />
            </Group>
          );
        }
        return tier.placeholder ? (
          <Group key={tier.tier} title={tier.label}>
            <p className="cs-lede">{tier.placeholder}.</p>
          </Group>
        ) : null;
      })}
    </>
  );
}

export default function TeamPage() {
  const years = getTeamYears();
  const { media } = getSiteConfig();

  const tabs = years.map((year) => ({
    year: year.config.year,
    current: year.config.current,
    content:
      year.config.structure === "corporate" ? <CorporateView year={year} /> : <TieredView year={year} />,
  }));

  return (
    <>
      <PageIntro
        title="Team"
        lede={<p>Executive team, portfolio managers, and analysts by academic year.</p>}
      >
        <MediaSlot
          src={media?.team}
          alt="QUANTT members at an industry partner's office"
          className="mt-[clamp(40px,5vw,64px)] aspect-[16/7] w-full"
          imgClassName="object-[center_65%]"
          sizes="(max-width: 1440px) 100vw, 1328px"
        />
      </PageIntro>

      <section aria-label="Team by year" className="cs-section">
        <Wrap>
          <YearTabs tabs={tabs} />
        </Wrap>
      </section>
    </>
  );
}
