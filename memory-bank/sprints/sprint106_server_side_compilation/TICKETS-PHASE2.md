# Tickets — Phase 2 (Docs‑First)

- DB: Add `compilation_version` (INT default 1) + `compile_meta` (JSONB) to scenes [dev]
  - Effort: S
  - Risk: Low (ADD COLUMN only)
- Compile Service: Record timings and tool into `compile_meta`
  - Effort: S
  - Risk: Low
- Execution V2: Implement parameterized Function path behind flag
  - Effort: M
  - Risk: Medium (ensure preview/export parity)
- Backfill Script: `scripts/backfill-scene-js.ts` to set `compilation_version=1`
  - Effort: S
  - Risk: Low (batch processing)
- Verification: Add minimal telemetry log + SQL checks for timing distribution
  - Effort: S
  - Risk: Low
- Rollout: Follow `PHASE2-ROLL-OUT-CHECKLIST.md` across envs
  - Effort: S
  - Risk: Low

