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
- 2025-09-16: Regression sweep logged in `2025-09-16-image-workflow-status.md`.
  - Confirmed upload→asset→context pipeline still intact; media-plan guard prevents crashes.
  - Removed helper override that forced `addAudio`, unblocking scene creation with existing project audio.
  - Outlined instrumentation work to capture Brain media plans and attachment mapping on dev.
- 2025-09-16: Prompt vs context weighting analysis in `2025-09-16-prompt-context-analysis.md`.
  - Documented how attachments, media library, and prompts compete inside the orchestrator.
  - Proposed deterministic pre-rules, logging, and temp adjustments to put user prompt + newest attachments first.
- 2025-09-16: Released `image-prompt-eval-guide.md` with 30 canonical image workflows.
  - Covers embed vs recreate, multi-image directives, attachment priority, and clarification triggers.
  - Designed for eval scenarios and regression testing; each case lists tool, `imageAction`, and expected directives.
- 2025-09-16: Added `2025-09-16-optimal-vs-current.md` comparing present pipeline with desired state.
  - Highlights deterministic intent layer, structured logging, instrumentation, evaluation harness, and UX hooks needed for reliability.
- 2025-09-16: Implemented dev-only structured logging for media-plan decisions.
  - Orchestrator + MediaPlanService now emit `[MEDIA_PLAN_SUMMARY]` / `[MEDIA_PLAN_RESOLVE]` logs with prompt preview, attachments, plan status, and resolved `imageAction` (non-production).
  - Logs include requestId (when available) so QA/engineers can trace decisions end-to-end.
- 2025-09-16: Added CLI dry-run tool `npm run debug:media-plan`.
  - Script accepts `--project`, `--user`, `--prompt`, `--image/--video/--audio/--scene`, and optional `--execute`.
  - Calls orchestrator directly (no UI) and prints decision summary; optional tool execution for deeper debugging.
- 2025-09-16: Added batch runner `npm run debug:media-plan-suite`.
  - `--mode cases` replays 30 canonical prompts from `scripts/data/media-plan-use-cases.json` against a supplied test project/user.
  - `--mode prod --limit N` replays recent real prompts with image uploads directly from the production DB (read-only) for audit.
- 2025-09-16: CLI outputs now include `latencyMs` and optional `--output path` for NDJSON logs.
- 2025-09-16: Added `scripts/data/media-plan-curated.json` with vetted prod prompts (real R2 URLs + user/project IDs).
