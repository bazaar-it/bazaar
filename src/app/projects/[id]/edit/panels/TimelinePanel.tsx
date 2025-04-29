// src/app/projects/[id]/edit/panels/TimelinePanel.tsx
"use client";

import React from 'react';
import { useVideoState } from '~/stores/videoState';

export default function TimelinePanel() {
  const { getCurrentProps } = useVideoState();
const inputProps = getCurrentProps();
  
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
      
      <div className="flex-1 bg-gray-100 rounded-lg p-4 overflow-auto">
        {inputProps.scenes.map((scene, index) => (
          <div 
            key={scene.id}
            className="mb-2 p-3 bg-white rounded border border-gray-200 shadow-sm"
          >
            <div className="flex justify-between items-center">
              <span className="font-medium">Scene {index + 1}</span>
              <span className="text-xs text-gray-500">
                {scene.start} - {scene.start + scene.duration} ({scene.duration} frames)
              </span>
            </div>
            <div className="text-sm text-gray-600 mt-1">Type: {scene.type}</div>
          </div>
        ))}
      </div>
    </div>
  );
} 