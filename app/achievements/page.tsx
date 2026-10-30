import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro, Wrap } from "@/components/ui";
import type { Achievement, AchievementMedia } from "@/lib/content";
import { getAchievements, getTeamYears } from "@/lib/content";

export const metadata: Metadata = {
  title: "Achievements — QUANTT",
  description: "Competition wins and placings by QUANTT members.",
};

const newTab = { target: "_blank", rel: "noopener noreferrer" } as const;

function Photos({ items }: { items: AchievementMedia[] }) {
  return (
    <div className="cs-media">
      {items.map((m) => (
        <a key={m.url} href={encodeURI(m.url)} {...newTab} aria-label={`${m.title ?? m.caption ?? "Photo"} (opens in new tab)`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={encodeURI(m.url)} alt={m.caption ?? m.title ?? ""} loading="lazy" />
          {m.caption && <span className="cs-media__caption">{m.caption}</span>}
        </a>
      ))}
    </div>
  );
}

/** PDFs and links as cards, like LinkedIn's media. */
function Attachments({ items }: { items: AchievementMedia[] }) {
  return (
    <div className="cs-attach">
      {items.map((m) => (
        <a key={m.url} href={m.type === "pdf" ? encodeURI(m.url) : m.url} {...newTab}>
          <span className="cs-attach__kind">{m.type === "pdf" ? "PDF" : "Link"}</span>
          <span className="cs-attach__text">
            <span className="cs-attach__title">{m.title ?? m.url}</span>
            {m.caption && <span className="cs-attach__caption">{m.caption}</span>}
          </span>
        </a>
      ))}
    </div>
  );
}

function Row({ a, linkedin }: { a: Achievement; linkedin: Map<string, string> }) {
  const photos = (a.media ?? []).filter((m) => m.type === "image");
  const files = (a.media ?? []).filter((m) => m.type !== "image");
  return (
    <li>
      <div className={`cs-list__row ${photos.length > 0 ? "cs-win--media" : ""}`}>
        <div className="cs-win__text">
          <div className="cs-byline">
            <span>{a.result}</span>
            {a.members && a.members.length > 0 && (
              <span>
                {a.members.map((name, i) => {
                  const url = linkedin.get(name);
                  return (
                    <span key={name}>
                      {i > 0 && ", "}
                      {url ? (
                        <a href={url} {...newTab} aria-label={`${name} on LinkedIn (opens in new tab)`}>
                          {name}
                        </a>
                      ) : (
                        name
                      )}
                    </span>
                  );
                })}
              </span>
            )}
          </div>
          <div>
            <h3>
              {a.url ? (
                <a href={a.url} {...newTab}>
                  {a.competition}
                </a>
              ) : (
                a.competition
              )}
            </h3>
          </div>
          {a.summary && <p className="cs-win__summary">{a.summary}</p>}
          {files.length > 0 && <Attachments items={files} />}
        </div>
        {photos.length > 0 && <Photos items={photos} />}
      </div>
    </li>
  );
}

export default function AchievementsPage() {
  const achievements = getAchievements();
  const years = [...new Set(achievements.map((a) => a.year))];

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
          {years.length === 0 ? (
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
            <div className="flex flex-col gap-12">
              {years.map((year) => (
                <section key={year} className="cs-panel cs-panel--wins cs-reveal" aria-labelledby={`wins-${year}`}>
                  <div className="cs-panel__intro">
                    <h2 id={`wins-${year}`} className="cs-h2 cs-h2--md">
                      {year}
                    </h2>
                  </div>
                  <ul className="cs-list">
                    {achievements
                      .filter((a) => a.year === year)
                      .map((a) => (
                        <Row key={`${a.competition}-${a.result}`} a={a} linkedin={linkedin} />
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
