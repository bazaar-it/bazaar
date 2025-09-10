# Plan – Sprint 102 Timeline V2

Phases
- Phase 1 (this sprint)
  - Extend action payloads (capture offsets).
  - Persist undo/redo to localStorage with TTL 24h.
  - Add `scenes.duplicateScene` API and switch UI.
- Phase 2
  - Add `projects.revision` and idempotency keys to all write endpoints.
  - Client rebases on 409 (stale) by refetch + reapply optimistic op.
- Phase 3
  - Optional server history via `sceneIterations` + History panel.

Technical Anchors
- Start is derived in UI; persist only `order` and `duration`.
- Dispatcher computes inverse before firing API.
- All write endpoints normalize order to 0..n-1.
