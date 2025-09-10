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
