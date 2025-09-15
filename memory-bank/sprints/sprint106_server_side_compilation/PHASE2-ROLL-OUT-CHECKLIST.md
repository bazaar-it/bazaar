# Phase 2 — Rollout Checklist (Docs‑Only)

## Dev (Day 1)
- [ ] Add columns: `compilation_version INT DEFAULT 1`, `compile_meta JSONB NULL`.
- [ ] Implement timing capture in compile path (write to `compile_meta.timings.ms`).
- [ ] Default V1 execution; add feature flag `SCENE_EXECUTION_MODEL` (default v1).
- [ ] Run backfill script on dev; spot‑check with `VERIFICATION-QUERIES.md`.

## Staging (Day 2)
- [ ] Apply the same migration (ADD COLUMN only).
- [ ] Enable metrics capture; keep V1 execution.
- [ ] Optional: enable V2 param execution for a single test project.
- [ ] Validate preview and export on a mixed project (templates + generated).

## Production (Day 3+) — After Backup
- [ ] BACKUP DB; confirm recovery plan.
- [ ] Apply migration (ADD COLUMN only).
- [ ] Enable metrics capture; keep V1 execution.
- [ ] Monitor compile timings and error rates for 24–48h.
- [ ] Optionally A/B a tiny % on V2 execution (feature flag).

## Verification (each env)
- [ ] `js_compiled_at` present on new scenes within ms of creation.
- [ ] `compilation_version` set to 1 on new/edited scenes.
- [ ] `compile_meta.timings.ms` populated (>0ms, <100ms typical per scene compile).
- [ ] Preview and export green on a 3–4 scene project.

## Rollback
- [ ] Disable V2 flag (if enabled).
- [ ] Ignore `compilation_version`/`compile_meta` fields (additive; safe to leave).
- [ ] Client fallback path still available for old scenes if needed.

