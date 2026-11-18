// Kept apart from content.ts (which reads files) so the browser can run it too.

/** Today's date in Toronto, "YYYY-MM-DD". End dates in content are Toronto days, wherever the build or browser runs. */
export function torontoToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Whether `until` ("YYYY-MM-DD", inclusive) hasn't passed yet in Toronto. No date means no end. */
const notPast = (until: string | undefined, now: Date) => !until || torontoToday(now) <= until;

/** Whether a win ticked "Feature on homepage" is still within its `featuredUntil` date (inclusive). */
export function isFeatureLive(a: { featured?: boolean; featuredUntil?: string }, now = new Date()): boolean {
  return !!a.featured && notPast(a.featuredUntil, now);
}

/**
 * Whether the recruiting message should render. A dated message expires at the end of `recruitingUntil` in Toronto,
 * so a stale deadline can never linger in production.
 */
export function isRecruitingOpen(config: { recruiting?: boolean; recruitingUntil?: string }, now = new Date()): boolean {
  return !!config.recruiting && notPast(config.recruitingUntil, now);
}
