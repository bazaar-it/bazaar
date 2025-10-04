# 2025-10-04 – LocalStorage quota crash during multi-scene generation

## Context
- Reporter reproduced quota failures after successful 8-scene Product Hunt generation.
- Browser console shows `QuotaExceededError` when `persist` middleware writes `bazaar-video-state`.
- Crash happens post-generation; preview page falls back to global error boundary.

## What we verified
- `useVideoState` persists to `localStorage` via `createJSONStorage(() => localStorage)`.
- `partialize()` still serializes `projects[pid].props`, which contains full `InputProps` per project.
- Each scene inside `props.scenes` carries `tsxCode` and `jsCode` strings (hundreds of KB) plus metadata.
- Large multi-scene generations (URL extractor, website-to-video) now send precompiled JS for every scene, so the payload doubled.
- Browsers cap `localStorage` at ~5MB per origin, so persisting enriched scenes easily overflows.

## Root cause
- Persist layer treats hydrated runtime state and persistence state as identical.
- We persist heavy scene source and compiled JS into `localStorage`, even though the DB (and SSE sync) is the real source of truth.
- Every incremental scene update reserializes the entire scene array, quickly hitting the quota.

## Impact
- Any large project (6+ fully branded scenes or audio-heavy edits) will crash on save in dev/prod if the persisted blob exceeds the limit.
- Users are forced to clear storage or switch environments (as reporter did by moving to bazaar.it) to keep working.
- State rehydration is unreliable; once quota is reached, future writes fail silently until the store clears.

## Proposed direction
1. Stop persisting heavyweight scene code to `localStorage`.
   - Persist only light UI state (audio prefs, draft chat input, playback speed, selected scene, undo stacks).
   - Strip `tsxCode`, `jsCode`, and other large payloads from the serialized version of `props`.
2. Keep full scene data in memory during runtime so preview + timeline stay instant.
   - Persistence layer can transform state on the way in/out without mutating the live store.
3. Let the DB/tRPC query (`generation.getProjectScenes`) rehydrate authoritative scene code after reload.
4. Future work: consider migrating persistence to IndexedDB or compressing payloads if we ever need offline scene cache, but prioritize stability now.

## Follow-ups after fix lands
- Monitor if preview flashes placeholders while scenes rehydrate; mitigate if UX becomes noisy.
- Instrument state size (approximate JSON length) to detect regressions early.
- Evaluate cleaning old persisted blobs during deploy to avoid stale quota overflows.
