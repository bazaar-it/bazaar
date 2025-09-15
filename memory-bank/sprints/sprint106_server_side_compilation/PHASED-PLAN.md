# Phased Plan — Strategy 5 Progressive Enhancement (Sprint 106+)

## Phase 1 — Stabilize Wrapper, No Authoring Changes (Sprint 106–107)
- Remove top-level const alias injections in PreviewPanelG (IconifyIcon/Icon).
- Keep only global, idempotent fallbacks (e.g., `if (!window.IconifyIcon) ...`).
- Ensure client slow-path normalize icons like server compiler.
- Log metrics: count slow-path compiles, precompiled usage ratio, wrapper collisions avoided.
- Document runtime contract and decision record.

## Phase 2 — Standardize Compiled Artifact (Sprint 108–110)
- Compiler ensures: no imports/exports, icon normalization, conflict auto-rename, `return Component;`.
- Introduce `compilation_version = 2` and `compiled_hash`.
- Parameterized execution harness in preview/export:
  - `new Function('React','Remotion','IconifyIcon', code)`.
  - Pass controlled globals explicitly; eliminate module-scope consts.
- Background migration: batch recompile v1 → v2 JS for existing scenes; record stats and failures.

## Phase 3 — Export Parity & Optimization (Sprint 111+)
- Export consumes the same `jsCode` v2; apply deterministic, export-only transforms (media guards, warnings).
- Optionally inline icons to SVG at export for determinism and speed.
- Deprecate client compilation path entirely once coverage is >99%.

## Metrics
- Precompiled coverage: % scenes with `jsCode` used in preview/export.
- Slow-path invocations: count and distribution; time spent.
- Collision incidents: wrapper-induced or scene-level.
- Compilation success: server compiler success, conflict auto-fixes, fallback usage.

## Rollback & Safety
- Wrapper change is additive and reversible (remove alias consts only).
- v1 scenes remain valid; fallback scene guarantees render even on failure.
- Versioned artifacts enable selective gating of new execution harness.
