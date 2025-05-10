# Timeline Snapping Functionality

## Overview

This document outlines the implementation plan for adding snapping functionality to the timeline interface in Bazaar-Vid. Snapping helps users precisely position and align timeline items, improving the editing experience and resulting in more professional-looking videos.

## Current Implementation

The timeline currently supports basic drag-and-drop operations through the `useTimelineDrag` hook, which allows:
- Moving items horizontally (changing start time)
- Resizing items from left or right edges (changing duration)
- Moving items between tracks

However, precise alignment is difficult without snapping guides.

## Planned Improvements

### 1. Grid Snapping

Implement snapping to a configurable grid:

```tsx
interface SnapConfig {
  enabled: boolean;
  gridSize: number; // In frames
  threshold: number; // Snap distance in pixels
}

const [snapConfig, setSnapConfig] = useState<SnapConfig>({
  enabled: true,
  gridSize: 10, // Snap to every 10th frame by default
  threshold: 10, // Snap when within 10 pixels
});
```

Apply snapping during drag operations:

```tsx
const calculateSnapPosition = (rawPosition: number): number => {
  if (!snapConfig.enabled) return rawPosition;
  
  // Convert position to frames
  const framePosition = pixelsToFrames(rawPosition);
  
  // Find nearest grid point
  const remainder = framePosition % snapConfig.gridSize;
  const nearestGridPoint = remainder < snapConfig.gridSize / 2
    ? framePosition - remainder
    : framePosition + (snapConfig.gridSize - remainder);
  
  // Check if we're within the threshold
  const distanceToGrid = Math.abs(framePosition - nearestGridPoint);
  const thresholdInFrames = pixelsToFrames(snapConfig.threshold);
  
  return distanceToGrid <= thresholdInFrames
    ? framesToPixels(nearestGridPoint) // Snap to grid
    : rawPosition; // Keep original position
};
```

### 2. Item Edge Snapping

Implement snapping to the edges of other timeline items:

```tsx
const findNearestItemEdges = (position: number, excludeItemId?: string): number[] => {
  const edges: number[] = [];
  
  // Collect all item edges from all tracks
  timelineTracks.forEach(track => {
    track.items.forEach(item => {
      if (item.id !== excludeItemId) {
        // Add start and end positions
        edges.push(item.startFrame);
        edges.push(item.startFrame + item.durationFrames);
      }
    });
  });
  
  return edges;
};

const snapToItemEdges = (rawPosition: number, excludeItemId?: string): number => {
  if (!snapConfig.enabled) return rawPosition;
  
  const framePosition = pixelsToFrames(rawPosition);
  const edges = findNearestItemEdges(framePosition, excludeItemId);
  
  // Find the closest edge
  let closestEdge = null;
  let minDistance = Infinity;
  
  edges.forEach(edge => {
    const distance = Math.abs(framePosition - edge);
    if (distance < minDistance) {
      minDistance = distance;
      closestEdge = edge;
    }
  });
  
  // Check if we're within the threshold
  const thresholdInFrames = pixelsToFrames(snapConfig.threshold);
  
  return (closestEdge !== null && minDistance <= thresholdInFrames)
    ? framesToPixels(closestEdge) // Snap to the item edge
    : rawPosition; // Keep original position
};
```

### 3. Playhead Snapping

Implement snapping to the current playhead position:

```tsx
const snapToPlayhead = (rawPosition: number): number => {
  if (!snapConfig.enabled) return rawPosition;
  
  const framePosition = pixelsToFrames(rawPosition);
  const playheadFrame = currentFrame;
  const distance = Math.abs(framePosition - playheadFrame);
  const thresholdInFrames = pixelsToFrames(snapConfig.threshold);
  
  return distance <= thresholdInFrames
    ? framesToPixels(playheadFrame) // Snap to playhead
    : rawPosition; // Keep original position
};
```

### 4. Visual Snap Indicators

Add visual indicators when snapping occurs:

```tsx
const [activeSnapGuides, setActiveSnapGuides] = useState<{
  vertical: number[];
  horizontal: number[];
}>({
  vertical: [],
  horizontal: []
});

// Update in the drag handler
const handleDrag = (event: DragEvent) => {
  // ... existing drag logic
  
  // Calculate snap positions
  const snappedX = calculateSnapPosition(rawX);
  
  // If snapping occurred, show a visual guide
  if (snappedX !== rawX) {
    setActiveSnapGuides(prev => ({
      ...prev,
      vertical: [...prev.vertical, snappedX]
    }));
  }
  
  // ... continue with drag handling
};

// Clear guides when drag ends
const handleDragEnd = () => {
  setActiveSnapGuides({ vertical: [], horizontal: [] });
  // ... existing drag end logic
};
```

Render the snap guides:

```tsx
{activeSnapGuides.vertical.map((position, index) => (
  <div
    key={`v-guide-${index}`}
    className="absolute top-0 bottom-0 w-px bg-blue-500 pointer-events-none z-50"
    style={{ left: `${position}px` }}
  />
))}
```

### 5. Toggle Controls

Add a UI control to toggle snapping on/off:

```tsx
const SnapToggle = () => {
  return (
    <button
      className={`p-2 rounded ${snapConfig.enabled ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
      onClick={() => setSnapConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
      title={`${snapConfig.enabled ? 'Disable' : 'Enable'} snapping`}
    >
      <MagnetIcon size={16} />
    </button>
  );
};
```

### 6. Snap Configuration Panel

Create a panel for configuring snap settings:

```tsx
const SnapConfigPanel = () => {
  return (
    <div className="p-4 bg-white shadow rounded">
      <h3 className="font-medium mb-3">Snap Settings</h3>
      
      <div className="mb-3">
        <label className="block text-sm mb-1">Grid Size (frames)</label>
        <input
          type="range"
          min="1"
          max="30"
          value={snapConfig.gridSize}
          onChange={e => setSnapConfig(prev => ({ 
            ...prev, 
            gridSize: parseInt(e.target.value) 
          }))}
          className="w-full"
        />
        <div className="text-xs text-right">{snapConfig.gridSize} frames</div>
      </div>
      
      <div className="mb-3">
        <label className="block text-sm mb-1">Snap Threshold (pixels)</label>
        <input
          type="range"
          min="1"
          max="20"
          value={snapConfig.threshold}
          onChange={e => setSnapConfig(prev => ({ 
            ...prev, 
            threshold: parseInt(e.target.value) 
          }))}
          className="w-full"
        />
        <div className="text-xs text-right">{snapConfig.threshold} pixels</div>
      </div>
    </div>
  );
};
```

## Implementation Strategy

### 1. Extend the TimelineContext

Add snap configuration and active guides to the TimelineContext:

```tsx
// Add to TimelineContextType
snapConfig: SnapConfig;
setSnapConfig: (config: SnapConfig | ((prev: SnapConfig) => SnapConfig)) => void;
activeSnapGuides: { vertical: number[]; horizontal: number[] };
setActiveSnapGuides: (guides: { vertical: number[]; horizontal: number[] }) => void;
```

### 2. Enhance the useTimelineDrag Hook

Modify the existing hook to incorporate snapping logic:

```tsx
// Inside useTimelineDrag.tsx
const useTimelineDrag = (/* existing params */) => {
  // ... existing code
  
  const { snapConfig, setActiveSnapGuides } = useTimeline();
  
  const handleDragStart = useCallback((/* params */) => {
    // ... existing code
  }, [/* deps */]);
  
  const handleDrag = useCallback((/* params */) => {
    // ... existing positioning code
    
    // Apply snapping if enabled
    if (snapConfig.enabled) {
      // Grid snapping
      const gridSnappedX = calculateSnapPosition(rawPositionX);
      
      // Item edge snapping
      const edgeSnappedX = snapToItemEdges(gridSnappedX, draggedItem.id);
      
      // Playhead snapping
      const finalX = snapToPlayhead(edgeSnappedX);
      
      // Set position to snapped value
      positionX = finalX;
      
      // Show visual guides if snapping occurred
      if (finalX !== rawPositionX) {
        setActiveSnapGuides(prev => ({
          ...prev,
          vertical: [...prev.vertical, finalX]
        }));
      }
    }
    
    // ... continue with existing drag logic
  }, [/* deps */]);
  
  const handleDragEnd = useCallback((/* params */) => {
    // Clear snap guides
    setActiveSnapGuides({ vertical: [], horizontal: [] });
    
    // ... existing code
  }, [/* deps */]);
  
  // ... return values
};
```

### 3. Render Snap Guides

Update the Timeline component to render snap guides:

```tsx
// Inside Timeline.tsx
const Timeline = () => {
  const { /* existing context values */, activeSnapGuides } = useTimeline();
  
  return (
    <div className="timeline-container relative">
      {/* Existing timeline content */}
      
      {/* Snap guides */}
      {activeSnapGuides.vertical.map((position, index) => (
        <div
          key={`v-guide-${index}`}
          className="absolute top-0 bottom-0 w-px bg-blue-500 pointer-events-none z-50"
          style={{ left: `${position}px` }}
        />
      ))}
      {activeSnapGuides.horizontal.map((position, index) => (
        <div
          key={`h-guide-${index}`}
          className="absolute left-0 right-0 h-px bg-blue-500 pointer-events-none z-50"
          style={{ top: `${position}px` }}
        />
      ))}
    </div>
  );
};
```

### 4. Add Timeline Controls

Add snap controls to the timeline header:

```tsx
// Inside TimelineHeader.tsx
const TimelineHeader = () => {
  const { snapConfig, setSnapConfig } = useTimeline();
  const [showSnapConfig, setShowSnapConfig] = useState(false);
  
  return (
    <div className="timeline-header flex items-center">
      {/* Existing header content */}
      
      <div className="ml-auto flex items-center gap-2">
        <button
          className={`p-2 rounded ${snapConfig.enabled ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setSnapConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
          title={`${snapConfig.enabled ? 'Disable' : 'Enable'} snapping`}
        >
          <MagnetIcon size={16} />
        </button>
        
        <button
          className="p-2 rounded bg-gray-100 hover:bg-gray-200"
          onClick={() => setShowSnapConfig(!showSnapConfig)}
          title="Snap settings"
        >
          <SettingsIcon size={16} />
        </button>
      </div>
      
      {showSnapConfig && (
        <div className="absolute right-0 top-full mt-1 z-10">
          <SnapConfigPanel />
        </div>
      )}
    </div>
  );
};
```

## Technical Considerations

1. **Performance**: Snapping calculations should be optimized to avoid impacting drag performance. Consider:
   - Limiting the number of edges checked for item edge snapping
   - Debouncing or throttling snap calculations during rapid movement
   - Using `requestAnimationFrame` for smoother visual updates

2. **Undo/Redo Support**: Ensure that snapped item movements are properly recorded in the undo/redo system:
   - Store the final snapped position in the undo history
   - Make sure the final position reflects the snapped position, not the raw drag position

3. **Multiple Selection**: When implementing multi-selection support, extend snapping to work with multiple selected items:
   - Consider the bounding box of the selection for snapping
   - Maintain relative positions between selected items when snapping

## Implementation Timeline

1. Update TimelineContext with snap configuration - 0.5 day
2. Implement grid snapping in useTimelineDrag - 0.5 day
3. Add item edge snapping - 1 day
4. Create visual snap guides - 0.5 day
5. Implement snap toggle and configuration UI - 0.5 day
6. Testing and refinement - 1 day

Total estimated time: 4 days 