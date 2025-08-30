# Timeline ↔ Preview Desync Investigation

Date: 2025-08-28
Owner: Timeline Stabilization

## Symptom
- At frame positions like 187 and 291, Preview shows Scene 2 while Timeline highlights Scene 3 (or Preview shows Scene 3 while Timeline highlights Scene 4). Clicking/dragging aside, the playhead-to-scene mapping differs between panels.

## Current Architecture (relevant bits)
- Source of truth: Zustand `useVideoState.projects[projectId].props.scenes` with `{ id, start, duration, data.code }`.
- PreviewPanelG:
  - Queries `generation.getProjectScenes` and converts to state scenes sequentially (start accumulative), publishes `preview-frame-update` at ~30Hz.
- TimelinePanel:
  - Reads the same VideoState scenes and computes UI blocks by accumulating `duration`.
  - Listens for `preview-frame-update` and sets `currentFrame`.

## Hypotheses
1) Order mismatch after mutations
   - DB returns scenes in different `order` than client expected → start offsets diverge.
   - Mitigation added: sort by `order` when converting in both panels.

2) Duration divergence (most likely)
   - DB `duration` doesn’t match the scene’s effective runtime from code (e.g., `durationInFrames_suffix` computed from script arrays). If code’s true duration ≠ DB’s, Preview content boundaries differ from Timeline math.
   - Split/trim also applies a frame offset into code; new right scene may end up with a different effective duration than DB unless normalized.

3) Stale state window
   - Timeline replaced state immediately post-mutation; Preview had a debounce or vice versa, causing temporary offsets.
   - Mitigation added: immediate state replace after mutations; Preview no longer skips sync on equal ID-sets.

## What “Correct” Looks Like (Acceptance)
- Given a project, at any frame:
  - The computed active scene index in Preview (based on state scenes’ [start, end]) equals the active clip block in Timeline.
  - Splits and trims update both panels so next `preview-frame-update` tick shows matching scene labels.

## Instrumentation Plan
1) Add lightweight debug overlay (dev-only) in PreviewPanelG:
   - Show: currentFrame, activeSceneIndex, activeSceneId, [start,end] of each scene.
2) Add logging in TimelinePanel for:
   - On `preview-frame-update`: computed active scene index at currentFrame and its [start,end].
3) Add a guard util `computeSceneRanges(scenes)` used by both panels; source-of-truth logic identical.

## Data Collection
- Reproduce at frames 187 and 291:
  - Log the computed ranges in both panels.
  - Record DB durations for all scenes (id, name, duration, order) and code-derived durations if available.

## Likely Fixes
- If Hypothesis 2 confirmed:
  - Option A (quick): On compile, read exported `durationInFrames_*` (or measure) and reconcile by updating DB duration to the code’s effective duration.
  - Option B (safer): Derive boundaries purely from DB durations for both panels AND ensure each scene code respects `duration` via a wrapper that clamps/overrides internal duration.
  - Option C: Persist `effectiveDuration` each time we compile and use that for Timeline/Preview boundaries.

## Proposed Next Steps
- Implement shared `computeSceneRanges` util and dev overlay.
- Add one reconciliation path (A or B) behind a feature flag.
- Validate on the user’s project with frames 187 and 291.

## Notes
- Keep changes minimal; avoid regressing split/trim.
- Document all findings in this file and link commits.
