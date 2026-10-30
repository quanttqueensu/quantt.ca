"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowCircle } from "./ui";
import type { Achievement } from "@/lib/content";
import { isFeatureLive } from "@/lib/featured";

/**
 * Slim "Latest win" row under the home hero. The site is a static build, so the end date
 * is checked again in the browser: the row disappears once `featuredUntil` has passed
 * even if nothing has been rebuilt since.
 */
export default function LatestWin({ win }: { win: Achievement }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (ref.current && !isFeatureLive(win)) ref.current.hidden = true;
  }, [win]);

  return (
    <section ref={ref} className="cs-latest" aria-label="Latest win">
      <div className="cs-wrap">
        <Link href="/achievements">
          <span className="cs-latest__tag">Latest win</span>
          <span className="cs-latest__place">{win.result}</span>
          <span className="cs-latest__name">
            {win.competition} {win.year}
          </span>
          {win.members?.length ? <span className="cs-latest__team">{win.members.join(", ")}</span> : null}
          <span className="cs-latest__more">
            <span className="cs-latest__more-label">All achievements</span>
            <ArrowCircle />
          </span>
        </Link>
      </div>
    </section>
  );
}
