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
  setPlayerRef: (ref: any) => void;
  seekToFrame: (frame: number) => void;
  setIsPlaying: (playing: boolean) => void;
  findGapsInRow: (row: number, itemWidth: number, itemId: number) => {start: number, end: number} | undefined;
  selectItem: (id: number | null) => void;
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
    setItems(prevItems => 
      prevItems.map(item => 
        item.id === updatedItem.id ? updatedItem : item
      )
    );
  }, []);

  const addItem = useCallback((newItem: TimelineItemUnion) => {
    setItems(prevItems => [...prevItems, newItem]);
  }, []);

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
    handleWheelZoom,
  };

  return (
    <TimelineContext.Provider value={contextValue}>
      {children}
    </TimelineContext.Provider>
  );
};

/**
 * Hook to access the timeline context
 */
export const useTimeline = () => {
  const context = useContext(TimelineContext);
  
  if (!context) {
    throw new Error('useTimeline must be used within a TimelineProvider');
  }
  
  return context;
};
