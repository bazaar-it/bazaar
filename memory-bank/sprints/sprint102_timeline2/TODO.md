# Sprint 102 — Timeline v2 TODOs (Ticket-style)

Date: 2025-08-28
Owner: Timeline Stabilization & UX
Related docs:
- sprint98: memory-bank/sprints/sprint98_autofix_analysis/TIMELINE-DEEP-DIVE.md
- plan: memory-bank/timeline/TIMELINE_INTEGRATION_PLAN.md

## A. Stabilization & Correctness

1) Fix cache invalidation after timeline mutations
- Status: Completed
- Evidence: `TimelinePanel.tsx` uses `api.scenes.updateSceneDuration` and `api.scenes.reorderScenes` without `utils.generation.getProjectScenes.invalidate({ projectId })` on success. `PreviewPanelG` can resync from DB and momentarily revert local changes.
- Acceptance:
  - After trim or reorder, DB cache invalidates and Preview doesn’t revert.
  - `getProjectScenes` network panel shows refresh on success.
- Code refs: `src/app/projects/[id]/generate/workspace/panels/TimelinePanel.tsx`, `src/app/projects/[id]/generate/workspace/panels/PreviewPanelG.tsx`.

2) Normalize zoom/drag/resize math
- Status: Completed (resizes honor zoom/scroll; allow extension)
- Evidence: Some paths use `rect.width/totalDuration` (ignores `zoomScale`), others account for zoom and scroll; leads to inconsistent feel when zoomed.
- Acceptance:
  - Dragging/resizing and playhead scrubbing behave identically at all zoom levels.
  - No unexpected jumps while trimming.
- Code refs: `TimelinePanel.tsx` drag/resize handlers; time ruler/grid calculations.

3) Consolidate preview frame event publisher
- Status: Completed (RemotionPreview no longer emits)
- Evidence: Both `PreviewPanelG` and `RemotionPreview` emit `preview-frame-update`. Choose one canonical source (prefer `PreviewPanelG`).
- Acceptance:
  - Exactly one publisher active; timeline updates smoothly without duplicate events.
- Code refs: `src/app/projects/[id]/generate/components/RemotionPreview.tsx`, `PreviewPanelG.tsx`.

4) Prevent auto-resize of timeline scale during trimming
- Status: Mitigated (no zoom change during trim; verify UX)
- Hypothesis: Some calculations tied to window width or ruler recompute may feel like zooming; or CSS width `${Math.max(100, zoomScale * 100)}%` causes stretch.
- Acceptance:
  - While dragging edges, zoom stays constant without reflow.
- Code refs: `TimelinePanel.tsx` width/zoom logic.

## B. UX Improvements

5) Add timestamp click-to-seek on ruler
- Status: Completed
- Acceptance:
  - Clicking on time markers/ruler seeks preview to that frame.
- Code refs: `TimelinePanel.tsx` time ruler section.

6) Fit timeline height to content
- Status: Completed (compact height when 1 row, no audio)
- Evidence: Fixed height `180/240px` based on audio presence.
- Acceptance:
  - With one row (no audio), height is reduced appropriately; grows with rows/audio.
- Code refs: `TimelinePanel.tsx` `timelineHeight` memo.

7) Panel spacing and radii (10px spacing + 15px radius)
- Status: Pending
- Acceptance:
  - Timeline panel matches workspace style guidelines (padding, corner radius, buffer zones).
- Code refs: `GenerateWorkspaceRoot.tsx` wrapper; `TimelinePanel` container classes.

8) Center play/pause buttons
- Status: Pending
- Acceptance:
  - Play/pause group horizontally centered within control cluster.
- Code refs: `TimelinePanel.tsx` controls header layout.

9) Add padding at end (right side) for easier dragging
- Status: Completed (160px end padding)
- Acceptance:
  - There is extra right-side padding/ghost space to grab clip edges.
- Code refs: `TimelinePanel.tsx` inner width calculation.

## C. Features & Shortcuts

10) Move loop controls into timeline
- Status: Completed (added Off/Scene/Video toggle)
- Acceptance:
  - Loop toggle (Off/Scene/Video) added to timeline controls; updates same loop state events.
- Code refs: `PreviewPanelG.tsx` loop state (2233–2360), integrate matching events into timeline.

10b) Remove scene-loop UI from PreviewPanel (dedupe)
- Status: Completed
- Rationale: Looping is now controlled from Timeline; Preview should no longer host a separate loop toggle to avoid split authority and user confusion.
- Acceptance:
  - Preview panel header no longer shows loop toggle.
  - Preview continues to honor `loop-state-change` events and `selectedSceneId` for scene loop.
- Code refs: `WorkspaceContentAreaG.tsx` (LoopToggle in Preview panel header), `PreviewPanelG.tsx` (loop state load/usage).

11) Keyboard + buttons: trim & split ([, ], |)
- Status: Partially completed (keyboard trims live; split wired to server)
- Notes: Split creates Part 1/Part 2 scenes at DB; future: code offset rewrite for accurate continuation.
- Acceptance:
  - `[` sets clip start to playhead, `]` sets end, `|` splits into two scenes at playhead.
  - Visual confirmation and DB persistence (duration/reorder as needed).
- Code refs: `TimelinePanel.tsx` keydown listener; `useVideoState.updateScene` and new split utility.

12) Timestamp click: also add a visible playhead handle
- Status: Enhancement
- Acceptance:
  - Dedicated playhead handle drag target; clicking timestamps or dragging handle syncs preview.

## D. Data Integrity & Naming

13) Preserve manual trims across edits
- Status: Completed (edit duration applied only if explicitly requested)
- Hypotheses:
  - Edit flow regenerates code without updating duration in DB, while Preview’s DB sync overwrites local manual trim.
  - Some tool paths recalculate durations.
- Acceptance:
  - After manual trim, editing code does not revert duration unless user changes it.
  - Add test: trim → edit → verify duration unchanged.
- Code refs: `scenes.updateSceneCode` (does not touch duration), edit tool, Preview DB sync.

14) Clean scene names (remove suffix like `_X21YX`)
- Status: Completed (UI-only display cleanup)
- Acceptance:
  - Displayed names omit technical suffixes; DB may keep raw name, but UI shows cleaned.
- Code refs: `generation/template-operations.ts` (suffix), Timeline/Preview display of names.

## E. Audio Integration

15) Drag audio from uploads into timeline
- Status: Pending
- Acceptance:
  - Dragging an audio asset onto timeline sets `project.audio` with start/end/volume defaults and shows waveform.
- Code refs: `useVideoState.updateProjectAudio`, TimelinePanel audio UI; Media panel drag source.

## F. Repro/Validation Items

16) Timeline zoom function doesn’t work
- Status: Improved (consistent paths); validate further
- Observed: Zoom changes `zoomScale` (Ctrl/Meta + wheel) and resizes grid/ruler; some interactions ignore zoom.
- Acceptance:
  - All interactions honor zoom; zoom in/out visibly changes scale and scrubbing/resize precision.

17) Closing timeline clears chat input box
- Status: Needs reproduction; not obvious from code
- Notes:
  - ChatPanelG persists draft in `useVideoState`; timeline toggle shouldn’t clear it. Might be focus/key handling or unmount side-effect.
- Acceptance:
  - Closing/opening timeline never alters chat draft.
- Code refs: `GenerateWorkspaceRoot.tsx` (timeline visibility), `ChatPanelG` draft handling.

18) “Legg til element” (Add element)
- Status: Clarify scope
- Hypothesis: Add empty clip/placeholder via timeline.
- Acceptance:
  - Define expected element types; add button + insertion behavior.

---

## Proposed Execution Order
- P1: (1) cache invalidation, (2) normalize zoom math, (3) consolidate frame events, (13) preserve trims.
- P2: (5) timestamp click seek, (10) loop controls, (11) shortcuts, (9) end padding.
- P3: (6) fit height, (7) styling, (8) center controls, (14) name cleanup, (15) audio drag.
- P4: (17) chat draft bug, (18) add element – after clarification.

## Notes
- Keep work minimal and focused; prefer incremental PRs.
- Update memory bank progress after each fix; link commits and files changed.

19) Timeline ↔ Preview desync at specific frames
- Status: New
- Observation: At frames ~187/291, Preview shows scene N while Timeline highlights scene N+1.
- Hypotheses: order sorting vs. DB; duration divergence between DB and code; stale state window.
- Plan: Instrument both panels, add shared computeSceneRanges, reconcile durations.
- Acceptance: Active scene under playhead matches in both panels across test frames.
- 20) Smarter naming for split parts
- Status: Completed
- Details: When splitting, the right-hand scene name increments an existing “(Part N)” suffix; if none, uses “(Part 2)”. Prevents repeated “Part 2” after multiple splits.
- Code refs: `src/server/api/routers/scenes.ts` (nextPartName logic in `splitScene`).
