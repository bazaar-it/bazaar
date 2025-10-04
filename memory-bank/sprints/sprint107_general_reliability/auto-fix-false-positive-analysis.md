# Auto-Fix False Positive Analysis (2025-10-05)

## Context
- User reports silent auto-fix firing while the previewed scene was already compiling and rendering correctly. The automatic edit overwrote valid code and left the project broken.
- Provided console log (request `08528BD51694`) shows the orchestrator forcing the EDIT tool with error message `Syntax error in Linkedin Post_xflddk7v: Unexpected token '<'` immediately before replacing the scene.
- No manual auto-fix trigger was used; the event originated from the preview pipeline.

## Evidence Reviewed
- `src/hooks/use-auto-fix.ts` (`handlePreviewError`, queue processing, progressive strategy)
- `src/app/projects/[id]/generate/workspace/panels/PreviewPanelG.tsx` (scene compilation, error dispatch) – especially lines 2401-2446 where `preview-scene-error` events are emitted.
- Utility heuristics in `src/lib/utils/scene-error-detector.ts` that attempt to map thrown errors back to a specific scene.
- Attempted to query `autofix_metrics` for project `2e5dc675-88ab-4acf-8ebd-64c08b762f6f` to inspect historical error payloads; MCP postgres tool returned `tool call failed` for both dev and prod branches (network restriction still in place).

## Key Findings
1. **Fallback dispatch misattributes global errors**
   - When `PreviewPanelG` cannot identify a problematic scene (`problematicSceneInfo === null`), it dispatches a `preview-scene-error` for the *first* scene in the ordered list (`PreviewPanelG.tsx:2434-2446`). This happens for any multi-scene compilation failure outside the per-scene compiler (e.g., blob import errors, namespace builder bugs, transient network issues).
   - Auto-fix interprets this as a real scene failure, queues a fix, and overwrites the first scene even though the underlying issue was unrelated.

2. **No verification before executing queued fixes**
   - Once an error is queued, `useAutoFix` waits 5s and runs the EDIT tool without re-checking whether the preview still emits an error. If the root cause was transient (or the fallback dispatch itself was spurious) the fix still fires (`handlePreviewError` → `processAutoFixQueue`).
   - `scene-fixed` events cancel queued fixes, but they are only emitted during `compileSceneDirectly` success. Global errors that never touch the per-scene compiler (e.g., the blob import failure) do not emit a matching `scene-fixed`, so the queue never clears.

3. **Scene heuristics flag syntactic errors that originated in the composite wrapper**
   - The error string `Unexpected token '<'` typically comes from evaluating the generated module, often because the composite code still contains JSX after Sucrase fails. In these cases `detectProblematicScene` reports `isValid === false` for the first scene simply because its wrapper failed to evaluate, not because the scene's source had JSX bugs. That reproduces the user incident: the scene worked previously, but a wrapper import glitch still labeled it as invalid.

4. **Operational metrics currently unreliable**
   - Without DB access we could not confirm whether the same signature repeatedly fires (`error_signature` uniqueness). Instrumentation should include the composite module name and stack trace so we can distinguish wrapper failures from true scene errors.

## Hypothesis
The silent auto-fix destroyed a healthy scene because `PreviewPanelG` emitted a `preview-scene-error` for Scene 1 during a transient composite import failure. Since no per-scene error followed, the queue timer expired and executed even though the preview was already rendering correctly. Lack of a final “still broken?” verification step allowed the fix to proceed.

## Next Steps
1. **Guard event dispatch**
   - Only dispatch `preview-scene-error` when `problematicSceneInfo` is available (scene-specific). For global errors emit a diagnostic event (`preview-global-error`) that does *not* invoke auto-fix.
2. **Pre-flight verification in `useAutoFix`**
   - Before executing a fix, re-run a lightweight check (e.g., inspect latest `sceneCompilationStatus` or request current preview error cache) to ensure the scene is still failing.
3. **Add instrumentation**
   - Log the composite module stage that emitted the error and capture stack traces for wrapper/import failures so we can classify them without guessing.
4. **Data follow-up**
   - Re-run the `autofix_metrics` query once MCP Postgres access is restored to validate how often fallback dispatch assigns errors to Scene 1.

## Open Questions
- Can we expose the Remotion preview's current error state via Zustand so `useAutoFix` can check synchronously before firing?
- Does the Remotion Player emit any hookable event when the import eventually succeeds (so we can cancel queue items even without `scene-fixed`)?

## Proposed Mitigations (Not Implemented)
- Draft a guard in `PreviewPanelG` that downgrades generic composite failures to a `preview-global-error` event so the auto-fix listener can ignore it.
- Add a validation hook in `useAutoFix` that re-checks preview status (e.g. stored compile result or a new `isSceneBroken` selector) before submitting EDIT prompts.
- Extend auto-fix metric payloads with `dispatcher` metadata (scene compiler vs composite wrapper vs runtime boundary) to distinguish true scene failures from pipeline noise.
- Keep a rollback flag so we can disable the new guardrails quickly if compilation telemetry shows regressions.
