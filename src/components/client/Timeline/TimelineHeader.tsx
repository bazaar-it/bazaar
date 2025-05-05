//src/components/client/Timeline/TimelineHeader.tsx
"use client";

import React, { useMemo } from 'react';

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
    const result = [];
    
    for (let frame = 0; frame <= durationInFrames; frame += markerInterval) {
      // Calculate position as percentage
      const position = (frame / durationInFrames) * 100;
      
      // Convert frame to time (assuming 30fps)
      const seconds = Math.floor(frame / 30);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      
      // Format time as MM:SS
      const timeLabel = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
      
      result.push({
        frame,
        position,
        timeLabel,
      });
    }
    
    return result;
  }, [durationInFrames, markerInterval]);

  return (
    <div className="h-6 relative border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs">
      {markers.map(marker => (
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
