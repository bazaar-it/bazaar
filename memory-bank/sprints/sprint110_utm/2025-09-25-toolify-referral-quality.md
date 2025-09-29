# Toolify Referral Quality Audit (2025-09-25)

## Context
- Trigger: spikes of new sign-ups with `Acquisition: toolify` who never send a prompt (e.g. Aaryan `aaryangaming698@gmail.com`).
- Goal: compare Toolify-referred accounts to other recent sign-ups to understand activation quality and spot fraud/bot signals.

## Data Pulls (prod)
1. **Recent 50 sign-ups** (`bazaar-vid_user` joined to `user_attribution`, `project`, `message`, `account`).
   - Columns: createdAt, first_touch_* attribution, providers, project count, prompt count, first prompt timestamp.
2. **Aggregated KPI snapshot** for those 50 users grouped by `first_touch_source` / `first_touch_medium`.
3. **Toolify-only deep dive** (all 6 users currently in prod).
4. **Signup vs first_touch_at deltas** to catch pipeline clock issues.

## Key Findings
- Toolify channel delivered exactly **6 sign-ups** so far. Every one is Google OAuth, Gmail-based, and **0 prompts / 0 custom projects** recorded. One user automatically received the welcome project (`isWelcome = true`), but no manual activity.
- Among the same 50-user window, non-Toolify sources show healthy activation: `unknown` source users have **65.9% prompt rate (27/41)** with median 1–2 minutes from signup to first prompt.
- Toolify cohort has **0% prompt rate**, **0% custom project creation**, and `first_prompt_at` is null across the board.
- First-touch metadata for Toolify users is uniform: `referrer=https://www.toolify.ai/`, `landing_path=/?utm_source=toolify`. No UTMs beyond `source/medium` were captured.
- Signup timing oddity: one Toolify user (`9b4b6736-59e7-4da4-a085-92e4c1d4632d`) shows `first_touch_at` about 9 hours *after* account creation. Others are within ~1 minute. This hints the attribution ingest may be firing on a later visit or a bot hitting the landing page repeatedly.
- Direct traffic in the same slice also shows 0 activation (3 users). Need to watch if Product Hunt link appended `?ref=producthunt` is causing similar high-bounce behavior or if it is just micro-sample noise.

## Emerging Hypotheses
- Toolify traffic could be scripted test accounts harvesting referral offers (all Gmail, gaming-style aliases) with no in-product activity.
- Alternative: Toolify listing might mislead users about the product (expecting "free instant video"), causing immediate bounce before the chat loads, so no prompt event fires.
- Attribution anomaly (negative minutes) needs validation; if first-touch ingestion can happen post-signup we might be mis-tagging some traffic.

## Suggested Next Steps
1. **Session instrumentation**: log landing + first authenticated screen events to see if Toolify visitors ever reach `/projects/...`. If not, treat as bounce.
2. **Bot detection**: compare IP / user-agent across the 6 accounts via auth logs (if available) or add capture to future sessions.
3. **Listing QA**: review Toolify listing copy/CTA to ensure expectation match; consider adding gated waitlist instead of direct Google sign-in.
4. **Attribution audit**: reproduce a Toolify referral locally to confirm `first_touch_at` ordering and ensure we don't overwrite first-touch on later visits.
5. **Monitoring**: add dashboard card for `prompt_rate` and `custom_project_rate` by source in sprint 110 analytics plan so low-quality channels surface quickly.

## Raw SQL Snippets
```sql
-- Aggregated activation for newest 50 users
WITH recent_users AS (
  SELECT u."id" AS user_id, u."createdAt" AS user_created_at,
         COALESCE(NULLIF(ua.first_touch_source, ''), 'unknown') AS source,
         COALESCE(NULLIF(ua.first_touch_medium, ''), 'unknown') AS medium
  FROM "bazaar-vid_user" u
  LEFT JOIN "bazaar-vid_user_attribution" ua ON ua.user_id = u."id"
  ORDER BY u."createdAt" DESC
  LIMIT 50
),
projects AS (
  SELECT p."userId" AS user_id, COUNT(*) AS project_count
  FROM "bazaar-vid_project" p
  GROUP BY p."userId"
),
prompts AS (
  SELECT p."userId" AS user_id, COUNT(*) AS prompt_count
  FROM "bazaar-vid_message" m
  JOIN "bazaar-vid_project" p ON p."id" = m."projectId"
  WHERE m."role" = 'user' AND m."kind" = 'message'
  GROUP BY p."userId"
)
SELECT source, medium,
       COUNT(*) AS total_users,
       COUNT(*) FILTER (WHERE COALESCE(pm.prompt_count, 0) > 0) AS users_with_prompts,
       COUNT(*) FILTER (WHERE COALESCE(pm.prompt_count, 0) = 0) AS users_without_prompts
FROM recent_users ru
LEFT JOIN projects pr ON pr.user_id = ru.user_id
LEFT JOIN prompts pm ON pm.user_id = ru.user_id
GROUP BY source, medium;
```
