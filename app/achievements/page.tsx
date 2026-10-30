import type { Metadata } from "next";
import Link from "next/link";
import { ArrowCircle, PageIntro, Wrap } from "@/components/ui";
import type { Achievement } from "@/lib/content";
import { getAchievements } from "@/lib/content";

export const metadata: Metadata = {
  title: "Achievements — QUANTT",
  description: "Competition wins and placings by QUANTT members.",
};

function Row({ a }: { a: Achievement }) {
  const inner = (
    <>
      <div className="cs-byline">
        <span>{a.result}</span>
        {a.members && a.members.length > 0 && <span>{a.members.join(", ")}</span>}
      </div>
      <div>
        <h3>{a.competition}</h3>
      </div>
      {a.url && <ArrowCircle />}
    </>
  );
  return (
    <li>
      {a.url ? (
        <a href={a.url} target="_blank" rel="noopener noreferrer" aria-label={`${a.competition}, ${a.result} (opens in new tab)`}>
          {inner}
        </a>
      ) : (
        <div className="cs-list__row">{inner}</div>
      )}
    </li>
  );
}

export default function AchievementsPage() {
  const achievements = getAchievements();
  const years = [...new Set(achievements.map((a) => a.year))];

  return (
    <>
      <PageIntro
        title="Achievements"
        lede={<p>Competitions QUANTT members have won or placed in.</p>}
      />

      <div className="cs-section">
        <Wrap>
          {years.length === 0 ? (
            <section className="cs-panel cs-reveal" aria-labelledby="wins-title">
              <div className="cs-panel__intro">
                <h2 id="wins-title" className="cs-h2 cs-h2--md">
                  Coming Soon
                </h2>
                <p>
                  See the{" "}
                  <Link href="/competition" className="cs-link">
                    research papers
                  </Link>{" "}
                  from past project teams.
                </p>
              </div>
            </section>
          ) : (
            <div className="flex flex-col gap-12">
              {years.map((year) => (
                <section key={year} className="cs-panel cs-reveal" aria-labelledby={`wins-${year}`}>
                  <div className="cs-panel__intro">
                    <h2 id={`wins-${year}`} className="cs-h2 cs-h2--md">
                      {year}
                    </h2>
                  </div>
                  <ul className="cs-list">
                    {achievements
                      .filter((a) => a.year === year)
                      .map((a) => (
                        <Row key={`${a.competition}-${a.result}`} a={a} />
                      ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </Wrap>
      </div>
    </>
  );
}
