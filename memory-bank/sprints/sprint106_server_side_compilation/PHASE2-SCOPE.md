# Phase 2 — Standardized Artifacts & Metrics (Scope)

## Objectives
- Version the compiled scene artifact and capture light compile/execute metrics.
- Keep Phase 1 behavior stable; add changes behind flags with zero user impact.

## Deliverables
- Schema additions (dev first): `compilation_version` (INT, default 1), `compile_meta` (JSONB, nullable).
- Parameterized Function execution path (flagged) accepting `(Remotion, Extras)`.
- Background backfill script to set `compilation_version=1` and populate basic `compile_meta`.
- Verification SQL and a minimal ops checklist for rollout and rollback.

## Non‑Goals
- Removing client fallback entirely.
- Changing scene authoring patterns.
- Complex metrics ingestion or external dashboards.

## Technical Approach
- Compilation: unchanged (Sucrase). Record timings into `compile_meta.timings.ms` and tool info `compile_meta.tool`.
- Execution: add V2 Function signature behind `SCENE_EXECUTION_MODEL=v2` env/flag.
  - V1: `new Function(js)()` → expects global `window.Remotion` destructure.
  - V2: `new Function('Remotion','Extras', jsWrapped)(Remotion, Extras)` → no global dependency.
- Data: set `compilation_version=1` on all compiled scenes during create/edit; backfill older rows.

## Acceptance Criteria
- See `PHASE2-ACCEPTANCE-CRITERIA.md`.

## Risks & Mitigations
- Migration mistakes → Only ADD COLUMN in dev initially; follow migration runbook for prod.
- Divergent execution paths → Keep V1 as default; bake quick toggle.
- Data growth → Monitor size via SQL; acceptable for near‑term.

## Milestones (Docs‑First)
- M1: Schema docs + flags defined (today)
- M2: Backfill script design + dry‑run plan
- M3: Execution V2 stub + guardrails
- M4: Dev rollout checklist + verification

## Dependencies
- None external. Align with export path maintainers for V2 toggle test.

## Open Questions
- Do we want `compile_meta.hash` for change detection? (nice‑to‑have)
- Should we store `model`/`prompt` refs for provenance? (future)

