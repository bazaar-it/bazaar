# Metrics & Analytics — Community

## Raw Events (source of truth)
- Table: `community_events`
- Types: `view`, `favorite`, `unfavorite`, `use`, `mix`, `prompt`, `click`
- Context: `source` (in_app_panel | community_site), `projectId`, `sceneCount`, `referrer`, `userAgent`
- Emission points:
  - View: card impression or detail open (debounced, server‑side guard)
  - Favorite/Unfavorite: on mutation success
  - Use: on successful import

## Aggregates
- Table: `community_metrics_daily` (templateId, day, eventType, count)
- Job: nightly rollup + optional near‑real‑time upserts
- Display: cached counters on cards; tooltip shows 7/30d trends
- Template cached counters (viewsCount, favoritesCount, usesCount) are updated on write paths and can be reconciled from events.

## Dashboards (MVP)
- Admin: Top templates by uses (7/30d), conversion funnel (views → uses)
- Owner: My templates performance summary

## Privacy & Safety
- Do not store PII in events; `userId` is enough for dedupe
- Rate limit event writes per IP/user
- Bot filtering via userAgent heuristics
