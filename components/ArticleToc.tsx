"use client";

import { useEffect, useRef, useState } from "react";
import type { Heading } from "@/lib/research";

/** Section list for the article rail; marks the section being read and keeps it in view. */
export default function ArticleToc({ headings }: { headings: Heading[] }) {
  const [active, setActive] = useState<string | null>(null);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const els = headings.map((h) => document.getElementById(h.id)).filter((e): e is HTMLElement => !!e);
    if (!els.length) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      // The current section is the last heading that has passed a line a third of the way down.
      const line = window.innerHeight / 3;
      let current: string | null = null;
      for (const el of els) if (el.getBoundingClientRect().top <= line) current = el.id;
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [headings]);

  // Keep the current item visible when the rail itself has to scroll.
  useEffect(() => {
    const rail = listRef.current?.closest(".ra-rail");
    const item = active ? listRef.current?.querySelector<HTMLElement>(`a[href="#${CSS.escape(active)}"]`) : null;
    if (!rail || !item) return;
    const r = rail.getBoundingClientRect();
    const i = item.getBoundingClientRect();
    if (i.top < r.top + 24) rail.scrollTop -= r.top + 24 - i.top;
    else if (i.bottom > r.bottom - 24) rail.scrollTop += i.bottom - (r.bottom - 24);
  }, [active]);

  return (
    <nav className="ra-toc" aria-label="Sections">
      <p>Sections</p>
      <ol ref={listRef}>
        {headings.map((h) => (
          <li key={h.id}>
            <a href={`#${h.id}`} aria-current={active === h.id ? "location" : undefined}>
              {h.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
