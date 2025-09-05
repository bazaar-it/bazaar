# Preview Namespacing & Timeline Stability — Follow-ups (Sprint 98)

Date: 2025-08-30

## Context
PR feedback confirms the following strengths:
- Per-scene IIFE namespacing to prevent identifier collisions
- Safe frame offset remapping via lexical replacement (no global mutation)
- Zero-scenes placeholder to keep Player stable
- Split strategy stores `startOffset` in props and avoids code mutation
- Trim operations and state recalculation are robust

This document captures low-risk improvements applied now, and non-blocking opportunities for future iterations.

## Improvements Implemented

1) Extracted namespacing helper
- File: `src/lib/video/wrapSceneNamespace.ts`
- Purpose: Centralize IIFE wrapping + safe `useCurrentFrame` offset remapping
- Benefit: Reduces `PreviewPanelG.tsx` complexity and unifies logic

1.1) Collision hardening (Sep 01, 2025)
- Change: Use `var SceneNS_[index] = (...)()` instead of `const`.
- Rationale: In rare cases the same scene index code could be included twice in a single generated module (state duplication or fallback + valid merge). `const` causes "Identifier already declared" at module scope; `var` tolerates redeclaration and simply reassigns.
- Also: Converted error boundary wrappers from `class`/`function` declarations to `var Name = class ...` and `var Name = function ...` to be redeclaration‑safe as well.
- Files:
  - `src/lib/video/wrapSceneNamespace.ts`
  - `src/app/projects/[id]/generate/workspace/panels/PreviewPanelG.tsx`
- Outcome: New scenes no longer crash the preview with `Identifier 'SceneNS_*' has already been declared`.

1.2) Stable namespace (Sep 01, 2025)
- Change: Namespace name now uses a stable scene‑ID derived key (`SceneNS_[first8OfId]`) instead of index.
- Rationale: Indexes shift when inserting/removing scenes; cache reused wrappers produced with an old index, causing runtime `SceneNS_* is not defined` when the boundary referenced the new index.
- Cache now stores `{code, usedRemotionFns}`; on cache hits we still know which Remotion functions to import.
- Result: Adding scenes or reordering no longer breaks preview due to namespace mismatches.

2) Local cache for namespaced scenes
- Location: `PreviewPanelG.tsx` (in-memory Map via `useRef`)
- Key: `${scene.id}:${startOffset}:${quickCodeHash}`
- Benefit: Avoids repeated regex work when preview re-renders with unchanged input

3) Safer remapping with fallback
- If remapping fails for any reason, we log a warning and fall back to the original code without offset remap (preview remains functional).

## Future Opportunities (Non-blocking)

- Move additional compilation utilities from `PreviewPanelG.tsx` into `src/lib/video/` to further shrink the file.
- Add lightweight unit tests for `wrapSceneNamespace` edge cases (strings/comments around `useCurrentFrame`).
- Consider memoizing compiled scenes across mounts if needed (L2 cache scoped by project).

## Cross-refs
- PR feedback source (internal): Timeline & Preview Stability Review
- Related files: `PreviewPanelG.tsx`, `TimelinePanel.tsx`, `src/server/api/routers/scenes.ts`, `src/stores/videoState.ts`

## Status
- Risk: Low
- Scope: Internal refactor + small perf gain
