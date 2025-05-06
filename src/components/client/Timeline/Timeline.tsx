//src/components/client/Timeline/Timeline.tsx
"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useTimeline, useTimelineZoom, useTimelineClick, useTimelineDrag } from './TimelineContext';
import TimelineGrid from './TimelineGrid';
import TimelineMarker from './TimelineMarker';
import TimelineHeader from './TimelineHeader';
import { cn } from '~/lib/utils';
import { useVideoState } from '~/stores/videoState';
import { TimelineItemType } from '~/types/timeline';
import type { TimelineItemUnion } from '~/types/timeline';
import type { Operation } from 'fast-json-patch';
import { addScene, removeSceneByIndex, replace } from '~/lib/patch';
import { ZoomIn, ZoomOut, Trash2, Copy, Plus, Scissors, RefreshCw } from 'lucide-react';

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
  
  // UI state
  const [isRegeneratingScene, setIsRegeneratingScene] = useState(false);
  
  // Get video state
  const { getCurrentProps, applyPatch } = useVideoState();
  const inputProps = getCurrentProps();

  // Map scenes to timeline items with guaranteed unique IDs
  const timelineItems = useMemo<TimelineItemUnion[]>(() => {
    if (!inputProps) return [];
    
    return inputProps.scenes.map((scene, index): TimelineItemUnion => {
      // Generate a unique numeric ID for each item
      // Use hash function to convert string UUID to a stable number
      // or use index + timestamp to ensure uniqueness
      const uniqueId = scene.id 
        ? (typeof scene.id === 'number' 
            ? scene.id 
            : hashStringToInt(scene.id)) 
        : index + Date.now();
      
      // Map scene type to timeline item type
      const itemType = mapSceneTypeToTimelineType(scene.type);
      
      // Create timeline item based on type
      switch (scene.type) {
        case 'text':
          return {
            id: uniqueId,
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
            id: uniqueId,
            type: TimelineItemType.IMAGE,
            from: scene.start,
            durationInFrames: scene.duration,
            row: index % 3,
            src: scene.data?.src as string || ''
          } as TimelineItemUnion;
        case 'custom':
          return {
            id: uniqueId,
            type: TimelineItemType.CUSTOM,
            from: scene.start,
            durationInFrames: scene.duration,
            row: index % 3,
            name: scene.data?.name as string || 'Custom',
            componentId: scene.data?.componentId as string || '',
            outputUrl: scene.data?.outputUrl as string || ''
          } as TimelineItemUnion;
        default:
          return {
            id: uniqueId,
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
  
  // Simple hash function to convert string to integer
  // This gives us a way to convert UUID strings to numbers
  function hashStringToInt(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    // Ensure positive number and avoid collisions with small indices
    return Math.abs(hash) + 1000000;
  }

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
  
  // Track timeline width for responsive calculations
  const [timelineWidth, setTimelineWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update scene in Zustand when timeline item changes using JSON-Patch
  const handleTimelineChange = useCallback((updatedItem: TimelineItemUnion) => {
    if (!inputProps) return;
    
    // Find scene by ID (converting between string and number as needed)
    const sceneIndex = inputProps.scenes.findIndex(scene => 
      parseInt(scene.id, 10) === updatedItem.id || scene.id === String(updatedItem.id)
    );
    
    if (sceneIndex === -1) return;
    
    // Clamp start and duration to valid bounds
    const safeFrom = Math.max(0, updatedItem.from);
    const safeDuration = Math.max(1, updatedItem.durationInFrames);
    
    // Generate patches using our patch factory - only update supported properties
    const patches: Operation[] = [
      // Update the start time (non-negative)
      ...replace(sceneIndex, 'start', safeFrom),
      // Update the duration (at least 1 frame)
      ...replace(sceneIndex, 'duration', safeDuration)
    ];
    
    // Apply patches using the optimistic update pattern
    applyPatch(projectId, patches);
  }, [inputProps, projectId, applyPatch]);
  
  // Handle item deletion using the patch factory
  const handleDeleteItem = useCallback((id: number) => {
    if (!inputProps) return;
    
    // Find the scene index
    const itemToDelete = items.find(item => item.id === id);
    if (!itemToDelete || !itemToDelete.sceneId) return;
    
    const sceneIndex = inputProps.scenes.findIndex(scene => scene.id === itemToDelete.sceneId);
    
    if (sceneIndex !== -1) {
      // Generate a remove patch using our factory
      const patches = removeSceneByIndex(sceneIndex);
      
      // Apply the patch
      applyPatch(projectId, patches);
      
      // If this was the selected item, clear selection
      if (internalSelectedItemId === id) {
        setSelectedItemId(null);
      }
    }
  }, [inputProps, projectId, applyPatch, internalSelectedItemId, setSelectedItemId, items]);
  
  // Handle add new track
  const handleAddTrack = useCallback(() => {
    if (!inputProps || !inputProps.scenes.length) return;
    
    // Find highest track number - avoid using row directly
    const maxTrackIndex = Math.max(...inputProps.scenes.map((scene, index) => {
      // Use the scene's index in scenes array if no explicit row/track
      return (scene as any).row || index % 3;
    }));
    
    // Create a new empty placeholder for this track
    const newTrackIndex = maxTrackIndex + 1;
    
    // Sample placeholder text for now - in production, this could be configurable
    const newScene = {
      type: 'text' as const, // Use const assertion to satisfy TypeScript
      id: String(Date.now()), // Generate a temporary ID
      start: 0,
      duration: 30, // 1 second at 30fps
      data: {
        text: `Track ${newTrackIndex + 1}`,
        color: '#FFFFFF',
        fontSize: 24,
        fontFamily: 'Arial',
      }
    };
    
    // Create patch to add the scene
    const patches = addScene(newScene);
    
    // Apply the patch
    applyPatch(projectId, patches);
  }, [inputProps, projectId, applyPatch]);
  
  // Hook to apply timeline changes to Zustand store
  useEffect(() => {
    // Add a listener or setup a reaction when item updates
    // For now, just set up a simple check on each item update
    const handleItemUpdate = (item: TimelineItemUnion) => {
      handleTimelineChange(item);
    };

    // Later we could add proper event listeners here
    
    return () => {
      // Cleanup logic if needed
    };
  }, [handleTimelineChange]);
  
  // Drag-to-chat item export
  const handleDragItemToChat = useCallback((id: number) => {
    if (!allowDragToChat) return;
    
    // Find the item by ID
    const item = timelineItems.find(item => item.id === id);
    if (!item) return;
    
    console.log('Item dragged to chat:', item);
    
    // If there's an external handler, call it
    if (onSelectItem) {
      onSelectItem(id);
    }
  }, [timelineItems, allowDragToChat, onSelectItem]);
  
  // Keyboard shortcuts for timeline
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts if in text input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Shortcut for deleting selected items
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (internalSelectedItemId !== null) {
          e.preventDefault();
          handleDeleteItem(internalSelectedItemId);
        }
      }
      
      // Shortcuts for zooming
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          zoomIn();
        } else if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          zoomOut();
        } else if (e.key === '0') {
          e.preventDefault();
          resetZoom();
        }
      }
      
      // Arrow keys for moving through timeline
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        seekToFrame(Math.max(0, currentFrame - (e.shiftKey ? 10 : 1)));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        seekToFrame(Math.min(durationInFrames - 1, currentFrame + (e.shiftKey ? 10 : 1)));
      }
    };
    
    // Add event listener for keyboard shortcuts
    window.addEventListener('keydown', handleKeyDown);
    
    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentFrame, durationInFrames, internalSelectedItemId, handleDeleteItem, seekToFrame, zoomIn, zoomOut, resetZoom]);
  
  // Handle window resizing
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setTimelineWidth(containerRef.current.clientWidth);
      }
    };
    
    // Initial measurement
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // External sync: update context selection when props change
  useEffect(() => {
    if (selectedItemId !== null && selectedItemId !== internalSelectedItemId) {
      setSelectedItemId(selectedItemId);
    }
  }, [selectedItemId, internalSelectedItemId, setSelectedItemId]);
  
  // Use explicit duration from props if provided
  useEffect(() => {
    if (totalDuration && totalDuration !== durationInFrames) {
      setDurationInFrames(totalDuration);
    }
  }, [totalDuration, durationInFrames, setDurationInFrames]);

  // Handle Scene Regeneration (placeholder for future implementation)
  const handleRegenerateScene = useCallback(() => {
    // Find the selected item
    const selectedItem = items.find(item => item.id === internalSelectedItemId);
    if (!selectedItem || !selectedItem.sceneId) return;
    
    // Set regenerating state to show UI feedback
    setIsRegeneratingScene(true);
    
    // For now, just log that we would regenerate this scene
    console.log(`Regenerating scene ${selectedItem.sceneId}`);
    
    // Simulate regeneration in progress
    setTimeout(() => {
      setIsRegeneratingScene(false);
      
      // Show notification
      console.log('Scene regeneration will be implemented in a future update');
    }, 1500);
    
    // In future implementation, this would trigger a tRPC call to regenerate the scene
    // The implementation would look like:
    /*
    api.chat.regenerateScene.mutate({
      projectId,
      sceneId: selectedItem.sceneId
    }, {
      onSuccess: () => {
        setIsRegeneratingScene(false);
        // Show success notification
      },
      onError: (error) => {
        setIsRegeneratingScene(false);
        // Show error notification
      }
    });
    */
  }, [internalSelectedItemId, items]);

  return (
    <div 
      ref={containerRef}
      className={cn("flex flex-col w-full h-full", className)}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-slate-900 px-4 py-2 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <button 
            onClick={zoomOut}
            className="p-1 text-slate-400 hover:text-white"
            title="Zoom out (Ctrl+-)"
          >
            <ZoomOut size={16} />
          </button>
          <span className="text-xs text-slate-300">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button 
            onClick={zoomIn}
            className="p-1 text-slate-400 hover:text-white"
            title="Zoom in (Ctrl++)"
          >
            <ZoomIn size={16} />
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Item selection tools */}
          {internalSelectedItemId !== null && (
            <>
              <button 
                onClick={() => handleDeleteItem(internalSelectedItemId)}
                className="p-1 text-slate-400 hover:text-red-500"
                title="Delete selected item (Delete)"
              >
                <Trash2 size={16} />
              </button>
              <button 
                onClick={() => {
                  // Clone selected item
                  const item = items.find(i => i.id === internalSelectedItemId);
                  if (item) {
                    const cloned = {
                      ...item,
                      id: Date.now(), // Generate new ID
                      from: item.from + item.durationInFrames + 5, // Place after original with gap
                    };
                    
                    // Add to timeline
                    updateItem(cloned);
                  }
                }}
                className="p-1 text-slate-400 hover:text-white"
                title="Duplicate selected item"
              >
                <Copy size={16} />
              </button>
              {/* Add regenerate button */}
              <button 
                onClick={handleRegenerateScene}
                className={cn(
                  "p-1",
                  isRegeneratingScene 
                    ? "text-blue-400 animate-pulse" 
                    : "text-slate-400 hover:text-white"
                )}
                title="Regenerate scene (coming soon)"
                disabled={isRegeneratingScene}
              >
                <RefreshCw size={16} className={isRegeneratingScene ? "animate-spin" : ""} />
              </button>
              <button 
                onClick={() => {
                  // Find the item
                  const item = items.find(i => i.id === internalSelectedItemId);
                  if (item && currentFrame > item.from && currentFrame < item.from + item.durationInFrames) {
                    // Split at current frame
                    const firstHalf = {
                      ...item,
                      durationInFrames: currentFrame - item.from
                    };
                    
                    const secondHalf = {
                      ...item,
                      id: Date.now(), // Generate new ID
                      from: currentFrame,
                      durationInFrames: item.from + item.durationInFrames - currentFrame
                    };
                    
                    // Update first half
                    updateItem(firstHalf);
                    // Add second half
                    updateItem(secondHalf);
                  }
                }}
                className="p-1 text-slate-400 hover:text-white"
                title="Split at current position"
              >
                <Scissors size={16} />
              </button>
            </>
          )}
          
          <button 
            onClick={handleAddTrack}
            className="p-1 text-slate-400 hover:text-white"
            title="Add new track"
          >
            <Plus size={16} />
          </button>
        </div>
        
        <div className="text-xs text-slate-300">
          {formatTime(currentFrame / 30)} / {formatTime(durationInFrames / 30)}
        </div>
      </div>
      
      {/* Timeline header with markers */}
      <TimelineHeader 
        durationInFrames={durationInFrames}
        zoomLevel={zoomLevel}
      />
      
      {/* Main timeline grid */}
      <div className="flex-grow overflow-auto relative">
        <TimelineGrid
          onDragToChat={allowDragToChat ? handleDragItemToChat : undefined}
          onTrackAdd={handleAddTrack}
        />
        
        {/* Playhead marker */}
        <TimelineMarker
          currentFrame={currentFrame}
          totalDuration={durationInFrames}
          zoomLevel={zoomLevel}
        />
      </div>
    </div>
  );
};

/**
 * Format seconds to MM:SS.ms format
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toFixed(2).padStart(5, '0')}`;
}

export default Timeline;
