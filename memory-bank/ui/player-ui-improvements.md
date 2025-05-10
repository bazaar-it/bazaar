# Video Player UI Improvements

## Overview

This document outlines the planned improvements to the Bazaar-Vid video player UI to enhance user experience, visual consistency, and functionality. The player is a critical component of the editor interface, providing the primary means of previewing and interacting with video content.

## Current Implementation

The current player implementation uses the standard Remotion Player component with default controls:

```tsx
<Player
  ref={playerRef}
  component={DynamicVideo}
  durationInFrames={inputProps.meta.duration}
  fps={30}
  compositionWidth={1280}
  compositionHeight={720}
  inputProps={inputProps}
  style={{ width: '100%', height: 'auto', aspectRatio: '16/9' }}
  controls
  autoPlay
  loop
/>
```

This provides basic functionality but lacks visual consistency with the Bazaar-Vid design system and misses advanced features needed for video editing.

## Planned Improvements

### 1. Custom Player Controls

Replace the default Remotion Player controls with a custom UI that matches the application design:

```tsx
<Player
  ref={playerRef}
  component={DynamicVideo}
  durationInFrames={inputProps.meta.duration}
  fps={30}
  compositionWidth={1280}
  compositionHeight={720}
  inputProps={inputProps}
  style={{ width: '100%', height: 'auto', aspectRatio: '16/9' }}
  showVolumeControls={false}
  showPlaybackRate={false}
  moveToBeginningWhenEnded={false}
  controls={false} // Disable default controls
>
  <CustomPlayerControls
    player={playerRef}
    currentFrame={currentFrame}
    durationInFrames={inputProps.meta.duration}
    isPlaying={isPlaying}
    onPlay={play}
    onPause={pause}
    onSeek={seekTo}
  />
</Player>
```

#### Custom Controls Component

Create a new `CustomPlayerControls` component with:

- Play/Pause button with visual feedback
- Frame counter showing current frame / total frames
- Custom progress bar with frame markers
- Frame stepping buttons (forward/backward 1 frame)
- Loop toggle button
- Full-screen toggle
- Time display (current time / total time)
- Keyboard shortcut indicators

### 2. Frame-Accurate Controls

Implement frame-by-frame navigation:

```tsx
const stepForward = useCallback(() => {
  if (!playerRef.current) return;
  const currentFrame = playerRef.current.getCurrentFrame();
  playerRef.current.seekTo(Math.min(currentFrame + 1, durationInFrames - 1));
}, [durationInFrames]);

const stepBackward = useCallback(() => {
  if (!playerRef.current) return;
  const currentFrame = playerRef.current.getCurrentFrame();
  playerRef.current.seekTo(Math.max(currentFrame - 1, 0));
}, []);
```

Add keyboard shortcuts for these operations:

```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return; // Skip if user is typing in an input
    }
    
    switch (e.key) {
      case ' ': // Space
        e.preventDefault();
        isPlaying ? pause() : play();
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (e.shiftKey) {
          seekTo(Math.min(currentFrame + 10, durationInFrames - 1));
        } else {
          stepForward();
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (e.shiftKey) {
          seekTo(Math.max(currentFrame - 10, 0));
        } else {
          stepBackward();
        }
        break;
      case 'Home':
        e.preventDefault();
        seekTo(0);
        break;
      case 'End':
        e.preventDefault();
        seekTo(durationInFrames - 1);
        break;
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [currentFrame, durationInFrames, isPlaying, pause, play, seekTo, stepBackward, stepForward]);
```

### 3. Loading and Buffering States

Add visual indicators for loading/buffering states:

```tsx
const [isLoading, setIsLoading] = useState(true);

// In the Player component:
<Player
  // ... other props
  renderLoading={() => (
    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-white font-medium">Loading video...</p>
      </div>
    </div>
  )}
  onRenderStart={() => setIsLoading(false)}
/>
```

### 4. Player Performance Optimization

Optimize performance by:

1. Using `useMemo` for static props:

```tsx
const playerProps = useMemo(() => ({
  durationInFrames: inputProps.meta.duration,
  fps: 30,
  compositionWidth: 1280,
  compositionHeight: 720,
  inputProps,
}), [inputProps]);

return (
  <Player
    ref={playerRef}
    component={DynamicVideo}
    {...playerProps}
    // ... other props
  />
);
```

2. Throttling frame updates for performance:

```tsx
const throttledSetCurrentFrame = useCallback(
  throttle((frame: number) => {
    setCurrentFrame(frame);
  }, 50), // Update at most every 50ms
  []
);
```

## Technical Implementation Approach

1. Create a new `CustomPlayerControls.tsx` component in `src/components/client/Player/`.
2. Update `useVideoPlayer.tsx` to include new frame control functions.
3. Create a shared keyboard shortcut handler system.
4. Update `PlayerShell.tsx` and `PreviewPanel.tsx` to use the new custom controls.
5. Add performance optimizations to prevent re-renders.

## Design Specifications

- Control bar height: 48px
- Control bar background: #1A1A1A with 80% opacity
- Primary color for active elements: #3B82F6 (blue-500)
- Icon size: 20px
- Button padding: 8px
- Progress bar height: 6px (10px on hover)
- Font: Inter (system-ui fallback)
- Text color: #FFFFFF
- Transition animation duration: 200ms

## Mockup

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                                                             │
│                      VIDEO CONTENT                          │
│                                                             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ ▶ ⏮ ⏭ │           ────○────────────────────                │
│         │ 00:00:10 / 00:01:30               ⟳ ⛶  45/450    │
└─────────────────────────────────────────────────────────────┘
```

## Accessibility Considerations

- All controls should have appropriate ARIA labels
- Keyboard focus indicators should be clearly visible
- Color contrast should meet WCAG AA standards
- Interactive elements should have minimum size of 44x44px for touch targets
- Provide keyboard shortcuts for all main functions

## Implementation Timeline

1. Create basic `CustomPlayerControls` component - 1 day
2. Implement frame navigation and keyboard shortcuts - 1 day
3. Add loading/buffering states - 0.5 day
4. Apply design styling and animations - 1 day
5. Test and fix accessibility issues - 0.5 day

Total estimated time: 4 days 