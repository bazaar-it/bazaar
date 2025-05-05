//src/components/client/Timeline/TimelineMarker.tsx
"use client";

import React from 'react';

interface TimelineMarkerProps {
  currentFrame: number;
  totalDuration: number;
  zoomLevel: number;
}

/**
 * Visual indicator for the current frame position in the timeline
 */
const TimelineMarker: React.FC<TimelineMarkerProps> = ({
  currentFrame,
  totalDuration,
  zoomLevel,
}) => {
  // Calculate position as percentage of total duration
  const position = (currentFrame / totalDuration) * 100;
  
  return (
    <div 
      className="absolute top-0 bottom-0 w-px bg-red-500 z-10 pointer-events-none"
      style={{ 
        left: `${position}%`,
        // Add subtle animation for smoother visual tracking
        transition: 'left 0.1s ease-out',
      }}
    >
      {/* Marker head - red triangle at the top */}
      <div 
        className="absolute top-0 left-0 w-3 h-3 bg-red-500 transform -translate-x-1/2 -translate-y-0"
        style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }}
      />
      
      {/* Frame number display */}
      <div className="absolute top-3 left-0 transform -translate-x-1/2 bg-red-500 text-white text-xs py-0.5 px-1 rounded">
        {currentFrame}
      </div>
    </div>
  );
};

export default TimelineMarker;
