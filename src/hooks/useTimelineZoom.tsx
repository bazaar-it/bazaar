//src/hooks/useTimelineZoom.tsx
"use client";

import { useState, useCallback } from "react";
import type { RefObject } from "react";

// Constants for zoom control
const ZOOM_CONSTRAINTS = {
  min: 0.25,
  max: 5,
  default: 1,
  step: 0.1,
  wheelStep: 0.1
};

type ZoomState = {
  scale: number;
  scroll: number;
};

/**
 * A custom hook that manages zoom and scroll behavior for a timeline component.
 * Handles both programmatic and wheel-based zooming while maintaining the zoom point
 * relative to the cursor position.
 */
export const useTimelineZoom = (timelineRef: RefObject<HTMLDivElement>) => {
  const [zoomState, setZoomState] = useState<ZoomState>({
    scale: ZOOM_CONSTRAINTS.default,
    scroll: 0,
  });

  // Calculate the new zoom level, respecting min/max constraints
  const calculateNewZoom = useCallback(
    (prevZoom: number, delta: number): number => {
      return Math.min(
        ZOOM_CONSTRAINTS.max,
        Math.max(ZOOM_CONSTRAINTS.min, prevZoom + delta * ZOOM_CONSTRAINTS.step)
      );
    },
    []
  );

  // Handle programmatic zoom
  const handleZoom = useCallback(
    (delta: number, clientX: number) => {
      const scrollContainer = timelineRef.current?.parentElement;
      if (!scrollContainer) return;

      const newZoom = calculateNewZoom(zoomState.scale, delta);
      if (newZoom === zoomState.scale) return;

      const rect = scrollContainer.getBoundingClientRect();
      const relativeX = clientX - rect.left + scrollContainer.scrollLeft;
      const zoomFactor = newZoom / zoomState.scale;
      const newScroll = relativeX * zoomFactor - (clientX - rect.left);

      requestAnimationFrame(() => {
        scrollContainer.scrollLeft = newScroll;
      });

      setZoomState({ scale: newZoom, scroll: newScroll });
    },
    [timelineRef, zoomState.scale, calculateNewZoom]
  );

  // Handle wheel-based zoom (with ctrl/cmd key)
  const handleWheelZoom = useCallback(
    (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        const delta = -Math.sign(event.deltaY) * ZOOM_CONSTRAINTS.wheelStep;
        handleZoom(delta, event.clientX);
      }
    },
    [handleZoom]
  );

  return {
    zoomScale: zoomState.scale,
    scrollPosition: zoomState.scroll,
    setZoomScale: (newScale: number) =>
      setZoomState((prev) => ({ ...prev, scale: newScale })),
    setScrollPosition: (newScroll: number) =>
      setZoomState((prev) => ({ ...prev, scroll: newScroll })),
    handleZoom,
    handleWheelZoom,
  };
};
