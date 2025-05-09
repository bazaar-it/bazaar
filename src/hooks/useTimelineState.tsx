//src/hooks/useTimelineState.tsx
"use client";

import { useState, useCallback, useRef } from "react";

// Define types for timeline state management
interface DraggedItem {
  id: number;
  type: 'move' | 'resize-start' | 'resize-end';
  originalPosition: {
    from: number;
    duration: number;
    row: number;
  };
}

interface GhostElement {
  id: number;
  position: { x: number, y: number };
  width: number;
  height: number;
}

/**
 * Hook to manage the internal state of the timeline
 * Coordinates drag operations, ghost elements, and temporary UI states
 */
export const useTimelineState = (
  durationInFrames: number, 
  maxRows: number,
  timelineRef: React.RefObject<HTMLDivElement>
) => {
  // State for drag operations
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);
  
  // State for UI feedback during interactions
  const [ghostElement, setGhostElement] = useState<GhostElement | null>(null);
  const [ghostMarkerPosition, setGhostMarkerPosition] = useState<number | null>(null);
  
  // Ref to store drag information that doesn't need to trigger re-renders
  const dragInfo = useRef<{
    itemId: number;
    type: 'move' | 'resize-start' | 'resize-end';
    startX: number;
    startY: number;
    initialFrom: number;
    initialDuration: number;
    initialRow: number;
  } | null>(null);

  /**
   * Initiates a drag operation on a timeline item
   */
  const handleDragStart = useCallback((
    overlay: any, 
    clientX: number, 
    clientY: number, 
    action: 'move' | 'resize-start' | 'resize-end'
  ) => {
    // Set dragging state
    setIsDragging(true);
    
    // Record the item being dragged and its original properties
    setDraggedItem({
      id: overlay.id,
      type: action,
      originalPosition: {
        from: overlay.from,
        duration: overlay.durationInFrames,
        row: overlay.row
      }
    });
    
    // Store detailed drag info in ref for performance
    dragInfo.current = {
      itemId: overlay.id,
      type: action,
      startX: clientX,
      startY: clientY,
      initialFrom: overlay.from,
      initialDuration: overlay.durationInFrames,
      initialRow: overlay.row
    };
    
    // Create initial ghost element for visual feedback
    updateGhostElement({
      id: overlay.id,
      position: { 
        x: overlay.from * (timelineRef.current?.clientWidth || 1000) / durationInFrames, 
        y: overlay.row * 40 // 40px row height
      },
      width: overlay.durationInFrames * (timelineRef.current?.clientWidth || 1000) / durationInFrames,
      height: 36 // Slightly smaller than row height for visual gap
    });
  }, [durationInFrames, timelineRef]);

  /**
   * Updates the ghost element during drag operations
   */
  const updateGhostElement = useCallback((ghost: GhostElement | null) => {
    setGhostElement(ghost);
  }, []);

  /**
   * Resets all drag-related state
   */
  const resetDragState = useCallback(() => {
    setIsDragging(false);
    setDraggedItem(null);
    setGhostElement(null);
    dragInfo.current = null;
  }, []);

  return {
    isDragging,
    draggedItem,
    ghostElement,
    ghostMarkerPosition,
    dragInfo: dragInfo.current,
    handleDragStart,
    updateGhostElement,
    resetDragState,
    setGhostMarkerPosition,
  };
};
