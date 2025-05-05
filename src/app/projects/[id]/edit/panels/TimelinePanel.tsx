// src/app/projects/[id]/edit/panels/TimelinePanel.tsx
//src/app/projects/[id]/edit/panels/TimelinePanel.tsx
"use client";

import React, { useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useVideoState } from '~/stores/videoState';
import Timeline from '~/components/client/Timeline/Timeline';
import type { TimelineItemUnion } from '~/types/timeline';
import { TimelineItemType } from '~/types/timeline';
import { useSelectedScene } from '~/components/client/Timeline/SelectedSceneContext';
import { replace } from '~/lib/patch';

export default function TimelinePanel() {
  const { id } = useParams<{ id: string }>();
  const { getCurrentProps, applyPatch } = useVideoState();
  const inputProps = getCurrentProps();
  const { selectedSceneId, setSelectedSceneId } = useSelectedScene();
  
  // Calculate total duration from video props
  const totalDuration = useMemo(() => {
    if (!inputProps) return 300; // Default fallback
    return inputProps.meta.duration;
  }, [inputProps]);
  
  // Convert scenes to timeline items
  const timelineItems = useMemo(() => {
    if (!inputProps) return [];
    
    return inputProps.scenes.map((scene, index) => {
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
  
  if (!inputProps) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <div className="animate-pulse text-xl">Loading timeline...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-xl font-semibold mb-4">Timeline</h2>
      
      <div className="flex-1">
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
      </div>
    </div>
  );
}