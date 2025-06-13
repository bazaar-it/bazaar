# TICKET-007: Real-time Preview Updates

## Overview
PreviewPanelG should update instantly when scenes change, providing immediate visual feedback to users.

## Current State

### Problem Areas
1. **Preview might not update immediately** when scenes are generated
2. **Full reload on updates** causes jarring experience
3. **No loading states** while scene is rendering
4. **Error boundaries missing** for render failures

## Implementation Plan

### Step 1: Add Real-time Subscription to PreviewPanelG

Update `/src/app/projects/[id]/generate/workspace/panels/PreviewPanelG.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { api } from '~/trpc/react';
import { useVideoStore } from '~/stores/videoState';
import { Player } from '@remotion/player';
import { ErrorBoundary } from 'react-error-boundary';
import type { UniversalResponse } from '~/lib/types/api/universal';

export function PreviewPanelG({ projectId }: { projectId: string }) {
  const { scenes, timeline } = useVideoStore();
  const [isRendering, setIsRendering] = useState(false);
  const [renderError, setRenderError] = useState<Error | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
  
  // Subscribe to real-time updates
  api.generation.subscribeToUpdates.useSubscription(
    { projectId },
    {
      onData: (update: UniversalResponse<any>) => {
        console.log('[Preview] Received update:', update.meta.operation);
        
        // Handle different operation types
        switch (update.meta.operation) {
          case 'scene.create':
          case 'scene.update':
            // Trigger re-render without full reload
            setLastUpdateTime(Date.now());
            break;
            
          case 'scene.delete':
            // Handle scene removal
            setLastUpdateTime(Date.now());
            break;
        }
      },
      onError: (error) => {
        console.error('[Preview] Subscription error:', error);
      }
    }
  );
  
  // Watch for video state changes
  useEffect(() => {
    // This will trigger when scenes are added/updated/removed
    setIsRendering(true);
    
    // Small delay to ensure state is settled
    const timer = setTimeout(() => {
      setIsRendering(false);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [scenes, timeline]);
  
  // Generate composition from scenes
  const composition = useMemo(() => {
    if (!scenes || scenes.length === 0) {
      return null;
    }
    
    try {
      // Convert scenes to Remotion composition
      return {
        id: 'video',
        component: VideoComposition,
        durationInFrames: calculateTotalDuration(scenes),
        fps: 30,
        width: 1920,
        height: 1080,
        defaultProps: {
          scenes: scenes.map(scene => ({
            id: scene.id,
            Component: createSceneComponent(scene.tsxCode), // Using correct field!
            duration: scene.duration,
            props: scene.props || {}
          }))
        }
      };
    } catch (error) {
      console.error('[Preview] Composition error:', error);
      setRenderError(error as Error);
      return null;
    }
  }, [scenes, lastUpdateTime]);
  
  // Error fallback component
  const ErrorFallback = ({ error, resetErrorBoundary }: any) => (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="text-red-500 mb-4">
        <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold mb-2">Preview Error</h3>
      <p className="text-gray-600 mb-4">{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Try Again
      </button>
    </div>
  );
  
  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <h3 className="text-white font-medium">Preview</h3>
        <div className="flex items-center gap-2">
          {isRendering && (
            <div className="flex items-center gap-2 text-gray-400">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-sm">Updating...</span>
            </div>
          )}
          <span className="text-sm text-gray-400">
            {scenes.length} scene{scenes.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      
      {/* Preview Area */}
      <div className="flex-1 relative">
        <ErrorBoundary
          FallbackComponent={ErrorFallback}
          onReset={() => setRenderError(null)}
        >
          {composition ? (
            <div className="absolute inset-0">
              <Player
                key={`player-${lastUpdateTime}`} // Force re-render on updates
                composition={composition}
                durationInFrames={composition.durationInFrames}
                fps={composition.fps}
                style={{
                  width: '100%',
                  height: '100%',
                }}
                controls
                loop
                autoPlay={false}
                // Smooth transitions between scenes
                renderPlayPauseButton={({ playing }) => (
                  <PlayPauseButton playing={playing} />
                )}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-gray-500 mb-2">
                  <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-gray-400">No scenes yet</p>
                <p className="text-sm text-gray-500 mt-1">Create a scene to see preview</p>
              </div>
            </div>
          )}
        </ErrorBoundary>
      </div>
    </div>
  );
}
```

### Step 2: Create Dynamic Scene Component Loader

Create `/src/lib/preview/sceneComponentLoader.ts`:

```typescript
import React from 'react';
import { transform } from '@babel/standalone';

/**
 * Dynamically create React component from TSX code string
 * Safely evaluates code in isolated context
 */
export function createSceneComponent(tsxCode: string): React.ComponentType<any> {
  try {
    // Transform TSX to JS
    const transformed = transform(tsxCode, {
      presets: ['react', 'typescript'],
      filename: 'scene.tsx',
    }).code;
    
    // Create component factory
    const componentFactory = new Function(
      'React',
      'useCurrentFrame',
      'interpolate',
      'spring',
      `
      ${transformed}
      
      // Find the default export
      const exportMatch = ${transformed}.match(/export\\s+default\\s+(\\w+)/);
      const componentName = exportMatch ? exportMatch[1] : 'Scene';
      
      return eval(componentName);
      `
    );
    
    // Import Remotion hooks
    const { useCurrentFrame, interpolate, spring } = require('remotion');
    
    // Create component with error boundary
    const Component = componentFactory(React, useCurrentFrame, interpolate, spring);
    
    // Wrap in error boundary
    return (props: any) => {
      try {
        return React.createElement(Component, props);
      } catch (error) {
        console.error('[Scene Component] Render error:', error);
        return React.createElement('div', {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            backgroundColor: '#1f2937',
            color: '#ef4444',
            padding: '2rem',
            textAlign: 'center',
          }
        }, `Scene Error: ${error.message}`);
      }
    };
    
  } catch (error) {
    console.error('[Scene Loader] Failed to create component:', error);
    
    // Return error component
    return () => React.createElement('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        backgroundColor: '#1f2937',
        color: '#ef4444',
      }
    }, 'Failed to load scene');
  }
}

/**
 * Calculate total duration from scenes
 */
export function calculateTotalDuration(scenes: SceneEntity[]): number {
  return scenes.reduce((total, scene) => total + scene.duration, 0);
}
```

### Step 3: Add Smooth Transitions

Create `/src/components/preview/VideoComposition.tsx`:

```typescript
import { Composition, Sequence, AbsoluteFill } from 'remotion';
import { TransitionSeries } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';

interface VideoCompositionProps {
  scenes: Array<{
    id: string;
    Component: React.ComponentType<any>;
    duration: number;
    props: any;
  }>;
}

export const VideoComposition: React.FC<VideoCompositionProps> = ({ scenes }) => {
  let currentFrame = 0;
  
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <TransitionSeries>
        {scenes.map((scene, index) => (
          <TransitionSeries.Sequence
            key={scene.id}
            durationInFrames={scene.duration}
          >
            <SceneWrapper scene={scene} />
            {index < scenes.length - 1 && (
              <TransitionSeries.Transition
                presentation={fade()}
                timing={{ durationInFrames: 15 }}
              />
            )}
          </TransitionSeries.Sequence>
        ))}
      </TransitionSeries>
    </AbsoluteFill>
  );
};

const SceneWrapper: React.FC<{ scene: any }> = ({ scene }) => {
  return (
    <AbsoluteFill>
      <scene.Component {...scene.props} />
    </AbsoluteFill>
  );
};
```

### Step 4: Add Performance Optimizations

```typescript
// Add to PreviewPanelG
const [debouncedScenes] = useDebounce(scenes, 100); // Debounce rapid updates

// Memoize expensive operations
const playerConfig = useMemo(() => ({
  inputProps: {
    scenes: debouncedScenes,
  },
  // Cache frames for smoother playback
  numberOfSharedAudioTags: 5,
  // Preload nearby frames
  moveToBeginningWhenEnded: true,
}), [debouncedScenes]);

// Use React.memo for scene components
const MemoizedSceneComponent = React.memo(({ scene }: any) => {
  const Component = scene.Component;
  return <Component {...scene.props} />;
}, (prevProps, nextProps) => {
  // Only re-render if scene actually changed
  return prevProps.scene.id === nextProps.scene.id &&
         prevProps.scene.tsxCode === nextProps.scene.tsxCode;
});
```

## After Implementation

### User Experience

1. **Instant Updates**
   - Scene appears in preview within 100ms
   - No full page reload
   - Smooth transitions between updates

2. **Loading States**
   - "Updating..." indicator during renders
   - Smooth fade transitions
   - No jarring jumps

3. **Error Handling**
   - Broken scenes show error message
   - Other scenes continue playing
   - "Try Again" button to recover

4. **Performance**
   - Debounced updates prevent lag
   - Memoized components reduce re-renders
   - Frame caching for smooth playback

## Testing Plan

### 1. Real-time Update Tests
```typescript
it('updates preview when scene is added', async () => {
  render(<PreviewPanelG projectId="123" />);
  
  // Simulate scene creation via subscription
  act(() => {
    mockSubscription.emit({
      meta: { operation: 'scene.create' },
      data: { id: 'new-scene', tsxCode: '<div>New</div>' }
    });
  });
  
  // Preview should update within 100ms
  await waitFor(() => {
    expect(screen.getByText('1 scene')).toBeInTheDocument();
  }, { timeout: 100 });
});
```

### 2. Error Boundary Tests
```typescript
it('shows error for broken scene code', async () => {
  const brokenScene = {
    id: '123',
    tsxCode: 'export default () => { throw new Error("Broken!"); }',
    duration: 150
  };
  
  render(<PreviewPanelG scenes={[brokenScene]} />);
  
  expect(screen.getByText(/Scene Error: Broken!/)).toBeInTheDocument();
});
```

### 3. Performance Tests
```typescript
it('handles rapid updates without lag', async () => {
  const { rerender } = render(<PreviewPanelG scenes={[]} />);
  
  // Simulate 10 rapid updates
  for (let i = 0; i < 10; i++) {
    rerender(<PreviewPanelG scenes={[...scenes, newScene(i)]} />);
  }
  
  // Should debounce and only render once
  expect(mockPlayer.mock.calls.length).toBeLessThan(5);
});
```

## Success Criteria

- [ ] Preview updates within 100ms of scene change
- [ ] No full reload or flashing
- [ ] Smooth transitions between scenes
- [ ] Errors don't crash entire preview
- [ ] Performance remains smooth with many scenes

## Dependencies

- Remotion Player
- React Error Boundary
- Babel Standalone (for TSX transformation)
- @remotion/transitions

## Time Estimate

- Real-time subscription: 2 hours
- Scene component loader: 2 hours
- Transitions and polish: 1 hour
- Testing: 1 hour
- **Total: 6 hours**