# Progress – Sprint 102 Timeline V2

Date: 2025-09-10
- Wrote design (README, plan) and tickets.
- Implemented Phase 1:
  - Action payloads now capture offsets: split, trimLeft.
  - Undo/Redo stacks persisted to localStorage (TTL 24h, pruned on rehydrate).
  - Duplicate moved to server via `scenes.duplicateScene` + UI switched.
- Preview placeholder renders immediately on zero scenes (already fixed earlier).

- DB guardrail checks (read-only):
  - Dev: duplicate orders found in 13 projects; gaps/min-max inconsistencies in several projects (e.g., min!=0 or max!=count-1). No negative/null orders; no invalid durations.
  - Prod: duplicate orders present (worst case: cnt=13 at order=1 for one project); multiple projects with min/max inconsistencies. No negative/null orders; no invalid durations.
  - Next: add write-side normalization (Phase 2) to renumber orders 0..n-1 transactionally after any write.

Next:
- Add unit tests around inverse payload correctness.
- Prepare Phase 2 revision+idempotency schema plan.
 
Date: 2025-09-10 (Phase 2)
- DB schema:
  - Added `project.revision` (bigint, default 0).
  - Added `scene_operation` table with unique `(project_id, idempotency_key)`.
- API updates (scenes router):
  - `splitScene`, `reorderScenes`, `updateSceneDuration`, `duplicateScene`
    - Accept `clientRevision` and `idempotencyKey`.
    - On conflict (stale revision) → throw CONFLICT.
    - Idempotency: if key seen, no-op and return current revision.
    - After successful write: increment `project.revision`, return `newRevision`, record scene_operation.
- Client updates (TimelinePanel):
  - Generate idempotency keys via `nanoid` per write.
  - Pass `clientRevision` when available; store `newRevision` on success.
  - Removed inline delete confirmation UI; delete is immediate with Undo available.
  - Added smooth delete UX: scene fades out (~180ms) before removal.
