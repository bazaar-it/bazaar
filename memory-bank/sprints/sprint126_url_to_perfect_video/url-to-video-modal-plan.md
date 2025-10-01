# URL → Video Modal Implementation Plan

**Date**: 2025-10-01
**Context**: Sprint 126 – URL to Perfect Video
**Goal**: Replace the "copy/paste URL into chat" flow with a first-run modal that captures brand URL + preferences, triggers the website-to-video pipeline automatically, and streams progress back into the workspace.

---

## 1. Current Pain
- New project creation immediately drops the user into the workspace with the welcome chat.
- Users must paste the URL into chat; with `useSSEGeneration` currently forcing `websiteUrl = undefined`, the brain defaults to single-scene `addScene` tool.
- No onboarding UI to gather duration, problem statement, differentiators, or music preferences.
- Pipeline feature flag (`FEATURES.WEBSITE_TO_VIDEO_ENABLED`) is `false`, so even if we pass `websiteUrl`, SSE short-circuits.

**Result**: user sees "normal" chat behavior; multi-scene selector + shared brand repository never run.

---

## 2. Desired Flow (per UX doc)
```
New Project → URL Modal → Background extraction kicks off → Streaming progress → Finished video (with music option)
```

### Modal Requirements
1. **URL input (required)** with async validation + preview (color swatches, title when available from cache).
2. **Duration slider** (default 30s, 20–40s range) mapping to multi-scene target frames.
3. **Optional copy support**
   - Problem statement
   - Differentiators / special sauce
4. **Music selection** – radio cards for the four default tracks (`addAudio` library).
5. **Deferred work preview** – show extraction progress + SSE events (scene 1/8 …) before closing.
6. **Cancel/back** – allow users to dismiss modal (returns them to workspace without running pipeline).

### Backend Expectations
- Use shared brand repository (`saveBrandProfile`) for caching.
- Invoke `WebsiteToVideoHandler` via SSE (`/api/generate-stream`) with `websiteUrl` + user inputs.
- Stream `scene_completed` and `all_scenes_complete` events to UI.
- Persist user-provided metadata (problem/differentiators/music style) so the customizer prompt can leverage it.

---

## 3. Implementation Outline

### 3.1 Frontend Surface
- **New component**: `URLToVideoModal` living under `src/components/url-to-video/` (client component).
- **State inputs**: `url`, `durationSec`, `problem`, `differentiators`, `musicTrack`, `musicPreviewActive`.
- **Async state**: `step` (`collect`, `analyzing`, `generating`, `complete`), `progress` array of scene updates, `error` message.
- **Validation**: only allow "Generate" when URL passes `URL` constructor and is not an R2 asset (reuse `normalizeBrandUrl` helper?).
- **Preview fetch**: debounce URL changes and call `api.websitePipeline.previewWebsite` or future shared repository lookup.
- **SSE hook**: reuse `useSSEGeneration`, but extend hook with `onProgress` (assistant chunk) and `onSceneAdded` callbacks so modal can display live updates without reading from chat state.
- **Form submission**: build normalized user message summarising selections, call `generate({ websiteUrl })` from hook.
- **Completion**: close modal, clear query flag, scroll chat to top, maybe auto-open preview panel.

### 3.2 Entry Trigger
- **New project redirect**: append `?onboarding=1` when creating a project.
  - Update `NewProjectButton` `onSuccess` redirect → `/projects/${id}/generate?onboarding=1`.
  - Update `/projects/new` route to also append the query string.
- **GenerateWorkspaceRoot**: read `useSearchParams()`; if `onboarding=1` and `initialProps.scenes.length === 0`, open modal on mount. Clear flag via `router.replace` once handled. Persist dismissal in `sessionStorage` (`bazaar:url-modal-dismissed:${projectId}`) to avoid reopening on reload.

### 3.3 SSE + Pipeline wiring
- **Feature flag**: switch `WEBSITE_TO_VIDEO_ENABLED` to look at `process.env.NEXT_PUBLIC_ENABLE_WEBSITE_TO_VIDEO` (default `true` in non-production env). This keeps prod safe while we iterate.
- **useSSEGeneration**: add optional callbacks
  - `onProgress(messageChunk: string, isComplete: boolean)`
  - `onSceneProgress({ sceneIndex, sceneName, totalScenes, progress })`
- **Modal** uses these callbacks to update progress list (`scene 1/8 done…`).
- **ChatPanelG**: when flag enabled, restore URL detection so manual chat fallback still works (but not critical for first iteration). Keep disabled behind feature flag to avoid surprise.

### 3.4 Handler Enhancements
- Extend `WebsiteToVideoHandler.execute` signature with optional `userInputs`:
  ```ts
  userInputs?: {
    problemStatement?: string;
    differentiators?: string;
    musicPreference?: string;
    requestedDuration?: number;
  }
  ```
- Pass `requestedDuration` to selector (`preferredDurationSeconds`).
- Feed `problemStatement` & `differentiators` into `buildNarrativeForBeat` (e.g., use problem statement for `problem_setup`, differentiators for `solution_feature`).
- Augment `TemplateCustomizerAI.customizeWithAI` prompt with a "USER INPUT" block containing these fields so edit tool can incorporate them.
- Emit music selection decision back to caller (for eventual integration with `AddAudioTool`). For MVP we can store in debug payload and log – actual audio insertion can land next iteration.

### 3.5 UI Polish
- Reuse shadcn components (`Dialog`, `Input`, `Textarea`, `Slider`, `RadioGroup`).
- Add mini color swatch row once preview returns data (fallback skeleton while loading).
- Provide music preview buttons (5s snippet – may reuse `<audio>` tag, ensure no autoplay on mount).
- Display error banner if extraction fails (graceful fallback: close modal and inform user they can still use chat).

### 3.6 Telemetry & Docs
- Fire analytics events (`modal_opened`, `url_validated`, `generate_clicked`, `pipeline_completed`). Use existing analytics helper if available.
- Update `PIPELINE_FLOW.md` once implementation shipping to note modal entry.
- Add QA checklist (URL caching, SSE progress, cancellation).

---

## 4. Open Questions / Risks
1. **Shared cache preview** – should we fetch brand repository entry by normalized URL before running Playwright? (For MVP we can skip and rely on `saveBrandProfile` to cache post-run.)
2. **Music application** – add audio automatically now vs follow-up? For now, store preference in project metadata and trigger audio insertion later.
3. **Permissions** – if modal dismissed, do we keep offering a shortcut button somewhere (e.g., Templates panel) to reopen? Suggest storing in project metadata so user can rerun from chat.
4. **Edge cases** – what happens if SSE times out mid-run? Modal should surface retry button that replays pipeline.

---

## 5. Next Steps
1. Implement feature flag + hook extension.
2. Build `URLToVideoModal` with placeholder UI and wire into `GenerateWorkspaceRoot`.
3. Connect modal submission to SSE with `websiteUrl` + user inputs.
4. Enhance handler + selector to honour user inputs.
5. QA with multiple URLs (cache miss + cache hit) and ensure scenes populate automatically.
6. Update sprint docs and progress logs post-implementation.
