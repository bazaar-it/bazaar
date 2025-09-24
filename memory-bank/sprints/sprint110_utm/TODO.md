# Sprint 110 - TODO

## Attribution Capture (Client)
- [ ] Build `useAttributionCapture` hook that reads `utm_*`, `gclid`, `fbclid`, `referrer`, and landing path on first page load.
- [ ] Persist first-touch bundle to signed cookie `bazaar_attribution` (7-day expiry) and localStorage backup for SPA transitions.
- [ ] Add SSR-safe helper to expose attribution bundle via `AppRouter` layout so signup page can prefetch it.

## Auth & API Integration
- [ ] Extend NextAuth `signIn`/`createUser` callback to pull attribution cookie and write DB row only if absent.
- [ ] Harden against tampering by verifying cookie signature (HMAC with app secret) before trusting payload.
- [ ] Support both OAuth redirects and email links by replaying cookie after callback.

## Database & Types
- [ ] Add `user_attribution` table via Drizzle migration (first/last touch fields, timestamps, indexes on `first_touch_source`).
- [ ] Expose TypeScript types + helper repository methods `createUserAttribution`, `updateLastTouch`.
- [ ] Backfill existing users with `unknown` records and flag OAuth provider for segmentation.

## Reporting & Tooling
- [ ] Ship SQL snippets (admin analytics folder) for sign-ups by channel, activation by channel, and revenue by channel.
- [ ] Add admin analytics stub tRPC route `admin.getAttributionSummary` returning basic counts.
- [ ] Document marketing playbook on building Looker/Preset chart off new table.

## QA & Monitoring
- [ ] Integration test covering email magic link + OAuth Google flows retaining attribution metadata.
- [ ] Add logging when attribution cookie missing/invalid during signup to monitor quality.
- [ ] Set up weekly db check (cron/notebook) to compute `% unknown` and alert if >5%.

## Launch Checklist
- [ ] Verify staging + production cookies marked `SameSite=Lax`, secure in https.
- [ ] Communicate rollout + new SQL to marketing/sales.
- [ ] Schedule 30-day retro to evaluate ROI and consider multi-touch/paid ads enhancements.
