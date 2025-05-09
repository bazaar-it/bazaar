//src/hooks/useTimelinePositioning.tsx
"use client";

import { useCallback, useMemo } from "react";
import type { RefObject } from "react";

interface TimelinePositioningProps {
  durationInFrames: number;
  timelineRef: RefObject<HTMLDivElement>;
  zoomScale: number;
}

/**
 * Hook to handle timeline coordinate conversions and positioning calculations
 * Provides utilities for translating between pixel positions and frame numbers
 */
export const useTimelinePositioning = ({
  durationInFrames,
  timelineRef,
  zoomScale
}: TimelinePositioningProps) => {
  
  // Calculate pixels per frame based on timeline width and duration
  const pixelsPerFrame = useMemo(() => {
    const timelineWidth = timelineRef.current?.clientWidth || 1000;
    return (timelineWidth * zoomScale) / durationInFrames;
  }, [durationInFrames, timelineRef, zoomScale]);
  
  /**
   * Convert a frame number to X coordinate in pixels
   */
  const frameToX = useCallback((frame: number): number => {
    return frame * pixelsPerFrame;
  }, [pixelsPerFrame]);
  
  /**
   * Convert an X coordinate in pixels to the nearest frame number
   */
  const xToFrame = useCallback((x: number): number => {
    return Math.max(0, Math.min(durationInFrames, Math.round(x / pixelsPerFrame)));
  }, [durationInFrames, pixelsPerFrame]);
  
  /**
   * Convert a row number to Y coordinate in pixels
   */
  const rowToY = useCallback((row: number): number => {
    // Assuming each row is 40px tall
    const ROW_HEIGHT = 40;
    return row * ROW_HEIGHT;
  }, []);
  
  /**
   * Convert a Y coordinate in pixels to the nearest row number
   */
  const yToRow = useCallback((y: number, maxRows: number): number => {
    const ROW_HEIGHT = 40;
    return Math.max(0, Math.min(maxRows - 1, Math.floor(y / ROW_HEIGHT)));
  }, []);
  
  /**
   * Calculate the visible width of an item in the timeline
   */
  const calculateItemWidth = useCallback((durationInFrames: number): number => {
    return Math.max(5, durationInFrames * pixelsPerFrame); // Minimum 5px width for visibility
  }, [pixelsPerFrame]);
  
  /**
   * Find gaps in a timeline row where a new item could be placed
   */
  const findGapsInRow = useCallback((
    items: any[],
    row: number,
    minGapDuration: number
  ): Array<{start: number, end: number}> => {
    // Get items in this row
    const rowItems = items.filter(item => item.row === row);
    
    // Sort by start position
    rowItems.sort((a, b) => a.from - b.from);
    
    // Find gaps
    const gaps: Array<{start: number, end: number}> = [];
    
    // Check if there's a gap at the beginning
    if (rowItems.length === 0 || rowItems[0].from > 0) {
      gaps.push({
        start: 0,
        end: rowItems.length ? rowItems[0].from : durationInFrames
      });
    }
    
    // Check for gaps between items
    for (let i = 0; i < rowItems.length - 1; i++) {
      const currentEnd = rowItems[i].from + rowItems[i].durationInFrames;
      const nextStart = rowItems[i + 1].from;
      
      if (nextStart - currentEnd >= minGapDuration) {
        gaps.push({
          start: currentEnd,
          end: nextStart
        });
      }
    }
    
    // Check if there's a gap at the end
    if (rowItems.length > 0) {
      const lastItem = rowItems[rowItems.length - 1];
      const lastItemEnd = lastItem.from + lastItem.durationInFrames;
      
      if (durationInFrames - lastItemEnd >= minGapDuration) {
        gaps.push({
          start: lastItemEnd,
          end: durationInFrames
        });
      }
    }
    
    return gaps;
  }, [durationInFrames]);
  
  return {
    pixelsPerFrame,
    frameToX,
    xToFrame,
    rowToY,
    yToRow,
    calculateItemWidth,
    findGapsInRow
  };
};
