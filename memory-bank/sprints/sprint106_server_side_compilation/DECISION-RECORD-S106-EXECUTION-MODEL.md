# ADR: Sprint 106 Execution Model — Progressive Standardization (Accepted)

## Status
Accepted — 2025-09-04

## Context
We currently have mixed execution paths: some scenes are precompiled (server) and others are compiled in the client. Wrappers (PreviewPanelG, export, etc.) sometimes inject top-level const aliases which can collide with scene code (e.g., IconifyIcon or Remotion destructuring), causing “Identifier already declared” errors. Icons appear in multiple forms (IconifyIcon/Icon/window.IconifyIcon), and we must maintain reliability without a risky big-bang migration.

## Decision
Adopt a progressive enhancement strategy:
- Short term: keep authoring style unchanged; remove conflicting wrapper aliases; rely on server compiler as the single source of truth; normalize icon usage; keep minimal, idempotent wrapper fallbacks only.
- Medium term: standardize compiled artifacts to a stable execution contract and execute scenes via parameterized Function(args) to avoid module-scope collisions.
- Long term: deprecate client compilation entirely, align export to consume the same precompiled artifact, and optionally inline icons at export for determinism.

## Rationale
- Backward compatible: works with all existing scenes and templates without retraining the LLM.
- Reliability: removes immediate collision sources while making compiler output the single consistent truth.
- Evolvable: allows gradual rollout of better isolation (Function args) and export parity.

## Consequences
- Two paths temporarily coexist (precompiled JS preferred; client compile as fallback) — requires metrics and gradual migration.
- Wrapper logic must be minimal and idempotent; no top-level consts that can collide with scene code.
- Compiler owns normalization (imports/exports stripping, icons, return injection, conflict auto-rename).

## Alternatives Considered
- Big-bang authoring standardization (move all destructuring inside functions): high risk/cost now; defer.
- Global context object (BazaarContext): acceptable pattern but still requires authoring changes; better to pass args to Function instead.

## Links
- RUNTIME-CONTRACT.md
- PHASED-PLAN.md
- TICKETS.md
