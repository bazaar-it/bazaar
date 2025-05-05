//src/components/client/Timeline/Timeline.tsx
"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useTimeline } from './TimelineContext';
import TimelineGrid from './TimelineGrid';
import TimelineMarker from './TimelineMarker';
import TimelineHeader from './TimelineHeader';
import { cn } from '~/lib/utils';
import { useVideoState } from '~/stores/videoState';
import { TimelineItemType } from '~/types/timeline';
import type { TimelineItemUnion, DragInfo } from '~/types/timeline';
import type { Operation } from 'fast-json-patch';
import { addScene, removeSceneByIndex, replace } from '~/lib/patch';

export interface TimelineProps {
  projectId: string;
  className?: string;
  allowDragToChat?: boolean;
  selectedItemId?: number | null;
  onSelectItem?: (itemId: number) => void;
  totalDuration?: number; // Duration in frames
}

/**
 * Timeline component for video editing
 * Provides a visual interface to view and manipulate timeline items
 */
export const Timeline: React.FC<TimelineProps> = ({
  projectId,
  className,
  allowDragToChat = false,
  selectedItemId = null,
  onSelectItem,
}) => {
  // Get timeline context values
  const { 
    items,
    selectedItemId: internalSelectedItemId, 
    setSelectedItemId,
    currentFrame, 
    durationInFrames,
    zoomLevel,
    isDragging,
    ghostPosition,
    dragInfoRef,
    timelineRef: contextTimelineRef,
    updateItem,
    setCurrentFrame,
    setZoomLevel,
    setGhostPosition,
    setIsDragging,
    findGapsInRow,
    seekToFrame
  } = useTimeline();
  
  // Get video state
  const { getCurrentProps, applyPatch } = useVideoState();
  const inputProps = getCurrentProps();

  // Convert scenes to timeline items
  const timelineItems = useMemo<TimelineItemUnion[]>(() => {
    if (!inputProps) return [];
    
    return inputProps.scenes.map((scene, index): TimelineItemUnion => {
      // Map scene type to timeline item type
      const itemType = mapSceneTypeToTimelineType(scene.type);
      
      // Create timeline item based on type
      switch (scene.type) {
        case 'text':
          return {
            id: parseInt(scene.id, 10) || index,
            type: TimelineItemType.TEXT,
            from: scene.start,
            durationInFrames: scene.duration,
            row: index % 3,
            content: scene.data?.text as string || 'Text',
            color: scene.data?.color as string || '#FFFFFF',
            fontSize: scene.data?.fontSize as number || 24,
            fontFamily: scene.data?.fontFamily as string || 'Arial'
          } as TimelineItemUnion;
        case 'image':
          return {
            id: parseInt(scene.id, 10) || index,
            type: TimelineItemType.IMAGE,
            from: scene.start,
            durationInFrames: scene.duration,
            row: index % 3,
            src: scene.data?.src as string || ''
          } as TimelineItemUnion;
        default:
          return {
            id: parseInt(scene.id, 10) || index,
            type: TimelineItemType.TEXT,
            from: scene.start,
            durationInFrames: scene.duration,
            row: index % 3,
            content: scene.type,
            fontSize: 24,
            fontFamily: 'Arial',
            color: '#FFFFFF'
          } as TimelineItemUnion;
      }
    });
  }, [inputProps]);

  // Helper function to map scene types to timeline item types
  function mapSceneTypeToTimelineType(sceneType: string): TimelineItemType {
    switch (sceneType) {
      case 'text': return TimelineItemType.TEXT;
      case 'image': return TimelineItemType.IMAGE;
      case 'video': return TimelineItemType.VIDEO;
      case 'audio': return TimelineItemType.AUDIO;
      default: return TimelineItemType.TEXT;
    }
  }

  // Handle item selection
  const handleItemClick = useCallback((itemId: number) => {
    // Update internal timeline context
    setSelectedItemId(itemId);
    
    // Propagate selection to parent component if handler provided
    if (onSelectItem) {
      onSelectItem(itemId);
    }
  }, [setSelectedItemId, onSelectItem]);

  // Update scene in Zustand when timeline item changes using JSON-Patch
  const handleTimelineChange = useCallback((updatedItem: TimelineItemUnion) => {
    if (!inputProps) return;
    
    // Find scene by ID (converting between string and number as needed)
    const sceneIndex = inputProps.scenes.findIndex(scene => 
      parseInt(scene.id, 10) === updatedItem.id || scene.id === String(updatedItem.id)
    );
    
    if (sceneIndex === -1) return;
    
    // Generate patches using our patch factory
    const patches: Operation[] = [
      // Update the start time
      ...replace(sceneIndex, 'start', updatedItem.from),
      // Update the duration
      ...replace(sceneIndex, 'duration', updatedItem.durationInFrames)
    ];
    
    // Apply patches using the optimistic update pattern
    applyPatch(projectId, patches);
  }, [inputProps, projectId, applyPatch]);

  // Handle item deletion using the patch factory
  const handleDeleteItem = useCallback((id: number) => {
    if (!inputProps) return;
    
    // Find the scene index
    const sceneIndex = inputProps.scenes.findIndex(scene => 
      parseInt(scene.id, 10) === id || scene.id === String(id)
    );
    
    if (sceneIndex !== -1) {
      // Generate a remove patch using our factory
      const patches = removeSceneByIndex(sceneIndex);
      
      // Apply the patch
      applyPatch(projectId, patches);
      
      // If this was the selected item, clear selection
      if (internalSelectedItemId === id) {
        handleItemClick(null as any);
      }
    }
  }, [inputProps, projectId, applyPatch]);

  // Refs for DOM elements
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Local state for drag item ID
  const [draggedItemId, setDraggedItemId] = useState<number | null>(null);
  
  // Seek on timeline click
  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = contextTimelineRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clickX = e.clientX - rect.left;
    const percent = clickX / rect.width;
    const frame = Math.round(percent * durationInFrames);
    seekToFrame(frame);
  }, [contextTimelineRef, durationInFrames, seekToFrame]);

  // Handle mouse wheel for zooming
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    
    // Adjust zoom level based on wheel direction
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    const newZoom = Math.max(0.5, Math.min(5, zoomLevel + delta));
    
    setZoomLevel(newZoom);
  }, [zoomLevel, setZoomLevel]);

  // Set up wheel event listener
  useEffect(() => {
    const timeline = contextTimelineRef.current;
    
    if (timeline) {
      timeline.addEventListener('wheel', handleWheel, { passive: false });
      
      return () => {
        timeline.removeEventListener('wheel', handleWheel);
      };
    }
  }, [handleWheel, contextTimelineRef]);

  // Track timeline width for responsive calculations
  const [timelineWidth, setTimelineWidth] = useState(0);
  
  // Track window resize for responsive adjustments
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setTimelineWidth(containerRef.current.clientWidth);
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Synchronize external and internal selection state
  useEffect(() => {
    // If selectedItemId is provided externally, sync it with internal state
    if (selectedItemId !== null && selectedItemId !== internalSelectedItemId) {
      setSelectedItemId(selectedItemId);
    }
  }, [selectedItemId, internalSelectedItemId, setSelectedItemId]);

  // Handle item drag start
  const handleItemDragStart = useCallback(
    (itemId: number, clientX: number, action: 'move' | 'resize-start' | 'resize-end') => {
      // Find item by ID
      const item = items.find(item => item.id === itemId);
      if (!item) return;
      
      // Calculate timeline dimensions
      const timeline = contextTimelineRef.current;
      if (!timeline) return;
      
      const timelineRect = timeline.getBoundingClientRect();
      const startPointPercent = clientX - timelineRect.left;
      const percentWidth = timelineRect.width / 100;
      const startPointInPercent = startPointPercent / percentWidth;
      
      // Set up drag info
      dragInfoRef.current = {
        itemId,
        action,
        startPosition: startPointInPercent, 
        startRow: item.row,
        startDuration: item.durationInFrames,
        startClientX: clientX
      };
      
      // Set up ghost position for visual feedback
      const leftPercent = (item.from / durationInFrames) * 100;
      const widthPercent = (item.durationInFrames / durationInFrames) * 100;
      
      setGhostPosition({
        left: leftPercent,
        width: widthPercent,
        row: item.row
      });
      
      setIsDragging(true);
      
      // Also select the item being dragged
      handleItemClick(itemId);
    },
    [items, setGhostPosition, setIsDragging, durationInFrames, handleItemClick]
  );

  // Handle making an item draggable to chat
  const handleDragToChat = useCallback((itemId: number) => {
    if (!allowDragToChat) return;
    
    // Find the relevant item
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    
    // Implementation will depend on how your chat interface expects data
    console.log('Item ready for drag to chat:', item);
    
    // You would implement the drag event handlers here
    // This is a placeholder for the actual implementation
  }, [items, allowDragToChat]);

  return (
    <div 
      className={cn("flex flex-col h-full overflow-hidden bg-background border rounded-md", className)}
      ref={containerRef}
    >
      {/* Timeline header with time markers */}
      <TimelineHeader 
        durationInFrames={durationInFrames} 
        zoomLevel={zoomLevel}
      />
      
      {/* Main timeline area */}
      <div className="flex-1 relative overflow-x-auto overflow-y-hidden">
        <div
          ref={contextTimelineRef}
          className="relative w-full h-full"
          style={{ 
            width: `${100 * zoomLevel}%`,
            minWidth: '100%',
          }}
          onClick={handleTimelineClick}
        >
          {/* Current frame marker */}
          <TimelineMarker 
            currentFrame={currentFrame} 
            totalDuration={durationInFrames}
            zoomLevel={zoomLevel}
          />
          
          {/* Ghost element for drag operations */}
          {isDragging && (
            <div 
              className="absolute h-full bg-blue-400/20 border border-blue-500 pointer-events-none"
              style={{
                left: `${ghostPosition.left}%`,
                width: `${ghostPosition.width}%`,
                zIndex: 10,
              }}
            />
          )}
          
          {/* Timeline grid with items */}
          <TimelineGrid
            items={items}
            selectedItemId={internalSelectedItemId}
            setSelectedItemId={setSelectedItemId}
            draggedItemId={draggedItemId}
            isDragging={isDragging}
            durationInFrames={durationInFrames}
            onItemDragStart={handleItemDragStart}
            onDragToChat={handleDragToChat}
            currentFrame={currentFrame}
            zoomLevel={zoomLevel}
          />
        </div>
      </div>
    </div>
  );
};

export default Timeline;
