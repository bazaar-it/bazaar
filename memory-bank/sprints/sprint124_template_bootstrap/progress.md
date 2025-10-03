# Sprint 124 Progress Log

## 2025-09-29 – Sprint kickoff
- Created sprint scaffold (`README.md`, `TODO.md`, `progress.md`).
- Captured template-first onboarding strategy, brand extraction plan, and orchestration considerations in `2025-09-29-template-onboarding-strategy.md` for Amy (LLM) hand-off.

2025-09-28 – Incremental template loading
- Added server-side cursor + search to templates.getAll and switched TemplatesPanelG to paged infinite query so desktop only compiles 10 templates at a time, loading more as users scroll.

## 2025-09-29 – Multi-scene infra planning
- Documented admin-only multi-scene template infrastructure requirements (creation, storage, browsing, application) and identified API/frontend updates plus 4-scene seed plan.


- Documented template prefetch/caching plan in `analysis/2025-09-28-template-panel-prefetch.md` (session cache + background warm of first page).- Added template-cache util + hooked TemplatesPanelG to reuse compiled modules via memory + localStorage hashes; first page stays instant while scroll loads reuse compiled code.

## 2025-09-29 – Multi-scene template implementation
- Added database support for multi-scene templates (`template_scene` table + admin-only flags), expanded template tRPC APIs, and upgraded desktop/mobile UI to add/browse multi-scene bundles.
- Seeded OrbitFlow four-scene admin demo via `npm run seed:multi-template` for QA.

## 2025-09-29 – Admin gating & schema fallbacks
- Confirmed dev DB includes `bazaar-vid_personalization_target`/`bazaar-vid_template_scene`; prod still missing personalization targets and GitHub connection columns (no `token_type`, `selected_repos`, etc.).
- Hid the PreviewPanel brand theme toolbar and personalization list query behind admin checks; default theme now applies on mount even when personalization is disabled.
- Locked `/projects/[id]/personalize` to admins so the server no longer queries personalization tables for standard users.
- Added GitHub connection fallback that retries with the legacy schema when new columns are absent, logging a warning instead of throwing.
- Guarded `personalizationTargets.list` against missing tables (return empty + warn) and surfaced a PRECONDITION_FAILED error if createFromUrl runs before migrations.
- Enabled admin-only deletion of multi-scene templates from both desktop and mobile panels with a destructive button + confirmation, wired to the existing soft-delete API and auto-refreshing the cache.
- Wrapped brandProfile.getByProject in table-missing guard so /personalize loads even when bazaar-vid_brand_profile hasn’t been migrated locally.
