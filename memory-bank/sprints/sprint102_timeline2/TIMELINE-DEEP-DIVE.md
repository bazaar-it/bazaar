# Timeline Deep Dive — Architecture, Integration, Issues, Next Steps

Date: 2025-08-28
Sprint: 98 — Auto-Fix Analysis & Stabilization

## Executive Summary
- The app’s timeline is implemented as a dedicated panel (`src/app/projects/[id]/generate/workspace/panels/TimelinePanel.tsx`) that reads/writes to the client state store (`useVideoState`) and persists key changes via tRPC routers (`scenesRouter` and `generationUniversalRouter`).
- Preview playback sync is done via a lightweight window event bus between TimelinePanel and PreviewPanelG using custom DOM events (`timeline-seek`/`timeline-play-pause` ↔ `preview-frame-update`/`preview-play-state-change`).
- A second, generic timeline system exists (`src/components/client/Timeline/*`) with its own context and hooks, but it is not wired into the generate workspace. This duplication creates conceptual drag and potential confusion.
- Main risks: event-bus fragility, cache invalidation gaps, zoom/resizing math inconsistencies, and dual timeline implementations drifting apart.

## Where Timeline Data Comes From
- Source of truth on the client: `useVideoState` (Zustand) at `src/stores/videoState.ts`
  - Scenes live under `projects[projectId].props.scenes` with `{ id, start, duration, data: { code, name, props } }`.
  - Mutations: `addScene`, `updateScene`, `deleteScene`, `reorderScenes`, and `updateProjectAudio` recalc `meta.duration` and emit a `refreshToken` to re-render preview.

- Source of truth in DB: `scenes` table (Drizzle) accessed via tRPC
  - Read: `api.generation.getProjectScenes` (router: `generation.universal > project-operations.ts`).
  - Write: `api.scenes.updateSceneDuration`, `api.scenes.reorderScenes`, `api.generation.updateSceneName`, `api.generation.removeScene`.

## How Timeline Integrates With DB
- Duration trim (resize):
  - Local: `useVideoState.updateScene(projectId, sceneId, { duration })`
  - Persist: `api.scenes.updateSceneDuration.mutate({ projectId, sceneId, duration })`
  - Side effects: creates a chat message + iteration record; BUT does not currently invalidate `generation.getProjectScenes` cache.

- Reorder:
  - Local: `useVideoState.reorderScenes(projectId, oldIndex, newIndex)` (recomputes `start` and total duration)
  - Persist: `api.scenes.reorderScenes.mutate({ projectId, sceneIds: [...] })`
  - Side effects: chat message for reorder; BUT no `getProjectScenes` invalidation.

- Name edit:
  - Local: `useVideoState.updateScene(projectId, sceneId, { name })`
  - Persist: `api.generation.updateSceneName.mutate({ projectId, sceneId, name })`

- Delete:
  - Local: `useVideoState.deleteScene(projectId, sceneId)`
  - Persist: `api.generation.removeScene.mutate({ projectId, sceneId })`

## How Timeline Integrates With State and Panels
- PreviewPanelG (`src/app/.../panels/PreviewPanelG.tsx`)
  - Reads current scenes from `useVideoState`.
  - Also queries DB scenes (`getProjectScenes`) and performs “smart sync” into state if DB changes.
  - Emits playback events every ~frame: `preview-frame-update`, infers `preview-play-state-change`.
  - Listens to timeline events: seeks on `timeline-seek`; toggles play/pause on `timeline-play-pause`.

- TimelinePanel
  - Visualizes scenes as blocks in a single track; supports trim, reorder, and playhead scrubbing.
  - Reads and updates `useVideoState` scenes; persists via tRPC mutations.
  - Communication with preview via window events:
    - Sends: `timeline-seek` (with frame), `timeline-play-pause`.
    - Receives: `preview-frame-update` (sets local `currentFrame`), `preview-play-state-change` (sets local `isPlaying`).
  - Audio: updates `useVideoState.updateProjectAudio` and renders waveform via WebAudio (gracefully degrades if no user gesture).

- GenerateWorkspaceRoot
  - Shows/hides the timeline panel and initializes project state (`setProject`), including initial audio.

## Parallel Timeline Implementation (Not in Use)
- Files: `src/components/client/Timeline/TimelineContext.tsx`, `TimelineGrid.tsx`, `TimelineItem.tsx`, and `~/lib/types/video/timeline.ts`.
- Provides a generalized context (drag ghost, zoom helpers, collision detection, multi-row tracks) and hooks (`useTimelineClick`, `useTimelineDrag`, `useTimelineZoom`).
- Not currently wired into the workspace UI; `TimelinePanel.tsx` is the active implementation.

## Identified Issues and Risks
1) Event bus fragility
   - Custom `window` events are simple but easy to duplicate or leak across mounts. Multiple listeners or unmounted panels could cause inconsistent state.
   - PreviewPanelG and RemotionPreview both dispatch `preview-frame-update`, potentially double-emitting.

2) Cache invalidation gaps
   - `updateSceneDuration` and `reorderScenes` mutations don’t invalidate `generation.getProjectScenes`. If PreviewPanelG syncs from DB shortly after, it may temporarily revert local changes until DB is polled again.

3) Zoom/resizing math inconsistencies
   - Some drag/resize math uses `rect.width / totalDuration` while playhead seeks account for `zoomScale`, leading to different behaviors at non-1.0 zoom or with scroll offset.

4) Dual timeline systems
   - The generic TimelineContext and the workspace TimelinePanel diverge in logic and UX. This duplication increases maintenance overhead and risk of regressions.

5) Audio waveform UX
   - Waveform generation depends on a valid AudioContext that may require a user gesture. Current code logs and degrades gracefully, but user feedback could be improved when waveform is unavailable.

## Recommended Actions
- Short term (stabilization)
  - Add `utils.generation.getProjectScenes.invalidate({ projectId })` in success callbacks for `reorderScenes` and `updateSceneDuration`.
  - Normalize zoom math for resize/drag paths to consistently incorporate `zoomScale` and scroll offsets.
  - Ensure only one source dispatches `preview-frame-update` at a time (PreviewPanelG vs RemotionPreview); decide the canonical publisher.

- Medium term (simplification)
  - Choose one timeline implementation. Either:
    - Migrate workspace to the generic `TimelineContext` primitives; or
    - Archive/remove the generic timeline folder and keep `TimelinePanel.tsx` as the single implementation.
  - Extract a small `timelineEvents.ts` helper to register/unregister listeners consistently and reduce boilerplate.

- Longer term (features)
  - Multi-track support (rows for audio/text/effects) using the validated overlap/gap logic from TimelineContext.
  - Frame-prompt actions to ChatPanelG (send prompt at current frame), following `TIMELINE_INTEGRATION_PLAN.md`.
  - E2E tests in `/src/lib/evals/` covering trim + reorder + playhead sync.

## Cross-References
- Plan: `memory-bank/timeline/TIMELINE_INTEGRATION_PLAN.md`
- Active panel: `src/app/projects/[id]/generate/workspace/panels/TimelinePanel.tsx`
- Preview: `src/app/projects/[id]/generate/workspace/panels/PreviewPanelG.tsx`
- State: `src/stores/videoState.ts`
- Routers: `src/server/api/routers/scenes.ts`, `src/server/api/routers/generation.universal.ts`
- Generic timeline (unused in workspace): `src/components/client/Timeline/*`, `src/lib/types/video/timeline.ts`

