# Sprint 124 TODO

## Immediate
- [x] Review current template creation + application pipeline to confirm single-scene assumptions and identify reuse points.
- [x] Design database migrations (`template_scenes` table + `adminOnly/sceneCount/totalDuration` columns on `templates`).
- [x] Update API surface plan (`templates.create/getAll/getWithScenes`, `generation.addTemplate`) to support multi-scene cloning.
- [x] Draft UI changes for admin-only multi-scene creation modal and template panel (badges, filters, gating).
- [x] Define content + assets for the 4-scene admin-only seed template.

## Parallel Planning (Brand Personalization)
- [ ] Define the `BrandProfile` schema covering visuals, copy, tone, and assets from URL/uploads.
- [ ] Outline data extraction steps for URL ingestion (screenshots, CSS, copy, tone) and asset uploads (OCR, palette detection).
- [ ] Draft LLM prompt frameworks for scene planner and per-scene edit executor.
- [ ] Decide on orchestration pattern (sequential vs planner + parallel) after comparing failure modes.

## Later
- [ ] Design guardrail checks (diff validator, story coherence, asset integrity).
- [ ] Specify telemetry events for template selection, edit success, and user completion.
- [ ] Prepare evaluation plan to measure first-prompt satisfaction and churn impact.
