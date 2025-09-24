# 2025-09-24 – UTM Attribution Analysis

## Problem Statement
We run campaigns across Product Hunt, Toolify, Hacker News, paid ads, and partnerships but have no durable way to tie a signed-in user back to their acquisition source. The `bazaar-vid_user` table includes no UTM/referrer metadata, so channel ROI, power-user cohorts, and LTV per campaign are invisible. We need a first-touch attribution system that survives OAuth redirects, is resilient to spoofing, and feeds both SQL analytics and future dashboards.

## Current State
- No attribution columns or tables in production (verified via `SELECT column_name FROM information_schema.columns WHERE table_name = 'bazaar-vid_user'`).
- Frontend does not persist `utm_*`, `gclid`, or `document.referrer`.
- NextAuth callbacks only create `users` + `accounts` records, so there is no hook capturing marketing metadata.
- Analytics roadmap (Sprint 108) expects channel-level reporting but lacks source data.

## Proposed Architecture Overview
1. **Capture first touch on the client**
   - As soon as a visitor lands, read `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `gclid`, `fbclid`, raw `document.referrer`, and landing `pathname`.
   - Persist a signed JSON blob in a cookie (`bazaar_attribution`) with `SameSite=Lax`, `Secure`, `HttpOnly=false` (needs client access), and short expiry (e.g., 7 days). Mirror to `localStorage` for SPA navigations.
   - Cookie payload example:
     ```json
     {
       "firstTouch": {
         "source": "producthunt",
         "medium": "community",
         "campaign": "launch_day",
         "term": null,
         "content": null,
         "referrer": "https://www.producthunt.com/posts/bazaar",
         "landingPath": "/?utm_source=producthunt",
         "capturedAt": "2025-09-24T08:20:14.321Z",
         "userAgentHash": "5b1e..."
       },
       "signature": "HMAC_SHA256"
     }
     ```
   - Never overwrite `firstTouch`. If later visits arrive with new UTMs, store them under `lastTouch` but keep original values untouched.

2. **Verify and persist on signup/login**
   - During NextAuth `signIn` callback or a dedicated API route that finalizes signup, read and verify the cookie’s HMAC signature (`crypto.createHmac('sha256', AUTH_SECRET)`).
   - If verification passes and no attribution exists for the user, write to new `user_attribution` table. Store both first and last touch (if available at that moment).
   - Immediately clear the cookie to prevent double writes but keep a server-side record that future sessions can update `last_touch` only.

3. **Database schema**
   - Use a dedicated table to avoid mutating `users` schema and allow optional future expansion (multi-touch events, paid channel metadata).
   - Candidate schema:
     ```sql
     create table bazaar-vid_user_attribution (
       user_id varchar(255) primary key references bazaar-vid_user(id) on delete cascade,
       first_touch_source text not null,
       first_touch_medium text,
       first_touch_campaign text,
       first_touch_term text,
       first_touch_content text,
       first_touch_referrer text,
       first_touch_landing_path text,
       first_touch_at timestamptz not null,
       last_touch_source text,
       last_touch_medium text,
       last_touch_campaign text,
       last_touch_term text,
       last_touch_content text,
       last_touch_referrer text,
       last_touch_landing_path text,
       last_touch_at timestamptz,
       created_at timestamptz not null default now(),
       updated_at timestamptz not null default now()
     );
     create index bazaar_vid_user_attr_first_source_idx on bazaar-vid_user_attribution (first_touch_source);
     create index bazaar_vid_user_attr_first_campaign_idx on bazaar-vid_user_attribution (first_touch_campaign);
     ```
   - Drizzle model lives in `src/server/db/schema.ts` and is exported via `userAttribution`.

4. **Reporting & analytics**
   - Provide canned SQL for:
     ```sql
     -- Sign-ups by channel
     select first_touch_source, count(*) as users
     from bazaar-vid_user_attribution
     where created_at >= now() - interval '7 days'
     group by 1
     order by users desc;

     -- Activation proxy (project creation) by channel
     select ua.first_touch_source,
            count(distinct p.id) as projects,
            count(distinct case when e.status = 'completed' then e.id end) as exports
     from bazaar-vid_user_attribution ua
     join bazaar-vid_project p on p.user_id = ua.user_id
     left join bazaar-vid_export e on e.user_id = ua.user_id
     group by 1
     order by projects desc;
     ```
   - Feed same data into analytics dashboards once Sprint 108 hooks are ready.

## Detailed Considerations

### Capturing on the Client
- Implement as a small framework-agnostic utility invoked in `app/layout.tsx` or a dedicated provider to avoid double execution.
- Use `URLSearchParams` to parse UTMs; fallback to `document.referrer` when UTMs missing.
- Hash the user agent + landing timestamp as part of the signature payload to reduce replay risk.
- Handle SSR by checking `typeof window !== 'undefined'` and gating to client-only effect.

### Cookie Signing & Security Trade-offs
- Storing attribution in client storage is unavoidable for first touch, so we must sign the payload to prevent a malicious actor from forging `source=enterprise`.
- The signature adds minimal overhead (~88 bytes) but guarantees integrity because only the server knows `AUTH_SECRET`.
- Alternate approach (server session storage) would require a dedicated session store; the cookie approach is simpler and stateless.

### Auth Flow Integration
- NextAuth `callbacks.events.createUser` (or `callbacks.jwt` depending on config) is the safest point to persist attribution.
- For Google OAuth, ensure the attribution cookie survives the third-party redirect: `SameSite=Lax` keeps it for top-level GET requests, which covers our flow; confirm login route uses GET.
- For email magic links, the first click occurs on `/api/auth/callback/email`—the cookie must be present on this domain; ensure link domain matches app domain.
- After writing to DB, clear the cookie by setting `maxAge=0` to avoid duplicate writes for subsequent sign-ins.

### Backfill Strategy
- Create `user_attribution` rows for existing users with `first_touch_source='unknown'` and `first_touch_at=created_at` so reporting queries do not exclude them.
- Optionally use `accounts.provider` to set a coarse source (e.g., `provider='google'` → `oauth-google`) but mark as `derived=true` for honesty.

### Edge Cases & Mitigations
- **No UTMs, direct/referral traffic**: fallback to `referrer` host or label as `direct`. Document rule: empty referrer → `direct`, external host → `referral`.
- **Incognito / cookie disabled**: store `unknown` entry with reason; include metrics to monitor frequency.
- **Multiple tabs**: once `firstTouch` stored, ignore subsequent writes to prevent race conditions.
- **Invalid signature**: drop payload, log warning, write `unknown` record to keep coverage stats accurate.
- **Long consideration windows**: 7-day cookie may be too short for high-ticket customers; document trade-off and allow tweak via env var.
- **Privacy**: store minimal data (no full query string beyond UTMs) and consider redacting sensitive referrers.

### Testing Plan
- Unit test `signAttributionCookie`/`verifyAttributionCookie` utilities.
- Cypress/Playwright happy-path: visit with UTMs → sign up via passwordless → assert DB row contains matching source.
- OAuth test: simulate Google signin (staging) and ensure attribution persists.
- Regression test for returning users: first touch remains original, last touch updates on new campaigns.

### Rollout & Monitoring
- Ship feature-flagged (env `ENABLE_ATTRIBUTION=true`).
- Log metrics: when cookie missing, invalid signature, or DB write fails. Surface counts in admin analytics or logs.
- Weekly job (could be simple script run manually) to compute `% unknown` and share with marketing.

## Implementation Phases
1. **Phase 0 – Schema & Utilities**: Add Drizzle model + migration; create cookie signing helpers; backfill `unknown` rows.
2. **Phase 1 – Client Capture**: Implement hook/provider, cookie writing, signature tests.
3. **Phase 2 – Auth Persistence**: Wire NextAuth callbacks, handle redirects, log outcomes.
4. **Phase 3 – Reporting**: Ship SQL snippets, tRPC summary endpoint, documentation for marketing.
5. **Phase 4 – QA & Rollout**: Run staging end-to-end tests, monitor metrics, enable production flag.

## Trade-offs
- Cookie-based storage avoids server sessions but depends on client cooperation; tamper-proof signature mitigates risk.
- First-touch only may undercount multi-channel journeys; storing a single `last_touch` column gives basic recency insight without complicating analytics.
- Backfilling with `unknown` keeps reports truthful but may look noisy initially; marketing must filter out legacy users when evaluating campaign ROI.

## Next Questions
- Do we need to persist paid channel metadata like ad group/creative IDs now, or wait for ads team request?
- Should we expand to multi-touch events (array of touches) in future sprints? If so, consider separate `user_attribution_events` table.
- Confirm legal/privacy stance on storing referrer URLs (should we trim query strings?).
