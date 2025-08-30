# Sprint 102 — Timeline v2 Progress

Date: 2025-08-28

- Added ticketized TODO (see TODO.md) with verification and acceptance.
- Implemented P1 fixes:
  - Cache invalidation after duration and reorder (and name/delete) in TimelinePanel → invalidates `generation.getProjectScenes`.
  - Normalized resize math to honor `zoomScale` and scroll for start/end trim drags.
  - Removed duplicate frame/play state event dispatch from RemotionPreview; PreviewPanelG remains canonical emitter.
  - Added loop controls into Timeline (Off/Scene/Video) with state sync.
  - Enabled extending last scene beyond current total by allowing drag beyond width.
  - Increased trim handle hit zones and added end padding for easier grabbing.
  - Compact height when only one clip and no audio.
  - Cleaned scene name display (strip technical suffixes) in UI.
  - Added handshake to request initial play-state from Preview to fix first-open icon mismatch.

Next:
- Validate zoom-aware trimming at different zoom levels (0.5, 1.0, 2.0).
- Confirm Preview doesn’t revert after trim/reorder (check network requests and state).
- If stable, proceed to (5) timestamp click-to-seek and (10) loop controls in timeline.

2025-08-28 — Evening
- Fixed critical bug in `TimelinePanel.tsx`: `const utils = api.useUtils()` was accidentally placed inside JSX. Moved to hook section near other state hooks. This unblocks cache invalidation after mutations.
- Verified `RemotionPreview` no longer dispatches `preview-frame-update`; `PreviewPanelG` is the canonical emitter (per TODO #3).
- Confirmed keyboard trims ([ and ]) and split (|) are wired to `api.scenes.splitScene` and duration mutation. Further UX polish pending.
- Removed 30-frame minimums: timeline can trim down to 1 frame. Updated keyboard ']' and drag logic to allow duration >= 1.
- Implemented perfect trim-from-start: '[' now performs split at playhead and deletes the left segment; server offsets code for the right segment. Left-edge drag end does the same (optimistically shrinks locally, then split+delete-left on release). 
- Backend `scenes.splitScene`: removed min-frames enforcement; ensures both sides >= 1 frame and preserves code continuity with `_applyFrameOffset`.
 - Fixed server error: added missing `sql` import in `src/server/api/routers/scenes.ts` used for bumping order before insert.
- Reduced left-edge trim sensitivity when zoomed out by increasing snap intervals (coarser steps at low zoom). Hold Shift to disable snapping for fine control.
- Added context menu action: “Split at Playhead” with scissors icon. Computes correct in-scene offset and uses `scenes.splitScene`; selects the right segment after split and invalidates cache.
- Fixed post-split duplicate declarations: New right-hand scene now gets a fresh identifier suffix (e.g., `_mefyxcww` → `_a1b2c3d4`) to avoid "Identifier 'script_...' has already been declared" when compiling multiple scenes.
- Improved split accuracy: Added `request-current-frame` handshake so Timeline reads the exact frame from Preview before computing split offset. Splits now align precisely with playhead position.
 - Prevent unintended reorders: Added a 6px drag threshold. Clicking one scene then clicking another no longer triggers a swap; reordering happens only on actual drag.
- Post-mutation state sync: After split/trim, Timeline fetches latest scenes and replaces VideoState immediately (no waiting for Preview debounce), keeping timeline and preview perfectly in sync.
- Consistent ordering: Both Preview and Timeline now sort database scenes by `order` before converting to state, preventing desync from out-of-order results.

2025-08-28 — Late Evening
- Desync persists at frames 187/291 on user project. Created TIMELINE-PREVIEW-DESYNC.md outlining hypotheses (likely duration divergence) and instrumentation plan.
- Added TODO #19 to track this explicitly.
- Implemented instrumentation:
  - Shared `computeSceneRanges` util at `src/lib/utils/scene-ranges.ts`.
  - Preview dev overlay showing frame, active scene, ranges.
  - Timeline logs active scene and ranges on `preview-frame-update`.

2025-08-29 — Timeline/Preview Sync Fix
- Root cause: Timeline content container used inner padding (`paddingRight: 160px`) to create end-drag space. Percent-based block widths/left were computed against the padded box, while click→frame and playhead math used a different base (visible width). Two different “rulers” caused visual drift (blocks appeared to end ~40–50 frames early).
- Fix:
  - Removed inner padding from the content container and added an absolute end spacer (`left: 100%; width: 160px`) that does not affect percentage calculations.
  - Updated click/drag frame mapping (and time ruler click) to use `innerContent.scrollWidth - spacerWidth` as the base width.
  - Result: Blocks, playhead, and video now share the same width basis; visual boundaries align with DB durations (DB as truth).
  - Added code comments documenting why the spacer must live outside the percentage base.

2025-08-29 — Looping UX moved to Timeline
- Implemented smart loop controls in Timeline (Off / Scene / Video) and unified selection:
  - Timeline dispatches `timeline-select-scene` when a clip is clicked (or drag starts).
  - Workspace listens and updates the global `selectedSceneId` so PreviewPanelG loops the currently selected scene when loop state is `scene`.
  - Preview still honors video loop vs. off, but scene selection now originates from Timeline for intuitive UX.
- Play/pause icon sync: Timeline infers playing from frame ticks (150ms debounce) and also listens to explicit `preview-play-state-change` events; Player onPlay/onPause now dispatches those events.

2025-08-29 — Playback Speed moved to Timeline
- Moved PlaybackSpeedSlider from Preview header to Timeline controls.
- Timeline now dispatches `playback-speed-change` and updates state via `useVideoState.setPlaybackSpeed` so Preview stays in sync.

2025-08-29 — Split/Trim toolbar + smarter naming
- Added quick edit buttons in Timeline: Trim Left `[`, Split `|`, Trim Right `]`. Operate on the selected scene at the playhead.
- Increased right-end spacer to 240px (outside percent base) to make extending the rightmost scene comfortable and drift-free.
- Smarter split naming: Right-hand scene after split now increments existing “(Part N)” if present (e.g., “Intro (Part 2)” → “Intro (Part 3)”), otherwise defaults to “(Part 2)”.

2025-08-30 — Styling polish + Drag-to-Chat
- Styling: Added 10px outer margin and 15px-ish rounded corners to Timeline panel (`m-2.5 rounded-2xl`), with subtle border and shadow to match workspace style.
- Centered transport controls: Play/pause and prev/next are centered in the header grid for better balance.
- Drag to Chat: You can now drag a scene block from the timeline into Chat. The chat shows a small “Scenes” chip row for context (Scene N: Name). On submit, the message is augmented with human-friendly refs like “@scene N” and hidden machine tokens `[scene:ID]` (not shown in the text area) so the Brain can precisely target scenes without exposing UUIDs to the user.

2025-08-29 — Split compile fix (Preview)
- Fixed runtime error: “Cannot set property useCurrentFrame of #<Object> which has only a getter”.
- Root cause: Preview tried to temporarily assign to `window.Remotion.useCurrentFrame` to add per-scene offsets.
- Change: Stop mutating `window.Remotion`. Each scene is isolated in an IIFE namespace and, when `props.startOffset` is present, shadows `useCurrentFrame` inside that namespace to return `base() + startOffset`.
- Also added per‑scene namespacing to eliminate duplicate top‑level identifiers after splits. Rendering now uses `${SceneNS_i}.Comp` with an error boundary.

2025-08-29 — Empty state safety after delete
- Deleting down to 0 scenes could leave Preview without a component, causing confusing states.
- Added a minimal placeholder composition (white AbsoluteFill) and default player props when no scenes exist, so the Player remains stable and shows an empty canvas instead of an error.
2025-08-30 — Command-Z Undo (initial)
- Added timeline-focused undo/redo stack in `useVideoState` with action types: deleteScene, reorder, updateDuration.
- Timeline: Cmd/Ctrl+Z triggers undo of the last action (restore deleted scene, revert reorder, restore previous duration). Shift+redo not yet wired; redo stack is populated for a follow-up.
- AI deletes in Chat also offer Undo via toast and will respect Cmd+Z if run from Timeline.
- Safety: Trims and reorders cancel on mouseup outside timeline so dragging to Chat won’t commit destructive changes.
