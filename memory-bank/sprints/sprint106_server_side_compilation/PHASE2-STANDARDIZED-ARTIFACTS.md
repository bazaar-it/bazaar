# Phase 2 — Standardized Artifacts & Metrics (Plan)

## Goal
Formalize a stable, versioned scene artifact so runtime execution is simple, observable, and forwards‑compatible.

## Scope (Non‑Destructive)
- Add metadata only; no breaking changes, no removals.
- Compile on creation/edit; store TSX + JS together (unchanged from Phase 1).
- Background backfill for older scenes.

## Proposed Schema Additions (Dev first)
- `scenes.compilation_version INTEGER NOT NULL DEFAULT 1`
- `scenes.js_compiled_at TIMESTAMPTZ` (already present)
- `scenes.compile_meta JSONB NULL` (timings, tool, sucrase version)

Notes:
- Dev migration only; test, then stage, then prod with backup per migration guidelines.
- No type changes to existing columns; only ADD COLUMN.

## Execution Model (Parameterized Function)
- Current: `new Function(jsCode)()` expects top‑level Remotion destructure in code.
- Target: `new Function('Remotion','Extras', wrappedJs)(Remotion, Extras)` so components read from parameters, not global `window`.
- Benefits: explicit dependencies, easier SSR/Lambda contexts, simpler testing.
- Plan: keep Phase 1 compatible codepath; introduce param model behind a feature flag.

## Background Backfill
- Script: `scripts/backfill-scene-js.ts`
  - Process in batches of 100; skip if `js_code` exists
  - Populate `compilation_version = 1`
  - Record `compile_meta.timings.ms` and `compile_meta.tool = 'sucrase'`

## Metrics & Observability
- Capture on compile: duration (ms), input size, output size
- Capture on preview/export: execution errors, retry count
- Dashboard: simple SQL charts first (compiles/day, failures/day)

## Rollout
1. Dev: add columns, implement metrics, run backfill on dev data
2. Staging: smoke test preview + export with Phase 1 and new flags on
3. Prod: backup, migrate (ADD COLUMN only), enable metrics first, then artifact versioning flag

## Risks & Mitigations
- Migration risk: Follow zero‑downtime process; columns are additive
- Runtime differences: Keep Phase 1 path as fallback until confidence is high
- Data size growth: JS ~2x TSX; still acceptable; monitor row/DB size

## Success Criteria
- 99%+ compile success, <10ms p50 compile (cached paths even faster)
- 0 preview/export regressions in first 48h after rollout
- Metrics available for compile duration and failure rate

