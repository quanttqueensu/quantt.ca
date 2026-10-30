# Quantt Website Repo

## Hosting: Cloudflare

quantt.ca is a static Next.js export (`output: "export"` in `next.config.ts`, written to `out/`) served by the Cloudflare Worker `quantt-website` (`wrangler.jsonc`).

1. Workers & Pages → Create → Import a repository → `quanttqueensu/quantt.ca`. Name `quantt-website`, build command `npm run build`, deploy command `npx wrangler deploy`, production branch `main`.
2. Settings → Domains & Routes → add `quantt.ca` and `www.quantt.ca` (remove them from Netlify first).

Every push to `main` deploys. If a push doesn't start a build, push again: "Retry build" on an old build redeploys that build's commit, not the latest `main`.

Preview locally: `npm run build && npx wrangler dev`.

## Admin editor (quantt.ca/admin)

A form editor for everything in `content/` (site settings, events, partners, achievements, team, portfolios, curriculum) and uploads to `public/images`, `public/achievements` and `public/papers`. Publishing commits to `main`, which redeploys the site. Code lives in `worker/` and is the only Worker code on the site (`run_worker_first` is `/admin` only).

- Sign-in: Cloudflare Access on `quantt.ca/admin` (the same Queen's one-time PIN as the other QUANTT sites). The shared directory (Worker `quantt-auth`, service binding `AUTH`) says who it is; only members with **Website: Admin** on auth.quantt.ca can open it. Anyone else gets "No editor access".
- Setup (once):
  1. GitHub: a fine-grained token for `quanttqueensu/quantt.ca` only, with Contents read and write and Commit statuses read. Save it on the `quantt-website` Worker as the secret `GITHUB_TOKEN`.
  2. Zero Trust → Access → Applications → Add a self-hosted app for `quantt.ca/admin` with the "QUANTT Members" policy. Add its AUD tag to `ACCESS_AUDS` on `quantt-auth`.
  3. On auth.quantt.ca, set Website to Admin for each editor.
