//src/components/client/Preview/DebugTimelineOverlay.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useVideoState } from '~/stores/videoState';
import { useTimeline } from '~/components/client/Timeline/TimelineContext';

type DebugTimelineOverlayProps = {
  projectId: string;
};

/**
 * Debug overlay for preview panel that shows:
 * - Current frame
 * - Scene ID at current frame (if any)
 * - Scene bounds
 * 
 * This helps diagnose why there might be black frames in the video
 */
export const DebugTimelineOverlay: React.FC<DebugTimelineOverlayProps> = ({ projectId }) => {
  // Use useState to track the frame locally
  const [frameDisplay, setFrameDisplay] = useState(0);
  const { getCurrentProps } = useVideoState();
  const { currentFrame } = useTimeline();
  const videoProps = getCurrentProps();
  
  // Update the frame display using an interval
  useEffect(() => {
    const timer = setInterval(() => {
      setFrameDisplay(currentFrame);
    }, 50); // Update every 50ms
    
    return () => clearInterval(timer);
  }, [currentFrame]);
  
  // Find the current scene(s) for this frame
  const activeScenes = videoProps?.scenes.filter(scene => {
    const start = scene.start;
    const end = start + scene.duration;
    return frameDisplay >= start && frameDisplay < end;
  }) || [];
  
  // Get details about the next scene
  const nextScene = videoProps?.scenes.find(scene => scene.start > frameDisplay);
  const nextSceneGap = nextScene ? nextScene.start - frameDisplay : 'unknown';
  
  return (
    <div className="absolute top-2 left-2 bg-black/50 text-white p-2 text-xs rounded pointer-events-none z-50 font-mono">
      <div>Frame: {frameDisplay}</div>
      <div className="text-xs opacity-70">Timeline Context Frame: {currentFrame}</div>
      
      {activeScenes.length > 0 ? (
        activeScenes.map((scene, idx) => (
          <div key={scene.id} className="mt-1 text-green-400">
            Scene {idx+1}: {scene.type} (ID: {scene.id.substring(0, 8)}...)
            <div className="text-gray-400">
              Bounds: {scene.start} → {scene.start + scene.duration}
            </div>
          </div>
        ))
      ) : (
        <div className="mt-1 text-red-400">
          No active scene at this frame
          {nextScene && (
            <div className="text-gray-400">
              Next scene in {nextSceneGap} frames
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DebugTimelineOverlay;
