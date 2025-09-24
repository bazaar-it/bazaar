# Sprint 130 TODO

## Theme Infrastructure
- [ ] Finalize `BrandTheme` TypeScript contract + provider implementation.
- [ ] Audit master demo scenes; replace hard-coded colors/fonts/logos with theme tokens.
- [ ] Add lint rule / test guarding against literal brand styles.

## Variant Generation
- [ ] Design `project_variants` schema + migrations.
- [ ] Implement `BulkBrandRenderer` service + tRPC mutation.
- [ ] Update render service to accept `brandTheme` props, serialize into exports.
- [ ] Tag exports with variant metadata; ensure download links stored per variant.

## Orchestration UX
- [ ] Draft “Personalize for Clients” panel wireframes.
- [ ] CSV/JSON ingestion pipeline (validation, dedupe, manual overrides).
- [ ] Choose orchestrator (n8n vs worker) and implement batch queueing.
- [ ] Build progress dashboard (status, failures, download zip).

## Reliability & QA
- [ ] Dataset of 5–10 brand fixtures for regression renders.
- [ ] Snapshot/eval harness comparing theme outputs.
- [ ] Fallback handling when brand extraction misses assets.
- [ ] Logging & observability for variant pipeline (metrics, audit trail).
