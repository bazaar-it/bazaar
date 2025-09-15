# Phase 2 — Acceptance Criteria (Docs‑Only)

## Goals
- Introduce standardized artifact versioning and light observability without breaking existing flows.

## Must‑Have Criteria
- Database: `compilation_version` (INT, default 1) and `compile_meta` (JSONB nullable) exist in dev.
- Compiler: On scene create/edit, records `compilation_version = 1` and `compile_meta.timings.ms`.
- Execution: Preview and export paths remain unchanged and green using stored JS.
- Backfill: Script exists; when run in dev, sets `compilation_version = 1` where null and leaves data intact.
- Feature Flags: Parameterized Function execution can be toggled per‑env; disabled by default.
- Docs: Runbook and testing checklist updated to include Phase 2 fields and flags.

## Nice‑to‑Have Criteria
- Basic dashboard query (SQL) for compile durations and failure counts.
- Lint rule or test ensuring wrapper does not inject Remotion destructure.

## Out of Scope (Phase 2)
- Removing client fallback entirely
- Aggressive minification or code compression
- Complex metrics pipeline

