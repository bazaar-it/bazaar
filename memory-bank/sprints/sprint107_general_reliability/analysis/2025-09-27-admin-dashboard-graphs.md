# Admin Dashboard Graph Conversion (2025-09-27)

## Context
- Current admin landing page (`src/app/admin/page.tsx`) surfaces headline metrics as static cards.
- Product request: replace raw counts with visual trends for new users, prompts, and scenes so admins can spot momentum at a glance.
- The analytics detail view already exposes time-series data through `admin.getAnalyticsData`; we can reuse that aggregation rather than inventing a new query.

## Questions & Constraints
- `getAnalyticsData` only supports `24h`, `7d`, `30d` windows. For the dashboard "All Time" tab we currently fall back to 30d summaries—keep the same behaviour for charts.
- We must avoid hammering TRPC with redundant requests; ideally memoize per timeframe+metric combination and share across cards.
- Recharts is already bundled on `/admin/analytics`; confirm the dashboard bundle size impact is acceptable. Consider lightweight `AreaChart` sparkline style with gradients that match existing card colours.

## Proposed Approach
1. Keep metric summary cards but embed a compact area chart to visualize the selected window.
2. Fetch analytics data once per metric using the selected timeframe (default 30d). Cache results by timeframe to prevent refetch loops when toggling tabs.
3. Derive series arrays from `query.data` (`count` per label). Expose placeholders while loading to avoid layout jump.
4. Update badge & descriptive text to sit alongside chart without losing delta context.
5. Maintain accessibility: provide `aria-label` for charts and ensure text alternatives still present raw numbers.

### Growth Tab Extension (2025-09-27 follow-up)
- Add a secondary view toggle (`Overview` ↔ `Growth`) so the existing cards stay intact.
- Reuse `getAnalyticsData` results; plot the `cumulative` series for users/prompts/scenes in dedicated full-width charts.
- Keep the timeframe toggle shared—the "All" option will continue to downshift to 30d for analytics fetches.
- Prefetch dimensioned gradients per metric to keep visual language consistent with the cards.
- Surface final totals (last data point) as chart footers so admins can read the absolute counts without hovering.

## Validation Plan
- Verify counts shown in cards still match backend summary numbers for each timeframe.
- Toggle across `All Time`, `Last 30 Days`, `Last 7 Days`, `Last 24 Hours` and confirm charts update accordingly.
- Test low-activity states (e.g. prompts=0) to ensure charts render empty axes gracefully.

## Follow-ups
- Consider consolidating analytics fetching logic into a shared hook if more surfaces need charts.
- Investigate batching `getAnalyticsData` on the backend to reduce round-trips when we inevitably add more metrics.
