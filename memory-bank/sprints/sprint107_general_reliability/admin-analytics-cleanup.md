# Admin Analytics Dashboard Cleanup (2025-09-29)

## Problem
The admin analytics page (`/admin/analytics`) still renders large sections of mock data (conversion funnel, template usage, heatmap, growth randomization) despite production endpoints existing. This confuses stakeholders and undermines trust in the dashboard metrics.

## Constraints & Notes
- Keep the experience focused on truthful data; prefer omission over fabrication.
- We already expose real analytics via `admin.getAnalyticsData`, `admin.getTopTemplates`, `admin.getUserEngagementStats`, and Google Analytics endpoints (if configured).
- When real data is unavailable (e.g., GA not connected), surface a clear empty state rather than seeding filler.

## Proposed Approach
1. Remove mock helper generators (`generateMockGrowthData`, `generateConversionFunnelData`, etc.) and the warning banner.
2. Build the growth chart from real time-series data by querying `admin.getAnalyticsData` for users, projects, scenes, and prompts.
3. Hook template sections up to `admin.getTopTemplates`; if no usage is found, show an empty state.
4. Drop the conversion funnel and activity heatmap blocks for now (no reliable source yet).
5. Keep Google Analytics driven widgets, but guard them with “Connect GA” messages when the API returns empty sets—never inject mock fallbacks.
6. Ensure all remaining cards/tabs read from truthful data (`dashboardMetrics`, `engagementStats`, `admin.getTrends`, etc.).

## Verification Plan
- Load `/admin/analytics` and confirm the page no longer references mock helpers or displays the warning banner.
- Inspect the growth chart network calls: should hit only `admin.getAnalyticsData` (multiple metrics) and render real counts.
- Validate template usage table reflects `admin.getTopTemplates` results (may show empty state on fresh DB).
- Confirm build passes TypeScript (mock helpers removed).
