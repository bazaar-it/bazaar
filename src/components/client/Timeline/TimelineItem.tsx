//src/components/client/Timeline/TimelineItem.tsx
"use client";

import React, { useMemo } from 'react';
import { type TimelineItemUnion, TimelineItemType, type TextItem, type CustomItem, type TimelineItemStatus } from '~/types/timeline';
import { cn } from '~/lib/utils';
import Image from 'next/image';
import { useTimelineClick, useTimelineDrag } from './TimelineContext';
import { AlertCircle, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface TimelineItemProps {
  item: TimelineItemUnion;
  isSelected: boolean;
  isDragging: boolean;
  durationInFrames: number;
  currentFrame: number;
  zoomLevel: number;
  onDragToChat?: () => void;
}

/**
 * Individual item displayed in the timeline
 * Supports dragging, resizing, and selection
 */
const TimelineItem: React.FC<TimelineItemProps> = ({
  item,
  isSelected,
  isDragging,
  durationInFrames,
  currentFrame,
  zoomLevel,
  onDragToChat,
}) => {
  // Get timeline utilities from context
  const { selectItem } = useTimelineClick();
  const { startDrag, isDraggingInvalid } = useTimelineDrag();
  
  // Calculate position and dimensions as percentages
  const leftPosition = (item.from / durationInFrames) * 100;
  const itemWidth = (item.durationInFrames / durationInFrames) * 100;
  
  // Determine if current frame is within this item
  const isActive = currentFrame >= item.from && currentFrame < item.from + item.durationInFrames;
  
  // Status indicator based on the item's status property
  const statusIndicator = useMemo(() => {
    // If no status is provided, don't show an indicator
    if (!item.status) return null;
    
    switch (item.status) {
      case 'valid':
        return (
          <div className="absolute -right-1 -top-1 bg-green-500/20 border border-green-500 rounded-full p-0.5 z-30">
            <CheckCircle size={12} className="text-green-500" />
          </div>
        );
      case 'warning':
        return (
          <div className="absolute -right-1 -top-1 bg-yellow-500/20 border border-yellow-500 rounded-full p-0.5 z-30">
            <AlertTriangle size={12} className="text-yellow-500" />
          </div>
        );
      case 'error':
        return (
          <div className="absolute -right-1 -top-1 bg-red-500/20 border border-red-500 rounded-full p-0.5 z-30">
            <AlertCircle size={12} className="text-red-500" />
          </div>
        );
      case 'building':
      case 'pending':
        return (
          <div className="absolute -right-1 -top-1 bg-blue-500/20 border border-blue-500 rounded-full p-0.5 z-30 animate-pulse">
            <Loader2 size={12} className="text-blue-500 animate-spin" />
          </div>
        );
      default:
        return null;
    }
  }, [item.status]);
  
  // Get border color based on status
  const getBorderColorClass = (): string => {
    if (!item.status) return "";
    
    switch (item.status) {
      case 'valid': return "border-green-500/30";
      case 'warning': return "border-yellow-500/30";
      case 'error': return "border-red-500/30";
      case 'building':
      case 'pending': return "border-blue-500/30";
      default: return "";
    }
  };
  
  // Generate thumbnail or icon based on item type
  const thumbnail = useMemo(() => {
    switch (item.type) {
      case TimelineItemType.IMAGE:
        return (item as any).src ? (
          <div className="h-full w-10 flex-shrink-0 relative overflow-hidden">
            <Image 
              src={(item as any).src} 
              alt="Thumbnail" 
              fill 
              className="object-cover opacity-80" 
              sizes="40px"
            />
          </div>
        ) : (
          <div className="h-full w-10 flex-shrink-0 bg-gradient-to-r from-orange-400 to-orange-500 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
          </div>
        );
      case TimelineItemType.TEXT:
        return (
          <div className="h-full w-10 flex-shrink-0 bg-gradient-to-r from-purple-400 to-purple-500 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white">
              <path d="M4 7V4h16v3"></path>
              <path d="M9 20h6"></path>
              <path d="M12 4v16"></path>
            </svg>
          </div>
        );
      case TimelineItemType.VIDEO:
        return (
          <div className="h-full w-10 flex-shrink-0 bg-gradient-to-r from-blue-400 to-blue-500 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white">
              <polygon points="23 7 16 12 23 17 23 7"></polygon>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
            </svg>
          </div>
        );
      case TimelineItemType.AUDIO:
        return (
          <div className="h-full w-10 flex-shrink-0 bg-gradient-to-r from-green-400 to-green-500 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white">
              <path d="M3 18v-6a9 9 0 0 1 18 0v6"></path>
              <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path>
            </svg>
          </div>
        );
      case TimelineItemType.CUSTOM:
        return (
          <div className="h-full w-10 flex-shrink-0 bg-gradient-to-r from-pink-400 to-pink-500 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white">
              <path d="M12 2l9 4.9V17L12 22 3 17V7L12 2z"></path>
            </svg>
          </div>
        );
      default:
        return (
          <div className="h-full w-10 flex-shrink-0 bg-gradient-to-r from-gray-400 to-gray-500 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
        );
    }
  }, [item]);
  
  // Get item title based on type
  const getItemTitle = () => {
    switch (item.type) {
      case TimelineItemType.VIDEO:
        return `Video ${item.id}`;
      case TimelineItemType.AUDIO:
        return `Audio ${item.id}`;
      case TimelineItemType.TEXT:
        return `Text: ${(item as TextItem).content.substring(0, 20) || ''}`;
      case TimelineItemType.IMAGE:
        return `Image ${item.id}`;
      case TimelineItemType.CUSTOM:
        return (item as CustomItem).name || `Custom ${item.id}`;
      default:
        // Use type assertion to help TypeScript understand this is still a valid object
        return `Unknown ${(item as {id: number}).id}`;
    }
  };
  
  // Duration text display (e.g. "0:05.12")
  const getDurationText = () => {
    const seconds = item.durationInFrames / 30; // assuming 30fps
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = (seconds % 60).toFixed(2);
    return `${minutes}:${remainingSeconds.padStart(5, '0')}`;
  };
  
  // Handle mouse down on the resize handles
  const handleResizeStart = (e: React.PointerEvent<HTMLDivElement>, action: 'resize-left' | 'resize-right') => {
    e.stopPropagation();
    startDrag(e, item.id, action);
  };
  
  // Handle drag to chat
  const handleDragToChatStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (!onDragToChat) return;
    
    // Create a properly typed object for drag data
    const dragData = {
      id: item.id,
      type: item.type.toString(),
      from: item.from,
      to: item.from + item.durationInFrames,
    };
    
    e.dataTransfer.setData('timeline-item', JSON.stringify(dragData));
  };

  // Handle item click with standard click + context aware selection
  const handleItemClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    selectItem(item.id);
  };

  // Handle item pointer down for dragging
  const handleItemPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only start drag if not clicking on the handles
    if (!(e.target as HTMLElement).classList.contains('resize-handle')) {
      startDrag(e, item.id, 'move');
    }
  };

  return (
    <div
      className={cn(
        "absolute flex flex-row h-full rounded-md cursor-grab select-none transition-colors duration-150 border",
        isSelected ? "ring-2 ring-white shadow-lg dark:ring-blue-300 z-20" : "z-10",
        isActive ? "border-b-2 border-yellow-300" : "",
        isDragging ? "opacity-50 cursor-grabbing" : "",
        isDraggingInvalid ? "ring-2 ring-red-500" : "",
        "hover:brightness-110",
        getBorderColorClass()
      )}
      style={{
        left: `${leftPosition}%`,
        width: `${Math.max(itemWidth, 0.5)}%`, // Ensure minimum width
        minWidth: '40px',
        transform: `scale(${isSelected ? 1.02 : 1})`,
        transition: 'transform 0.1s ease, border 0.2s ease'
      }}
      onClick={handleItemClick}
      onPointerDown={handleItemPointerDown}
      draggable={!!onDragToChat}
      onDragStart={handleDragToChatStart}
    >
      {/* Status Indicator */}
      {statusIndicator}
      
      {/* Left resize handle */}
      <div
        className="resize-handle absolute left-0 top-0 bottom-0 w-2 cursor-w-resize z-30"
        onPointerDown={(e) => handleResizeStart(e, 'resize-left')}
      />
      
      {/* Thumbnail/icon */}
      {thumbnail}
      
      {/* Content */}
      <div className="flex-1 px-1 flex flex-col justify-center overflow-hidden">
        <div className="text-xs font-medium text-white truncate">
          {getItemTitle()}
        </div>
        <div className="text-xs text-gray-300">
          {getDurationText()}
        </div>
      </div>
      
      {/* Right resize handle */}
      <div
        className="resize-handle absolute right-0 top-0 bottom-0 w-2 cursor-e-resize z-30"
        onPointerDown={(e) => handleResizeStart(e, 'resize-right')}
      />
    </div>
  );
};

export default TimelineItem;
