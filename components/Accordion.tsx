"use client";

import { useId, useState, ReactNode } from "react";

interface AccordionItem {
  title: string;
  content: ReactNode;
}

/** Square rows under hairline rules; the chevron flips up when a row is open. */
export default function Accordion({ items }: { items: AccordionItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const id = useId();

  return (
    <ul className="border-b border-line">
      {items.map((item, i) => {
        const open = openIndex === i;
        const buttonId = `${id}-button-${i}`;
        const panelId = `${id}-panel-${i}`;
        return (
          <li key={i} className="border-t border-line">
            <h3>
              <button
                type="button"
                id={buttonId}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenIndex(open ? null : i)}
                className="group flex min-h-14 w-full items-center justify-between gap-6 py-3 text-left"
              >
                <span className="text-xl leading-7 tracking-[-0.02em] text-ink">{item.title}</span>
                <span
                  className={`cs-arrow transition-transform duration-300 ${
                    open ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M12 16.207 4.646 8.854l.708-.708L12 14.793l6.646-6.647.708.708L12 16.207Z" />
                  </svg>
                </span>
              </button>
            </h3>
            <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!open} className="pb-10">
              {item.content}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
