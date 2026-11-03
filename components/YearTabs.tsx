"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";

interface YearTab {
  year: string;
  current: boolean;
  content: ReactNode;
}

export default function YearTabs({ tabs, label = "Academic year" }: { tabs: YearTab[]; label?: string }) {
  const defaultYear = tabs.find((t) => t.current)?.year ?? tabs[0]?.year;
  const [selected, setSelected] = useState(defaultYear);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  // A tab bar with one tab is chrome with nothing to switch between.
  if (tabs.length <= 1) return <>{tabs[0]?.content ?? null}</>;

  const onKeyDown = (e: KeyboardEvent, i: number) => {
    let next: number | null = null;
    if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    if (next === null) return;
    e.preventDefault();
    setSelected(tabs[next].year);
    refs.current[tabs[next].year]?.focus();
  };

  return (
    <>
      <div
        role="tablist"
        aria-label={label}
        className="cs-tabs mb-6"
      >
        {tabs.map((tab, i) => {
          const isSelected = selected === tab.year;
          return (
            <button
              key={tab.year}
              ref={(el) => {
                refs.current[tab.year] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${tab.year}`}
              aria-selected={isSelected}
              aria-controls={`panel-${tab.year}`}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => setSelected(tab.year)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className="min-h-11"
            >
              {tab.year}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.year}
          role="tabpanel"
          id={`panel-${tab.year}`}
          aria-labelledby={`tab-${tab.year}`}
          hidden={selected !== tab.year}
        >
          {tab.content}
        </div>
      ))}
    </>
  );
}
