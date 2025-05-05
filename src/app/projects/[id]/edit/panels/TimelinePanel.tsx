// src/app/projects/[id]/edit/panels/TimelinePanel.tsx
//src/app/projects/[id]/edit/panels/TimelinePanel.tsx
"use client";

import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useVideoState } from '~/stores/videoState';
import Timeline from '~/components/client/Timeline/Timeline';
import { TimelineProvider } from '~/components/client/Timeline/TimelineContext';
import type { TimelineItemUnion } from '~/types/timeline';
import { TimelineItemType } from '~/types/timeline';
import { useSelectedScene } from '~/components/client/Timeline/SelectedSceneContext';
import { replace } from '~/lib/patch';

export default function TimelinePanel() {
  const { id } = useParams<{ id: string }>();
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
  
  // Handle timeline item updates to sync with videoState
  const handleItemUpdate = useCallback((updatedItem: TimelineItemUnion) => {
    if (!inputProps || !id) return;
    
    const sceneIndex = inputProps.scenes.findIndex(scene => 
      parseInt(scene.id, 10) === updatedItem.id || scene.id === String(updatedItem.id)
    );
    
    if (sceneIndex === -1) return;
    
    // Generate and apply patches for the updated properties
    const patches = [
      // Update the start time
      ...replace(sceneIndex, 'start', updatedItem.from),
      // Update the duration
      ...replace(sceneIndex, 'duration', updatedItem.durationInFrames)
    ];
    
    // Apply the patches to update the state
    applyPatch(id, patches);
  }, [inputProps, id, applyPatch]);
  
  // If projectId or sceneId change, or if a new scene is added beyond current view,
  // ensure the timeline scrolls to show relevant content
  useEffect(() => {
    if (!inputProps?.scenes || !timelineContainerRef.current) return;
    
    // If we have a selected scene, make sure it's visible
    if (selectedSceneId) {
      const selectedScene = inputProps.scenes.find(scene => scene.id === selectedSceneId);
      if (selectedScene) {
        const timeline = timelineContainerRef.current.querySelector('.timeline-grid');
        if (timeline && timeline.scrollWidth > timeline.clientWidth) {
          // Calculate scroll position to ensure selected item is visible
          const sceneStart = selectedScene.start;
          const sceneDuration = selectedScene.duration;
          const sceneCenter = sceneStart + (sceneDuration / 2);
          
          // Get pixel ratio from totalDuration and container width
          const pixelsPerFrame = timeline.scrollWidth / totalDuration;
          const centerPosition = sceneCenter * pixelsPerFrame;
          
          // Center the scene in the visible area
          timeline.scrollLeft = centerPosition - (timeline.clientWidth / 2);
        }
      }
    }
  }, [selectedSceneId, inputProps?.scenes, totalDuration]);
  
  if (!inputProps) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <div className="animate-pulse text-xl">Loading timeline...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" ref={timelineContainerRef}>
      <h2 className="text-xl font-semibold mb-4">Timeline</h2>
      
      <div className="flex-1">
        <TimelineProvider initialItems={timelineItems} initialDuration={totalDuration}>
          <Timeline 
            projectId={id as string} 
            className="h-full"
            totalDuration={totalDuration}
            onSelectItem={(itemId) => {
              // Convert timeline item ID to scene ID string
              const scene = inputProps.scenes.find(s => {
                const sceneIdNum = parseInt(s.id, 10);
                return !isNaN(sceneIdNum) && sceneIdNum === itemId;
              });
              
              // Update the selected scene in context
              if (scene) {
                setSelectedSceneId(scene.id);
              } else {
                setSelectedSceneId(null);
              }
            }}
            selectedItemId={selectedSceneId ? parseInt(selectedSceneId, 10) : null}
          />
        </TimelineProvider>
      </div>
    </div>
  );
}