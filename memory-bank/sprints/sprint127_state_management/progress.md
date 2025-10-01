# Sprint 127 – State Management Progress Log

**Date**: 2025-10-02  
**Engineer**: Codex

## ✅ Today
- Introduced `sceneSyncHelpers` (`src/lib/sync/sceneSync.ts`) to centralise scene update/delete/restore flows.  
  - Chat panel and timeline now call the helpers instead of manually invalidating tRPC queries.  
  - Each helper logs the operation, invalidates `generation.getProjectScenes`, and forces a preview refresh.
- Updated chat restore & revert flows to rely on the shared helper so restored code reaches the preview instantly (no manual refresh).  
- Updated timeline mutations (delete, restore, reorder, duplicate, split, duration/name changes) to call the helper, reducing duplicated sync logic.
- Added `revision` column to `scenes` (`drizzle/migrations/0022_add_scene_revision.sql`) and increment it in core update paths (edit, trim, restore, iteration revert) to unblock optimistic-locking work.

## Notes
- Remaining manual sync paths in TimelinePanel (legacy drag/trim flows) still fetch scenes directly; will migrate them after validating the helper in production.  
- Scene revision increments are wired into the primary mutation paths; secondary timeline flows will adopt revisions in the next pass.

## Next
- Update remaining timeline drag/trim flows to use the helper & revision increments.  
- Plumb `revision` through API responses and surface optimistic-lock errors to the UI.  
- Instrument helper telemetry (Sentry/analytics) once behaviour is stable.

---

**Date**: 2025-10-02 (later)  
**Engineer**: Codex

## ✅ Today
- Investigated "deleted scene resurrects after chat edit" regression; root cause was soft-deleted rows still loaded into orchestration/storyboard queries.  
- Added `deletedAt IS NULL` guard to all scene fetches used by Brain orchestration, scene tools, and manual timeline mutations (`scene-operations.ts`, `helpers.ts`, `scenes.ts`, `templates.ts`).  
- Updated delete mutation to refuse operating on already-soft-deleted rows; prevents downstream edits from targeting stale scene IDs.

## Notes
- Restore flow still reuses soft-deleted payload as intended; other queries now ignore deleted rows by default.  
- Need to verify multi-scene templates and iteration revert flows continue to function with the stricter filters.

## Next
- Manual QA pass: delete via timeline, issue chat edits, confirm scene remains removed after orchestration completes.  
- Add regression test (integration) that simulates delete→edit to ensure filters stay in place.

---

**Date**: 2025-10-02 (later still)  
**Engineer**: Codex

## ✅ Today
- Expanded the soft-delete guards to every remaining scene query (template imports, website-to-video, add-audio, create-scene-from-plan, timeline duplicate/split/reorder/duration) so orchestrator or utility jobs cannot resurrect removed scenes.  
- Tightened iteration revert logic to ignore deleted scenes when calculating order or applying edits, avoiding accidental restores.  
- Documented the audit results and outstanding QA steps for the deletion regression.

## Notes
- Restore/undo paths intentionally bypass the filter; all other mutations now assume `deletedAt` = active.  
- Need to monitor performance of the additional `isNull` predicates—no noticeable impact expected.

## Next
- Manual UI verification: delete scene → run website-to-video + chat edit to confirm no resurrection.  
- Author integration test covering delete→LLM edit flow.
