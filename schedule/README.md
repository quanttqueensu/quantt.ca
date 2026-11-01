# QUANTT Schedule

Team availability and events for calendar.quantt.ca. One Mon–Sun week, 8 AM–10 PM in half hours, built from each member's class-schedule calendar link (Queen's timetable or Outlook `.ics`). Darker blue means more people are in class; click a slot to see who is free and who is busy.

This folder is a standalone Cloudflare Worker (`quantt-calendar`) with static assets and does not touch the main website.

## How it works
- `public/index.html` is the whole front end (no build step).
- `src/worker.js` sends `/api/*` to the handlers below and serves everything else from `public/`.
- `src/api/busy.js` fetches every member's calendar on the server, expands the recurring classes for the requested week, and returns only names and class titles per half hour. Feeds are cached at the edge for 15 minutes; the reload button in the header bypasses the cache.
- `src/api/members.js` lists, adds and removes members. Calendar links are stored in a Cloudflare KV namespace and are never sent to the browser or committed to this repo.
- Every API call needs a password (`x-schedule-key` header). The team password can view; the admin password can also add calendars (by link or by uploading an `.ics` file, stored in KV) and remove them. The sign-in screen accepts either.
- Admins can import the club's contacts export (Google Contacts CSV) from the sidebar. Members are renamed to their contact name and grouped by team: Co-Chairs, Quant Trading (the CIO, then each PM's team), Research & Dev (Quant Research under the COO, Quant Development under the CTO) and Operations & Marketing (Operations and Marketing sections, from job titles, under the CMO). Leads are listed first and underlined, and people without a calendar yet show greyed out. Admins can drag names to reorder them within a team; the order (names only) is saved in KV for everyone.
- **Events and attendance.** The Ops & Marketing login (and admin) can create, edit and delete events (title, date, start and end time, location, description) from the New event button or by clicking a time slot. Events show on the week grid and under Upcoming events for everyone. Anyone signed in picks their name once and marks themselves going; for events marked "Attendance required", missing one takes an exemption request with a reason, which Ops & Marketing or an admin approves or denies. Only those two logins see the reasons. Events and responses are stored in the D1 database `DB` (`src/events.js`, `src/api/events.js`, `attendance.js`, `review.js`).
- **Invites.** An event is for everyone unless the Invite field in the event form names teams or people (a department such as Quant Trading includes its sub-teams). Only invitees can respond, count towards attendance and get reminder emails; everyone else still sees the event, marked Not invited.
- **Announcement email.** The new event form has an optional "Email an announcement" box. Ticked, it emails the event (with an optional subject and note) to everyone invited as soon as it's saved. If the email fails, the event is still saved and the form says why.
- **Saving safely.** If two people edit the same event at once, the second save is refused with a message instead of overwriting the first. Closing the event form with unsaved changes asks first. Events and responses are kept in D1, which Cloudflare can restore to any point in the last 30 days (Time Travel).
- **Reminder emails.** Each event has its own reminders, set in the event form like Google Calendar notifications: add as many rows as you like ("Email 2 days before, to everyone" or "to non-responders"), plus an optional follow-up that emails people who haven't responded every few days. "Use these reminders for new events" saves them as the default. Nobody who is excused or said they can't come is emailed. A cron trigger runs every 15 minutes and sends whatever is due, and Ops & Marketing can send one immediately from the event. Addresses come from the contacts CSV import, are kept in KV and are never sent to the browser. Emails go out through [Resend](https://resend.com) (`src/events.js`, `src/api/reminders.js`).
- Logins: the team password views the calendar and responds to events; the Ops & Marketing password can also manage events, exemptions and reminders; the admin password can do everything, including calendars, contacts import and ordering.
- The Week button in the top bar switches between the full week and a Monday to Friday work week; each browser remembers the choice. Slot details open when you click a cell. Only names, teams and lead flags are kept, in KV; nothing else from the file is stored.

## Cloudflare Worker setup
1. Workers & Pages → Create → Import a repository → `quanttqueensu/quantt-website`, **root directory `/schedule`**, deploy command `npx wrangler deploy`. The Worker name, assets and KV binding come from `wrangler.toml`.
2. Settings → Variables and Secrets: add `SCHEDULE_PASSWORD` (team password), `OPS_PASSWORD` (Ops & Marketing: events and reminders) and `ADMIN_PASSWORD` (everything) as secrets.
3. The `SCHEDULE_KV` namespace and the `DB` D1 database have no ids in `wrangler.toml`, so `wrangler deploy` creates them in the Worker's account on the first deploy and reuses them after that. The tables are created on first use.
4. Reminder emails: create a Resend account, verify the `quantt.ca` domain there (it adds DNS records in Cloudflare), and add the API key as the secret `RESEND_API_KEY`. Optional plain-text variables: `EMAIL_FROM` (default `QUANTT <events@quantt.ca>`), `EMAIL_REPLY_TO`, and `APP_URL` (default `https://calendar.quantt.ca`). Without the key everything else works and no emails are sent. After deploying, an admin re-imports the contacts CSV once so the email addresses are stored.
5. Settings → Domains & Routes → add custom domain `calendar.quantt.ca`.
6. Once this is merged, set the production branch to `main`.

## Local development
```
npx wrangler dev
```
with a `.dev.vars` file containing `SCHEDULE_PASSWORD=...`, `OPS_PASSWORD=...` and `ADMIN_PASSWORD=...` (and `RESEND_API_KEY=...` to try emails). `npx wrangler dev --test-scheduled` lets you trigger the reminder cron at `/__scheduled`.

## Limits
- Recurring events with weekly or daily rules are expanded (including `UNTIL`, `COUNT`, `EXDATE`). Monthly and yearly rules show only their first occurrence.
- Cloudflare's free plan allows 50 outbound requests per call, so the free plan supports up to about 50 calendars.
