# Admin Analytics Plan

Status: Draft (v1)
Owner: Admin/Analytics
Date: 2025-08-09

## Objectives
Provide a single Admin Analytics surface that answers:
- What features/releases drive engagement? (Changelog analytics)
- Are exports reliable and fast? (Export funnel)
- Are users engaged and successful? (Prompts, scenes, iterations)
- Are we monetizing? (Paywall & credits funnel)
- What are we spending on LLMs and which tools/models are hot? (LLM usage & tool hotspots)
- What templates are most used? (Templates leaderboard)

## Phase 1 (Ship first)
- Top Used Template leaderboard
- Trend sparklines: Exports/day, Prompts/day, Paywall conversions/day (24h/7d/30d)
- Week-over-week comparison for Exports success rate and Paying users

## Phase 2
- Release analytics (publish cadence, views, coverage)
- Export funnel (success rate by format, durations, totals, top errors)
- Monetization funnel (viewed → click → checkout → complete)
- Engagement (iterations-to-success, edit complexity mix)
- LLM spend proxies & tool hotspots
- Asset analytics (uploads by type, reuse)

---

## Data sources & existing schema
- Changelog: `changelog_entries`
- Exports: `exports`, `export_analytics`
- Engagement: `messages`, `scenes`, `scene_iterations`
- Monetization: `paywall_events`, `paywall_analytics`, `credit_transactions`, `user_credits`
- Templates: `templates` (has `usageCount`, plus references from generated scenes if available)
- LLM usage: `api_usage_metrics`
- Assets: `project_memory` with `uploaded_asset`

---

## Endpoints (tRPC)

### 1) Top Used Template
Route: `admin.getTopTemplates({ timeframe?: '24h'|'7d'|'30d'|'all', limit?: number })`
- Returns: [{ id, name, usageCount, thumbnailUrl }]
- Source: `template_usage` aggregated by timeframe (Phase 1 implemented). Fallback to `templates.usageCount` for `all`.

### 2) Trend Sparklines
Route: `admin.getTrends({ timeframe: '24h'|'7d'|'30d', metrics: ('exports'|'prompts'|'paywall')[] })`
- exports: counts/day from `exports.createdAt`
- prompts: counts/day from `messages` (role='user')
- paywall: conversions/day from `paywall_events` (event_type='completed_purchase')
- Response: normalized time buckets with counts + cumulative if useful

### 3) Week-over-Week Comparison
Route: `admin.getWoW({ metric: 'export_success'|'paying_users', weeks: 1|2|4 })`
- export_success: success rate = completed / total from `exports`
- paying_users: distinct users with purchase events from `credit_transactions` (type='purchase')
- Response: current window vs previous window deltas (% and absolute)

### 4) Release Analytics (Phase 2)
Route: `admin.getReleaseAnalytics({ timeframe: '30d'|'90d'|'all' })`
- views per release (changelog_entries.viewCount)
- publish cadence (median days between published entries)
- coverage: % entries with videoUrl and thumbnailUrl

### 5) Export Funnel (Phase 2)
Route: `admin.getExportFunnel({ timeframe })`
- totals, success rate (completed/total), average render duration, total minutes
- by-format distribution (mp4/webm/gif)
- top error messages from `export_analytics`

### 6) Engagement (Phase 2)
Route: `admin.getEngagement({ timeframe })`
- prompts per active user (messages)
- iterations-to-success (scene_iterations)
- edit complexity mix (structural/creative/surgical)
- time-to-first-scene (first user message → first scene.createdAt)

### 7) Monetization Funnel (Phase 2)
Route: `admin.getMonetizationFunnel({ timeframe })`
- counts: viewed → clicked_package → initiated_checkout → completed (from `paywall_events`)
- conversion rate per step, drop-offs
- credits usage vs purchase trend (user_credits delta + credit_transactions)

### 8) LLM Usage & Tool Hotspots (Phase 2)
Route: `admin.getLLMUsage({ timeframe })`
- tokens by model/provider, average response time, success ratio, error rates
- top tools invoked and error hotspots (aggregate `api_usage_metrics.toolName`)

### 9) Asset Stats (Phase 2)
Route: `admin.getAssetStats({ timeframe })`
- uploads by type (image/video/audio/logo)
- reuse rate (assets used across projects)
- size buckets

---

## UI Plan (Admin → Analytics Tab)
- Filter chips: 24h/7d/30d/all
- Widgets:
  - Leaderboard: Top Templates (with tiny thumbnails)
  - Sparklines row: Exports | Prompts | Conversions (tooltips & totals)
  - WoW cards: Export success rate (Δ%) | Paying users (Δ%)
- Phase 2 sections (tabs): Release | Exports | Engagement | Monetization | LLM | Assets

Recharts: LineChart for trends; RadialBar or simple bars for distributions; small stat cards for deltas.

---

## Acceptance Criteria (Phase 1)
- [x] Admin → Analytics shows top templates (limit 10) with correct counts
- [ ] 3 sparklines render with correct time buckets and totals
- [ ] WoW comparison shows % and absolute deltas for export success and paying users
- [ ] All queries respect timeframe and are performant (indexed columns)

## Technical Notes
- Indexing: Ensure indexes on `exports.createdAt`, `messages.createdAt`, `paywall_events.createdAt` exist (already present for most). Add if missing.
- Added `template_usage` table with indexes on `(template_id)` and `(created_at)` to support timeframe-aware Top Templates.
- Time bucketing: compute on server in SQL or aggregate in TS; prefer SQL with DATE_TRUNC where possible.
- Timezones: use UTC on server, format in client.
- Caching: staleTime 1–5 min; background refetch on window focus.

## Future Enhancements
- Release page drill-down (click to jump to section on single-page changelog)
- Inline media previews of “Media URLs” in changelog detail rendering
- Export reliability deep dive (FFmpeg finalizing time share)

