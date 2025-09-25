# Sprint 110 - Progress

## 2025-09-24
- Created sprint README, TODO, and baseline analysis plan for UTM attribution tracking.
- Defined success metrics (95%+ attribution coverage) and rollout plan with staging validation first.
- Listed edge-case coverage for OAuth redirects, cookie tamper protection, and expiry handling.
- Implemented client attribution capture + signed cookie flow (`AttributionCapture` component) and post-login ingestion (`/api/attribution/ingest`).
- Added `user_attribution` schema + manual SQL migration (`drizzle/migrations/0019_add_user_attribution.sql`) with backfill for existing users.
- Created reusable HMAC helpers for attribution cookies and wired layout components to fire capture/ingest without blocking auth.
- Surfaced attribution metadata in admin users list/detail views by extending `admin.getUserAnalytics`/`getUserDetails` to join `user_attribution` and rendering source/campaign badges.

## 2025-09-25
- Queried prod attribution + engagement data for the latest 50 sign-ups; produced Toolify referral quality audit doc with cohort-level prompt rates.
- Confirmed Toolify cohort (6 users) has 0 prompts/custom projects vs. 65% activation baseline; flagged attribution timing anomaly for follow-up.
