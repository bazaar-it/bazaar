# Sprint 115 — Community

## Goal
Launch a community system where any user can turn one or more scenes from a project into a public, discoverable template, browse community content on a subdomain (community.bazaar.it), favorite items, and import them back into their projects — all using our existing generation pipeline.

## Scope
- Public community templates sourced from user scenes
- In‑app Community Panel (rename of Templates Panel)
- Subdomain experience at `community.bazaar.it`
- Cross‑subdomain auth (same login, shared session)
- Favorites and simple analytics (views, favorites, uses)
- Safe, additive database schema (no destructive changes)

## Non‑Goals (for this sprint)
- Monetization or revenue‑share models
- Complex curation/moderation workflows (basic visibility only)
- Per‑scene version history beyond stored snapshot
- Collection/playlist features

## Success Criteria
- Any user can select 1..n scenes and publish a community template
- Items appear in both: Community Panel (in‑app) and community site
- Favoriting works cross‑subdomain and syncs to in‑app panel
- “Use template” imports to a user project with minimal friction
- Metrics captured: views, favorites, uses (raw events + daily rollups)
- No breaking schema changes; migrations fully reversible

## Related Work
- Sprint 93 — Admin Templates: memory-bank/sprints/sprint93_admin_templates/analysis.md
  - We will generalize that pipeline to all users and shift storage from code to DB‑backed community tables.

## Documents
- data-model.md — Tables, indices, constraints, safety
- auth-subdomain.md — Shared session across subdomains
- pipeline-and-ux.md — Flows for publish/browse/import
- metrics-analytics.md — Events, aggregation, dashboards
- migration-plan.md — Safe rollout steps (dev → staging → prod)

## High‑Level Plan
1) Additive schema (community_*) + indices
2) API: create/list/favorite/use + metrics events
3) In‑app Community Panel (rename from Templates Panel)
4) Subdomain app (browse, favorite, use)
5) Cross‑subdomain auth + deep links for import
6) Metrics aggregation jobs + admin views

