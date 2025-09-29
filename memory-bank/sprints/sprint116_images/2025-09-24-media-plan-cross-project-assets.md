# 2025-09-24 – Media Plan Cross-Project Asset Regression

## Context
- Prod project: `fa164d69-521e-45fc-8ea2-c2385810f0d8`
- User prompts (prod `bazaar-vid_message`): `"animate this"` and `"add new sceene"` (sequences 2 and 3) received no assistant reply.
- Linked asset (`bazaar-vid_project_asset` → `bazaar-vid_asset`):
  - Asset id `b7242e4f-a30a-42ba-911d-2ca43feaf4ff`
  - URL: `https://pub-…/projects/0ce700db-f091-497c-8cc0-09b3b5fa582e/images/1758054810995-d89af119-39e0-4f46-88e0-79390dadbe50.png`
  - Asset metadata tags include `kind:ui`, `layout:dashboard`, `hint:recreate`
  - Asset was linked to the failing project via `project_asset.added_at = 2025-09-24T15:32:41.852Z`

## Observations
1. `bazaar-vid_scene` contains only the welcome template; no new scenes were persisted after the prompts, confirming execution aborted before insert.
2. No `scene_plan` or `scene_iteration` rows were created, which points to failure during tool execution rather than earlier orchestration plumbing.
3. Recent `bazaar-vid_message` entries show only user prompts; no assistant status/error messages were written, matching the API returning an error payload before message sanitisation.
4. Similar historical error content (July entries) shows the add tool complaining about `imageUrls` being empty when `imageAction` was `recreate`.

## Root Cause
- Sprint 116 introduced a guardrail in `mediaPlanService.resolvePlan`:
  ```ts
  const planProjectId = extractProjectId(url);
  if (planProjectId && planProjectId !== projectId) {
    recordSkipped(url, { projectId: planProjectId, scope: 'project', reason: 'project-mismatch' });
    return false;
  }
  ```
- Asset URLs encode the project ID used at upload time. When the same asset is later linked to a different project (via `project_asset`), the URL continues to contain the original project UUID.
- For the prod asset above, `extractProjectId(url)` returns `0ce700db-…` while the active project is `fa164d69-…`. The guard therefore flags it as a cross-project leak and drops it from `planned.imageUrls`.
- Orchestrator still sets `imageAction` (driven by the asset tags → `recreate`), but the resolved `imageUrls` array is empty.
- `AddTool.generateFromImages` throws `No images provided`, which bubbles up through `executeToolFromDecision` → `generateScene` and the API responds with an error; the front-end surfaces a generic failure and no assistant message is stored.

## Impact
- Any attempt to reuse previously uploaded media (different project path in R2) now fails outright for image-driven flows.
- `imageAction` defaults to `recreate` for UI-tagged assets, so text-only prompts fall back to empty add scenes even when the user explicitly attaches an image.
- Affects all prod users who rely on cross-project asset reuse — effectively breaks the primary Sprint 116 objective on production.

## Next Steps
1. ✅ *2025-09-24* — Patched `mediaPlanService.resolvePlan` so any URL marked `scope: 'project'` (and not `requiresLink`) bypasses the storage-path guard. `resolveToken` now carries a `projectScoped` flag forward to `canUsePlanUrl`, preventing legitimate linked assets from being dropped.
   - Added defensive `isProjectScopedAsset()` helper so fallback attachments and direct URLs are also trusted when metadata says they are project-linked.
   - Updated unit coverage (`src/brain/services/__tests__/media-plan.service.test.ts`) with regression cases for legacy R2 paths and unlinked user-library assets.
2. Instrumentation TODO: keep `skippedPlanUrls` logging to monitor for other false positives.
3. Future work: incorporate the new regression test into `scripts/run-media-plan-suite.ts` once we re-enable Neon-backed replays locally.

## Fix Implementation (2025-09-24)
- Updated `mediaPlanService.resolvePlan` to treat assets with `scope: 'project'` (or otherwise trusted via `project_asset` linkage) as safe, bypassing the project-id-from-URL guard when present.
- Added targeted Jest coverage (`src/brain/services/__tests__/media-plan.service.test.ts`) to prove:
  - Project-linked assets with legacy project IDs in their URL now pass through and populate `imageUrls`.
  - User-library/unlinked assets with mismatched project IDs remain blocked and surface in `skippedPlanUrls`.
- `npm run test -- src/brain/services/__tests__/media-plan.service.test.ts` passes locally, confirming both scenarios.
