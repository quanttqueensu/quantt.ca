"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { isRecruitingOpen } from "@/lib/featured";

/**
 * Wraps the recruiting message. The site is a static build, so `recruitingUntil` is checked again in the browser
 * (like LatestWin): the message disappears once that day has ended in Toronto, even if nothing has been rebuilt since.
 */
export default function RecruitingCheck({ until, children }: { until?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current && !isRecruitingOpen({ recruiting: true, recruitingUntil: until })) ref.current.style.display = "none";
  }, [until]);
  return (
    <div ref={ref} style={{ display: "contents" }}>
      {children}
    </div>
  );
}
