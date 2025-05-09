//src/hooks/useTimelineEventHandlers.tsx
"use client";

import { useCallback } from "react";
import type { RefObject } from "react";

interface TimelineEventHandlerProps {
  handleDrag: (clientX: number, clientY: number) => any;
  handleDragEnd: (result?: any) => void;
  isDragging: boolean;
  timelineRef: RefObject<HTMLDivElement>;
  setGhostMarkerPosition: (position: number | null) => void;
}

/**
 * Hook to manage timeline-specific event handlers
 * Coordinates mouse and touch events for dragging, clicking, and hovering
 */
export const useTimelineEventHandlers = ({
  handleDrag,
  handleDragEnd,
  isDragging,
  timelineRef,
  setGhostMarkerPosition
}: TimelineEventHandlerProps) => {
  
  // Handler for mouse movement during drag operations
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) {
      // Handle hover position for ghost marker
      const timelineEl = timelineRef.current;
      if (timelineEl) {
        const rect = timelineEl.getBoundingClientRect();
        const x = e.clientX - rect.left;
        setGhostMarkerPosition(x);
      }
      return;
    }
    
    // Process drag operation
    const result = handleDrag(e.clientX, e.clientY);
    return result;
  }, [isDragging, handleDrag, timelineRef, setGhostMarkerPosition]);
  
  // Handler for touch movement during drag operations
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || !e.touches[0]) return;
    
    // Extract coordinates from touch event
    const touch = e.touches[0];
    const result = handleDrag(touch.clientX, touch.clientY);
    return result;
  }, [isDragging, handleDrag]);
  
  // Handler for when mouse leaves the timeline
  const handleTimelineMouseLeave = useCallback(() => {
    if (isDragging) return;
    
    // Hide ghost marker when mouse leaves timeline
    setGhostMarkerPosition(null);
  }, [isDragging, setGhostMarkerPosition]);
  
  return {
    handleMouseMove,
    handleTouchMove,
    handleTimelineMouseLeave
  };
};
