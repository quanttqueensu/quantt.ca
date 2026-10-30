// Kept apart from content.ts (which reads files) so the browser can run it too.

/** Whether a win ticked "Feature on homepage" is still within its `featuredUntil` date (inclusive). */
export function isFeatureLive(a: { featured?: boolean; featuredUntil?: string }, now = new Date()): boolean {
  if (!a.featured) return false;
  if (!a.featuredUntil) return true;
  return new Date(`${a.featuredUntil}T23:59:59`) >= now;
}
