# Sprint 110 - TODO

## Attribution Capture (Client)
- [x] Build client attribution capture component that reads `utm_*`, `gclid`, `fbclid`, `referrer`, and landing path on first page load.
- [x] Persist first-touch bundle via signed cookie `bazaar_attribution` using `/api/attribution/capture`, with localStorage fingerprint for retries.
- [ ] Evaluate whether additional SSR helper is needed beyond root layout capture (follow-up if auth pages need prefetch access).

## Auth & API Integration
- [x] Add post-login `/api/attribution/ingest` endpoint that reads signed cookie once and writes DB row.
- [x] Harden against tampering by verifying cookie signature (HMAC with app secret) before trusting payload.
- [ ] Confirm email link flows (if added later) replay attribution cookie safely.

## Database & Types
- [x] Add `user_attribution` table via Drizzle schema + SQL migration (first/last touch fields, indexes on `first_touch_source`).
- [ ] Expose helper repository methods `createUserAttribution`, `updateLastTouch` (current API routes inline logic).
- [x] Backfill existing users with `unknown` records during migration.

## Reporting & Tooling
- [ ] Ship SQL snippets (admin analytics folder) for sign-ups by channel, activation by channel, and revenue by channel.
- [ ] Add admin analytics stub tRPC route `admin.getAttributionSummary` returning basic counts.
- [ ] Document marketing playbook on building Looker/Preset chart off new table.
- [x] Surface attribution source/campaign details in existing admin users UI for immediate visibility.

## QA & Monitoring
- [ ] Integration test covering email magic link + OAuth Google flows retaining attribution metadata.
- [ ] Add logging when attribution cookie missing/invalid during signup to monitor quality.
- [ ] Set up weekly db check (cron/notebook) to compute `% unknown` and alert if >5%.

## Launch Checklist
- [ ] Verify staging + production cookies marked `SameSite=Lax`, secure in https.
- [ ] Communicate rollout + new SQL to marketing/sales.
- [ ] Schedule 30-day retro to evaluate ROI and consider multi-touch/paid ads enhancements.
