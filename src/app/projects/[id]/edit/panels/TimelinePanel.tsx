// src/app/projects/[id]/edit/panels/TimelinePanel.tsx
"use client";

import React, { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { useVideoState } from '~/stores/videoState';
import Timeline from '~/components/client/Timeline/Timeline';
import { TimelineItemType } from '~/types/timeline';
import type { TimelineItemUnion, TimelineItemStatus } from '~/types/timeline';
import { TimelineProvider } from '~/components/client/Timeline/TimelineContext';
import { useSelectedScene } from '~/components/client/Timeline/SelectedSceneContext';
import { replace } from '~/lib/patch';
import type { SceneType } from "~/types/remotion-constants";

// Define a simple interface for component jobs to avoid type errors
interface ComponentJob {
  id: string;
  status: string;
  metadata?: {
    durationInFrames?: number;
  };
}

export default function TimelinePanel() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const { getCurrentProps, applyPatch } = useVideoState();
  const inputProps = getCurrentProps();
  const { selectedSceneId, setSelectedSceneId } = useSelectedScene();
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const [sceneStatuses, setSceneStatuses] = useState<Record<string, TimelineItemStatus>>({});
  
  // Since we don't have real-time job data yet, we'll check for timing issues only
  // We can implement a real API once it's available
  const activeJobs: ComponentJob[] = [];
  
  // Initialize scene statuses based on timing issues
  useEffect(() => {
    if (inputProps?.scenes) {
      const newStatuses: Record<string, TimelineItemStatus> = {};
      
      // Check for scene timing issues
      let previousEndFrame = 0;
      inputProps.scenes.forEach((scene, index) => {
        // Check for gaps
        if (scene.start > previousEndFrame && index > 0) {
          newStatuses[scene.id] = "warning";
        }
        
        // Check for overlaps
        if (scene.start < previousEndFrame && index > 0) {
          newStatuses[scene.id] = "error";
        }
        
        previousEndFrame = scene.start + scene.duration;
      });
      
      setSceneStatuses(newStatuses);
    }
  }, [inputProps?.scenes]);
  
  // Calculate total duration from video props
  const totalDuration = useMemo(() => {
    if (!inputProps?.meta?.duration) return 300; // Default 10 seconds at 30fps
    return inputProps.meta.duration;
  }, [inputProps?.meta?.duration]);
  
  // Convert scenes to timeline items
  const timelineItems = useMemo(() => {
    if (!inputProps) return [];
    
    return inputProps.scenes.map((scene, index): TimelineItemUnion => {
      const status = sceneStatuses[scene.id] || "valid";
      
      // Map the type first to use in the correct item creation
      const itemType = mapSceneTypeToTimelineType(scene.type);
      
      // Create timeline item based on type
      switch (itemType) {
        case TimelineItemType.TEXT:
          return {
            id: parseInt(scene.id, 10) || index + 1,
            type: TimelineItemType.TEXT,
            from: scene.start,
            durationInFrames: scene.duration,
            row: index % 3,
            content: scene.data?.text as string || 'Text',
            color: scene.data?.color as string || '#FFFFFF',
            fontSize: scene.data?.fontSize as number || 24,
            fontFamily: scene.data?.fontFamily as string || 'Arial',
            status,
            sceneId: scene.id,
          };
        case TimelineItemType.IMAGE:
          return {
            id: parseInt(scene.id, 10) || index + 1,
            type: TimelineItemType.IMAGE,
            from: scene.start,
            durationInFrames: scene.duration,
            row: index % 3,
            src: scene.data?.src as string || '',
            status,
            sceneId: scene.id,
          };
        case TimelineItemType.CUSTOM:
          return {
            id: parseInt(scene.id, 10) || index + 1,
            type: TimelineItemType.CUSTOM,
            from: scene.start,
            durationInFrames: scene.duration,
            row: index % 3,
            componentId: scene.data?.componentId as string || '',
            name: scene.data?.name as string || 'Custom Component',
            outputUrl: scene.data?.outputUrl as string || '',
            status,
            sceneId: scene.id,
          };
        default:
          return {
            id: parseInt(scene.id, 10) || index + 1,
            type: TimelineItemType.TEXT,
            from: scene.start,
            durationInFrames: scene.duration,
            row: index % 3,
            content: scene.type,
            fontSize: 24,
            fontFamily: 'Arial',
            color: '#FFFFFF',
            status,
            sceneId: scene.id,
          };
      }
    });
  }, [inputProps?.scenes, sceneStatuses]);
  
  // Function to map scene types to timeline item types
  function mapSceneTypeToTimelineType(sceneType: string): TimelineItemType {
    switch (sceneType) {
      case 'text': return TimelineItemType.TEXT;
      case 'image': return TimelineItemType.IMAGE;
      case 'custom': return TimelineItemType.CUSTOM;
      case 'video': return TimelineItemType.VIDEO;
      case 'audio': return TimelineItemType.AUDIO;
      default: return TimelineItemType.TEXT;
    }
  }
  
  const handleSelectItem = useCallback((itemId: number) => {
    // Find the scene that corresponds to the timeline item
    const item = timelineItems.find(item => item.id === itemId);
    
    // Update the selected scene in context
    if (item && item.sceneId) {
      setSelectedSceneId(item.sceneId);
      
      // Update URL with scene ID for deep linking
      const newPath = `${pathname}?scene=${item.sceneId}`;
      router.push(newPath);
    }
  }, [timelineItems, setSelectedSceneId, pathname, router]);

  if (!inputProps) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-8">
        <div className="animate-pulse text-xl text-muted-foreground">Loading timeline...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" ref={timelineContainerRef}>
      <div className="px-4 py-3 border-b border-gray-100 mb-2">
        <h2 className="text-lg font-medium text-gray-900">Timeline</h2>
        <p className="text-sm text-gray-500">Video timeline</p>
      </div>
      
      <div className="flex-1 border border-gray-100 rounded-[15px] shadow-sm overflow-hidden mx-2 bg-white/50">
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
      <div className="mt-3 mx-4 text-xs text-gray-600 grid grid-cols-2 gap-x-4 gap-y-1 p-3 bg-gray-50/70 rounded-[15px] border border-gray-100 shadow-sm">
        <div className="flex items-center">
          <kbd className="px-2 py-0.5 bg-white rounded-[6px] text-gray-700 text-[10px] mr-2 shadow-sm border border-gray-200 font-medium">Delete</kbd>
          <span>Remove scene</span>
        </div>
        <div className="flex items-center">
          <kbd className="px-2 py-0.5 bg-white rounded-[6px] text-gray-700 text-[10px] mr-2 shadow-sm border border-gray-200 font-medium">Space</kbd>
          <span>Play/pause</span>
        </div>
        <div className="flex items-center">
          <kbd className="px-2 py-0.5 bg-white rounded-[6px] text-gray-700 text-[10px] mr-2 shadow-sm border border-gray-200 font-medium">→</kbd>
          <span>Next frame</span>
        </div>
        <div className="flex items-center">
          <kbd className="px-2 py-0.5 bg-white rounded-[6px] text-gray-700 text-[10px] mr-2 shadow-sm border border-gray-200 font-medium">←</kbd>
          <span>Previous frame</span>
        </div>
      </div>
      
      {/* Status legend */}
      <div className="mt-2 mx-4 mb-3 flex flex-wrap items-center gap-3 text-xs text-gray-600 p-3 border-t border-gray-100">
        <span className="font-medium">Status:</span>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-500/20 border border-green-500 rounded-full mr-1.5 shadow-sm"></div>
          <span>Valid</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-yellow-500/20 border border-yellow-500 rounded-full mr-1.5 shadow-sm"></div>
          <span>Warning</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-red-500/20 border border-red-500 rounded-full mr-1.5 shadow-sm"></div>
          <span>Error</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-blue-500/20 border border-blue-500 rounded-full mr-1.5 animate-pulse shadow-sm"></div>
          <span>Building</span>
        </div>
      </div>
    </div>
  );
}