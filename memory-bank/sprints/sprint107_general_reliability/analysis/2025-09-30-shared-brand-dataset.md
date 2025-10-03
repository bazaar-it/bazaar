# 2025-09-30 – Shared brand dataset audit

## Production reality
- The production database has **no** `bazaar-vid_brand_%` tables yet; the Sprint 99.5 migration never shipped. All we have is `bazaar-vid_personalization_target` (1 row) with a `(project_id, website_url)` unique index, so every extraction today is effectively private to the originating project.
- Because the shared tables are missing, prod has no canonical cache for repeated domains. Any workspace that wants brand data must rerun the full extraction pipeline.

## Dev schema findings
- `bazaar-vid_brand_extraction` exists in dev with 29 columns. `project_id` is nullable but `user_id` is **required** and indexed, so every row is scoped to the requesting account. Only 3 rows exist and they all belong to one user.
- `bazaar-vid_brand_profile` requires `project_id` and has no uniqueness on `website_url`. We store four separate rows for `https://ramp.com` (each with a different project) and even treat uploaded screenshots as `website_url` values when users paste R2 URLs.
- `bazaar-vid_personalization_target` mirrors prod: uniqueness is `(project_id, website_url)`, so the same domain appears multiple times (e.g. `https://cluely.com/` appears in three projects).
- `bazaar-vid_extraction_cache` is empty and only enforces uniqueness on `cache_key`, leaving `url_hash` as a plain index (no dedupe guarantee).

## Fallouts
- We cannot build a compound dataset because every table either demands `project_id` or `user_id`.
- Normalising URLs is missing: trailing slashes, protocol variants, and raw asset URLs all count as distinct entries, so cache hit rates stay near zero.
- There is no lifecycle tracking (last_used, extraction quality, screenshot coverage) which makes it hard to know when a cached brand is stale or safe to reuse.
- Prod/dev drift means any work that targets the new tables will instantly break in production until we reconcile schemas.

## Proposed direction
1. **Canonical brand repository**: introduce `brand_repository` (or repurpose `bazaar-vid_brand_profile`) with a required `normalized_url` (domain + path policy), optional `last_extracted_by`, `latest_extraction_id`, aggregate screenshots, palette, copy, and `usage_count`. Enforce a unique index on `normalized_url`.
2. **Project linkage**: move `project_id` into a join table (`project_brand_profile`), so projects reference the shared brand row without duplicating data.
3. **Extraction cache**: ensure `url_hash` (or `normalized_url`) is unique and reusable across users. Store the raw scrape artefacts (HTML, screenshots, color swatch) plus a TTL so we can reuse within a freshness window.
4. **Normalizer + gating**: add a preprocessing step that trims protocols, removes trailing slashes, collapses `www.` and filters obvious asset URLs before we query the repository.
5. **Backfill plan**: deduplicate existing dev rows by domain (keep the freshest entry, migrate others into linkage table) and create a migration batch for prod that creates the tables + seeds from curated targets.

## Open questions
- How do we expose confidence/quality so we can prefer human-reviewed brands when multiple extracts exist?
- Do we store multiple brand variants per domain (e.g. light/dark) and if so how do we key them?
- What retention policy should `screenshot` assets follow once we have a shared cache?
