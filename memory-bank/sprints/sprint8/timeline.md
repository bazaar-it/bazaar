We can dramatically beef up our timeline by re‐using the core hooks and helpers from your "react-video-editor-pro" package. Roughly the work will look like this:

Pull over the timeline hooks:
• useTimelineClick (for click-to-seek)
• useTimelineZoom (wheel zoom + keeping cursor position stable)
• useTimelineDragAndDrop (move/resize with collision detection)
• your visible-rows/overlays hooks if you want dynamic row management
Adapt them to our types and wire them into our TimelineContext:
– In TimelineProvider, call each hook, feed it our timelineRef, items, durationInFrames, dragInfoRef, etc.
– Expose back out: handleTimelineClick, handleWheelZoom, handleDragStart, handleDrag, handleDragEnd alongside the existing actions (select, seek, updateItem, etc.)
In TimelinePanel/Timeline:
– Attach onClick=handleTimelineClick and onWheel=handleWheelZoom to the container
– OnMouseMove/Mou­seUp at the document level, forward to handleDrag/handleDragEnd when isDragging
– Replace our ad-hoc drag logic in Timeline with the pro hook's functions
Tweak TimelineGrid/TimelineItem to use the new context callbacks instead of the internal ones.


# Timeline Duration Validation Issue & Feature Enhancement Plan

Looking at the error logs, I can see you're experiencing validation failures when manipulating timeline items, particularly around scene durations. This is a common issue when implementing advanced timeline functionality.

## Root Cause Analysis

The error `durationInFrames must be positive, but got 0` occurs because:

1. Your Zod schema validation (`inputPropsSchema`) enforces that scene durations must be ≥ 1
2. During timeline operations (likely drag/resize), your current implementation occasionally produces patches that set `scenes[x].duration` to 0
3. When these patches hit your server, they fail validation at `src/server/api/routers/video.ts:57`

This typically happens when:
- A timeline item is resized to be too small
- An item is dragged to the end of another item, leaving no space
- Edge cases in drag algorithms produce zero-width results

## Two-Part Solution

### 1. Immediate Timeline Validation Fix

We need to implement client-side validation in the timeline hooks to prevent these invalid states:

```typescript
// Add to useTimelineDragAndDrop.ts
const validateResize = (item: TimelineItemUnion, newStart: number, newDuration: number): boolean => {
  // Enforce minimum duration (should match server validation)
  if (newDuration < 1) {
    return false;
  }
  
  // Additional validations can be added here
  
  return true;
};

// Then use this in the handleResize function
const handleResize = (itemId: number, edge: 'start' | 'end', newPosition: number) => {
  // Calculate new values...
  
  // Validate before applying
  if (!validateResize(item, newStart, newDuration)) {
    return; // Prevent the invalid operation
  }
  
  // Apply valid changes...
};
```

### 2. Enhanced Timeline Features Implementation

Let's integrate this fix into our broader timeline enhancement plan:

## Updated Implementation Tickets with Validation Focus

### Ticket 1: Timeline Validation Framework

**Description:**
Create a robust validation framework for timeline operations to prevent invalid states and provide user feedback.

**Tasks:**
- [ ] Create `src/hooks/timeline/useTimelineValidation.ts` with core validation functions
- [ ] Implement `validateDuration`, `validatePosition`, and `validateOverlap` functions
- [ ] Add visual feedback for invalid operations (red highlighting, cursor changes)
- [ ] Create a "snap to minimum duration" feature for resize operations
- [ ] Add configurable minimum duration setting to TimelineContext

**Acceptance Criteria:**
- Operations that would result in duration < 1 are prevented
- User receives visual feedback about why an operation was rejected
- Timeline operations generate only valid JSON patches
- All validations match server-side Zod schema rules

**Estimate:** 2 days

### Ticket 2: Timeline Hook Integration with Validation

**Description:**
Port core hooks from react-video-editor-pro and integrate validation framework to ensure robust operation.

**Tasks:**
- [ ] Create core hooks with validation integration:
  - `useTimelineClick.ts`
  - `useTimelineZoom.ts`
  - `useTimelineDragAndDrop.ts` (with validation checks)
- [ ] Add "constraint checking" to drag operations (minimum duration, bounds)
- [ ] Implement collision handling with proper spacing logic
- [ ] Add "smart resize" with auto-adjustment to valid durations

**Acceptance Criteria:**
- Timeline operations maintain minimum 1 frame duration
- Resize handles prevent items from becoming too small
- Dragging near edges automatically snaps to valid positions
- No validation errors occur during normal timeline operations

**Estimate:** 3 days

### Ticket 3: Visual Timeline Item Enhancements

**Description:**
Enhance visual representation of timeline items with better feedback and styling.

**Tasks:**
- [ ] Add duration indicators directly on timeline items
- [ ] Create visual thumbnails for different scene types
- [ ] Implement hover states with property information
- [ ] Add min-width visual indicator for resize operations
- [ ] Create a selection outline with resize handles

**Acceptance Criteria:**
- Timeline items show accurate duration information
- Users can see visual feedback during resize operations
- Minimum duration is clearly indicated when resizing
- Items have type-specific styling and thumbnails

**Estimate:** 2 days

### Ticket 4: Timeline-to-Chat Integration

**Description:**
Implement the ability to drag scenes from timeline to chat for AI-powered editing.

**Tasks:**
- [ ] Add drag source handlers to TimelineItem
- [ ] Create drop target in ChatPanel
- [ ] Implement item property extraction for the chat context
- [ ] Add scene reference storage in chat messages
- [ ] Create visual feedback during drag operations

**Acceptance Criteria:**
- Users can drag valid timeline items to chat area
- Scene properties are included in the chat context
- AI receives accurate scene information for editing
- Generated patches correctly reference the original scene

**Estimate:** 2 days

### Ticket 5: Collision and Multi-Item Operations

**Description:**
Implement advanced collision detection and handling for timeline operations.

**Tasks:**
- [ ] Create collision detection algorithm with min-spacing rules
- [ ] Implement "push or split" behavior for item collisions
- [ ] Add group selection and bulk item operations
- [ ] Create item reordering between tracks with validation

**Acceptance Criteria:**
- Items maintain proper spacing on the same track
- Colliding items trigger appropriate resolution behavior
- Multi-item operations preserve all validation rules
- Track reordering respects minimum durations

**Estimate:** 3 days

## Example Timeline Item Component Enhancement

Here's a snippet of how to enhance the `TimelineItem` component with better visual feedback:

```tsx
// src/components/client/Timeline/TimelineItem.tsx enhancement
const TimelineItem: React.FC<TimelineItemProps> = ({
  item,
  isSelected,
  isDragging,
  durationInFrames,
  onClick,
  onDragStart,
  onDragToChat,
  currentFrame,
  zoomLevel,
}) => {
  // Calculate if this item is currently too small (near minimum size)
  const isNearMinimumSize = item.duration <= 5; // 5 frames as warning threshold
  
  // Get item color based on type and state
  const getItemColor = () => {
    if (isNearMinimumSize) return 'bg-yellow-500/80'; // Warning color
    if (isSelected) return 'bg-blue-500/80';
    
    // Type-specific colors
    switch (item.type) {
      case 'text': return 'bg-gradient-to-r from-purple-500/70 to-purple-600/70';
      case 'image': return 'bg-gradient-to-r from-green-500/70 to-green-600/70';
      case 'custom': return 'bg-gradient-to-r from-amber-500/70 to-amber-600/70';
      default: return 'bg-gray-500/70';
    }
  };
  
  return (
    <div
      className={`
        relative rounded-md shadow-md ${getItemColor()}
        ${isDragging ? 'ring-2 ring-white/50' : ''}
        ${isSelected ? 'ring-2 ring-blue-500' : ''}
        transition-shadow duration-150
      `}
      style={{
        left: `${item.start * zoomLevel}px`,
        width: `${Math.max(item.duration * zoomLevel, 20)}px`, // Enforce minimum visual width
        height: '40px',
      }}
      onClick={onClick}
    >
      {/* Item thumbnail/icon based on type */}
      <div className="absolute left-2 top-2 h-6 w-6 flex items-center justify-center">
        {getItemIcon(item.type)}
      </div>
      
      {/* Item title */}
      <div className="px-9 py-2 text-xs font-medium text-white truncate">
        {getItemTitle()}
      </div>
      
      {/* Duration indicator */}
      <div className="absolute right-2 bottom-1 text-xs text-white/80 font-mono">
        {formatDuration(item.duration)}
      </div>
      
      {/* Minimum size warning */}
      {isNearMinimumSize && (
        <div className="absolute right-3 top-2 text-yellow-200">
          <Tooltip content="This item is near minimum size">
            <ExclamationIcon className="h-4 w-4" />
          </Tooltip>
        </div>
      )}
      
      {/* Resize handles */}
      <div 
        className="absolute left-0 top-0 w-1.5 h-full cursor-ew-resize bg-white/20 hover:bg-white/40"
        onMouseDown={(e) => handleResizeStart(e, 'resize-start')}
      />
      <div 
        className="absolute right-0 top-0 w-1.5 h-full cursor-ew-resize bg-white/20 hover:bg-white/40"
        onMouseDown={(e) => handleResizeStart(e, 'resize-end')}
      />
    </div>
  );
};
```

## Next Steps

1. First, implement the validation framework to immediately fix the errors you're experiencing
2. Integrate the hooks from react-video-editor-pro with this validation framework
3. Enhance the visual components to provide better feedback
4. Implement the timeline-to-chat drag integration
5. Add the advanced collision detection

This approach ensures you'll have a robust, professional timeline that won't generate invalid JSON patches while also providing a great user experience.

Let me know if you'd like me to focus on any specific part of this plan in more detail, or if you need help implementing any particular component.

# Timeline Enhancements

Implementing features inspired by react-video-editor-pro, we need to enhance our timeline implementation with more professional features.

## Tasks

### 1. Refactor Timeline Context
- [x] Create a unified TimelineContext with proper state management.
- [x] Move all timeline-specific state and logic into context.
- [x] Ensure video state synchronization through the context.

### 2. Enhanced Zoom and Click Behavior
- [x] Implement `useTimelineZoom` hook for centralized zoom control.
- [x] Create `useTimelineClick` hook for timeline interactions.
- [x] Rewire TimelineGrid and TimelineItem to use the new context hooks.
- [x] Add better frame seeking, including keyboard shortcuts.
- [x] Implement zoom-around-cursor behavior for precision editing.

### 3. Item Drag and Drop
- [ ] Implement drag-to-reposition with snapping.
- [ ] Add resize from start/end of items.
- [ ] Add multi-track awareness (items on different tracks).
- [ ] Implement collision detection between items.
- [ ] Add visual feedback during drag operations.

### 4. Visual Improvements
- [ ] Improve timeline visuals with consistent styling.
- [ ] Add thumbnails for media items.
- [ ] Implement playhead marker with frame indicator.
- [ ] Add time markers with proper scaling at different zoom levels.
- [ ] Show item details overlay on hover/selection.

### 5. Advanced Features
- [ ] Enable drag-to-chat for AI editing.
- [ ] Add copy/paste of timeline items.
- [ ] Implement split functionality at current frame.
- [ ] Support nested timeline items (e.g., compositions).
- [ ] Add track locking/hiding functionality.

## Technical Notes

- Tweak TimelineGrid/TimelineItem to use the new context callbacks instead of the internal ones.
- Ensure all drag operations generate appropriate JSON patches for the video state.
- Optimize rendering performance by using React.memo and useMemo effectively.
- Add TypeScript interfaces for all timeline-related data structures.
- Follow accessibility guidelines for keyboard navigation and screen readers.

## Implementation Details

### useTimelineZoom Hook
The `useTimelineZoom` hook encapsulates zoom functionality with these features:
- Direct zoom methods (zoomIn, zoomOut, resetZoom)
- Zoom-around-cursor behavior for precise positioning
- Supports keyboard shortcuts (Ctrl+/-, Ctrl+0)
- Properly syncs zoom level with timeline width calculations

### useTimelineClick Hook
The `useTimelineClick` hook provides unified click handling with:
- Frame seeking via timeline clicks
- Item selection on click
- Navigation between items (next/previous)
- Finding items at a specific frame position
- Support for keyboard navigation

These hooks simplify the timeline components by:
1. Centralizing interaction logic in the context
2. Providing a consistent API across components
3. Ensuring proper state updates when interactions happen
4. Supporting better keyboard shortcuts and accessibility

Next steps will focus on improving the drag-and-drop implementation using these new hooks as a foundation.

# Timeline Drag-and-Drop Implementation

We've successfully implemented a robust drag-and-drop system for the timeline component, allowing users to easily manipulate video elements through a familiar interface. This implementation follows professional video editing UX patterns with a focus on validation and visual feedback.

## Core Components

### 1. useTimelineDrag Hook

The `useTimelineDrag` hook in TimelineContext.tsx now provides these capabilities:

- **Multiple Drag Operations**:
  - Move items by dragging the body
  - Resize from left edge (changes both position and duration)
  - Resize from right edge (changes only duration)

- **Visual Feedback During Drag**:
  - Ghost element shows proposed position/size
  - Color coding indicates valid vs. invalid operations
  - Smooth transitions for responsive feedback

- **Validation System**:
  - Prevents items becoming too small (min duration check)
  - Prevents extending beyond timeline bounds
  - Handles collision detection between items
  - Restricts to valid row ranges

- **Drag Context Tracking**:
  - Maintains state during drag operations
  - Preserves original position for cancellation
  - Properly cleans up event listeners
  - Uses pointer events for better cross-device support

### 2. Updated TimelineItem Component

The TimelineItem component now:

- Uses pointer events instead of mouse events for better cross-device support
- Connects directly with the timeline context drag hooks
- Provides distinct visual styles for selected and active states
- Shows visual feedback during drag operations
- Includes proper type handling for all cases
- Supports drag-to-chat operations for integrating with AI

### 3. Enhanced TimelineGrid Component

The TimelineGrid component has been updated to:

- Display the ghost item during drag operations
- Show a playhead marker for the current frame
- Provide visual track management controls
- Support multi-track operations with collision detection
- Implement proper event bubbling for complex interactions

## Implementation Details

The drag system follows this flow:

1. **Drag Start**: 
   - User presses pointer down on item or handle
   - We capture initial position, dimensions, and drag type
   - Set up ghost element at starting position
   - Add event listeners to document for move/end

2. **Drag Move**:
   - Track pointer movement and translate to timeline coordinates
   - Update ghost position in real-time
   - Validate proposed position against constraints
   - Provide visual feedback on validity

3. **Drag End**:
   - Apply the change to the actual timeline item
   - Run validation one more time to ensure final position is valid
   - Clamp to valid ranges if needed
   - Remove event listeners
   - Clean up drag state

This implementation creates a seamless editing experience while ensuring all timeline operations maintain data integrity.

## Recent Fixes

- Fixed type errors in TimelineItem.tsx with proper type assertions for the default case
- Removed duplicate function declarations in TimelineContext.tsx that were causing "Cannot redeclare block-scoped variable" errors
- Improved collision detection logic to more accurately find gaps in timeline rows
- Enhanced visual feedback during invalid drag operations with color coding
- Optimized pointer event handling for better performance

## Next Steps

- Implement drag snapping to align items to time markers or other items
- Add keyboard shortcuts for finer control of timeline manipulation
- Implement multi-select and group operations for items
- Create undo/redo functionality for timeline operations
- Add item splitting functionality at the current playhead position

## 2025-05-06: Timeline Enhancements Summary

### What Was Done

- Integrated core hooks (`useTimelineClick`, `useTimelineZoom`, `useTimelineDragAndDrop`) for click-to-seek, zoom, and drag/resize with collision detection.
- Added client-side validation in drag/resize to prevent zero-duration and overlapping items, with visual feedback (`invalidDragOperation`).
- Improved scene insertion logic to clamp row placement and find gaps, avoiding unwanted new rows.
- Enhanced real-time scene planning in chat with RxJS `Subject` emitter, streaming status updates (`scenePlan`, `sceneStatus`, `building`, `error`).
- Extended server-side chat router to persist `lastScenePlan`, handle dynamic FPS, and support fallback flows on component generation errors.
- Implemented patch validation using Zod schemas before applying JSON-Patch operations, ensuring integrity and duration limits.

### Consequences

- Dragging/resizing now prevents invalid timeline states, improving UX and blocking zero-length or overlapping scenes.
- Zoom and click interactions align precisely with player frames, enhancing control.
- Real-time planning feedback stream guides users during video composition and surfaces errors early.
- Server persisting plan metadata enables auditability and potential plan restoration.
- Patch validation reduces runtime failures and enforces scene count/duration constraints.

### Next Steps

2. Enhance UI feedback: visually highlight gaps, invalid drop zones, and support undo/redo of timeline edits.
3. Expose tRPC mutations for timeline changes to persist updates server-side via `updateTimeline`.
4. Optimize rendering for large timelines (e.g., row virtualization, memoization).
5. Extend error handling: surface in-app notifications for scene generation failures and patch validation errors.
