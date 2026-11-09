"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The home hero's photo: cross-fades through the gallery every few seconds.
 * The first photo is in the static HTML; each next photo loads one step ahead of being shown.
 * Holds still for reduced motion and while the tab is hidden.
 */
export default function HeroSlides({ photos, interval = 6000 }: { photos: string[]; interval?: number }) {
  const [active, setActive] = useState(0);
  const [loaded, setLoaded] = useState(false);
  // Highest index mounted so far: the photo after the current one is always loading in the background.
  const [reach, setReach] = useState(0);
  const first = useRef<HTMLImageElement>(null);

  // Start once the first photo is ready (it may finish before hydration, so don't rely on onLoad alone).
  useEffect(() => {
    const img = first.current;
    if (!img || photos.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let live = true;
    const start = () => {
      if (!live) return;
      setLoaded(true);
      setReach(1);
    };
    if (img.complete) Promise.resolve().then(start);
    else img.addEventListener("load", start, { once: true });
    return () => {
      live = false;
      img.removeEventListener("load", start);
    };
  }, [photos.length]);

  useEffect(() => {
    if (!loaded) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      setActive((i) => {
        const next = (i + 1) % photos.length;
        setReach((r) => Math.max(r, Math.min(next + 1, photos.length - 1)));
        return next;
      });
    }, interval);
    return () => window.clearInterval(id);
  }, [loaded, photos.length, interval]);

  return (
    <div className="cs-hero__media cs-hero__slides" aria-hidden="true">
      {photos.map((src, i) =>
        i <= reach ? (
          // eslint-disable-next-line @next/next/no-img-element -- static export, images served as-is
          <img
            key={src}
            ref={i === 0 ? first : undefined}
            src={src}
            alt=""
            decoding="async"
            fetchPriority={i === 0 ? "high" : "low"}
            className={i === active ? "is-active" : ""}
          />
        ) : null
      )}
    </div>
  );
}
