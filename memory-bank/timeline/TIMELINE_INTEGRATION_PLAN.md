# Timeline Panel Integration Plan

## Overview
Integrate a minimal but powerful timeline panel for Bazaar-Vid, inspired by React Video Editor Pro's implementation.

## Core Requirements

### 1. Minimal Viable Features (MVP)
- **Scene Trimming**: Adjust start/end points of scenes
- **Scene Rearranging**: Drag & drop to reorder scenes
- **Scene Cutting**: Split one scene into multiple scenes
- **Frame Navigation**: Scrub through timeline with frame-specific selection
- **AI Frame Prompts**: Pause on any frame and send frame-specific prompts to AI

### 2. Architecture Considerations

#### State Management
- Leverage existing Zustand `videoState` store
- Add timeline-specific state slice:
  ```typescript
  interface TimelineState {
    currentFrame: number;
    selectedSceneId: string | null;
    playheadPosition: number;
    zoom: number;
    isPlaying: boolean;
    selectedRange: { start: number; end: number } | null;
  }
  ```

#### React Video Editor Pro - Key Components to Study
Based on the screenshots, their timeline has:
- **Track lanes** for different media types
- **Waveform visualization** for audio
- **Thumbnail previews** for video scenes
- **Zoom controls** for timeline scale
- **Playhead scrubber** for frame navigation

### 3. Implementation Strategy

#### Phase 1: Basic Timeline UI
```typescript
// TimelinePanel.tsx
interface TimelinePanelProps {
  projectId: string;
  scenes: Scene[];
  currentFrame: number;
  onFrameChange: (frame: number) => void;
}
```

#### Phase 2: Scene Operations
- **Trim**: Click and drag scene edges
- **Rearrange**: Drag entire scene blocks
- **Cut**: Right-click menu or keyboard shortcut (Cmd+K)

#### Phase 3: Frame-Specific AI
```typescript
interface FramePromptProps {
  frame: number;
  sceneId: string;
  onPrompt: (prompt: string, frame: number) => void;
}
```

### 4. UI/UX Design

```
┌─────────────────────────────────────────────────────┐
│ Timeline Panel                                       │
├─────────────────────────────────────────────────────┤
│ [⏮][⏯][⏭] Frame: 150 | 00:05.00 | [🔍-][🔍+]      │
├─────────────────────────────────────────────────────┤
│     0    30    60    90   120   150   180   210     │
│     |     |     |     |     |     |     |     |      │
│ ────┼─────┼─────┼─────┼─────▼─────┼─────┼─────┼──── │
│                              ┃ (playhead)            │
│ ┌─────────┐ ┌──────────────┐ ┌────────────┐         │
│ │Scene 1  │ │   Scene 2    │ │  Scene 3   │         │
│ │0-60     │ │   60-150     │ │  150-240   │         │
│ └─────────┘ └──────────────┘ └────────────┘         │
│                                                      │
│ [AI Prompt at Frame 150] [_____________________] 📤  │
└─────────────────────────────────────────────────────┘
```

### 5. Integration Points

#### With Existing Systems
- **PreviewPanelG**: Sync playhead position
- **ChatPanelG**: Send frame-specific prompts
- **VideoState**: Update scene durations and order
- **Scene Operations**: Leverage existing add/edit/delete/trim tools

#### New Hooks Needed
```typescript
// useTimeline.ts
export function useTimeline(projectId: string) {
  // Timeline-specific logic
  const currentFrame = useVideoState(state => state.timeline.currentFrame);
  const setCurrentFrame = useVideoState(state => state.setCurrentFrame);
  
  const handleSceneTrim = (sceneId: string, newStart: number, newEnd: number) => {
    // Call existing trim operation
  };
  
  const handleSceneReorder = (fromIndex: number, toIndex: number) => {
    // Update scene order
  };
  
  const handleSceneCut = (sceneId: string, cutPoint: number) => {
    // Split scene at frame
  };
  
  return {
    currentFrame,
    setCurrentFrame,
    handleSceneTrim,
    handleSceneReorder,
    handleSceneCut
  };
}
```

### 6. Files from React Video Editor Pro to Analyze

Key files to examine in their codebase:
- `components/Timeline/Timeline.tsx` - Main timeline component
- `components/Timeline/Track.tsx` - Individual track lanes
- `components/Timeline/Playhead.tsx` - Playhead scrubber
- `hooks/useTimeline.ts` - Timeline state management
- `lib/timeline/` - Timeline utilities

### 7. Minimal Implementation Checklist

- [ ] Create `TimelinePanel.tsx` component
- [ ] Add timeline to panel registry
- [ ] Implement basic scene blocks visualization
- [ ] Add playhead scrubber
- [ ] Implement drag to rearrange
- [ ] Implement edge dragging for trim
- [ ] Add right-click context menu for cut
- [ ] Add frame-specific prompt input
- [ ] Sync with PreviewPanelG playback
- [ ] Test with multiple scenes

### 8. Complexity Reduction Strategies

To avoid the complexity issues from previous attempts:

1. **No custom video decoding** - Use existing preview panel
2. **No waveform generation** - Simple duration blocks
3. **No multi-track** - Single track for all scenes
4. **No undo/redo initially** - Add later if needed
5. **Simple drag & drop** - Use react-dnd or native HTML5
6. **Frame numbers only** - No timecode conversion complexity

### 9. Success Metrics

The timeline is successful if users can:
- ✅ See all scenes in order
- ✅ Drag to rearrange scenes
- ✅ Trim scene start/end points
- ✅ Cut a scene into two
- ✅ Click to jump to any frame
- ✅ Send AI prompts for specific frames

### 10. Next Steps in New Worktree

1. Navigate to: `/Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid-timeline/`
2. Run: `npm install`
3. Start new Claude session: `claude`
4. Copy this plan to guide implementation
5. Analyze React Video Editor Pro timeline code
6. Start with minimal TimelinePanel.tsx

## Remember: Start Simple, Iterate Fast

The key to success is starting with the absolute minimum:
1. Display scenes as blocks
2. Add click to select
3. Add drag to reorder
4. Everything else is bonus

Good luck with the timeline integration! 🚀