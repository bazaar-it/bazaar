# Tickets — Sprint 106 Server-Side Compilation

## Phase 1 — Immediate Stabilization
- [ ] PreviewPanelG: Remove top-level alias consts for `IconifyIcon`/`Icon` in generated composite code.
- [ ] PreviewPanelG: Keep only `if (!window.IconifyIcon) window.IconifyIcon = (...)` fallback.
- [ ] PreviewPanelG: In slow-path TSX compilation, normalize icon usage to `window.IconifyIcon` (JSX and `React.createElement`).
- [ ] Metrics: Log precompiled vs slow-path usage; count per session and per project.
- [ ] Test: Validate PromptUI template works in new projects (desktop & portrait).
- [ ] Docs: Add Decision Record, Runtime Contract, Phased Plan (this PR).

## Phase 2 — Standardized Artifact & Harness
- [ ] Compiler: Ensure trailing `return Component;` and no imports/exports in all outputs.
- [ ] Schema: Add `compilation_version` and `compiled_hash` fields (dev only first; follow migration safety guide).
- [ ] Preview/Export: Switch to parameterized Function execution — `new Function('React','Remotion','IconifyIcon', code)`.
- [ ] Migration: Batch recompile v1 scenes → v2; record stats, failures, and mark `compilation_version`.
- [ ] Migration: Add dry-run mode to assess impact and surface counts without writing.
- [ ] Migration: Progressive rollout (10% → 50% → 100%) with monitoring and rollback plan.
- [ ] Telemetry: Add success/failure, conflict auto-rename counts, fallback frequency.
- [ ] Telemetry: Track compilation errors by type/frequency and recovery method; measure user-visible errors before/after Phase 1.

## Phase 3 — Export Parity & Optimization
- [ ] Export pipeline: Consume v2 `jsCode` directly; apply deterministic transforms only.
- [ ] Icons (export): Optionally inline SVGs for determinism and speed; keep preview runtime Iconify.
- [ ] Kill switch: Deprecate client compilation when coverage >99% and error budget allows.

## References
- DECISION-RECORD-S106-EXECUTION-MODEL.md
- RUNTIME-CONTRACT.md
- PHASED-PLAN.md
