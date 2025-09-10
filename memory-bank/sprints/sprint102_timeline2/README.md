# Sprint 102 – Timeline V2 (Reliability First)

Goal: Make timeline interactions deterministic, undoable, and free of stale UI. The DB remains the source of truth; the UI mirrors it optimistically with clean rollback.

Key Outcomes
- Command-based action model with precise, invertible payloads
- Centralized dispatcher (store layer) for optimistic updates + rollback
- Persisted undo/redo with TTL (24h)
- Zero-scene placeholder refresh fixed (no debounce)
- Duplicate moved to server API (atomic and auditable)

See tickets.md for actionable tasks and acceptance criteria.
