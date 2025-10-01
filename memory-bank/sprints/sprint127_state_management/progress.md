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
