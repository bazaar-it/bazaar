//src/components/client/Timeline/TimelineGrid.tsx
"use client";

import React, { useMemo, useState, useRef, useEffect } from 'react';
import TimelineItem from './TimelineItem';
import type { TimelineItemUnion } from '~/types/timeline';
import { cn } from '~/lib/utils';
import { ChevronDown, ChevronUp, Lock, Unlock, Eye, EyeOff, Plus } from 'lucide-react';
import { useTimelineClick, useTimelineZoom, useTimeline, useTimelineDrag } from './TimelineContext';

interface TimelineGridProps {
  onDragToChat?: (id: number) => void;
  onTrackAdd?: () => void;
  className?: string;
}

/**
 * TimelineGrid component that displays timeline items in rows
 * Supporting multiple tracks with advanced functionality
 */
const TimelineGrid: React.FC<TimelineGridProps> = ({
  onDragToChat,
  onTrackAdd,
  className
}) => {
  // Use the timeline hooks for data and interaction
  const { 
    items, 
    selectedItemId, 
    selectItem, 
    isDragging,
    currentFrame, 
    durationInFrames, 
    zoomLevel,
    ghostPosition,
    timelineRef
  } = useTimeline();
  const { handleTimelineClick } = useTimelineClick();
  const { handleWheelZoom } = useTimelineZoom();
  const { isDraggingInvalid } = useTimelineDrag();
  
  // Group items by row
  const rowsMap = useMemo(() => {
    const map = new Map<number, TimelineItemUnion[]>();
    
    // Sort items by their position (from)
    const sortedItems = [...items].sort((a, b) => a.from - b.from);
    
    // Group by row
    sortedItems.forEach(item => {
      if (!map.has(item.row)) {
        map.set(item.row, []);
      }
      map.get(item.row)!.push(item);
    });
    
    return map;
  }, [items]);
  
  // Get the maximum row number
  const maxRow = useMemo(() => {
    return items.length > 0
      ? Math.max(...items.map(item => item.row))
      : 0;
  }, [items]);
  
  // Create array of row indices
  const rows = useMemo(() => {
    return Array.from({ length: maxRow + 1 }, (_, i) => i);
  }, [maxRow]);

  // Track management state
  const [lockedTracks, setLockedTracks] = useState<Set<number>>(new Set());
  const [collapsedTracks, setCollapsedTracks] = useState<Set<number>>(new Set());
  const [hiddenTracks, setHiddenTracks] = useState<Set<number>>(new Set());
  
  // Drop target indicators
  const [dropTargetRow, setDropTargetRow] = useState<number | null>(null);
  
  // Handle locking/unlocking a track
  const toggleTrackLock = (rowIndex: number) => {
    setLockedTracks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowIndex)) {
        newSet.delete(rowIndex);
      } else {
        newSet.add(rowIndex);
      }
      return newSet;
    });
  };
  
  // Handle collapsing/expanding a track
  const toggleTrackCollapse = (rowIndex: number) => {
    setCollapsedTracks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowIndex)) {
        newSet.delete(rowIndex);
      } else {
        newSet.add(rowIndex);
      }
      return newSet;
    });
  };
  
  // Handle hiding/showing a track
  const toggleTrackVisibility = (rowIndex: number) => {
    setHiddenTracks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowIndex)) {
        newSet.delete(rowIndex);
      } else {
        newSet.add(rowIndex);
      }
      return newSet;
    });
  };
  
  // Render ghost item during drag
  const renderGhostItem = () => {
    if (!isDragging || !ghostPosition) return null;
    
    return (
      <GhostItem 
        position={ghostPosition}
        isInvalid={isDraggingInvalid}
      />
    );
  };
  
  // Handle drop target during drag
  const handleRowDragOver = (e: React.DragEvent, rowIndex: number) => {
    e.preventDefault();
    setDropTargetRow(rowIndex);
  };
  
  const handleRowDragLeave = () => {
    setDropTargetRow(null);
  };
  
  // Calculate time marker position based on current frame
  const markerPosition = useMemo(() => {
    return (currentFrame / durationInFrames) * 100;
  }, [currentFrame, durationInFrames]);

  // Setup wheel event for zooming
  useEffect(() => {
    const grid = timelineRef.current;
    if (!grid) return;
    
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        handleWheelZoom(e, e.clientX);
      }
    };
    
    grid.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      grid.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheelZoom, timelineRef]);

  return (
    <div 
      className={cn(
        "w-full h-full relative",
        "bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[15px]",
        className
      )}
      ref={timelineRef}
      onClick={handleTimelineClick}
    >
      {/* Main timeline grid with two-column layout */}
      <div className="flex h-full">
        {/* Track Headers Column */}
        <div className="w-36 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900 z-10">
          {rows.map(rowIndex => (
            <div 
              key={`track-header-${rowIndex}`}
              className={cn(
                "flex items-center h-14 px-3 border-b border-gray-200 dark:border-gray-800",
                dropTargetRow === rowIndex ? "bg-blue-100/30 dark:bg-blue-900/30" : "",
                hiddenTracks.has(rowIndex) ? "opacity-60" : ""
              )}
            >
              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => toggleTrackCollapse(rowIndex)}
                    className="p-1 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                  >
                    {collapsedTracks.has(rowIndex) ? 
                      <ChevronDown size={14} /> : 
                      <ChevronUp size={14} />
                    }
                  </button>
                  <span className="text-sm font-medium truncate text-gray-700 dark:text-gray-300">
                    Track {rowIndex + 1}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => toggleTrackVisibility(rowIndex)}
                  className="p-1 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                  title={hiddenTracks.has(rowIndex) ? "Show track" : "Hide track"}
                >
                  {hiddenTracks.has(rowIndex) ? 
                    <EyeOff size={14} /> : 
                    <Eye size={14} />
                  }
                </button>
                <button 
                  onClick={() => toggleTrackLock(rowIndex)}
                  className="p-1 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                  title={lockedTracks.has(rowIndex) ? "Unlock track" : "Lock track"}
                >
                  {lockedTracks.has(rowIndex) ? 
                    <Lock size={14} /> : 
                    <Unlock size={14} />
                  }
                </button>
              </div>
            </div>
          ))}
          
          {/* Add track button */}
          {onTrackAdd && (
            <button 
              onClick={onTrackAdd}
              className="flex items-center justify-center w-full h-10 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              title="Add new track"
            >
              <Plus size={16} />
              <span className="ml-1 text-xs">Add Track</span>
            </button>
          )}
        </div>
        
        {/* Timeline Content Column */}
        <div className="flex-1 relative overflow-hidden">
          {/* Background grid lines */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Horizontal grid lines */}
            {rows.map((row) => (
              <div 
                key={`grid-row-${row}`}
                className="absolute left-0 right-0 border-b border-gray-200 dark:border-gray-800/80 pointer-events-none"
                style={{ top: row * 56, height: 56 }}
              />
            ))}
            
            {/* Vertical grid lines (frame markers) */}
            {Array.from({ length: Math.floor(durationInFrames / 30) + 1 }).map((_, i) => (
              <div
                key={`grid-col-${i}`}
                className="absolute top-0 bottom-0 border-l border-gray-200 dark:border-gray-800/80 pointer-events-none"
                style={{ 
                  left: i * 30 * zoomLevel, 
                  height: '100%'
                }}
              />
            ))}
          </div>
          
          {/* Current frame marker */}
          <div
            className="absolute top-0 bottom-0 w-px bg-red-500 z-30 pointer-events-none"
            style={{ left: `${markerPosition}%` }}
          >
            <div className="h-3 w-3 bg-red-500 rounded-full absolute -left-1.5 -top-1.5" />
          </div>
          
          {/* Ghost item during drag */}
          {renderGhostItem()}
          
          {/* Timeline Content Rows */}
          <div className="relative">
            {rows.map(rowIndex => {
              // Skip hidden tracks
              if (hiddenTracks.has(rowIndex)) return null;
              
              // Get items for this row
              const rowItems = rowsMap.get(rowIndex) || [];
              
              return (
                <div 
                  key={`track-${rowIndex}`}
                  className={cn(
                    "relative border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900",
                    "hover:bg-gray-100 dark:hover:bg-gray-800/80 transition-colors",
                    collapsedTracks.has(rowIndex) ? "h-2" : "h-14",
                    lockedTracks.has(rowIndex) ? "opacity-60" : "",
                    dropTargetRow === rowIndex ? "bg-blue-100/30 dark:bg-blue-900/30" : ""
                  )}
                  onDragOver={(e) => !lockedTracks.has(rowIndex) && handleRowDragOver(e, rowIndex)}
                  onDragLeave={handleRowDragLeave}
                  style={{ 
                    backgroundSize: `${100 * zoomLevel}px 40px`, 
                    backgroundPosition: '0 center'
                  }}
                >
                  {/* Only render items if track is not collapsed */}
                  {!collapsedTracks.has(rowIndex) && rowItems.map(item => (
                    <TimelineItem
                      key={`item-${item.id}`}
                      item={item}
                      isSelected={selectedItemId === item.id}
                      isDragging={isDragging}
                      durationInFrames={durationInFrames}
                      currentFrame={currentFrame}
                      zoomLevel={zoomLevel}
                      onDragToChat={onDragToChat ? () => onDragToChat(item.id) : undefined}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Ghost item component for drag visualization
 */
interface GhostItemProps {
  position: {
    left: number;
    width: number;
    row?: number;
  };
  isInvalid: boolean;
}

const GhostItem: React.FC<GhostItemProps> = ({ position, isInvalid }) => {
  return (
    <div 
      className={cn(
        "absolute h-8 border rounded-md pointer-events-none transition-colors duration-150",
        isInvalid ? "bg-red-400/60 border-red-500" : "bg-blue-400/60 border-blue-500"
      )}
      style={{
        left: `${position.left}px`,
        width: `${position.width}px`,
        top: position.row !== undefined 
          ? `${position.row * 56 + 14}px` 
          : '14px',
        zIndex: 5
      }}
    />
  );
};

export default TimelineGrid;
