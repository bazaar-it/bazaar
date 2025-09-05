# Runtime Contract — Authoring, Compiler, Wrapper (Sprint 106)

## Goals
- Ensure consistent, collision-free execution for preview and export.
- Keep existing authoring patterns working (no LLM/template rewrites now).
- Make the server compiler the single source of truth.

## Authoring Contract (Accepted Inputs)
- Allowed:
  - Top-level: `const { ... } = window.Remotion;`
  - `export default function Component() { ... }` or `export default Component;`
  - Icons in any of these forms: `<IconifyIcon/>`, `<Icon/>`, `<window.IconifyIcon/>`, `React.createElement(IconifyIcon, ...)`.
- Not allowed (compiler will strip):
  - Imports of React/Remotion/Iconify and CSS.
  - Named exports.

## Compiler Contract (Normalized Output)
- Strips all imports/exports and rewrites icons to `window.IconifyIcon` calls.
- Resolves conflicts by auto-renaming top-level identifiers across scenes.
- Adds a trailing `return Component;` so the artifact can be executed via Function.
- Always returns JS (or a safe fallback component) — never triggers regeneration.
- Outputs include: `jsCode`, `compiledAt`, optional `compilationError`, optional `conflicts`.

## Wrapper Contract (Preview/Export Harness)
- Do NOT inject top-level const aliases for Remotion or icons.
- May set idempotent global fallbacks (e.g., `if (!window.IconifyIcon) { window.IconifyIcon = (...) }`).
- Prefer parameterized Function execution (next phase):
  - `new Function('React','Remotion','IconifyIcon', code)`
  - Pass controlled globals explicitly to avoid module-scope collisions.

## Icons Contract
- Runtime canonical API: `window.IconifyIcon(props)`.
- Compiler rewrites all icon usages to the canonical API.
- Export parity: future phase can inline SVGs for determinism, while preview keeps runtime Iconify.

## Versioning (Planned)
- Add `compilation_version` and `compiled_hash` to scenes.
- Use version gating to manage preview/export behavior and backfills.

## Security Boundaries
- No dynamic imports or external module loading in scene artifacts.
- Scene code executed with constrained globals via Function parameters (future phase) to reduce scope and collisions.

## Success Criteria
- No “Identifier already declared” errors in new projects or multi-scene compositions.
- Preview and export consume the same `jsCode` artifact with minimal deterministic transforms at export.
