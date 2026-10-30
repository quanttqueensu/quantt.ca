import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro, Wrap } from "@/components/ui";
import type { Achievement } from "@/lib/content";
import { getAchievements, getTeamYears } from "@/lib/content";

export const metadata: Metadata = {
  title: "Achievements — QUANTT",
  description: "Competition wins and placings by QUANTT members.",
};

/** "1st place" → 1 with a superscript "st"; anything else ("Finalist") is shown as written. */
function Placing({ result }: { result: string }) {
  const m = result.match(/^(\d+)(st|nd|rd|th)\b/i);
  if (!m) return <span className="cs-win__place cs-win__place--text">{result}</span>;
  return (
    <span className="cs-win__place" aria-label={result}>
      {m[1]}
      <sup>{m[2]}</sup>
    </span>
  );
}

function Members({ names, linkedin }: { names: string[]; linkedin: Map<string, string> }) {
  return (
    <ul className="cs-win__team" aria-label="Team">
      {names.map((name) => {
        const url = linkedin.get(name);
        return (
          <li key={name}>
            {url ? (
              <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`${name} on LinkedIn (opens in new tab)`}>
                {name}
              </a>
            ) : (
              name
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Win({ a, showYear, linkedin }: { a: Achievement; showYear: boolean; linkedin: Map<string, string> }) {
  return (
    <li className={`cs-win ${showYear ? "cs-win--first" : ""}`}>
      <span className="cs-win__year" aria-hidden={!showYear}>
        {showYear ? a.year : ""}
      </span>
      <Placing result={a.result} />
      <h3 className="cs-win__name">
        {a.url ? (
          <a href={a.url} target="_blank" rel="noopener noreferrer">
            {a.competition}
          </a>
        ) : (
          a.competition
        )}
      </h3>
      {a.members && a.members.length > 0 && <Members names={a.members} linkedin={linkedin} />}
    </li>
  );
}

export default function AchievementsPage() {
  const achievements = getAchievements();

  // Member name → LinkedIn, from the newest team year that lists them.
  const linkedin = new Map<string, string>();
  for (const year of getTeamYears()) {
    for (const m of year.members) {
      if (m.linkedin && !linkedin.has(m.name)) linkedin.set(m.name, m.linkedin);
    }
  }

  return (
    <>
      <PageIntro
        title="Achievements"
        lede={<p>Competitions QUANTT members have won or placed in.</p>}
      />

      <div className="cs-section">
        <Wrap>
          {achievements.length === 0 ? (
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
            <ol className="cs-wins cs-reveal">
              {achievements.map((a, i) => (
                <Win
                  key={`${a.year}-${a.competition}-${a.result}`}
                  a={a}
                  showYear={i === 0 || achievements[i - 1].year !== a.year}
                  linkedin={linkedin}
                />
              ))}
            </ol>
          )}
        </Wrap>
      </div>
    </>
  );
}
