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
}

/**
 * TimelineGrid component that displays timeline items in rows
 * Supporting multiple tracks with advanced functionality
 */
const TimelineGrid: React.FC<TimelineGridProps> = ({
  onDragToChat,
  onTrackAdd,
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
      className="w-full h-full relative"
      ref={timelineRef}
      onClick={handleTimelineClick}
    >
      {/* Draw current frame marker */}
      <div
        className="absolute top-0 bottom-0 w-px bg-red-500 z-30 pointer-events-none"
        style={{ left: `${markerPosition}%` }}
      >
        <div className="h-3 w-3 bg-red-500 rounded-full absolute -left-1.5 -top-1.5" />
      </div>
      
      {/* Ghost item during drag */}
      {renderGhostItem()}
      
      <div className="w-full h-full">
        {/* Track Headers */}
        <div className="sticky left-0 z-20 bg-slate-900 border-r border-slate-700 w-36">
          {rows.map(rowIndex => (
            <div 
              key={`track-header-${rowIndex}`}
              className={cn(
                "flex items-center h-14 px-2 border-b border-slate-700",
                dropTargetRow === rowIndex ? "bg-blue-900/30" : "",
                hiddenTracks.has(rowIndex) ? "opacity-50" : ""
              )}
            >
              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => toggleTrackCollapse(rowIndex)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    {collapsedTracks.has(rowIndex) ? 
                      <ChevronDown size={14} /> : 
                      <ChevronUp size={14} />
                    }
                  </button>
                  <span className="text-xs font-medium truncate">
                    Track {rowIndex + 1}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => toggleTrackVisibility(rowIndex)}
                  className="p-1 text-slate-400 hover:text-white"
                  title={hiddenTracks.has(rowIndex) ? "Show track" : "Hide track"}
                >
                  {hiddenTracks.has(rowIndex) ? 
                    <EyeOff size={14} /> : 
                    <Eye size={14} />
                  }
                </button>
                <button 
                  onClick={() => toggleTrackLock(rowIndex)}
                  className="p-1 text-slate-400 hover:text-white"
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
          <button 
            onClick={onTrackAdd}
            className="flex items-center justify-center w-full h-10 text-slate-400 hover:text-white hover:bg-slate-800"
            title="Add new track"
          >
            <Plus size={16} />
            <span className="ml-1 text-xs">Add Track</span>
          </button>
        </div>
        
        {/* Timeline Rows */}
        <div className="flex-1 overflow-hidden">
          {rows.map(rowIndex => {
            // Skip hidden tracks
            if (hiddenTracks.has(rowIndex)) return null;
            
            // Get items for this row
            const rowItems = rowsMap.get(rowIndex) || [];
            
            return (
              <div 
                key={`track-${rowIndex}`}
                className={cn(
                  "relative h-14 border-b border-slate-700 bg-slate-800",
                  "hover:bg-slate-800/80",
                  collapsedTracks.has(rowIndex) ? "h-2" : "h-14",
                  lockedTracks.has(rowIndex) ? "opacity-50" : "",
                  dropTargetRow === rowIndex ? "bg-blue-900/30" : ""
                )}
                onDragOver={(e) => !lockedTracks.has(rowIndex) && handleRowDragOver(e, rowIndex)}
                onDragLeave={handleRowDragLeave}
                style={{ 
                  backgroundSize: `${100 * zoomLevel}px 40px`, 
                  backgroundPosition: '0 center',
                  backgroundImage: 'linear-gradient(to right, rgba(115, 115, 115, 0.2) 1px, transparent 1px), linear-gradient(to right, rgba(115, 115, 115, 0.1) 1px, transparent 1px)',
                  backgroundRepeat: 'repeat-x'
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
