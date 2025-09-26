# New User Influx Readiness (2025-09-26)

## Context
- Marketing is expecting ≈500 fresh signups imminently.
- Production currently has 657 users total (`SELECT COUNT(*) FROM bazaar-vid_user`).
- Daily signup average across the last 7 days is ~12 (max 108 on 2025-09-16), so 500 newcomers would be a 40x spike.

## Data Review
- Latest day-level signups (prod):
  - 2025-09-26: 18
  - 2025-09-25: 10
  - 2025-09-24: 10
  - 2025-09-23: 14
  - 2025-09-22: 14
- Projects created per day roughly tracks signups but with gaps: 147 projects on 2025-09-16 vs 108 signups, yet recent days show 8–22 signups only yielding 13–17 projects.
- 37 active users today have **zero projects** (`users_without_projects` query). 8 of the 22 signups on 2025-09-25 still have no workspace.
- `user_credits` has 658 rows (one orphan: `user_id = b0f9c12d-a3e5-4169-aa66-ee860e6977aa`, created 2025-07-15) → legacy cleanup item but not critical for the upcoming spike.

## Root Cause: Homepage Redirect Logic
- `src/app/(marketing)/page.tsx:20-34` treats any `referer` containing `'/'` as "internal navigation".
  - This condition is effectively always true for OAuth callbacks (`https://accounts.google.com/...` contains `/`), so newly signed-in users land back on the marketing homepage instead of `/projects/quick-create`.
  - Result: many new accounts never create the welcome project → explains 37 project-less users and recent gaps between signups vs projects.
- With 500 new users, the majority will stall on the marketing landing page unless they manually discover the "Start" CTA.

## Additional Observations / Risks
- `createUser` event (NextAuth) synchronously calls `sendNewUserNotification`, awaiting an HTTP POST to Resend for every signup. A Resend outage or rate-limit would slow or block the signup callback.
- Database connection pool is capped at 10 connections (`serverless Pool` in `src/server/db/index.ts`). Sudden spikes may exhaust the pool; we rely on retry logic but still risk request queueing.
- Credits bootstrap is working (no recent users without `user_credits`), but the orphan row indicates we should schedule periodic cleanup to keep referential integrity tight.

## Immediate Action Items
1. **Fix homepage redirect heuristics** so new logins always hit `/projects/quick-create` unless the referrer clearly matches our own domain (prevents silent stalls).
2. Consider moving the admin notification email into a fire-and-forget job (queue or best-effort) so a Resend blip cannot block 500 signups.
3. Optional hardening: provision/bump Neon pool size temporarily or closely monitor connection metrics during the launch.
4. Backfill welcome projects (or proactively create them on signup) for the 37 existing accounts to confirm the flow after the redirect fix.

## Next Steps
- Implement redirect fix (Sprint 107 scope) and add a regression test / manual QA plan.
- Coordinate with marketing/ops on monitoring: track `users_without_projects` metric hourly during the signup wave.
- Document signup email strategy (if Resend unavailable, log + skip) before traffic spike.

