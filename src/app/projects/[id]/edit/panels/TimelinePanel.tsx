// src/app/projects/[id]/edit/panels/TimelinePanel.tsx
//src/app/projects/[id]/edit/panels/TimelinePanel.tsx
"use client";

import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useVideoState } from '~/stores/videoState';
import Timeline from '~/components/client/Timeline/Timeline';
import { TimelineProvider } from '~/components/client/Timeline/TimelineContext';
import type { TimelineItemUnion } from '~/types/timeline';
import { TimelineItemType } from '~/types/timeline';
import { useSelectedScene } from '~/components/client/Timeline/SelectedSceneContext';
import { replace } from '~/lib/patch';

export default function TimelinePanel() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { getCurrentProps, applyPatch } = useVideoState();
  const inputProps = getCurrentProps();
  const { selectedSceneId, setSelectedSceneId } = useSelectedScene();
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  
  // Calculate total duration from video props
  const totalDuration = useMemo(() => {
    if (!inputProps?.scenes || inputProps.scenes.length === 0) {
      return 300; // Default 10 seconds at 30fps if no scenes
    }
    
    // Find the latest ending frame across all scenes
    const maxEndFrame = inputProps.scenes.reduce((max, scene) => {
      const sceneEndFrame = scene.start + scene.duration;
      return Math.max(max, sceneEndFrame);
    }, 0);
    
    // Add some padding (3 seconds) to ensure we can see beyond the last scene
    return Math.max(maxEndFrame + 90, 300);
  }, [inputProps?.scenes]);
  
  // Convert scenes to timeline items
  const timelineItems = useMemo<TimelineItemUnion[]>(() => {
    if (!inputProps) return [];
    
    return inputProps.scenes.map((scene, index): TimelineItemUnion => {
      // Map the type first to use in the correct item creation
      const itemType = mapSceneTypeToTimelineType(scene.type);
      
      // Create proper typed items based on scene type
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
          };
        case 'image':
          return {
            id: parseInt(scene.id, 10) || index,
            type: TimelineItemType.IMAGE,
            from: scene.start,
            durationInFrames: scene.duration,
            row: index % 3,
            src: scene.data?.src as string || ''
          };
        case 'custom':
          return {
            id: parseInt(scene.id, 10) || index,
            type: TimelineItemType.CUSTOM,
            from: scene.start,
            durationInFrames: scene.duration,
            row: index % 3,
            componentId: scene.data?.componentId as string || '',
            name: scene.data?.name as string || 'Custom Component',
            outputUrl: scene.data?.outputUrl as string || ''
          };
        default:
          // Default to a text item for other scene types
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
          };
      }
    });
  }, [inputProps]);
  
  // Function to map scene types to timeline item types
  function mapSceneTypeToTimelineType(sceneType: string): TimelineItemType {
    switch (sceneType) {
      case 'text': return TimelineItemType.TEXT;
      case 'image': return TimelineItemType.IMAGE;
      case 'video': return TimelineItemType.VIDEO;
      case 'audio': return TimelineItemType.AUDIO;
      case 'custom': return TimelineItemType.CUSTOM;
      default: return TimelineItemType.TEXT;
    }
  }
  
  // Handle when an item is selected from the timeline
  const handleSelectItem = useCallback((itemId: number) => {
    // Find the scene that corresponds to the timeline item
    const scene = inputProps?.scenes.find(s => {
      const sceneIdNum = parseInt(s.id, 10);
      return !isNaN(sceneIdNum) && sceneIdNum === itemId;
    });
    
    // Update the selected scene in context
    if (scene) {
      setSelectedSceneId(scene.id);
      
      // Log instead of toast notification
      console.log(`Selected: ${scene.type} scene`);
    }
  }, [inputProps?.scenes, setSelectedSceneId]);
  
  // Handle drag from timeline to chat
  const handleDragToChat = useCallback((itemId: number) => {
    // Find the scene
    const scene = inputProps?.scenes.find(s => {
      const sceneIdNum = parseInt(s.id, 10);
      return !isNaN(sceneIdNum) && sceneIdNum === itemId;
    });
    
    if (scene) {
      // You could implement a way to send this scene to the chat
      // For now, just log
      console.log(`Dragged scene ${scene.type} to chat`);
    }
  }, [inputProps?.scenes]);

  if (!inputProps) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <div className="animate-pulse text-xl">Loading timeline...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" ref={timelineContainerRef}>
      <h2 className="text-xl font-semibold mb-2">Timeline</h2>
      
      <div className="flex-1 border border-gray-700 rounded-md overflow-hidden">
        <TimelineProvider 
          initialItems={timelineItems} 
          initialDuration={totalDuration}
        >
          <Timeline 
            projectId={id as string} 
            className="h-full"
            totalDuration={totalDuration}
            onSelectItem={handleSelectItem}
            selectedItemId={selectedSceneId ? parseInt(selectedSceneId, 10) : null}
            allowDragToChat={true}
          />
        </TimelineProvider>
      </div>
      
      {/* Keyboard shortcut help */}
      <div className="mt-2 text-xs text-gray-400 grid grid-cols-2 gap-x-4 gap-y-1">
        <div className="flex items-center">
          <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-300 text-[10px] mr-1">Delete</kbd>
          <span>Remove scene</span>
        </div>
        <div className="flex items-center">
          <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-300 text-[10px] mr-1">Ctrl</kbd>
          <span>+</span>
          <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-300 text-[10px] mx-1">D</kbd>
          <span>Duplicate</span>
        </div>
        <div className="flex items-center">
          <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-300 text-[10px] mr-1">Ctrl</kbd>
          <span>+</span>
          <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-300 text-[10px] mx-1">S</kbd>
          <span>Split at playhead</span>
        </div>
        <div className="flex items-center">
          <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-300 text-[10px] mr-1">↔</kbd>
          <span>Drag to reposition</span>
        </div>
      </div>
    </div>
  );
}