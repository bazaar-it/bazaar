# Admin Dashboard Metric Review (2025-09-26)

## Context
- Admin overview shows large percentage swings (e.g., +179% users for "Last 30 Days") that feel detached from the actual number of new signups.
- Goal: verify how we compute the cards and identify improvements before the 500-user campaign.

## Findings
1. **Current Data Model**
   - `getDashboardMetrics` (tRPC admin router) returns counts for four time slices: all-time, last 30/7 days, and last 24 hours, plus equivalent "previous" windows.
   - Frontend cards (`src/app/admin/page.tsx`) display the slice that matches the active toggle and compute growth = `(current - previous) / previous`.
   - Example from prod (2025-09-26 09:40 UTC):
     - Users: 294 new in the last 30 days vs 104 in the 30 days before ⇒ **+182.7%**.
     - Users last 7 days: 93 vs 194 ⇒ **-52%**.
     - Prompts last 30 days: 1 710 vs 2 650 ⇒ **-35%**.
     - Scenes last 30 days: 617 vs 971 ⇒ **-36%**.
   - Percentages are correct, but we never surface the absolute delta, so the UI reads as "growth rate" without context.

2. **Labeling Mismatch**
   - Card titles remain "Total Users / Total Prompts" even when we present period-specific counts. With the 30-day filter selected, the "Total Users" value (293) is easily misread as the all-time total.
   - We also hide the absolute base (all-time count) when the timeframe changes, so admins cannot see the current total + period delta together.

3. **Missing Growth Breakdown**
   - We calculate `lastN` and `prevN` but do not surface:
     - Absolute change (`current - previous`)
     - Share of all-time total (`current / all`)
     - Average per day within the window (useful for 7d/24h monitoring)
   - Without these, the cards give dramatic percentages that are hard to translate into operational decisions.

4. **Edge Behaviours**
   - When `previous` = 0 we force a 100% badge, even if the current value is small (e.g., 3 users). This inflates perception for young cohorts.
   - Debug logging `console.log('Users 30d Debug', …)` still ships in production, adding unnecessary noise.

## Recommendations
1. **Restructure Card Data**
   - Return a richer payload from `getDashboardMetrics`:
     ```ts
     users: {
       totalAllTime,
       currentPeriod,
       previousPeriod,
       absoluteChange,
       percentChange,
       avgPerDay
     }
     ```
     (same for prompts/scenes).
   - Keep the API backward-compatible by adding fields rather than renaming existing ones.

2. **Clarify Presentation**
   - Rename card labels when a timeframe is active (e.g., "New Users" / "Prompts this period").
   - Show both the all-time total and the period delta inside each card, e.g.:
     - `658 total • +294 last 30 days (vs 104, +190, +183%)`
   - Include average per day per window for quick pacing checks (e.g., `≈9.8/day`).

3. **Stabilize Growth Badges**
   - Replace the current 100% fallback with a clearer badge: `+294 new users` when previous = 0, and show percent only when the denominator is non-zero and >10 (configurable threshold) to avoid misleading swings.

4. **Cleanup / Instrumentation**
   - Remove leftover debug logs from the dashboard component.
   - Add unit coverage for the new aggregation helper to ensure we keep period comparisons aligned with SQL expectations.

## Next Steps
- Implement the richer metric object + frontend redesign in Sprint 107.
- Post-change QA checklist:
  1. Compare SQL spot checks with rendered numbers for each timeframe.
  2. Verify badges with low denominators fall back to absolute deltas.
  3. Confirm responsive layout still works with additional text lines.

## Open Questions
- Do we also want cumulative retention metrics (e.g., % of new users who sent ≥1 prompt)? If yes, extend the API while we are touching this area.
- Should the timeframe toggle influence the feedback list (currently always last 5 items regardless of period)?


## Implementation Follow-up (2025-09-26)
- `admin.getDashboardMetrics` now returns `timeframes.{30d,7d,24h}` summaries (current, previous, Δ, %, avg/day) alongside legacy keys.
- Admin cards read the richer payload, display totals plus period deltas, and downgrade the badge to plain `+X` when the baseline < 10.
