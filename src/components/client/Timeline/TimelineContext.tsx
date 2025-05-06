//src/components/client/Timeline/TimelineContext.tsx
"use client";

import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type {
  TimelineContextState,
  TimelineActions,
  TimelineItemUnion,
  DragInfo,
  GhostPosition
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
}

// Create context with default empty state
const TimelineContext = createContext<TimelineContextValue | null>(null);

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
  const [ghostPosition, setGhostPosition] = useState<GhostPosition>({ left: 0, width: 0 });
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

  // Wheel zoom handler - zooms around mouse position
  const handleWheelZoom = useCallback((e: WheelEvent, clientX: number) => {
    e.preventDefault();
    
    if (!timelineRef.current) return;
    
    const timeline = timelineRef.current;
    const timelineRect = timeline.getBoundingClientRect();
    const mouseX = clientX - timelineRect.left;
    const mouseXPercent = mouseX / timelineRect.width;
    
    // Adjust zoom level based on wheel direction
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    const newZoom = Math.max(0.5, Math.min(5, zoomLevel + delta));
    
    // Adjust scroll position to keep mouse position constant
    const oldScroll = scrollPosition;
    const newScroll = oldScroll + (mouseXPercent * (newZoom - zoomLevel) * timelineRect.width);
    
    setZoomLevel(newZoom);
    setScrollPosition(newScroll);
  }, [zoomLevel, scrollPosition]);
  
  // Timeline click handler for seeking
  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging || !timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = clickX / rect.width;
    const frame = Math.floor(pct * durationInFrames);
    
    // Seek to clicked position
    setCurrentFrame(frame);
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(frame);
    }
  }, [isDragging, durationInFrames]);
  
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
 */
export const useTimelineZoom = () => {
  const { zoomLevel, setZoomLevel, scrollPosition, setScrollPosition, handleWheelZoom } = useTimeline();
  
  // Direct zoom methods
  const zoomIn = useCallback(() => {
    const newZoom = Math.min(5, zoomLevel + 0.1);
    setZoomLevel(newZoom);
  }, [zoomLevel, setZoomLevel]);
  
  const zoomOut = useCallback(() => {
    const newZoom = Math.max(0.5, zoomLevel - 0.1);
    setZoomLevel(newZoom);
  }, [zoomLevel, setZoomLevel]);
  
  const resetZoom = useCallback(() => {
    setZoomLevel(1);
    setScrollPosition(0);
  }, [setZoomLevel, setScrollPosition]);
  
  return {
    zoomLevel,
    scrollPosition,
    zoomIn,
    zoomOut,
    resetZoom,
    handleWheelZoom,
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
