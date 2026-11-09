"use client";

import { useEffect, useRef, useState } from "react";

type Slide = { src: string; position?: string };

/** Fisher–Yates: every photo once, in random order. */
function shuffled(n: number, skip: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i).filter((i) => i !== skip);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * The home hero's photo: cross-fades through the gallery in random order, every photo once per round.
 * The first photo is in the static HTML; each next photo loads one step ahead of being shown.
 * Holds still for reduced motion and while the tab is hidden.
 */
export default function HeroSlides({ photos, interval = 6000 }: { photos: Slide[]; interval?: number }) {
  const [active, setActive] = useState(0);
  // Photos in the page so far: the current one and the one after it (loading in the background).
  const [mounted, setMounted] = useState<number[]>([0]);
  const [running, setRunning] = useState(false);
  const first = useRef<HTMLImageElement>(null);
  const queue = useRef<number[]>([]);
  const next = useRef(0);

  const take = (current: number) => {
    if (!queue.current.length) queue.current = shuffled(photos.length, current);
    return queue.current.shift() ?? 0;
  };

  // Start once the first photo is ready (it may finish before hydration, so don't rely on onLoad alone).
  useEffect(() => {
    const img = first.current;
    if (!img || photos.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let live = true;
    const start = () => {
      if (!live) return;
      next.current = take(0);
      setMounted((m) => [...new Set([...m, next.current])]);
      setRunning(true);
    };
    if (img.complete) Promise.resolve().then(start);
    else img.addEventListener("load", start, { once: true });
    return () => {
      live = false;
      img.removeEventListener("load", start);
    };
    // take() only reads refs and photos.length.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos.length]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      const now = next.current;
      next.current = take(now);
      setActive(now);
      setMounted((m) => [...new Set([...m, now, next.current])]);
    }, interval);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, interval]);

  return (
    <div className="cs-hero__media cs-hero__slides" aria-hidden="true">
      {photos.map(({ src, position }, i) =>
        mounted.includes(i) ? (
          // eslint-disable-next-line @next/next/no-img-element -- static export, images served as-is
          <img
            key={src}
            ref={i === 0 ? first : undefined}
            src={src}
            alt=""
            decoding="async"
            fetchPriority={i === 0 ? "high" : "low"}
            className={i === active ? "is-active" : ""}
            style={position ? { objectPosition: position } : undefined}
          />
        ) : null
      )}
    </div>
  );
}
