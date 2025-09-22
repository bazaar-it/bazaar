# 2025-09-20 – Media Panel Project Linking

## Context
- Media panel previously listed *all* user uploads (`getUserUploads`) regardless of project.
- Clicking an item inserted the raw URL into chat but did **not** associate the asset with the active project.
- Result: backend might treat reused assets as cross-project when the Brain references them later; plan provenance showed URLs from other project buckets.

## Change
- Added `project.linkAssetToProject` TRPC endpoint (`project.ts:700`):
  - Validates project ownership and that the asset belongs to the current user.
  - Calls new `assetContext.linkAssetToProject()` helper with graceful fallback handling for legacy columns.
- MediaPanel click handler now awaits `linkAssetToProject` before calling `onInsertToChat`.
  - Errors are logged (warn) but non-blocking so user flow continues.

## Expected Effects
- Any panel asset reused via click gets a row in `projectAssets`, ensuring Brain context + project media views stay in sync.
- Provenance logs (`sourceMap`) should now classify those assets as same-project rather than cross-project plan inserts.
- Drag-and-drop from panel still sets `dataTransfer` with the URL; code path could be extended later to link on drop via `linkAssetToProject` if needed.

## Follow-up Considerations
- Add similar linking for drag operations (currently only click path handled).
- Consider backfilling existing projectAsset gaps by scanning chat history for URLs and linking where missing.
- Monitor plan debug logs for `mapped-from-library` URLs pointing to other project IDs; those should disappear once linking is consistent.
