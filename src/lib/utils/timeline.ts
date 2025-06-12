// src/lib/utils/timeline.ts
// Timeline management utilities for scene start/end calculations

import type { TimelineUpdate, TimelineState } from '~/lib/types/api/brain-contracts';

/**
 * Calculate timeline updates when a scene duration changes
 */
export function calculateTimelineUpdates(
  scenes: Array<{ id: string; duration: number }>,
  changedSceneId: string,
  newDuration: number
): TimelineUpdate[] {
  const updates: TimelineUpdate[] = [];
  let currentTime = 0;
  
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const oldStart = currentTime;
    const oldEnd = currentTime + scene.duration;
    
    // Use new duration for the changed scene
    const duration = scene.id === changedSceneId ? newDuration : scene.duration;
    
    updates.push({
      sceneId: scene.id,
      oldStart,
      oldEnd,
      newStart: currentTime,
      newEnd: currentTime + duration,
      duration
    });
    
    currentTime += duration;
  }
  
  return updates;
}

/**
 * Calculate timeline state for all scenes
 */
export function calculateTimelineState(
  scenes: Array<{ id: string; duration: number }>
): TimelineState {
  const timelineScenes = [];
  let currentTime = 0;
  
  for (const scene of scenes) {
    timelineScenes.push({
      id: scene.id,
      start: currentTime,
      end: currentTime + scene.duration,
      duration: scene.duration
    });
    
    currentTime += scene.duration;
  }
  
  return {
    scenes: timelineScenes,
    totalDuration: currentTime
  };
}

/**
 * Get affected scenes after a deletion
 */
export function getAffectedScenesAfterDeletion(
  scenes: Array<{ id: string; duration: number }>,
  deletedSceneId: string
): Array<{ id: string; shiftAmount: number }> {
  const deletedIndex = scenes.findIndex(s => s.id === deletedSceneId);
  if (deletedIndex === -1) return [];
  
  const deletedDuration = scenes[deletedIndex].duration;
  
  return scenes
    .slice(deletedIndex + 1)
    .map(scene => ({
      id: scene.id,
      shiftAmount: -deletedDuration // Negative shift to move earlier
    }));
}

/**
 * Calculate insertion point for a new scene
 */
export function calculateInsertionPoint(
  scenes: Array<{ id: string; duration: number }>,
  afterSceneId?: string
): { order: number; startTime: number } {
  if (!afterSceneId || scenes.length === 0) {
    // Insert at the end
    const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
    return {
      order: scenes.length,
      startTime: totalDuration
    };
  }
  
  const afterIndex = scenes.findIndex(s => s.id === afterSceneId);
  if (afterIndex === -1) {
    // Scene not found, insert at end
    const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
    return {
      order: scenes.length,
      startTime: totalDuration
    };
  }
  
  // Calculate start time up to and including the target scene
  const startTime = scenes
    .slice(0, afterIndex + 1)
    .reduce((sum, s) => sum + s.duration, 0);
  
  return {
    order: afterIndex + 1,
    startTime
  };
}