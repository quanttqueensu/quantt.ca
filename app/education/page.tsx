import type { Metadata } from "next";
import Accordion from "@/components/Accordion";
import { Button, PageIntro, Wrap } from "@/components/ui";
import { getEducationChapters, getSiteConfig } from "@/lib/content";

export const metadata: Metadata = {
  alternates: { canonical: "/education" },
  title: "Education — QUANTT",
  description:
    "QUANTT's curriculum: markets and strategy types, coding and problem solving, strategy infrastructure from data to automation, and the math and probability underneath.",
};

function TopicList({ title, topics }: { title: string; topics: string[] }) {
  return (
    <div>
      <h4 className="text-base font-medium text-ink">{title}</h4>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-base text-body marker:text-blue">
        {topics.map((topic, i) => (
          <li key={i}>{topic}</li>
        ))}
      </ul>
    </div>
  );
}

const focusAreas = [
  {
    name: "Markets and Strategies",
    focus: "Asset classes and strategy types",
    body: "Equities, rates, credit, options, and energy, and the strategy types that trade them: momentum, relative value, volatility, and event-driven.",
  },
  {
    name: "Coding and Problem Solving",
    focus: "Python, puzzles, and games",
    body: "Python and pandas for research, Green Book problems, and market-making games.",
  },
  {
    name: "Strategy Infrastructure",
    focus: "From data to automation",
    body: "Building a strategy from the ground up: data pipelines, backtesting engines, execution through market APIs, and automation.",
  },
  {
    name: "Math and Probability",
    focus: "The quantitative foundation",
    body: "Probability, statistics, regression, time-series methods, and option pricing.",
  },
];

// Every topic for a module in one list; the curriculum has a single track.
const topicsOf = (ch: ReturnType<typeof getEducationChapters>[number]) => [
  ...(ch.topics ?? []),
  ...(ch.trading_track ?? []),
  ...(ch.development_track ?? []),
];

export default function EducationPage() {
  const chapters = getEducationChapters();
  const { media } = getSiteConfig();

  const items = chapters.map((ch) => ({
    title: `Module ${ch.chapter}. ${ch.title}`,
    content: (
      <div className="grid gap-8 md:grid-cols-2">
        {ch.body && <p className="max-w-[65ch] text-base text-body md:col-span-2">{ch.body}</p>}
        {topicsOf(ch).length ? <TopicList title="Topics" topics={topicsOf(ch)} /> : null}
      </div>
    ),
  }));

  return (
    <>
      <PageIntro
        title="Education"
        lede={
          <p>
            Coverage of asset classes and strategy types, coding and problem solving, and the
            infrastructure behind a strategy, from data to automation, taught alongside portfolio work.
          </p>
        }
        cta={
          <Button href="#modules" variant="accent">
            Explore Every Module
          </Button>
        }
        photo={{
          src: media?.education,
          alt: "Aerial view of Queen's University campus in Kingston",
          position: "object-[center_60%]",
        }}
      />

      <section aria-label="Focus areas" className="cs-section">
        <Wrap>
          {focusAreas.map((t) => (
            <div key={t.name} className="cs-row cs-grid cs-split cs-reveal">
              <div>
                <h2 className="cs-row__title">{t.name}</h2>
                <p className="cs-meta mt-2 text-meta">{t.focus}</p>
              </div>
              <p className="cs-lede">{t.body}</p>
            </div>
          ))}
        </Wrap>
      </section>

      <section id="modules" aria-labelledby="modules-title" className="cs-section scroll-mt-28">
        <Wrap>
          <h2 id="modules-title" className="cs-h2 cs-reveal mb-12">
            Modules
          </h2>
          {items.length > 0 ? (
            <Accordion items={items} />
          ) : (
            <p className="cs-lede">The module plan is published before the curriculum starts.</p>
          )}
        </Wrap>
      </section>
    </>
  );
}
