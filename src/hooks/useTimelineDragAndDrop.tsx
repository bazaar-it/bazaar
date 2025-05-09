//src/hooks/useTimelineDragAndDrop.tsx
"use client";

import { useState, useCallback } from "react";
import type { RefObject } from "react";
import { useVideoState } from "~/stores/videoState";
import { replace } from "~/lib/patch";

// Types for the timeline drag and drop operations
interface DragInfo {
  itemId: number;
  type: 'move' | 'resize-start' | 'resize-end';
  startX: number;
  startY: number;
  initialFrom: number;
  initialDuration: number;
  initialRow: number;
  currentFrom?: number;
  currentDuration?: number;
  currentRow?: number;
}

interface GhostElement {
  id: number;
  position: { x: number, y: number };
  width: number;
  height: number;
}

interface TimelineDragAndDropProps {
  overlays: any[]; // Will be refined with actual scene types 
  durationInFrames: number;
  onOverlayChange: (updatedOverlay: any) => void;
  updateGhostElement: (ghost: GhostElement | null) => void;
  resetDragState: () => void;
  timelineRef: RefObject<HTMLDivElement>;
  dragInfo: DragInfo | null;
  maxRows: number;
}

/**
 * Hook to handle timeline drag and drop operations
 * Manages the positioning, resizing, and validation of timeline items
 */
export const useTimelineDragAndDrop = ({
  overlays,
  durationInFrames,
  onOverlayChange,
  updateGhostElement,
  resetDragState,
  timelineRef,
  dragInfo,
  maxRows
}: TimelineDragAndDropProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isInvalidDrag, setIsInvalidDrag] = useState(false);

  // Connect to our video state for applying updates
  const { applyPatch } = useVideoState();

  // Handler for starting a drag operation
  const handleDragStart = useCallback((
    overlay: any,
    clientX: number,
    clientY: number,
    action: 'move' | 'resize-start' | 'resize-end'
  ) => {
    setIsDragging(true);
    setIsInvalidDrag(false);
    
    // Show the ghost element at the initial position
    const timelineEl = timelineRef.current;
    if (!timelineEl) return;
    
    const { width, height } = timelineEl.getBoundingClientRect();
    const pixelsPerFrame = width / durationInFrames;
    
    updateGhostElement({
      id: overlay.id,
      position: { 
        x: overlay.from * pixelsPerFrame, 
        y: overlay.row * 40 // Assuming 40px row height
      },
      width: overlay.durationInFrames * pixelsPerFrame,
      height: 36 // Slightly smaller than row height for visual gap
    });
    
  }, [timelineRef, durationInFrames, updateGhostElement]);

  // Handler for dragging an item
  const handleDrag = useCallback((
    clientX: number,
    clientY: number
  ) => {
    if (!dragInfo || !timelineRef.current) return;
    
    const { 
      itemId, 
      type, 
      initialFrom, 
      initialDuration, 
      initialRow,
      startX, 
      startY 
    } = dragInfo;
    
    const timelineRect = timelineRef.current.getBoundingClientRect();
    const pixelsPerFrame = timelineRect.width / durationInFrames;
    
    // Find the overlay being dragged
    const overlay = overlays.find(o => o.id === itemId);
    if (!overlay) return;
    
    let newFrom = initialFrom;
    let newDuration = initialDuration;
    let newRow = initialRow;
    
    // Calculate new position based on drag type
    if (type === 'move') {
      // Find drag distance in pixels and convert to frames
      const dragDistanceX = clientX - startX;
      newFrom = Math.max(0, Math.round(initialFrom + (dragDistanceX / pixelsPerFrame)));
      
      // Calculate row change
      const dragY = clientY - timelineRect.top;
      const rowHeight = 40;
      newRow = Math.max(0, Math.min(maxRows - 1, Math.floor(dragY / rowHeight)));
    }
    else if (type === 'resize-start') {
      // Resizing from left changes both position and duration
      const dragDistanceX = clientX - startX;
      const framesDragged = Math.round(dragDistanceX / pixelsPerFrame);
      
      // Ensure minimum duration and that we don't exceed original position + duration
      const maxStartAdjustment = initialDuration - 1; // Ensure at least 1 frame duration
      const adjustedFrames = Math.max(-initialFrom, Math.min(maxStartAdjustment, framesDragged));
      
      newFrom = initialFrom + adjustedFrames;
      newDuration = initialDuration - adjustedFrames;
    }
    else if (type === 'resize-end') {
      // Resizing from right only changes duration
      const dragDistanceX = clientX - startX;
      const framesDragged = Math.round(dragDistanceX / pixelsPerFrame);
      
      // Ensure minimum duration and that we don't exceed timeline bounds
      newDuration = Math.max(1, initialDuration + framesDragged);
      
      // Don't extend beyond timeline
      if (newFrom + newDuration > durationInFrames) {
        newDuration = durationInFrames - newFrom;
      }
    }
    
    // Update ghost element position
    updateGhostElement({
      id: itemId,
      position: { 
        x: newFrom * pixelsPerFrame, 
        y: newRow * 40 
      },
      width: newDuration * pixelsPerFrame,
      height: 36
    });
    
    // Store current values for use in drag end
    return {
      itemId,
      newFrom,
      newDuration,
      newRow
    };
    
  }, [dragInfo, timelineRef, durationInFrames, overlays, maxRows, updateGhostElement]);

  // Handler for completing a drag operation
  const handleDragEnd = useCallback((result?: { itemId: number, newFrom: number, newDuration: number, newRow: number }) => {
    setIsDragging(false);
    
    if (result && !isInvalidDrag) {
      const { itemId, newFrom, newDuration, newRow } = result;
      const overlay = overlays.find(o => o.id === itemId);
      
      if (overlay) {
        // Create the updated overlay
        const updatedOverlay = {
          ...overlay,
          from: newFrom,
          durationInFrames: newDuration,
          row: newRow
        };
        
        // Update via our patch mechanism
        onOverlayChange(updatedOverlay);
      }
    }
    
    // Clean up
    resetDragState();
    updateGhostElement(null);
    
  }, [isInvalidDrag, overlays, onOverlayChange, resetDragState, updateGhostElement]);

  return {
    handleDragStart,
    handleDrag,
    handleDragEnd,
    isDragging,
    isInvalidDrag
  };
};
