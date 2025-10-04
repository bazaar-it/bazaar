# Default Export Normalization Plan (2025-10-04)

## Problem
- Many template/LLM-generated scenes only declare `const Foo = ...` plus named exports (e.g., `export const duration...`) without `export default`.
- PreviewPanel executes the compiled JS blob (`scene.jsCode`) and works because we append `return Component;` in the compiler.
- Lambda/share/admin import the stored TSX/JS as ES modules and expect a default export → `module.default === undefined` → `DynamicScene` renders the fallback panel.
- Recent Easing fixes expose the issue more clearly, but the root cause is missing default exports in stored scenes.

## Goals
1. Guarantee every scene saved to the DB includes a valid default export.
2. Backfill existing scenes missing a default export so admin/share/export consumers render the real component.
3. Keep preview behavior unchanged.
4. Avoid LLM or regeneration; rely on compiler metadata.

## Implementation Plan

### 1. Compiler enforcement
- File: `src/server/services/compilation/scene-compiler.service.ts`
- After `performCompilation` determines `componentName` (the same name we use when we append `return ${componentName};`), detect if the source TSX lacks an `export default`.
- If missing, append `\nexport default ${componentName};\n` to the TSX before returning the result (and before persisting to the DB).
- Ensure the JS blob we return still includes `return ${componentName};` as today.

### 2. Backfill script
- Create a script (e.g., `scripts/backfill-default-export.ts`) that:
  1. Fetches all scenes from the DB where `tsxCode` is missing `export default`.
  2. Calls `SceneCompilerService.compileScene` with the existing TSX to get the normalized TSX/JS.
  3. Writes the updated `tsxCode`/`jsCode`/`jsCompiledAt` back to the DB.
- Run in dev first; verify with a small sample; then run against production (with backup).

### 3. Runtime redeploy
- After code changes land, run `npm run remotion:deploy` to publish the updated runtime (includes the `window.Remotion` shim and Easing fallback).
- Update `REMOTION_SERVE_URL` / `REMOTION_SITE_ID` in all environments, restart processes.

### 4. Validation
- Re-run exports for previously failing projects (e.g., "Effortless Collaboration", "Vibrant Ecosystem") to confirm scenes render correctly.
- Spot-check admin/share pages for the same projects.
- Monitor export logs for any remaining warnings about missing default export (should be none).

### 5. Follow-up
- Consider adding an automated test/eval that simulates a scene with only named exports to ensure we never regress.
- Optional: update templated scenes (LLM prompts) to emit `export default` explicitly so enforcement rarely triggers.

## Risks & Mitigations
- **Risk:** Backfill script mutates scene content unexpectedly. → Use dry-run mode first; diff sample outputs; take DB backup.
- **Risk:** Compiler picks the wrong `componentName`. → We already rely on the same heuristic for preview; evaluate logs during backfill to ensure the chosen name matches the intended root component.
- **Risk:** Runtime redeploy missed. → Deploy once after landing the changes; confirm `LambdaRender] Using serve URL: …bazaar-icon-robust-20251004…` in logs.

## Status
- Plan drafted 2025-10-04; awaiting implementation.
