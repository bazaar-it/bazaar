//src/components/client/Timeline/TimelineHeader.tsx
"use client";

import React, { useMemo } from 'react';
import { ZoomIn, ZoomOut, Trash2, Copy, RefreshCw, Clock } from 'lucide-react';
import { useTimeline, useTimelineZoom } from './TimelineContext';
import { Button } from '~/components/ui/button';

interface TimelineHeaderProps {
  durationInFrames: number;
  zoomLevel: number;
  onDeleteItem?: (id: number | null) => void;
  onCopyItem?: (id: number | null) => void;
}

/**
 * Header component for the timeline showing frame markers and controls
 */
const TimelineHeader: React.FC<TimelineHeaderProps> = ({
  durationInFrames,
  zoomLevel,
  onDeleteItem,
  onCopyItem
}) => {
  // Get timeline context values and zoom functions
  const { currentFrame, selectedItemId } = useTimeline();
  const { zoomIn, zoomOut, resetZoom } = useTimelineZoom();
  
  // Calculate current time display
  const currentTimeDisplay = useMemo(() => {
    // Convert frame to time (assuming 30fps)
    const seconds = Math.floor(currentFrame / 30);
    const frames = currentFrame % 30;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    // Format time as MM:SS:FF
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  }, [currentFrame]);
  
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
    <div className="border-b border-gray-200 bg-white">
      {/* Controls bar */}
      <div className="h-10 flex items-center justify-between px-2 border-b">
        {/* Left side - fixed width for layer names column */}
        <div className="w-[120px] flex-shrink-0 border-r border-gray-200 pr-2">
          <span className="text-xs font-medium">Layers</span>
        </div>
        
        {/* Middle - Zoom & Edit controls */}
        <div className="flex items-center gap-3 flex-1 justify-center">
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={zoomIn}
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={zoomOut}
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={resetZoom}
              title="Reset Zoom"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="w-px h-4 bg-gray-200 mx-1"></div>
          
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => onDeleteItem?.(selectedItemId)}
              disabled={!selectedItemId}
              title="Delete Selected Item"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => onCopyItem?.(selectedItemId)}
              disabled={!selectedItemId}
              title="Copy Selected Item"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Right - Current time display */}
        <div className="flex items-center bg-gray-100 rounded px-2 py-1 text-xs min-w-[80px] justify-end">
          <Clock className="h-3.5 w-3.5 mr-1" />
          <span className="font-mono">{currentTimeDisplay}</span>
        </div>
      </div>
      
      {/* Time markers */}
      <div className="h-6 relative ml-[120px]">
        {markers.map(marker => (
          <div
            key={marker.frame}
            className="absolute flex flex-col items-center"
            style={{ left: `${marker.position}%` }}
          >
            {/* Marker line */}
            <div className="h-2 w-px bg-gray-400" />
            
            {/* Time label */}
            <div className="text-gray-600 text-[10px]">
              {marker.timeLabel}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TimelineHeader;
