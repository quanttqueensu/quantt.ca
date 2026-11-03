"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

interface ResearchTab {
  id: string;
  label: string;
  /** Shorter label for phones, so all tabs fit on one line. */
  short?: string;
  content: ReactNode;
}

/** Research page tabs: one type of research at a time. A link to /competition#<id> opens that tab. */
export default function ResearchTabs({ tabs }: { tabs: ResearchTab[] }) {
  const [selected, setSelected] = useState(tabs[0]?.id);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    const open = () => {
      const hash = decodeURIComponent(window.location.hash.slice(1));
      if (!hash) return;
      const tab = tabs.find((t) => t.id === hash || hash.startsWith(`${t.id}-`));
      if (tab) setSelected(tab.id);
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, [tabs]);

  if (tabs.length <= 1) return <>{tabs[0]?.content ?? null}</>;

  const onKeyDown = (e: KeyboardEvent, i: number) => {
    let next: number | null = null;
    if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    if (next === null) return;
    e.preventDefault();
    setSelected(tabs[next].id);
    refs.current[tabs[next].id]?.focus();
  };

  return (
    <>
      <div role="tablist" aria-label="Type of research" className="cs-tabs cs-tabs--scroll mb-8">
        {tabs.map((tab, i) => {
          const isSelected = selected === tab.id;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                refs.current[tab.id] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isSelected}
              aria-controls={tab.id}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => {
                setSelected(tab.id);
                history.replaceState(null, "", `#${tab.id}`);
              }}
              onKeyDown={(e) => onKeyDown(e, i)}
              className="min-h-11"
            >
              {tab.short ? (
                <>
                  <span className="cs-tabs__long">{tab.label}</span>
                  <span className="cs-tabs__short">{tab.short}</span>
                </>
              ) : (
                tab.label
              )}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div key={tab.id} role="tabpanel" id={tab.id} aria-labelledby={`tab-${tab.id}`} hidden={selected !== tab.id}>
          {tab.content}
        </div>
      ))}
    </>
  );
}
