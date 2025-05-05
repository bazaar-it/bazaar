//src/components/client/Timeline/TimelineGrid.tsx
"use client";

import React, { useMemo } from 'react';
import TimelineItem from './TimelineItem';
import type { TimelineItemUnion } from '~/types/timeline';

interface TimelineGridProps {
  items: TimelineItemUnion[];
  selectedItemId: number | null;
  setSelectedItemId: (id: number | null) => void;
  draggedItemId: number | null;
  isDragging: boolean;
  durationInFrames: number;
  onItemDragStart: (id: number, clientX: number, action: 'move' | 'resize-start' | 'resize-end') => void;
  onDragToChat?: (id: number) => void;
  currentFrame: number;
  zoomLevel: number;
}

/**
 * TimelineGrid component that displays timeline items in rows
 */
const TimelineGrid: React.FC<TimelineGridProps> = ({
  items,
  selectedItemId,
  setSelectedItemId,
  draggedItemId,
  isDragging,
  durationInFrames,
  onItemDragStart,
  onDragToChat,
  currentFrame,
  zoomLevel,
}) => {
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

  return (
    <div className="w-full h-full">
      {rows.map(rowIndex => (
        <div 
          key={`row-${rowIndex}`}
          className="relative h-14 w-full border-b border-gray-200 dark:border-gray-700"
        >
          {/* Items in this row */}
          {rowsMap.get(rowIndex)?.map(item => (
            <TimelineItem
              key={item.id}
              item={item}
              isSelected={item.id === selectedItemId}
              isDragging={isDragging && item.id === draggedItemId}
              durationInFrames={durationInFrames}
              onClick={() => setSelectedItemId(item.id)}
              onDragStart={(clientX: number, action: 'move' | 'resize-start' | 'resize-end') => onItemDragStart(item.id, clientX, action)}
              onDragToChat={onDragToChat ? () => onDragToChat(item.id) : undefined}
              currentFrame={currentFrame}
              zoomLevel={zoomLevel}
            />
          ))}
        </div>
      ))}
      
      {/* Add an empty row at the end for dragging/creating new items */}
      <div className="relative h-14 w-full border-b border-gray-200 dark:border-gray-700" />
    </div>
  );
};

export default TimelineGrid;
