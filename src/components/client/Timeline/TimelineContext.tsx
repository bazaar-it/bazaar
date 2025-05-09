//src/components/client/Timeline/TimelineContext.tsx
"use client";

import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { 
  type TimelineItemUnion,
  type DragInfo,
  type GhostPosition,
  TimelineItemType,
  type TextItem,
  type ImageItem,
  type CustomItem,
  type VideoItem,
  type AudioItem,
  type TimelineContextState,
  type TimelineActions
} from '~/types/timeline';
import { useVideoState } from '~/stores/videoState';
import {
  validateDuration,
  validateStart,
  validateRow,
  validateOverlap
} from '~/hooks/useTimelineValidation';

/**
 * Combined interface for the timeline context
 */
interface TimelineContextValue extends TimelineContextState, TimelineActions {
  // Additional properties needed for bidirectional sync with player
  dragInfoRef: React.RefObject<DragInfo | null>;
  ghostPosition: GhostPosition;
  isDragging: boolean;
  playerRef: React.RefObject<any>;
  timelineRef: React.RefObject<HTMLDivElement>;
  setGhostPosition: React.Dispatch<React.SetStateAction<GhostPosition>>;
  setIsDragging: React.Dispatch<React.SetStateAction<boolean>>;
  setInvalidDragOperation: React.Dispatch<React.SetStateAction<boolean>>;
  setPlayerRef: (ref: any) => void;
  seekToFrame: (frame: number) => void;
  setIsPlaying: (playing: boolean) => void;
  findGapsInRow: (row: number, itemWidth: number, itemId: number) => {start: number, end: number} | undefined;
  selectItem: (id: number | null) => void;
  handleWheelZoom: (e: WheelEvent, clientX: number) => void;
  handleTimelineClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  
  // Timeline positioning utilities
  pixelsPerFrame: number;
  frameToX: (frame: number) => number;
  xToFrame: (x: number) => number;
  rowToY: (row: number) => number;
  yToRow: (y: number) => number;
  
  // Enhanced drag and drop functionality
  handleItemDragStart: (item: TimelineItemUnion, clientX: number, clientY: number, actionType: 'move' | 'resize-left' | 'resize-right') => void;
  handleItemDrag: (clientX: number, clientY: number) => void;
  handleItemDragEnd: () => void;
  
  // New method to update timeline based on scene plan
  updateFromScenePlan: (scenes: Array<{id: string, type: string, durationInFrames: number}>) => void;
}

// Create context with default empty state
const TimelineContext = createContext<TimelineContextValue | null>(null);

// Export context for use in other components
export { TimelineContext };

/**
 * Timeline provider props
 */
interface TimelineProviderProps {
  children: React.ReactNode;
  initialItems?: TimelineItemUnion[];
  initialDuration?: number;
}

/**
 * Provider component for timeline state and actions
 */
export const TimelineProvider: React.FC<TimelineProviderProps> = ({
  children,
  initialItems = [],
  initialDuration = 300, // 10 seconds at 30fps by default
}) => {
  // State
  const [items, setItems] = useState<TimelineItemUnion[]>(initialItems);
  // Sync items when initialItems prop changes
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  
  // Select item handler
  const selectItem = useCallback((id: number | null) => {
    setSelectedItemId(id);
  }, []);
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [durationInFrames, setDurationInFrames] = useState<number>(initialDuration);
  // Sync duration when initialDuration prop changes
  useEffect(() => {
    setDurationInFrames(initialDuration);
  }, [initialDuration]);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [scrollPosition, setScrollPosition] = useState<number>(0);
  const [ghostPosition, setGhostPosition] = useState<GhostPosition>({
    left: 0,
    width: 0,
    row: 0
  });
  const [isDragging, setIsDragging] = useState(false);
  
  // Validation settings
  const [minDuration] = useState(1); // Mirror server-side validation
  const [maxRows] = useState(10); // Maximum number of timeline tracks
  const [invalidDragOperation, setInvalidDragOperation] = useState(false);
  
  // Refs
  const timelineRef = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;
  const playerRef = useRef<any>(null);
  const dragInfoRef = useRef<DragInfo | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const isPlayingRef = useRef(false);

  // Get videoState to sync with overall application state
  const { getCurrentProps, replace } = useVideoState();

  // Wheel zoom handler - zooms around mouse position
  const handleWheelZoom = useCallback((e: WheelEvent, clientX: number) => {
    e.preventDefault(); // Prevent browser zooming
    
    if (!timelineRef.current) return;
    
    // Calculate zoom amount based on wheel delta
    const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
    let newZoom = zoomLevel + zoomDelta;
    newZoom = Math.max(0.5, Math.min(newZoom, 5)); // Clamp zoom level
    
    // Calculate zoom point relative to timeline
    const rect = timelineRef.current.getBoundingClientRect();
    const zoomPoint = clientX - rect.left;
    
    // Calculate how the scroll position needs to change to keep the zoom point stationary
    const zoomRatio = newZoom / zoomLevel;
    const newScroll = scrollPosition * zoomRatio + (zoomPoint - zoomPoint * zoomRatio);
    
    // Update state
    setZoomLevel(newZoom);
    setScrollPosition(newScroll);
  }, [zoomLevel, scrollPosition]);

  // Timeline positioning utilities
  // Calculate pixels per frame based on timeline width and zoom level
  const pixelsPerFrame = useMemo(() => {
    const timelineWidth = timelineRef.current?.clientWidth || 1000;
    return (timelineWidth * zoomLevel) / durationInFrames;
  }, [durationInFrames, timelineRef, zoomLevel]);
  
  // Convert a frame number to X coordinate in pixels
  const frameToX = useCallback((frame: number): number => {
    return frame * pixelsPerFrame;
  }, [pixelsPerFrame]);
  
  // Convert an X coordinate in pixels to the nearest frame number
  const xToFrame = useCallback((x: number): number => {
    return Math.max(0, Math.min(durationInFrames, Math.round(x / pixelsPerFrame)));
  }, [durationInFrames, pixelsPerFrame]);
  
  // Convert a row number to Y coordinate in pixels
  const rowToY = useCallback((row: number): number => {
    const ROW_HEIGHT = 40; // Standard row height
    return row * ROW_HEIGHT;
  }, []);
  
  // Convert a Y coordinate in pixels to the nearest row number
  const yToRow = useCallback((y: number): number => {
    const ROW_HEIGHT = 40;
    return Math.max(0, Math.min(maxRows - 1, Math.floor(y / ROW_HEIGHT)));
  }, [maxRows]);

  // Timeline click handler for seeking
  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging || !timelineRef.current) return;
    
    // Get click position relative to timeline
    const timeline = timelineRef.current;
    const rect = timeline.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    
    // Use our new positioning utility to convert x coordinate to frame
    const targetFrame = xToFrame(relX);
    
    // Update timeline and player position
    setCurrentFrame(targetFrame);
    if (playerRef.current) {
      playerRef.current.seekTo(targetFrame);
    }
  }, [isDragging, xToFrame, setCurrentFrame, playerRef]);
  
  // Frame-accurate player sync using rAF
  useEffect(() => {
    if (!isPlayingRef.current || !playerRef.current) return;
    
    let lastTime = 0;
    const FPS = 30; // Match your video FPS
    const frameInterval = 1000 / FPS;
    
    const syncFrames = (timestamp: number) => {
      if (timestamp - lastTime >= frameInterval) {
        // Get current frame from player and update context
        if (playerRef.current) {
          const frame = playerRef.current.getCurrentFrame();
          setCurrentFrame(frame);
        }
        lastTime = timestamp;
      }
      
      rafIdRef.current = requestAnimationFrame(syncFrames);
    };
    
    rafIdRef.current = requestAnimationFrame(syncFrames);
    
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);
  
  // Action handlers
  const updateItem = useCallback((updatedItem: TimelineItemUnion) => {
    // Validate the item against our constraints
    const isValidDuration = validateDuration(updatedItem.durationInFrames, durationInFrames);
    const isValidStart = validateStart(updatedItem.from, updatedItem.durationInFrames, durationInFrames);
    const isValidRow = validateRow(updatedItem.row, maxRows);
    const isValidOverlap = validateOverlap(items, updatedItem);
    
    // If any validation fails, clamp the values to valid ranges
    if (!isValidDuration || !isValidStart || !isValidRow || !isValidOverlap) {
      // Create a copy to prevent modifying the original
      const clampedItem = { ...updatedItem };
      
      // Apply clamps
      if (!isValidDuration) {
        clampedItem.durationInFrames = Math.max(minDuration, Math.min(clampedItem.durationInFrames, durationInFrames));
      }
      
      if (!isValidStart) {
        // Ensure start ≥ 0 and item fits within totalDuration
        clampedItem.from = Math.max(0, Math.min(clampedItem.from, durationInFrames - clampedItem.durationInFrames));
      }
      
      if (!isValidRow) {
        // Clamp row to valid range
        clampedItem.row = Math.max(0, Math.min(clampedItem.row, maxRows - 1));
      }
      
      // Only for development debugging - remove for production
      console.debug(
        'Timeline validation active:\n' +
        `Item ${updatedItem.id}: ${isValidDuration ? '✓' : '✗'} Duration, ${isValidStart ? '✓' : '✗'} Start, ` +
        `${isValidRow ? '✓' : '✗'} Row, ${isValidOverlap ? '✓' : '✗'} Overlap`
      );
      
      // Set the UI feedback flag for invalid operation
      setInvalidDragOperation(true);
      
      // Reset the flag after a short delay
      setTimeout(() => setInvalidDragOperation(false), 1500);
      
      // Update with the clamped item
      setItems(prevItems => 
        prevItems.map(item => 
          item.id === clampedItem.id ? clampedItem : item
        )
      );
    } else {
      // All validations passed, update normally
      setInvalidDragOperation(false);
      setItems(prevItems => 
        prevItems.map(item => 
          item.id === updatedItem.id ? updatedItem : item
        )
      );
    }
  }, [items, durationInFrames, maxRows, minDuration]);

  const removeItem = useCallback((id: number) => {
    setItems(prevItems => prevItems.filter(item => item.id !== id));
  }, []);
  
  // Enhanced drag and drop functionality
  const handleItemDragStart = useCallback((item: TimelineItemUnion, clientX: number, clientY: number, actionType: 'move' | 'resize-left' | 'resize-right') => {
    // Set drag state
    setIsDragging(true);
    setInvalidDragOperation(false);
    
    // Map our action type to the expected dragType in DragInfo
    const dragType = actionType;
    
    // Calculate pixels per frame for the current zoom level
    const pxPerFrame = pixelsPerFrame;
    
    // Create drag info reference for tracking the operation
    dragInfoRef.current = {
      itemId: item.id,
      dragType: dragType,
      startX: clientX,
      startFrame: item.from,
      startDuration: item.durationInFrames,
      startRow: item.row,
      offsetX: 0,
      pixelsPerFrame: pxPerFrame
    };
    
    // Set up ghost element for visual feedback
    setGhostPosition({
      left: frameToX(item.from),
      width: frameToX(item.durationInFrames) - frameToX(0),
      row: item.row
    });
  }, [dragInfoRef, setIsDragging, setInvalidDragOperation, setGhostPosition, frameToX, pixelsPerFrame]);
  
  // Handle item dragging with enhanced position calculation
  const handleItemDrag = useCallback((clientX: number, clientY: number) => {
    if (!isDragging || !dragInfoRef.current || !timelineRef.current) return;
    
    const { 
      itemId, 
      dragType, 
      startFrame, 
      startDuration, 
      startRow,
      startX,
      pixelsPerFrame: pxPerFrame
    } = dragInfoRef.current;
    
    // Find the item being dragged
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    
    // Calculate the current position based on drag type
    let newFrame = startFrame;
    let newDuration = startDuration;
    let newRow = startRow;
    
    const timeline = timelineRef.current;
    const rect = timeline.getBoundingClientRect();
    
    if (dragType === 'move') {
      // Calculate horizontal drag distance and convert to frames
      const dragDistanceX = clientX - startX;
      const framesDragged = Math.round(dragDistanceX / pixelsPerFrame);
      newFrame = Math.max(0, startFrame + framesDragged);
      
      // Ensure item doesn't go beyond timeline bounds
      if (newFrame + newDuration > durationInFrames) {
        newFrame = durationInFrames - newDuration;
      }
      
      // Calculate new row based on vertical position
      const relY = clientY - rect.top;
      newRow = yToRow(relY);
    }
    else if (dragType === 'resize-left') {
      // Resizing from start point (left edge)
      const dragDistanceX = clientX - startX;
      const framesDragged = Math.round(dragDistanceX / pixelsPerFrame);
      
      // Limit to ensure minimum duration
      const maxFramesAdjustment = startDuration - minDuration;
      const clampedFramesDragged = Math.max(-startFrame, Math.min(maxFramesAdjustment, framesDragged));
      
      newFrame = startFrame + clampedFramesDragged;
      newDuration = startDuration - clampedFramesDragged;
    }
    else if (dragType === 'resize-right') {
      // Resizing from end point (right edge)
      const dragDistanceX = clientX - startX;
      const framesDragged = Math.round(dragDistanceX / pixelsPerFrame);
      
      // Ensure minimum duration and that we don't exceed timeline bounds
      newDuration = Math.max(minDuration, startDuration + framesDragged);
      
      // Don't extend beyond timeline duration
      if (newFrame + newDuration > durationInFrames) {
        newDuration = durationInFrames - newFrame;
      }
    }
    
    // Update the drag info with current values
    dragInfoRef.current = {
      ...dragInfoRef.current,
      currentFrame: newFrame,
      currentDuration: newDuration,
      currentRow: newRow
    };
    
    // Check for overlap to provide visual feedback
    const draggedItem = { ...item, from: newFrame, durationInFrames: newDuration, row: newRow };
    const overlaps = !validateOverlap(items, draggedItem);
    setInvalidDragOperation(overlaps);
    
    // Update ghost element for visual feedback
    setGhostPosition({
      left: frameToX(newFrame),
      width: frameToX(newDuration) - frameToX(0),
      row: newRow
    });
  }, [isDragging, dragInfoRef, items, timelineRef, durationInFrames, minDuration, pixelsPerFrame, 
      validateOverlap, setInvalidDragOperation, setGhostPosition, frameToX, yToRow]);
  
  // Handle drag end with validation
  const handleItemDragEnd = useCallback(() => {
    if (!isDragging || !dragInfoRef.current) {
      setIsDragging(false);
      setGhostPosition({ left: 0, width: 0 }); // Reset ghost position
      return;
    }
    
    const { 
      itemId, 
      currentFrame = dragInfoRef.current.startFrame, 
      currentDuration = dragInfoRef.current.startDuration, 
      currentRow = dragInfoRef.current.startRow 
    } = dragInfoRef.current;
    
    // Reset UI state regardless of outcome
    setIsDragging(false);
    setGhostPosition({ left: 0, width: 0 }); // Reset ghost position
    
    // Find the item being dragged
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    
    // Create updated item with new position
    const updatedItem = { 
      ...item, 
      from: currentFrame, 
      durationInFrames: currentDuration, 
      row: currentRow 
    };
    
    // Apply the update which will handle additional validation
    updateItem(updatedItem);
    
    // Clear drag info
    dragInfoRef.current = null;
  }, [isDragging, dragInfoRef, items, updateItem, setIsDragging, setGhostPosition]);
  
  // Start and stop player sync loop
  const setIsPlaying = useCallback((playing: boolean) => {
    isPlayingRef.current = playing;
  }, []);
  
  // Set player ref for bidirectional sync
  const setPlayerRef = useCallback((ref: any) => {
    playerRef.current = ref;
  }, []);
  
  // Seek player to a specific frame
  const seekToFrame = useCallback((frame: number) => {
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(frame);
      setCurrentFrame(frame);
    }
  }, []);

  // Find gaps in a row to avoid overlaps (collision detection)
  const findGapsInRow = useCallback((row: number, itemWidth: number, itemId: number) => {
    // Get all items in this row except the current dragged item
    const itemsInRow = items.filter(item => 
      item.row === row && item.id !== itemId
    );
    
    // Sort by 'from' position
    const sortedItems = [...itemsInRow].sort((a, b) => a.from - b.from);
    
    // Find all gaps between items
    const gaps: { start: number, end: number }[] = [];
    
    // First gap: from 0 to first item
    if (sortedItems.length === 0) {
      // No items in row, entire timeline is available
      gaps.push({ start: 0, end: durationInFrames });
    } else {
      // Add gap from 0 to first item if it exists
      const firstItem = sortedItems[0];
      if (firstItem && firstItem.from > 0) {
        gaps.push({ start: 0, end: firstItem.from });
      }
      
      // Add gaps between items
      for (let i = 0; i < sortedItems.length - 1; i++) {
        const currentItem = sortedItems[i];
        const nextItem = sortedItems[i + 1];
        
        if (currentItem && nextItem) {
          const currentEnd = currentItem.from + currentItem.durationInFrames;
          const nextStart = nextItem.from;
          
          if (nextStart > currentEnd) {
            gaps.push({ start: currentEnd, end: nextStart });
          }
        }
      }
      
      // Add gap after last item if it exists
      if (sortedItems.length > 0) {
        const lastItem = sortedItems[sortedItems.length - 1];
        if (lastItem) {
          const lastItemEnd = lastItem.from + lastItem.durationInFrames;
          
          if (lastItemEnd < durationInFrames) {
            gaps.push({ start: lastItemEnd, end: durationInFrames });
          }
        }
      }
    }
    
    // Find first gap that can fit the item
    return gaps.find(gap => gap.end - gap.start >= itemWidth);
  }, [items, durationInFrames]);
  
  // Now that findGapsInRow is defined, define addItem which depends on it
  const addItem = useCallback((newItem: TimelineItemUnion) => {
    // Validate the new item before adding
    const isValidDuration = validateDuration(newItem.durationInFrames, durationInFrames);
    const isValidStart = validateStart(newItem.from, newItem.durationInFrames, durationInFrames);
    const isValidRow = validateRow(newItem.row, maxRows);
    const isValidOverlap = validateOverlap(items, newItem);
    
    // If any validation fails, clamp the values to valid ranges
    if (!isValidDuration || !isValidStart || !isValidRow || !isValidOverlap) {
      // Create a copy to prevent modifying the original
      const clampedItem = { ...newItem };
      
      // Apply clamps
      if (!isValidDuration) {
        clampedItem.durationInFrames = Math.max(minDuration, Math.min(clampedItem.durationInFrames, durationInFrames));
      }
      
      if (!isValidStart) {
        // Ensure start ≥ 0 and item fits within totalDuration
        clampedItem.from = Math.max(0, Math.min(clampedItem.from, durationInFrames - clampedItem.durationInFrames));
      }
      
      if (!isValidRow) {
        // Clamp row to valid range
        clampedItem.row = Math.max(0, Math.min(clampedItem.row, maxRows - 1));
      }
      
      // For overlaps, we'll just add to the next available row or the end
      if (!isValidOverlap) {
        // Try to find first gap that fits
        const gap = findGapsInRow(clampedItem.row, clampedItem.durationInFrames, clampedItem.id);
        if (gap) {
          clampedItem.from = gap.start;
        } else {
          // No gap found, move to next row or append at end
          clampedItem.row = Math.min(clampedItem.row + 1, maxRows - 1);
        }
      }
      
      setItems(prevItems => [...prevItems, clampedItem]);
    } else {
      // All validations passed, add normally
      setItems(prevItems => [...prevItems, newItem]);
    }
  }, [items, durationInFrames, maxRows, minDuration, findGapsInRow]);
  
  // New method to update timeline based on scene plan
  const updateFromScenePlan = useCallback((scenes: Array<{id: string, type: string, durationInFrames: number}>) => {
    // Convert scene plan format to timeline items
    const newItems: TimelineItemUnion[] = scenes.map((scene, index) => {
      // Calculate position based on previous scenes
      const from = scenes.slice(0, index).reduce((acc, s) => acc + s.durationInFrames, 0);
      
      const sceneType = mapSceneTypeToTimelineType(scene.type);
      
      // Create base timeline item with common properties
      const baseItem = {
        id: parseInt(scene.id.replace(/\D/g, '')) || index + 1,
        type: sceneType,
        from,
        durationInFrames: scene.durationInFrames,
        row: 0,
        sceneId: scene.id,
        status: 'valid' as const,
      };
      
      // Create specific item based on type
      switch (sceneType) {
        case TimelineItemType.TEXT:
          return {
            ...baseItem,
            type: TimelineItemType.TEXT,
            content: `Scene ${index + 1}: ${scene.type}`,
          } as TextItem;
          
        case TimelineItemType.IMAGE:
          return {
            ...baseItem,
            type: TimelineItemType.IMAGE,
            src: '',
          } as ImageItem;
          
        case TimelineItemType.CUSTOM:
          return {
            ...baseItem,
            type: TimelineItemType.CUSTOM,
            componentId: scene.id,
            name: `Scene ${index + 1}: ${scene.type}`,
            outputUrl: '',
          } as CustomItem;
          
        case TimelineItemType.VIDEO:
          return {
            ...baseItem,
            type: TimelineItemType.VIDEO,
            src: '',
          } as VideoItem;
          
        case TimelineItemType.AUDIO:
          return {
            ...baseItem,
            type: TimelineItemType.AUDIO,
            src: '',
          } as AudioItem;
          
        default:
          // Default to CUSTOM if no matching type
          return {
            ...baseItem,
            type: TimelineItemType.CUSTOM,
            componentId: scene.id,
            name: `Scene ${index + 1}: ${scene.type}`,
            outputUrl: '',
          } as CustomItem;
      }
    });
    
    // Update timeline items with new ones from scene plan
    setItems(newItems);
    
    // Update total duration
    const newDuration = newItems.reduce((max, item) => Math.max(max, item.from + item.durationInFrames), 0);
    setDurationInFrames(newDuration);
    
    // Select first item by default
    if (newItems.length > 0 && newItems[0]) {
      selectItem(newItems[0].id);
    }
    
    console.log("Timeline updated from scene plan:", newItems);
  }, [selectItem]);
  
  // Helper function to map scene types to timeline item types
  const mapSceneTypeToTimelineType = useCallback((sceneType: string): TimelineItemType => {
    switch (sceneType.toLowerCase()) {
      case 'text':
        return TimelineItemType.TEXT;
      case 'image':
        return TimelineItemType.IMAGE;
      case 'custom':
        return TimelineItemType.CUSTOM;
      case 'background-color':
      case 'color':
        return TimelineItemType.CUSTOM;
      case 'video':
        return TimelineItemType.VIDEO;
      case 'audio':
        return TimelineItemType.AUDIO;
      // Add more mappings as needed
      default:
        return TimelineItemType.CUSTOM;
    }
  }, []);
  
  // Combine state and actions for context value
  const contextValue: TimelineContextValue = {
    // State
    items,
    selectedItemId,
    currentFrame,
    durationInFrames,
    zoomLevel,
    scrollPosition,
    ghostPosition,
    dragInfoRef,
    playerRef,
    timelineRef,
    isDragging,
    minDuration,
    maxRows,
    invalidDragOperation,
    setInvalidDragOperation,
    // Actions
    setItems,
    setSelectedItemId,
    addItem,
    removeItem,
    updateItem,
    selectItem: selectItem,
    setCurrentFrame,
    setDurationInFrames,
    setZoomLevel,
    setScrollPosition,
    setGhostPosition,
    setIsDragging,
    setPlayerRef,
    seekToFrame,
    setIsPlaying,
    findGapsInRow,
    // Hook callbacks
    handleWheelZoom,
    handleTimelineClick,
    
    // Timeline positioning utilities
    pixelsPerFrame,
    frameToX,
    xToFrame,
    rowToY,
    yToRow,
    
    // Enhanced drag and drop functions
    handleItemDragStart,
    handleItemDrag,
    handleItemDragEnd,
    
    // New method for scene plan integration
    updateFromScenePlan,
  };

  return (
    <TimelineContext.Provider value={contextValue}>
      {children}
    </TimelineContext.Provider>
  );
};

/**
 * Custom hook to access timeline context
 */
export const useTimeline = () => {
  const context = useContext(TimelineContext);
  if (!context) {
    throw new Error('useTimeline must be used within a TimelineProvider');
  }
  return context;
};

/**
 * Custom hook for timeline zoom functionality
 * Wraps the zoom behavior from context in an easy-to-use interface
 * with enhanced zoom precision and frame-focused zooming
 */
export const useTimelineZoom = () => {
  const context = useTimeline();
  if (!context) throw new Error('useTimelineZoom must be used within a TimelineProvider');
  
  const { 
    zoomLevel, 
    setZoomLevel, 
    scrollPosition, 
    setScrollPosition, 
    handleWheelZoom, 
    durationInFrames,
    timelineRef 
  } = context;
  
  // Constants for zoom constraints
  const ZOOM_CONSTRAINTS = {
    min: 0.5,    // Minimum zoom level (zoomed out)
    max: 5,      // Maximum zoom level (zoomed in)
    default: 1,  // Default zoom level
    step: 0.1,   // Standard zoom step
  };
  
  // Direct zoom methods with improved behavior
  const zoomIn = useCallback(() => {
    const newZoom = Math.min(ZOOM_CONSTRAINTS.max, zoomLevel + ZOOM_CONSTRAINTS.step);
    
    // Only update if actually changing
    if (newZoom === zoomLevel) return;
    
    // Get current view center point before zooming
    const timeline = timelineRef?.current;
    if (!timeline) {
      setZoomLevel(newZoom);
      return;
    }
    
    const viewportWidth = timeline.clientWidth;
    const centerFramePosition = (scrollPosition + (viewportWidth / 2)) / (10 * zoomLevel);
    
    // Update zoom
    setZoomLevel(newZoom);
    
    // Adjust scroll to maintain center
    const newScrollPosition = (centerFramePosition * 10 * newZoom) - (viewportWidth / 2);
    setScrollPosition(Math.max(0, newScrollPosition));
  }, [zoomLevel, setZoomLevel, timelineRef, scrollPosition, setScrollPosition]);
  
  const zoomOut = useCallback(() => {
    const newZoom = Math.max(ZOOM_CONSTRAINTS.min, zoomLevel - ZOOM_CONSTRAINTS.step);
    
    // Only update if actually changing
    if (newZoom === zoomLevel) return;
    
    // Get current view center point before zooming
    const timeline = timelineRef?.current;
    if (!timeline) {
      setZoomLevel(newZoom);
      return;
    }
    
    const viewportWidth = timeline.clientWidth;
    const centerFramePosition = (scrollPosition + (viewportWidth / 2)) / (10 * zoomLevel);
    
    // Update zoom
    setZoomLevel(newZoom);
    
    // Adjust scroll to maintain center
    const newScrollPosition = (centerFramePosition * 10 * newZoom) - (viewportWidth / 2);
    setScrollPosition(Math.max(0, newScrollPosition));
  }, [zoomLevel, setZoomLevel, timelineRef, scrollPosition, setScrollPosition]);
  
  const resetZoom = useCallback(() => {
    setZoomLevel(ZOOM_CONSTRAINTS.default);
    setScrollPosition(0);
  }, [setZoomLevel, setScrollPosition]);
  
  // Focus the view on a specific frame with optimal zoom
  const zoomToFrame = useCallback((frameNumber: number, customZoomLevel?: number) => {
    const timeline = timelineRef?.current;
    if (!timeline) return;
    
    // Use provided zoom level or calculate a reasonable default
    const targetZoom = customZoomLevel || ZOOM_CONSTRAINTS.default * 1.5;
    const newZoom = Math.max(ZOOM_CONSTRAINTS.min, Math.min(targetZoom, ZOOM_CONSTRAINTS.max));
    
    // Set the new zoom level
    setZoomLevel(newZoom);
    
    // Center the view on the specified frame
    const pixelsPerFrame = 10 * newZoom;
    const frameOffset = frameNumber * pixelsPerFrame;
    const viewportWidth = timeline.clientWidth;
    
    // Set scroll position to center the frame
    const newScrollPosition = Math.max(0, frameOffset - (viewportWidth / 2));
    setScrollPosition(newScrollPosition);
  }, [timelineRef, setZoomLevel, setScrollPosition]);
  
  // Fit entire timeline in view
  const fitView = useCallback(() => {
    const timeline = timelineRef?.current;
    if (!timeline || !durationInFrames) return;
    
    const viewportWidth = timeline.clientWidth;
    const requiredWidth = durationInFrames * 10;
    const fitZoom = Math.max(ZOOM_CONSTRAINTS.min, viewportWidth / requiredWidth);
    
    setZoomLevel(fitZoom);
    setScrollPosition(0);
  }, [timelineRef, durationInFrames, setZoomLevel, setScrollPosition]);
  
  return {
    zoomLevel,
    scrollPosition,
    zoomIn,
    zoomOut,
    resetZoom,
    handleWheelZoom,
    zoomToFrame,
    fitView,
  };
};

/**
 * Custom hook for timeline click and seek functionality
 * Abstracts seeking and selection behaviors
 */
export const useTimelineClick = () => {
  const { 
    handleTimelineClick, 
    selectItem, 
    seekToFrame, 
    currentFrame, 
    items, 
    selectedItemId 
  } = useTimeline();
  
  // Find item at position
  const findItemAtFrame = useCallback((frame: number) => {
    return items.find(item => 
      frame >= item.from && frame < item.from + item.durationInFrames
    );
  }, [items]);
  
  // Select item at current frame
  const selectItemAtCurrentFrame = useCallback(() => {
    const item = findItemAtFrame(currentFrame);
    if (item) {
      selectItem(item.id);
      return true;
    }
    return false;
  }, [currentFrame, findItemAtFrame, selectItem]);
  
  // Go to next/previous item
  const goToNextItem = useCallback(() => {
    // Find next item after current position
    const nextItems = items
      .filter(item => item.from > currentFrame)
      .sort((a, b) => a.from - b.from);
    
    if (nextItems.length > 0) {
      const nextItem = nextItems[0];
      if (nextItem) {
        seekToFrame(nextItem.from);
        selectItem(nextItem.id);
        return true;
      }
    }
    return false;
  }, [currentFrame, items, seekToFrame, selectItem]);
  
  const goToPreviousItem = useCallback(() => {
    // Find previous items before current position
    const prevItems = items
      .filter(item => item.from + item.durationInFrames <= currentFrame)
      .sort((a, b) => (b.from + b.durationInFrames) - (a.from + a.durationInFrames));
    
    if (prevItems.length > 0) {
      const prevItem = prevItems[0];
      if (prevItem) {
        seekToFrame(prevItem.from);
        selectItem(prevItem.id);
        return true;
      }
    }
    return false;
  }, [currentFrame, items, seekToFrame, selectItem]);
  
  return {
    handleTimelineClick,
    selectItem,
    seekToFrame,
    selectItemAtCurrentFrame,
    goToNextItem,
    goToPreviousItem,
    findItemAtFrame,
    currentFrame,
    selectedItemId
  };
};

/**
 * Custom hook for timeline drag and drop functionality
 * Provides methods to handle item dragging, resizing, and validation
 */
export const useTimelineDrag = () => {
  const {
    items,
    updateItem,
    setIsDragging,
    ghostPosition,
    setGhostPosition,
    dragInfoRef,
    timelineRef,
    durationInFrames,
    zoomLevel,
    scrollPosition,
    findGapsInRow,
    selectItem,
    minDuration,
    maxRows,
    invalidDragOperation,
    setInvalidDragOperation
  } = useTimeline();

  // Calculate frame position from x coordinate
  const xToFrame = useCallback((x: number): number => {
    if (!timelineRef.current) return 0;
    
    const timelineRect = timelineRef.current.getBoundingClientRect();
    const timelineWidth = timelineRect.width;
    const pixelsPerFrame = (timelineWidth * zoomLevel) / durationInFrames;
    const frame = Math.max(0, Math.round((x + scrollPosition) / pixelsPerFrame));
    
    return frame;
  }, [timelineRef, durationInFrames, zoomLevel, scrollPosition]);

  // Start dragging an item
  const startDrag = useCallback((
    e: React.PointerEvent,
    itemId: number,
    dragType: 'move' | 'resize-left' | 'resize-right'
  ) => {
    e.stopPropagation();
    
    // Prevent text selection during drag
    document.body.style.userSelect = 'none';
    
    const item = items.find(i => i.id === itemId);
    if (!item || !timelineRef.current) return;
    
    // Select the item being dragged
    selectItem(itemId);
    
    // Set initial drag info
    const timelineRect = timelineRef.current.getBoundingClientRect();
    const pixelsPerFrame = (timelineRect.width * zoomLevel) / durationInFrames;
    
    const startX = e.clientX;
    const itemStartFrame = item.from;
    const itemEndFrame = item.from + item.durationInFrames;
    const offsetX = startX - (itemStartFrame * pixelsPerFrame) + scrollPosition;
    
    // Save initial state for reference during drag
    dragInfoRef.current = {
      itemId,
      dragType,
      startX,
      startFrame: item.from,
      startDuration: item.durationInFrames,
      startRow: item.row,
      offsetX: dragType === 'move' ? offsetX : 0,
      pixelsPerFrame
    };
    
    // Update UI state
    setIsDragging(true);
    
    // Set initial ghost position
    setGhostPosition({
      left: (item.from * pixelsPerFrame) - scrollPosition,
      width: item.durationInFrames * pixelsPerFrame
    });
    
    // Add event listeners for drag and release
    document.addEventListener('pointermove', handleDragMove);
    document.addEventListener('pointerup', handleDragEnd);
  }, [
    items, 
    selectItem, 
    timelineRef, 
    setIsDragging, 
    setGhostPosition, 
    dragInfoRef,
    zoomLevel, 
    durationInFrames, 
    scrollPosition
  ]);

  // Handle drag movement
  const handleDragMove = useCallback((e: PointerEvent) => {
    if (!dragInfoRef.current || !timelineRef.current) return;
    
    const dragInfo = dragInfoRef.current;
    const { itemId, dragType, pixelsPerFrame, startFrame, startDuration, startRow } = dragInfo;
    
    const timelineRect = timelineRef.current.getBoundingClientRect();
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    
    let newFrom = startFrame;
    let newDuration = startDuration;
    let newRow = startRow;
    
    if (dragType === 'move') {
      // Calculate drag distance in frames
      const dragDistanceX = e.clientX - dragInfo.startX;
      newFrom = Math.max(0, Math.round(startFrame + (dragDistanceX / pixelsPerFrame)));
      
      // Calculate row change based on Y position relative to timeline
      const dragY = e.clientY - timelineRect.top;
      const rowHeight = 40; // Match your row height in TimelineGrid
      newRow = Math.max(0, Math.min(maxRows - 1, Math.floor(dragY / rowHeight)));
    }
    else if (dragType === 'resize-left') {
      // Resize from left edge (changes start position and duration)
      const newStartFrame = xToFrame(e.clientX - timelineRect.left);
      const maxStart = startFrame + startDuration - minDuration;
      
      newFrom = Math.max(0, Math.min(maxStart, newStartFrame));
      newDuration = startDuration - (newFrom - startFrame);
    }
    else if (dragType === 'resize-right') {
      // Resize from right edge (only changes duration)
      const newEndFrame = xToFrame(e.clientX - timelineRect.left);
      newDuration = Math.max(minDuration, newEndFrame - startFrame);
      
      // Ensure we don't exceed timeline bounds
      if (newFrom + newDuration > durationInFrames) {
        newDuration = durationInFrames - newFrom;
      }
    }
    
    // --- Client-side validation ---
    const updatedItem = { ...item, from: newFrom, durationInFrames: newDuration, row: newRow };
    const isValidDuration = validateDuration(newDuration, durationInFrames);
    const isValidStart = validateStart(newFrom, newDuration, durationInFrames);
    const isValidRow = validateRow(newRow, maxRows);
    const isValidOverlap = validateOverlap(items, updatedItem);
    const isValid = isValidDuration && isValidStart && isValidRow && isValidOverlap;
    setInvalidDragOperation(!isValid);
    if (!isValid) return;
    // --- End validation ---
    
    setGhostPosition({
      left: (newFrom * pixelsPerFrame) - scrollPosition,
      width: newDuration * pixelsPerFrame
    });
    
    dragInfoRef.current = {
      ...dragInfo,
      currentFrame: newFrom,
      currentDuration: newDuration,
      currentRow: newRow
    };
  }, [
    items,
    dragInfoRef,
    timelineRef,
    xToFrame,
    setGhostPosition,
    scrollPosition,
    durationInFrames,
    minDuration,
    maxRows,
    setInvalidDragOperation
  ]);

  // End dragging and commit changes
  const handleDragEnd = useCallback((e: PointerEvent) => {
    if (!dragInfoRef.current) return;
    
    const dragInfo = dragInfoRef.current;
    const { itemId, currentFrame, currentDuration, currentRow } = dragInfo;
    
    // Prevent committing invalid operations
    if (invalidDragOperation) {
      setInvalidDragOperation(false);
      dragInfoRef.current = null;
      return;
    }
    
    // Clean up event listeners
    document.removeEventListener('pointermove', handleDragMove);
    document.removeEventListener('pointerup', handleDragEnd);
    
    // Reset drag state
    setIsDragging(false);
    document.body.style.userSelect = '';
    
    // Apply the changes to the actual item
    const item = items.find(i => i.id === itemId);
    if (item && (currentFrame !== undefined || currentDuration !== undefined || currentRow !== undefined)) {
      const updatedItem = {
        ...item,
        from: currentFrame !== undefined ? currentFrame : item.from,
        durationInFrames: currentDuration !== undefined ? currentDuration : item.durationInFrames,
        row: currentRow !== undefined ? currentRow : item.row
      };
      
      // Apply the update (with validation)
      updateItem(updatedItem);
    }
    
    // Clear drag info
    dragInfoRef.current = null;
  }, [
    items,
    updateItem,
    setIsDragging,
    dragInfoRef,
    invalidDragOperation,
    setInvalidDragOperation
  ]);

  return {
    startDrag,
    ghostPosition,
    isDraggingInvalid: invalidDragOperation,
    handleDragMove,
    handleDragEnd
  };
};
