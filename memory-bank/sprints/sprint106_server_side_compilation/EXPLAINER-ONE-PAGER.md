# Sprint 106 — Server‑Side Compilation (1‑Pager)

## What Changed
- Server compiles TSX → JS at scene create/edit time and stores both.
- Wrapper no longer injects `const { ... } = window.Remotion` — scenes keep their own top‑level destructure.
- Compiler strips exports (if any) and appends `return ComponentName;` to support `new Function(js)` execution.
- Preview and export use the stored JS directly; TSX remains for code editing and diffs.

## Why It’s Safe
- Additive change: We only store JS alongside existing TSX (no destructive schema changes used for Phase 1).
- Proven in practice: Multiple scenes (templates + generated) run together without duplicate declarations.
- Deterministic output: Compiler behavior is consistent (export stripped + auto‑return) and verified via DB `js_compiled_at`.
- Reversible: Client fallback path exists (ignore `js_code` and recompile on client for legacy scenes if needed).

## Benefits
- Reliability: Eliminates “Identifier already declared” collisions across scenes.
- Speed: JS compile happens once per create/edit (ms‑level); preview loads instantly afterward.
- Simplicity: Single execution target (browser Function) and simple data flow.
- Consistency: Templates and generated scenes follow the same rules.

## Evidence (from DB and Runtime)
- All scenes have `js_compiled_at` timestamps within ms of creation.
- JS contains an auto‑added `return ComponentName;` line; TSX remains unmodified except export stripping.
- Export succeeded with mixed scenes (templates + generated) and no wrapper conflicts.

## Risks & Mitigations
- Risk: Wrapper regression re‑injects Remotion destructure.
  - Mitigation: Tests and code review; run verification SQL to confirm scenes compile; wrapper code guarded.
- Risk: Scene with malformed TSX.
  - Mitigation: Auto‑fix flow (silent) and safe fallbacks; re‑edit triggers recompile.
- Risk: Data size growth (JS ~2× TSX).
  - Mitigation: Acceptable for now; Phase 2 adds metrics to monitor.

## FAQ
- Q: Why keep top‑level `const { ... } = window.Remotion` in scenes?
  - A: It’s the simplest contract for runtime execution via Function in the browser; no import resolution needed.
- Q: Why append `return ComponentName;`?
  - A: Ensures the Function returns the component constructor without relying on ESM exports.
- Q: Does this work for export on Lambda?
  - A: Yes, we execute the same compiled JS in the export path; verified by a successful export.

## What’s Next (Phase 2 Preview)
- Add `compilation_version`, `compile_meta` (timings/tool) for observability.
- Parameterized Function execution (pass `Remotion`, `Extras` as args instead of reading from `window`).
- Background backfill for older scenes; dashboard metrics.
