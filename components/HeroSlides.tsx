"use client";

import { useEffect, useRef, useState } from "react";

type Slide = { src: string; position?: string };

declare global {
  interface Window {
    __heroStart?: number;
  }
}

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
 * It opens on the photo chosen in admin, or on a random one. A random opening is picked by a tiny inline script
 * as the page loads, so the first photo shows straight away (no blank hero while JavaScript starts); without
 * JavaScript the first photo in the list shows. Each next photo loads one step ahead of being shown.
 * Holds still for reduced motion and while the tab is hidden.
 */
export default function HeroSlides({
  photos,
  start = "random",
  interval = 6000,
}: {
  photos: Slide[];
  start?: number | "random";
  interval?: number;
}) {
  const random = start === "random" && photos.length > 1;
  // On the server a random opening isn't known yet: the opening <img> is rendered without a src and the inline
  // script below fills it in. In the browser, the script has already chosen, so the state starts there.
  const [first] = useState(() =>
    random ? (typeof window === "undefined" ? 0 : (window.__heroStart ?? 0)) : typeof start === "number" ? start : 0
  );
  const [active, setActive] = useState(first);
  // Photos in the page so far: the current one and the one after it (loading in the background).
  const [mounted, setMounted] = useState<number[]>([first]);
  const [running, setRunning] = useState(false);
  const firstImg = useRef<HTMLImageElement>(null);
  const queue = useRef<number[]>([]);
  const next = useRef(first);

  const take = (current: number) => {
    if (!queue.current.length) queue.current = shuffled(photos.length, current);
    return queue.current.shift() ?? 0;
  };

  // Start once the first photo is ready (it may finish before hydration, so don't rely on onLoad alone).
  useEffect(() => {
    const img = firstImg.current;
    if (!img || photos.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let live = true;
    const begin = () => {
      if (!live) return;
      next.current = take(first);
      setMounted((m) => [...new Set([...m, next.current])]);
      setRunning(true);
    };
    if (img.complete && img.naturalWidth) Promise.resolve().then(begin);
    else img.addEventListener("load", begin, { once: true });
    return () => {
      live = false;
      img.removeEventListener("load", begin);
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

  const serverRandom = random && typeof window === "undefined";
  const pick = `(function(){var p=${JSON.stringify(photos).replace(/</g, "\\u003c")},k=Math.floor(Math.random()*p.length),i=document.getElementById("hero-first");window.__heroStart=k;if(i){i.src=p[k].src;i.style.objectPosition=p[k].position||"";}})();`;

  return (
    <div className="cs-hero__media cs-hero__slides" aria-hidden="true">
      {photos.map(({ src, position }, i) =>
        mounted.includes(i) ? (
          // eslint-disable-next-line @next/next/no-img-element -- static export, images served as-is
          <img
            key={i === first ? "first" : src}
            id={i === first ? "hero-first" : undefined}
            ref={i === first ? firstImg : undefined}
            src={serverRandom && i === first ? undefined : src}
            alt=""
            decoding="async"
            fetchPriority={i === first ? "high" : "low"}
            className={i === active ? "is-active" : ""}
            style={position ? { objectPosition: position } : undefined}
            suppressHydrationWarning
          />
        ) : null
      )}
      {random && <script dangerouslySetInnerHTML={{ __html: pick }} suppressHydrationWarning />}
      {random && (
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photos[0].src} alt="" className="is-active" style={photos[0].position ? { objectPosition: photos[0].position } : undefined} />
        </noscript>
      )}
    </div>
  );
}
