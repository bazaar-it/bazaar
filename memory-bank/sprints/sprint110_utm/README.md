# Sprint 110: UTM Attribution – Source Tracking Foundation

## Goal
Give Bazaar.it reliable first-touch (and optional last-touch) attribution for every signed-in user so growth, ads, and partnership spend can be tied directly to product engagement and revenue outcomes.

## Why
- Marketing is scaling across Product Hunt, Toolify, HN, ads, and partnerships; we need to know which sources produce activated and paying users.
- Current user table has zero acquisition metadata, blocking channel ROI analysis and power-user cohort tracking.
- Attribution data unlocks SQL- and dashboard-level insights without depending on third-party analytics retention policies.

## Scope
- Capture UTM parameters, landing page, and referrer on first visit and persist in a signed cookie/local storage bundle.
- Extend auth/signup flow to read that bundle exactly once and write canonical attribution rows to Postgres.
- Introduce Drizzle schema for `user_attribution` (first-touch + optional last-touch fields) with guardrails against spoofing.
- Provide baseline SQL/reporting templates so marketing can measure sign-ups, activation, retention, and revenue by source.
- Add guardrails, tests, and monitoring to ensure attribution survives SSR, OAuth redirects, and cookie expiry scenarios.

## Non-Goals
- Full-blown multi-touch attribution modeling or incremental lift studies.
- Real-time dashboard shipping (tracked separately under analytics roadmap).
- Ingesting historic data from existing analytics tools (documented as follow-up work).

## Success Criteria
- 95%+ of new sign-ups have non-null first-touch source metadata within 48h of launch.
- Marketing can run SQL queries grouping by `first_touch_source` to compare activation/exports/purchases.
- Attribution cookie stores only the first touch and is cryptographically protected to prevent tampering.
- OAuth and passwordless flows both capture attribution reliably across redirects.

## Metrics & Reporting Targets
- Daily funnel: sign-ups by `first_touch_source` vs. previous week.
- Power-user tracking: projects created, exports requested, purchases made per source.
- Data quality audit: unmatched/`unknown` share stays <5% per week after launch.

## Dependencies
- NextAuth callbacks for `signIn` and user creation hooks.
- Drizzle migration tooling and Neon schema reviews.
- Frontend utilities for cookie parsing + SSR-safe hydration.
- Coordination with Sprint 116 image work (no conflicts expected, but shared auth code touches need review).

## Rollout Plan
1. Ship instrumentation and schema behind feature flag shipping to staging/dev first.
2. Verify sample users sign up via mocked UTM links; run SQL sanity checks.
3. Enable in production; monitor `unknown` rates and error logs.
4. Document operational playbook in analytics folder for marketing handoff.
