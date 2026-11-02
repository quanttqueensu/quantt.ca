// quantt.ca/team/photos/<name-slug>: a member's headshot, read from the shared member directory
// (Worker quantt-auth, service binding AUTH, Directory.photo). Headshots are uploaded once on auth.quantt.ca.
// Anyone without one gets a plain initials circle, so the team page never shows a broken image.

export const PHOTO_PATH = /^\/team\/photos\/([a-z0-9-]{1,80})$/;

export function initials(slug) {
  const parts = slug.split("-").filter(Boolean);
  const s = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] || "?").slice(0, 2);
  return s.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

const placeholder = (slug) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="#e6ebf2"/>` +
  `<text x="40" y="40" dy=".35em" text-anchor="middle" font-family="system-ui,Arial,sans-serif" font-size="28" fill="#5b6b82">${initials(slug)}</text></svg>`;

export async function photo(slug, env) {
  const f = env.AUTH ? await env.AUTH.photo(slug).catch(() => null) : null;
  if (f?.data && /^image\/(jpeg|png|webp)$/.test(f.type)) {
    return new Response(f.data, { headers: { "content-type": f.type, "cache-control": "public, max-age=3600", "x-content-type-options": "nosniff" } });
  }
  return new Response(placeholder(slug), {
    headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=600", "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'", "x-content-type-options": "nosniff" },
  });
}
