# Ticket: Split Scene — Render-Range Strategy (Hybrid)

Date: 2025-08-29
Owner: Timeline/Preview Stabilization

## Problem
Regex-based frame-offset injection for split scenes is fragile and causes desync and edge failures for complex code paths, and duration drift when code is edited.

## Decision
Adopt a hybrid strategy: Keep current offset injection for continuity in V1, but prioritize DB-as-truth timing and add duration sync. Plan a V2 implementation based on Render-Range for new splits (and AST transforms when code must be edited).

## Scope
- Immediate (now):
  - Duration Sync: Re-extract duration from TSX on `updateSceneCode` and persist to DB (done).
  - Allow 1-frame trims: `updateSceneDuration` min relaxed to 1 (done).
  - Keep offset injection and smarter split naming (done).
- Short-term (next):
  - Expand regex coverage for offsets (interpolate(frame…), spring({ frame… }), getFrame(), currentFrame) to improve continuity.
  - Add a splitStrategy flag in memory (or comment in code) to track strategy used (render-range vs offset) for future migrations.
- V2 (target):
  - Render-Range: For new splits, prefer wrapping the right half in `<Sequence from={splitPoint} durationInFrames={rightDuration}>` and rebase frame via a wrapper (prop/context or shadow hook), rather than mutating original code.
  - AST Transforms: For code edits, use Babel AST to inject offsets and rename all suffix occurrences reliably.
  - Preview & Validation: Offer a pre-commit render test to detect issues (e.g., media offsets, nested sequences).

## Changes Implemented
- DB duration sync: Added `extractDurationFromCode()` and updated `scenes.updateSceneCode` to persist extracted duration when present.
- Trim min: `updateSceneDuration` now allows min(1) frame.
- Smarter naming for split: Right-hand scene names increment (Part N) automatically.
- Timeline UX: Loop & speed controls moved to Timeline; quick edit bar ([, |, ]) added; sync fixes.
- Preview compile stability: Per-scene IIFE namespacing + lexical `useCurrentFrame` shadowing for right-hand scenes with `startOffset`. No mutation of `window.Remotion`.

## Risks
- Duration extraction via regex may miss non-literal definitions; safe fallback is no update.
- Render-Range requires a frame rebase mechanism in Preview for perfect continuity; implemented via lexical shadow (no global mutation). 

## Acceptance
- Editing code updates timeline durations immediately (no drift).
- New splits continue to animate smoothly (offset retained for V1); timeline and preview remain in sync.
- Plan captured for V2 Render-Range + AST.

## Code Refs
- `src/server/api/routers/scenes.ts`
- `src/server/services/code/duration-extractor.ts`
- `src/app/projects/[id]/generate/workspace/panels/TimelinePanel.tsx`
- `src/app/projects/[id]/generate/workspace/panels/PreviewPanelG.tsx`
