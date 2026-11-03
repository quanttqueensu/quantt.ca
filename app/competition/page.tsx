import type { Metadata } from "next";
import PaperShelf, { type ShelfPaper } from "@/components/PaperShelf";
import ResearchFeed from "@/components/ResearchFeed";
import ResearchTabs from "@/components/ResearchTabs";
import { getResearchArticles } from "@/lib/research";
import { PageIntro, Wrap } from "@/components/ui";
import type { TeamYear } from "@/lib/content";
import { getCompetitionPapers, getTeamYears } from "@/lib/content";

export const metadata: Metadata = {
  alternates: { canonical: "/competition" },
  title: "Research — QUANTT",
  description: "Research articles by QUANTT members, and papers from QUANTT's project teams and outside competitions.",
};

/** One year's project team papers, the competition winner first. */
function projectPapers(year: TeamYear): ShelfPaper[] {
  const teams = year.config.projectTeams ?? [];
  const papers = year.config.researchPapers ?? {};
  const details = year.config.researchPaperDetails ?? {};
  const winner = year.config.winner;
  const ordered =
    winner && teams.includes(winner) ? [winner, ...teams.filter((t) => t !== winner)] : teams;

  return ordered
    .filter((team) => papers[team])
    .map((team) => {
      const pm = year.members.find((m) => m.tier === "project-manager" && m.department === team);
      const d = details[team];
      const won = team === winner;
      return {
        key: team,
        pdf: papers[team],
        cover: d?.image,
        tag: won ? "Winner" : undefined,
        heading: team,
        note: won ? `Won QUANTT's ${year.config.year} project competition` : undefined,
        title: d?.title,
        meta: [pm && `Led by ${pm.name}`, d?.date].filter(Boolean).join(", ") || undefined,
      };
    });
}

/** Papers from members' external competitions, ticked for this page in the admin. */
function competitionPapers(): ShelfPaper[] {
  return getCompetitionPapers().map(({ achievement: a, pdf }) => ({
    key: `${a.competition}-${a.year}-${pdf.url}`,
    pdf: pdf.url,
    cover: pdf.cover,
    tag: a.result,
    heading: a.competition,
    note: `${a.result}, ${a.year}`,
    // "Research paper" says nothing the page doesn't; show only real titles.
    title: pdf.title && !/^(research )?paper$/i.test(pdf.title.trim()) ? pdf.title : undefined,
    meta: a.members?.length ? a.members.join(", ") : undefined,
  }));
}

function Shelf({ id, title, count, papers }: { id: string; title: string; count: string; papers: ShelfPaper[] }) {
  return (
    <section className="cs-shelf-group" aria-labelledby={id}>
      <div className="cs-shelf-group__head">
        <h2 id={id}>{title}</h2>
        <p>{count}</p>
      </div>
      <PaperShelf papers={papers} />
    </section>
  );
}

const count = (n: number) => `${n} ${n === 1 ? "paper" : "papers"}`;

export default function CompetitionPage() {
  const years = getTeamYears()
    .map((year) => ({ year: year.config.year, papers: projectPapers(year) }))
    .filter((y) => y.papers.length > 0);
  const external = competitionPapers();
  const articles = getResearchArticles();

  return (
    <>
      <PageIntro
        title="Research"
      />

      <div className="cs-section">
        <Wrap>
          <ResearchTabs
            tabs={[
              ...(articles.length > 0
                ? [
                    {
                      id: "articles",
                      label: "Articles",
                      content: <ResearchFeed articles={articles} />,
                    },
                  ]
                : []),
              ...(years.length > 0
                ? [
                    {
                      id: "papers",
                      label: "Project team papers",
                      short: "Project teams",
                      content: years.map((y) => (
                        <Shelf
                          key={y.year}
                          id={`papers-${y.year}`}
                          title={`${y.year} project teams`}
                          count={count(y.papers.length)}
                          papers={y.papers}
                        />
                      )),
                    },
                  ]
                : []),
              ...(external.length > 0
                ? [
                    {
                      id: "competitions",
                      label: "Competition papers",
                      short: "Competitions",
                      content: <PaperShelf papers={external} />,
                    },
                  ]
                : []),
            ]}
          />
        </Wrap>
      </div>
    </>
  );
}
