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
  onLayerAdd?: () => void;
}

/**
 * TimelineGrid component that displays timeline items in rows
 * Supporting multiple layers with advanced functionality
 */
const TimelineGrid: React.FC<TimelineGridProps> = ({
  onDragToChat,
  onLayerAdd,
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

  // Layer management state
  const [lockedLayers, setLockedLayers] = useState<Set<number>>(new Set());
  const [collapsedLayers, setCollapsedLayers] = useState<Set<number>>(new Set());
  const [hiddenLayers, setHiddenLayers] = useState<Set<number>>(new Set());
  
  // Drop target indicators
  const [dropTargetRow, setDropTargetRow] = useState<number | null>(null);
  
  // Handle locking/unlocking a layer
  const toggleLayerLock = (rowIndex: number) => {
    setLockedLayers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowIndex)) {
        newSet.delete(rowIndex);
      } else {
        newSet.add(rowIndex);
      }
      return newSet;
    });
  };
  
  // Handle collapsing/expanding a layer
  const toggleLayerCollapse = (rowIndex: number) => {
    setCollapsedLayers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowIndex)) {
        newSet.delete(rowIndex);
      } else {
        newSet.add(rowIndex);
      }
      return newSet;
    });
  };
  
  // Handle hiding/showing a layer
  const toggleLayerVisibility = (rowIndex: number) => {
    setHiddenLayers(prev => {
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
        {/* Layer Headers */}
        <div className="sticky left-0 z-20 bg-white border-r border-gray-200 w-36">
          {rows.map(rowIndex => (
            <div 
              key={`layer-header-${rowIndex}`}
              className={cn(
                "flex items-center h-14 px-2 border-b border-gray-200 bg-white text-black",
                dropTargetRow === rowIndex ? "bg-gray-100" : "",
                hiddenLayers.has(rowIndex) ? "opacity-50" : ""
              )}
            >
              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => toggleLayerCollapse(rowIndex)}
                    className="p-1 text-gray-400 hover:text-black"
                  >
                    {collapsedLayers.has(rowIndex) ? 
                      <ChevronDown size={14} /> : 
                      <ChevronUp size={14} />
                    }
                  </button>
                  <span className="text-xs font-medium truncate text-black">
                    Layer {rowIndex + 1}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => toggleLayerVisibility(rowIndex)}
                  className="p-1 text-gray-400 hover:text-black"
                  title={hiddenLayers.has(rowIndex) ? "Show layer" : "Hide layer"}
                >
                  {hiddenLayers.has(rowIndex) ? 
                    <EyeOff size={14} /> : 
                    <Eye size={14} />
                  }
                </button>
                <button 
                  onClick={() => toggleLayerLock(rowIndex)}
                  className="p-1 text-gray-400 hover:text-black"
                  title={lockedLayers.has(rowIndex) ? "Unlock layer" : "Lock layer"}
                >
                  {lockedLayers.has(rowIndex) ? 
                    <Lock size={14} /> : 
                    <Unlock size={14} />
                  }
                </button>
              </div>
            </div>
          ))}
          
          {/* Add layer button */}
          <button 
            onClick={onLayerAdd}
            className="flex items-center justify-center w-full h-10 text-gray-400 hover:text-black hover:bg-gray-100 bg-white"
            title="Add new layer"
          >
            <Plus size={16} />
            <span className="ml-1 text-xs text-black">Add Layer</span>
          </button>
        </div>
        
        {/* Timeline Rows */}
        <div className="flex-1 overflow-hidden">
          {rows.map(rowIndex => {
            // Skip hidden layers
            if (hiddenLayers.has(rowIndex)) return null;
            
            // Get items for this row
            const rowItems = rowsMap.get(rowIndex) || [];
            
            return (
              <div 
                key={`layer-${rowIndex}`}
                className={cn(
                  "relative border-b border-gray-100",
                  collapsedLayers.has(rowIndex) ? "h-2" : "h-14",
                  lockedLayers.has(rowIndex) ? "opacity-50" : "",
                  dropTargetRow === rowIndex ? "bg-blue-50" : ""
                )}
                onDragOver={(e) => !lockedLayers.has(rowIndex) && handleRowDragOver(e, rowIndex)}
                onDragLeave={handleRowDragLeave}
              >
                {/* Empty row content for drop target */}
                <div className="w-full h-full"></div>
                
                {/* Only render items if layer is not collapsed */}
                {!collapsedLayers.has(rowIndex) && rowItems.map(item => (
                  <TimelineItem
                    key={item.id}
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
