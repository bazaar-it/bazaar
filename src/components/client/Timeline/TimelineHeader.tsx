//src/components/client/Timeline/TimelineHeader.tsx
"use client";

import React, { useMemo } from "react";
import { useTimeline } from "./TimelineContext";

interface TimelineHeaderProps {
  durationInFrames: number;
  zoomLevel: number;
}

/**
 * Header component for the timeline showing frame markers
 */
const TimelineHeader: React.FC<TimelineHeaderProps> = ({
  durationInFrames,
  zoomLevel,
}) => {
  const { timeUnit = "frames" } = useTimeline();

  // Calculate appropriate interval between markers based on zoom level
  const markerInterval = useMemo(() => {
    // Base interval at zoom level 1
    let interval = 30; // One second at 30fps

    // Adjust based on zoom level
    if (zoomLevel > 3) {
      interval = 10; // Show more markers at high zoom
    } else if (zoomLevel < 0.8) {
      interval = 60; // Show fewer markers at low zoom
    }

    return interval;
  }, [zoomLevel]);

  // Generate frame markers
  const markers = useMemo(() => {
    const result: Array<{ frame: number; position: number; timeLabel: string }> = [];
    const FPS = 30; // Timeline is 30fps

    for (let frame = 0; frame <= durationInFrames; frame += markerInterval) {
      // Calculate position as percentage
      const position = (frame / durationInFrames) * 100;

      let timeLabel: string;
      if (timeUnit === "frames") {
        timeLabel = String(frame);
      } else {
        // Seconds mode
        const seconds = Math.floor(frame / FPS);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        const framesWithinSecond = frame % FPS; // 0..29
        // Under 1 minute: show S (no decimals)
        if (minutes === 0) {
          timeLabel = `${remainingSeconds}`;
        } else {
          // >= 1 minute: show M:SS; add .ff only if not exact second
          const base = `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
          if (framesWithinSecond > 0) {
            const hundredths = Math.floor((framesWithinSecond / FPS) * 100)
              .toString()
              .padStart(2, "0");
            timeLabel = `${base}.${hundredths}`;
          } else {
            timeLabel = base;
          }
        }
      }

      result.push({ frame, position, timeLabel });
    }

    return result;
  }, [durationInFrames, markerInterval, timeUnit]);

  return (
    <div className="h-6 relative border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs">
      {markers.map((marker) => (
        <div
          key={marker.frame}
          className="absolute flex flex-col items-center"
          style={{ left: `${marker.position}%` }}
        >
          {/* Marker line */}
          <div className="h-2 w-px bg-gray-400 dark:bg-gray-500" />

          {/* Time label */}
          <div className="text-gray-600 dark:text-gray-300 text-[10px]">
            {marker.timeLabel}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TimelineHeader;

