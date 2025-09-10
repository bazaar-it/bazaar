# Tickets – Sprint 102 Timeline V2

## T-102-01 Command-based timeline actions
- Define unified `TimelineAction` payloads and explicit inverses.
- Include: delete, reorder, trimRight, trimLeft, split, duplicate, editName.
- Add `offset` to `split` and `trimLeft` actions.
- Acceptance:
  - All UI calls use the dispatcher (`pushAction`) before hitting the API.
  - Inverse payloads are computed client-side and stored with the action.

## T-102-02 Centralized dispatcher + optimistic updates
- Single entry-points in `videoState` for timeline ops.
- Queue, apply optimistic state, call API, on error rollback using inverse.
- Acceptance:
  - No direct scattered store updates for timeline in panels; they route via dispatcher.

## T-102-03 Persisted undo/redo with TTL
- Persist per-project undo/redo stacks to `localStorage` (TTL 24h).
- Keys: in zustand persisted state; prune on rehydrate.
- Acceptance:
  - Reloading page keeps last 24h of undo/redo.
  - Stacks are pruned after 24h.

## T-102-04 Revision + idempotency (Phase 2 design)
- Add `projects.revision` (bigint) + idempotency key to write endpoints.
- Server rejects stale writes (409), returns `{ newRevision }`.
- Acceptance:
  - Docs + schema plan; implementation in Phase 2.

## T-102-05 Duplicate API endpoint
- Add `scenes.duplicateScene`.
- Body: `{ projectId, sceneId, position?, name? }` (Phase 2 will add idempotency+revision).
- Server: copy fields, compute new order, return `newScene`.
- Acceptance:
  - Timeline duplicate uses server API; undo deletes returned scene.

## T-102-06 Zero-scene placeholder (done)
- Compile placeholder immediately when there are zero scenes.
- Acceptance:
  - Deleting the last scene updates the preview without manual refresh.

## T-102-07 DB Guardrails (read-only checks)
- MCP queries to verify:
  - Unique order per project
  - Sequential 0..n-1 (no gaps/negatives)
  - Consistency of ordered_ids
- Acceptance:
  - Queries documented; repair strategy defined (transactional re-numbering).

## T-102-08 Tests & Telemetry
- Unit: inverse correctness per action type.
- Integration: undo/redo flows; reorder long-press; last-scene delete.
- E2E: common timeline flows with stable waits.
- Telemetry: log operation id + duration; consider reusing `sceneIterations`.

## T-102-09 Cross-tab coherence (optional)
- Emit `storage` or SSE ping to nudge other tabs to refresh.
- Acceptance: second tab reflects changes within 1–2s.
