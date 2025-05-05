# Timeline & Video Preview Integration Guide

This document outlines the integration of a frame-accurate timeline with Remotion video preview in Bazaar-Vid.

## 1. Overview
- **Goal**: Bidirectional sync between timeline UI and Remotion `<Player>`.
- **Key Techniques**: Frame-based state, requestAnimationFrame loop at 30 FPS, JSON-Patch state updates.

## 2. File Mapping
| Purpose                         | Bazaar-Vid Path                                             |
|---------------------------------|-------------------------------------------------------------|
| Video player hook               | `src/hooks/useVideoPlayer.tsx`                              |
| PlayerShell wiring              | `src/components/client/PlayerShell.tsx`                     |
| Timeline context provider       | `src/components/client/Timeline/TimelineContext.tsx`        |
| Timeline main component         | `src/components/client/Timeline/Timeline.tsx`               |
| Timeline grid rendering         | `src/components/client/Timeline/TimelineGrid.tsx`           |
| Timeline item rendering         | `src/components/client/Timeline/TimelineItem.tsx`           |
| JSON-Patch operations           | `src/stores/videoState.ts` (applyPatch)                     |

## 3. useVideoPlayer Hook
- Manages `isPlaying` & `currentFrame` via `requestAnimationFrame` throttled to `VIDEO_FPS`.
- Exposes: `playerRef`, `play()`, `pause()`, `seekTo(frame)`.
- Updates `currentFrame` state for timeline marker.

## 4. PlayerShell Integration
1. Import `useVideoPlayer` & `useTimeline`.
2. Attach `ref={playerRef}` to `<Player>`.
3. On effect: register `playerRef`, propagate `isPlaying` & `currentFrame` into TimelineContext (`setPlayerRef`, `setIsPlaying`, `setCurrentFrame`).

## 5. TimelineContext Updates
- Added actions: `setPlayerRef`, `seekToFrame`, `setIsPlaying`, `setCurrentFrame`.
- Removed internal RAF loop; uses hook instead.

## 6. Timeline Click-to-Scrub
- Handler calculates clicked frame: `frame = round((x / width) * durationInFrames)`.
- Calls `seekToFrame(frame)` to update both context and preview.

## 7. Drag-and-Drop JSON-Patch
1. Compute `finalFrom` and `finalDuration` on drag end.
2. Build patch: 
   ```ts
   const patch: Operation[] = [
     { op: 'replace', path: `/scenes/${i}/start`, value: finalFrom },
     { op: 'replace', path: `/scenes/${i}/duration`, value: finalDuration }
   ];
   ```
3. Call `applyPatch(projectId, patch)` from `useVideoState`.
4. Preview updates optimistically and re-renders.

## 8. Testing & Validation
- Click timeline: preview frame jumps accordingly.
- Play/pause: timeline marker moves in real time.
- Drag/resize clip: preview updates start/duration.
- Verify JSON-Patch stored and persisted via tRPC pipeline.

---
*Last updated: 2025-05-05*
