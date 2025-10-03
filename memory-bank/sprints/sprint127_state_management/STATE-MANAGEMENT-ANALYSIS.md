# Sprint 127 – State Management Deep Dive

**Date**: 2025-10-02  
**Author**: Codex (assistant)  
**Goal**: Map the current state-management architecture, highlight sources of truth, and document the restore/preview desync that users are seeing.

---

## 1. Current Architecture

### 1.1 Client store (Zustand `videoState`)
- Live in `src/stores/videoState.ts`.  
- Holds `projects[projectId].props` (scenes, meta, audio, etc.), chat history, undo stacks, code cache.  
- Persists to local storage (`zustand/middleware/persist`).  
- Provides helpers:
  - `addScene`, `updateScene`, `replace` mutate the local copy and emit a `refreshToken` to force preview re-render.  
  - `updateAndRefresh` wraps updates that need to trigger the Remotion player.  
  - `syncToDatabase` / `loadFromDatabase` exist but most “write” flows bypass them and rely on explicit invalidations.

### 1.2 Server database (Postgres via Drizzle)
- Canonical truth for `scenes` table.  
- Every tool/edit ultimately persists here.  
- `scene-operations.ts` handles mutations (create/edit/delete/restore).  
- Server compilation optionally pre-generates JS that PreviewPanel prefers when available.

### 1.3 Data fetch layer (tRPC)
- `generation.getProjectScenes` returns ordered scenes with code/metadata.  
- Preview panel, timeline, and chat panel all call this query.  
- Cache invalidation is manual (`utils.generation.getProjectScenes.invalidate({ projectId })`), meaning any mutation that forgets to invalidate leaves the client with stale data.

### 1.4 Preview Panel (`PreviewPanelG`)
- Reads local `videoState.projects[projectId].props`.  
- Listens to `generation.getProjectScenes` results.  
- When the server payload differs (signature hash on scene `id/order/duration/code`), it calls `replace(projectId, updatedProps)` to sync Zustand → preview.  
- Uses a 300 ms debounce before applying replacements to avoid thrash.  
- Injects `refreshToken` into project state so the embedded Remotion player re-renders.

### 1.5 SSE + Chat Flow (`useSSEGeneration` + `ChatPanelG`)
- A scene edit arrives via SSE, the mutation returns `scene` payload.  
- For edits (`scene.update` / `scene.trim`): `updateScene(projectId, sceneId, actualScene)` updates Zustand immediately and then invalidates `getProjectScenes` for correctness.  
- For creates (`scene.create`): they **only** invalidate `getProjectScenes`; local addScene was deliberately removed after earlier race bugs (see sprint 98 notes).  
- For restore (problem area): chat panel mutation currently *only* shows a toast.

### 1.6 Timeline Panel
- Also drives mutations but always invalidates `getProjectScenes` in `onSuccess`.  
- Undo/redo flows rely on restoring the server row and forcing a refetch.

---

## 2. Source-of-Truth Reality

| Flow | Immediate store update? | DB invalidated? | Preview refresh? |
|------|-------------------------|-----------------|------------------|
| Scene edit (AI tool) | ✅ `updateScene` | ✅ (post-update) | ✅ (refresh token + future sync) |
| Scene create (AI) | ❌ (relies on DB) | ✅ | ✅ after fetch |
| Scene delete (timeline) | ✅ local optimistic removal | ✅ | ✅ |
| Scene restore (timeline undo) | ❌ | ✅ | ✅ |
| Scene restore (chat iteration restore) | ❌ | ❌ | ❌ → **bug** |

Because the chat restore path never invalidates `generation.getProjectScenes`, PreviewPanel retains the stale `tsxCode`. The toast gives false confidence, but:
- Remotion still renders the previous version.  
- Subsequent “edit” operations send the **old** code back to the LLM.  
- The new edit response mutates a branch of history the user is no longer looking at → random / surprising output.

The user workaround (manual page refresh) re-hits `getProjectScenes`, which finally syncs Zustand with the restored record.

---

## 3. Restore Flow Walkthrough (chat panel)

1. User clicks “Restore” on a past message.  
2. `ChatPanelG` calls `api.generation.restoreScene.mutate`.  
3. Server resurrects the scene row, recompiles if needed, returns `{ success: true, scene }`.  
4. Client `onSuccess` only fires `toast.success('Scene restored')`.  
   - No call to `updateScene`, `addScene`, or `replace`.  
   - No `utils.generation.getProjectScenes.invalidate({ projectId })`.  
   - Zustand + preview remain unchanged.  
5. User sees toast but Remotion still renders old code → confusion.  
6. Next edit uses stale `props.scenes` from Zustand, so LLM edits the **pre-restore** version.

Timeline restore does the right thing: invalidates the query, letting PreviewPanel sync.

---

## 4. Broader Observations / Risks

1. **Dual State Surfaces** – `videoState` and DB must stay in lockstep. Any mutation path that skips either `updateScene` or query invalidation creates divergence.  
2. **Manual invalidations everywhere** – high risk of missing one (current bug). We need a shared abstraction (e.g., `syncScenesFromServer(projectId, scene?)`).  
3. **PreviewPanel debounce** – 300 ms debounce delays updates; acceptable but worth remembering when we debug “laggy” refreshes.  
4. **Persistence & refresh tokens** – refresh tokens ensure Remotion rerenders, but only when `replace`/`updateScene` runs. Restore skip leads to stale render even if DB is now correct.  
5. **SSE lifetime** – `useSSEGeneration` invalidates some project queries (title updates, etc.), but not scenes; all scene freshness still hinges on manual invalidations in panel components.

---

## 5. Opportunities / Action Items

1. **Fix restore path** – On success: 
   - `await utils.generation.getProjectScenes.invalidate({ projectId })` and/or  
   - `updateScene(projectId, restoredScene.id, restoredScene)` if a local copy exists.  
   - Trigger `updateAndRefresh` so preview reflects the change immediately.  
   - ✅ Implemented via `sceneSyncHelpers.syncSceneRestored()` (2025-10-02).
2. **Centralize scene sync** – Extract helper that wraps mutation success with: update store (when safe), invalidate query, log.  
   - ✅ `src/lib/sync/sceneSync.ts` now wraps create/update/delete/restore paths for chat + timeline.
3. **Audit other mutations** – Re-check revert flows, prompt enhance, duplication, etc., to ensure every server change ends with a store update + invalidation.  
   - 🔄 Timeline drag/trim flows still manual (tracked in progress log).
4. **Consider server-push** – Long term, SSE could stream authoritative scene payloads to remove the need for every component to remember invalidations.  
5. **Testing** – Add integration test simulating restore via chat to ensure preview state changes (e.g., using Playwright + Remotion render checks or at least verifying store state updates).

---

## 6. Next Steps for Sprint 127

- Prioritize restoring consistency: implement shared mutation helper & patch chat restore bug.  
- Draft regression tests (unit or E2E) that cover restore → preview update.  
- Map out future state consolidation (maybe server-driven state or single query provider) after immediate bug fixes.

---

*End of analysis.*
