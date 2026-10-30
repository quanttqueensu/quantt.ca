import type { Metadata } from "next";
import Link from "next/link";
import AchievementsList, { type WinRow } from "@/components/AchievementsList";
import { PageIntro, Wrap } from "@/components/ui";
import { getAchievements, getTeamYears } from "@/lib/content";

export const metadata: Metadata = {
  title: "Achievements — QUANTT",
  description: "Competition wins and placings by QUANTT members.",
};

export default function AchievementsPage() {
  // Member name → LinkedIn, from the newest team year that lists them.
  const linkedin = new Map<string, string>();
  for (const year of getTeamYears()) {
    for (const m of year.members) {
      if (m.linkedin && !linkedin.has(m.name)) linkedin.set(m.name, m.linkedin);
    }
  }

  const rows: WinRow[] = getAchievements().map((a, i) => ({
    id: String(i),
    year: a.year,
    result: a.result,
    competition: a.competition,
    url: a.url,
    team: (a.members ?? []).map((name) => ({ name, linkedin: linkedin.get(name) })),
    summary: a.summary,
    media: a.media ?? [],
  }));

  return (
    <>
      <PageIntro
        title="Achievements"
        lede={<p>Competitions QUANTT members have won or placed in.</p>}
      />

      <div className="cs-section">
        <Wrap>
          {rows.length === 0 ? (
            <section className="cs-panel cs-reveal" aria-labelledby="wins-title">
              <div className="cs-panel__intro">
                <h2 id="wins-title" className="cs-h2 cs-h2--md">
                  Coming Soon
                </h2>
                <p>
                  See the <Link href="/competition">research papers</Link> from past project teams.
                </p>
              </div>
            </section>
          ) : (
            <AchievementsList rows={rows} />
          )}
        </Wrap>
      </div>
    </>
  );
}
