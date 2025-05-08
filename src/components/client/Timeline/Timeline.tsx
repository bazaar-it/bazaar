//src/components/client/Timeline/Timeline.tsx
"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useTimeline, useTimelineZoom, useTimelineClick, useTimelineDrag } from './TimelineContext';
import TimelineHeader from './TimelineHeader';
import { cn } from '~/lib/utils';
import { useVideoState } from '~/stores/videoState';
import { TimelineItemType } from '~/types/timeline';
import { addScene, removeSceneByIndex } from '~/lib/patch';
import { ZoomIn, ZoomOut, RefreshCw, Trash2, Copy } from 'lucide-react';

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
  totalDuration,
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
    timelineRef: contextTimelineRef,
    updateItem,
    setDurationInFrames,
    seekToFrame
  } = useTimeline();
  
  // Use the hooks for timeline interaction
  const { handleTimelineClick, selectItem } = useTimelineClick();
  const { zoomIn, zoomOut, resetZoom } = useTimelineZoom();
  const { startDrag } = useTimelineDrag();
  
  // Get video state
  const { getCurrentProps, applyPatch } = useVideoState();
  const inputProps = getCurrentProps();

  // Generate layers based on items (renamed from tracks)
  const layers = useMemo(() => {
    // Show at least 2 layers
    const maxRow = items.length > 0 
      ? Math.max(...items.map(item => (typeof item.row === 'number' ? item.row : 0)))
      : 1;
    
    return Array.from({ length: maxRow + 1 }, (_, i) => `Layer ${i + 1}`);
  }, [items]);

  // Handle delete item
  const handleDeleteItem = useCallback((id: number | null) => {
    if (id === null) return;
    
    // Find the item
    const itemToDelete = items.find(item => item.id === id);
    if (!itemToDelete || !itemToDelete.sceneId) return;
    
    const sceneIndex = inputProps?.scenes.findIndex(scene => scene.id === itemToDelete.sceneId);
    
    if (typeof sceneIndex === 'number' && sceneIndex !== -1) {
      // Generate a remove patch
      const patches = removeSceneByIndex(sceneIndex);
      
      // Apply the patch
      applyPatch(projectId, patches);
      
      // Clear selection
      if (internalSelectedItemId === id) {
        setSelectedItemId(null);
      }
    }
  }, [items, inputProps?.scenes, projectId, applyPatch, internalSelectedItemId, setSelectedItemId]);

  // Handle copy item
  const handleCopyItem = useCallback((id: number | null) => {
    if (id === null) return;
    
    // Find the item
    const itemToCopy = items.find(item => item.id === id);
    if (!itemToCopy || !itemToCopy.sceneId) return;
    
    const sceneToCopy = inputProps?.scenes.find(scene => scene.id === itemToCopy.sceneId);
    
    if (sceneToCopy) {
      // Create a new scene based on the copied one with a new ID
      const newScene = {
        ...sceneToCopy,
        id: String(Date.now()), // Generate a new ID
        start: sceneToCopy.start + sceneToCopy.duration, // Position after the original
      };
      
      // Add the new scene
      const patches = addScene(newScene);
      applyPatch(projectId, patches);
    }
  }, [items, inputProps?.scenes, projectId, applyPatch]);

  // Add new layer (renamed from track)
  const handleAddLayer = useCallback(() => {
    // Create a new text scene as a placeholder for the new layer
    const newScene = {
      type: 'text' as const,
      id: String(Date.now()),
      start: 0,
      duration: 30,
      data: {
        text: 'New Layer',
        color: '#FFFFFF',
        fontSize: 24,
        fontFamily: 'Arial',
      }
    };
    
    const patches = addScene(newScene);
    applyPatch(projectId, patches);
  }, [projectId, applyPatch]);

  // Format time display (MM:SS:FF)
  const formatTimeDisplay = (frame: number) => {
    const seconds = Math.floor(frame / 30);
    const frames = frame % 30;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn("flex flex-col h-full bg-white", className)}>
      {/* Use TimelineHeader component for all header controls */}
      <TimelineHeader 
        durationInFrames={durationInFrames} 
        zoomLevel={zoomLevel}
        onDeleteItem={handleDeleteItem}
        onCopyItem={handleCopyItem}
      />
      
      {/* Timeline grid */}
      <div className="flex-1 relative overflow-auto" ref={contextTimelineRef}>
        {/* Layer names column (renamed from Track) */}
        <div className="absolute left-0 top-0 bottom-0 w-[120px] bg-white border-r border-gray-200 z-10">
          {layers.map((layerName, idx) => (
            <div 
              key={idx}
              className="h-12 px-3 flex items-center border-b border-gray-100 text-sm"
            >
              {layerName}
            </div>
          ))}
          <div 
            className="h-12 px-3 flex items-center text-blue-500 hover:bg-gray-50 cursor-pointer text-sm"
            onClick={handleAddLayer}
          >
            + Add Layer
          </div>
        </div>
        
        {/* Timeline content area */}
        <div 
          className="absolute left-[120px] right-0 top-0 bottom-0 overflow-auto"
          onClick={handleTimelineClick}
        >
          {/* Layer rows background */}
          {layers.map((_, idx) => (
            <div 
              key={idx}
              className="h-12 border-b border-gray-100"
            ></div>
          ))}
          
          {/* Current frame marker */}
          <div
            className="absolute top-0 bottom-0 w-px bg-red-500 z-20 pointer-events-none"
            style={{ 
              left: `${(currentFrame / durationInFrames) * 100}%` 
            }}
          >
            <div className="absolute -top-1 -left-[9px] w-[18px] h-5 flex items-center justify-center bg-red-500 text-white text-[10px] rounded">
              {currentFrame}
            </div>
          </div>
          
          {/* Timeline items */}
          {items.map(item => (
            <div
              key={item.id}
              className={cn(
                "absolute rounded-sm overflow-hidden cursor-pointer border transition-all",
                selectedItemId === item.id 
                  ? "ring-2 ring-blue-500 border-blue-500 bg-blue-100"
                  : "border-blue-400 bg-blue-50 hover:bg-blue-100"
              )}
              style={{
                top: `${(item.row || 0) * 48 + 6}px`,
                left: `${(item.from / durationInFrames) * 100}%`,
                width: `${(item.durationInFrames / durationInFrames) * 100}%`,
                height: '36px',
                opacity: isDragging && selectedItemId === item.id ? 0.5 : 1
              }}
              onClick={(e) => {
                e.stopPropagation();
                selectItem(item.id);
                if (onSelectItem) {
                  onSelectItem(item.id);
                }
              }}
              onPointerDown={(e) => {
                if (e.button === 0) {
                  e.stopPropagation();
                  selectItem(item.id);
                  startDrag(e, item.id, 'move');
                }
              }}
            >
              <div className="h-full w-full p-1 text-xs flex items-center overflow-hidden text-blue-900">
                {item.type === TimelineItemType.TEXT ? `Text: ${item.content || ''}` : 
                 item.type === TimelineItemType.IMAGE ? 'Image' : 
                 item.type === TimelineItemType.VIDEO ? 'Video' : 
                 item.type === TimelineItemType.AUDIO ? 'Audio' : 'Item'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Timeline;
