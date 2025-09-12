# Progress — Sprint 116 Images

Date: 2025-09-08
- Created sprint docs (README, use-cases, design, prompt drafts, TODO).
- Clarified first-principles plan: add/edit only, with Brain-driven imageAction and upload-time metadata.
- Embed path will be minimal (no storytelling); recreate is strict reference-only.

Next:
- Add `imageDirectives` (per-image) to Brain output and parser.
- Implement EditTool branching.
- Replace legacy prompt fragments in add embed path.

Date: 2025-09-08 (later)
- Added modular prompt base (technical guardrails) and mode deltas (embed/recreate); wired into AddTool and EditTool.
- Updated README/design to reflect current status and modular assembly.
- Expanded TODO with detailed, file-level tickets and acceptance criteria for Brain, ContextBuilder, tools, and deletion plan.

Date: 2025-09-10
- Timeline: fixed scene reordering UX to be deliberate, not over‑sensitive.
  - Added press‑and‑hold (250ms) on scene block to initiate reorder (keeps drag‑to‑chat intact).
  - Added small movement threshold during hold to avoid accidental activation.
  - Widened drop acceptance band to center 25–75% of target scene for reliable drop.
  - Persist reorder to DB via `scenes.reorderScenes` and keep Zustand + Preview in sync.

Date: 2025-09-10 (follow‑up PR review fixes)
- Addressed reviewer feedback on timer cleanup and global state:
  - Replaced window globals with internal refs for last pointer position.
  - Centralized long‑press timer cleanup in `clearLongPress()`; added null‑safe guards.
  - Applied helper consistently across handlers (drag start/end, mouse up/leave).

Date: 2025-09-10 (bugfix: last scene deletion placeholder)
- Root cause: PreviewPanelG only recompiles when `scenes.length > 0`, so deleting the last scene left the previous compiled component until a hard refresh.
- Fixes:
  - PreviewPanelG: trigger compilation even when `scenes.length === 0` (immediately compile placeholder component, no debounce).
  - DB→state sync: handle empty `dbScenes` by replacing VideoState scenes with `[]` and resetting duration, preventing stale scenes.
- Outcome: deleting the final scene now immediately shows the placeholder video without manual refresh.

Date: 2025-09-10 (Timeline undo/redo)
- Added reliable, single Undo/Redo controls in Timeline, mirroring CapCut behavior:
  - Visible buttons in the controls bar + existing ⌘Z/⇧⌘Z shortcuts.
  - Undo stack persists: delete, reorder, trim-right (duration), split, and duplicate.
  - New TimelineAction types: `split`, `trimLeft`, `duplicate` with appropriate undo paths.
  - Drag-resize end now records `updateDuration` to allow undo of trims.
  - Duplicate action records snapshot to allow redo.
