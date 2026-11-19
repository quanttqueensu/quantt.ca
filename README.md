# Quantt Website Repo

## Hosting: Cloudflare

quantt.ca is a static Next.js export (`output: "export"` in `next.config.ts`, written to `out/`) served by the Cloudflare Worker `quantt-website` (`wrangler.jsonc`).

1. Workers & Pages → Create → Import a repository → `quanttqueensu/quantt.ca`. Name `quantt-website`, build command `npm run build`, deploy command `npx wrangler deploy`, production branch `main`.
2. Settings → Domains & Routes → add `quantt.ca` and `www.quantt.ca` (remove them from Netlify first).

Every push to `main` deploys. If a push doesn't start a build, push again: "Retry build" on an old build redeploys that build's commit, not the latest `main`.

Preview locally: `npm run build && npx wrangler dev`.

## Admin editor (quantt.ca/admin)

A form editor for everything in `content/` (site settings, events, partners, achievements, team, portfolios, curriculum) and uploads to `public/images`, `public/achievements` and `public/papers`. Publishing commits to `main`, which redeploys the site. Code lives in `worker/`, the only Worker code on the site (`run_worker_first` is `/admin` and `/team/photos/*`).

- Publishing: each upload goes up on its own first (`/admin/api/blob`, one git blob per request), then one `/admin/api/commit` sends the text files and the uploads' shas and makes a single commit. If someone else changed a file since it was opened, only that file is reloaded; other staged changes stay.
- Checks: `lib/schema.js` says what the build needs from each file in `content/`. The build stops with that message on a bad file, and the editor refuses a save that would fail it (bad YAML, wrong types, deleting `config.yml`, `events.yml`, `partners.yml` or `achievements.yml`). YAML is read with the core schema, so dates stay strings.
- After publishing, the header shows the Cloudflare build: Live, Build failed, or, after 15 minutes with no answer, "Build status unknown: check Cloudflare".
- No SVG uploads (they can run scripts on this origin); existing SVGs can still be deleted. Research article HTML is sanitized (`rehype-sanitize`).

Team headshots aren't in this repo. They're uploaded once on auth.quantt.ca (the member directory), and `/team/photos/<name-slug>` (`worker/photos.js`) reads them through the `AUTH` binding; anyone without one gets an initials circle. A `photo:` path in a member's front matter overrides it. Past years show no headshots.

- Sign-in: Cloudflare Access on `quantt.ca/admin` (the same Queen's one-time PIN as the other QUANTT sites). The shared directory (Worker `quantt-auth`, service binding `AUTH`) says who it is; only members with **Website: Admin** on auth.quantt.ca can open it. Anyone else gets "No editor access".
- Setup (once):
  1. GitHub: a fine-grained token for `quanttqueensu/quantt.ca` only, with Contents read and write and Commit statuses read. Save it on the `quantt-website` Worker as the secret `GITHUB_TOKEN`. The editor shows a warning 30 days before it expires (and a clear error once it has); make a new one and replace the secret.
  2. Zero Trust → Access → Applications → Add a self-hosted app for `quantt.ca/admin` with the "QUANTT Members" policy. Add its AUD tag to `ACCESS_AUDS` on `quantt-auth`.
  3. On auth.quantt.ca, set Website to Admin for each editor.
