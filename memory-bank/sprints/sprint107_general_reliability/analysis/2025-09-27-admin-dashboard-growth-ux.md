# Admin Dashboard Growth UX Follow-up (2025-09-27)

## Context
- The new Growth view currently reuses the 30-day analytics slice for the “All Time” toggle, which is misleading.
- Hover tooltips stay latched onto the last data point, making it hard to inspect a new point.
- Request: richer exploration controls (continuous graph with zooming) while retaining the overview cards.

## Proposed Adjustments
1. **True All-Time Window**
   - Extend `admin.getAnalyticsData` to accept an `all` timeframe that scopes from the first event to now.
   - Bucket by day for long ranges to keep data manageable (hourly buckets only for ≤30 day windows).
   - Preserve the existing return shape so current callers keep working.

2. **Zoomable Growth Charts**
   - Keep three cumulative charts (users, prompts, scenes) but add a Recharts `Brush` so admins can drag-select the time range instead of jumping between preset windows.
   - Sync the brush domain with the timeframe toggle: selecting "Last 7 Days" snaps the brush to the newest 7-day window; dragging the brush updates local state without refetching.

3. **Tooltip Responsiveness**
   - Switch to the default tooltip cursor + disable active dot locking to avoid lingering highlights after hover.
   - Add a small timestamp badge under the chart title to show the currently highlighted date when hovering.

## Validation Plan
- Compare Growth totals against the overview cards for each timeframe (24h/7d/30d/all) to confirm consistency.
- Drag the brush across a long window and ensure the displayed domain + tooltip data update immediately.
- Hover across multiple points and verify the active marker follows the pointer.

## Follow-ups
- Consider shared memoized analytics hook if we add more views to reduce duplicate fetches.
- Add integration test for the new `all` timeframe once the lint/test pipeline is back on Node ≥18.

## Implementation Notes
- `admin.getAnalyticsData` now supports a fourth `'all'` timeframe, collecting the earliest timestamp per metric and bucketing daily when the horizon is large.
- Growth charts include a Recharts `Brush` so users can drag-select arbitrary windows; the overview timeframe toggle still snaps the range by resetting brush state.
- Tooltips now use the default hover behaviour with formatting helpers, eliminating the sticky active point reported in the initial preview.
