//src/components/client/Timeline/TimelineItem.tsx
"use client";

import React from 'react';
import { type TimelineItemUnion, TimelineItemType } from '~/types/timeline';
import { cn } from '~/lib/utils';

interface TimelineItemProps {
  item: TimelineItemUnion;
  isSelected: boolean;
  isDragging: boolean;
  durationInFrames: number;
  onClick: () => void;
  onDragStart: (clientX: number, action: 'move' | 'resize-start' | 'resize-end') => void;
  onDragToChat?: () => void;
  currentFrame: number;
  zoomLevel: number;
}

/**
 * Individual item displayed in the timeline
 */
const TimelineItem: React.FC<TimelineItemProps> = ({
  item,
  isSelected,
  isDragging,
  durationInFrames,
  onClick,
  onDragStart,
  onDragToChat,
  currentFrame,
  zoomLevel,
}) => {
  // Calculate position and dimensions as percentages
  const leftPosition = (item.from / durationInFrames) * 100;
  const itemWidth = (item.durationInFrames / durationInFrames) * 100;
  
  // Determine if current frame is within this item
  const isActive = currentFrame >= item.from && currentFrame < item.from + item.durationInFrames;
  
  // Get appropriate background color based on item type
  const getBackgroundColor = () => {
    switch (item.type) {
      case TimelineItemType.VIDEO:
        return 'bg-blue-500/75';
      case TimelineItemType.AUDIO:
        return 'bg-green-500/75';
      case TimelineItemType.TEXT:
        return 'bg-purple-500/75';
      case TimelineItemType.IMAGE:
        return 'bg-orange-500/75';
      default:
        return 'bg-gray-500/75';
    }
  };
  
  // Handle mouse down on the resize handles
  const handleResizeStart = (e: React.MouseEvent, action: 'resize-start' | 'resize-end') => {
    e.stopPropagation();
    onDragStart(e.clientX, action);
  };
  
  // Handle drag to chat
  const handleDragToChatStart = (e: React.DragEvent) => {
    if (!onDragToChat) return;
    
    e.dataTransfer.setData('timeline-item', JSON.stringify({
      id: item.id,
      type: item.type,
      from: item.from,
      to: item.from + item.durationInFrames,
    }));
    
    // Set a custom drag image if needed
    // const dragImage = document.createElement('div');
    // dragImage.textContent = `Item ${item.id}`;
    // document.body.appendChild(dragImage);
    // e.dataTransfer.setDragImage(dragImage, 0, 0);
    // setTimeout(() => document.body.removeChild(dragImage), 0);
  };

  return (
    <div
      className={cn(
        "absolute h-full rounded-md cursor-pointer select-none",
        getBackgroundColor(),
        isSelected ? "ring-2 ring-white dark:ring-blue-300" : "",
        isActive ? "border-b-2 border-yellow-300" : "",
        isDragging ? "opacity-50" : ""
      )}
      style={{
        left: `${leftPosition}%`,
        width: `${itemWidth}%`,
        minWidth: '8px',
        zIndex: isSelected ? 2 : 1,
      }}
      onClick={onClick}
      onMouseDown={(e) => onDragStart(e.clientX, 'move')}
      draggable={!!onDragToChat}
      onDragStart={handleDragToChatStart}
    >
      {/* Item label - shows type and ID */}
      <div className="px-2 py-1 text-xs font-medium text-white truncate overflow-hidden">
        {item.type === TimelineItemType.TEXT 
          ? (item as any).content.substring(0, 10) 
          : `${item.type} ${item.id}`}
      </div>
      
      {/* Left resize handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-2 cursor-w-resize"
        onMouseDown={(e) => handleResizeStart(e, 'resize-start')}
      />
      
      {/* Right resize handle */}
      <div
        className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize"
        onMouseDown={(e) => handleResizeStart(e, 'resize-end')}
      />
    </div>
  );
};

export default TimelineItem;
