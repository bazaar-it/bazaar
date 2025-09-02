"use client";

import React, { useEffect, useState } from 'react';
import { api } from '~/trpc/react';

interface SceneAttachmentsProps {
  sceneIds: string[];
  projectId: string;
}

interface SceneInfo {
  id: string;
  name: string;
  order: number;
}

export function SceneAttachments({ sceneIds, projectId }: SceneAttachmentsProps) {
  const [scenes, setScenes] = useState<SceneInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch scene information for the attached scene IDs
  // No cache - always fetch fresh data to ensure correct scene ordering
  const { data: projectScenes } = api.generation.getProjectScenes.useQuery(
    { projectId },
    { 
      enabled: sceneIds.length > 0,
      staleTime: 0, // No cache - always fresh
      gcTime: 0, // Don't keep in cache (gcTime replaces cacheTime in React Query v5)
      refetchOnMount: 'always', // Always refetch when component mounts
    }
  );

  useEffect(() => {
    if (projectScenes && sceneIds.length > 0) {
      // Create a map of scene position in the full timeline
      // This ensures correct "Scene X" numbering even after deletions
      const scenePositionMap = new Map<string, number>();
      projectScenes.forEach((scene, index) => {
        scenePositionMap.set(scene.id, index + 1); // 1-indexed for display
      });
      
      // Filter scenes to only include the attached ones
      // Maintain the order they were attached (sceneIds order)
      const attachedScenes = sceneIds
        .map(sceneId => {
          const scene = projectScenes.find(s => s.id === sceneId);
          if (!scene) return null;
          
          const position = scenePositionMap.get(sceneId) || 0;
          return {
            id: scene.id,
            name: scene.name || `Scene ${position}`,
            order: position - 1 // Store 0-indexed order for consistency
          };
        })
        .filter(Boolean) as SceneInfo[];
      
      setScenes(attachedScenes);
      setIsLoading(false);
    }
  }, [projectScenes, sceneIds]);

  if (isLoading) {
    return (
      <div className="space-y-2 mb-2">
        <div className="flex flex-wrap gap-2">
          {sceneIds.map((_, index) => (
            <div 
              key={index} 
              className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 border border-gray-200 rounded-lg animate-pulse"
            >
              <div className="w-16 h-4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1 text-xs opacity-75">
          <span>📎</span>
          <span>Loading scene attachments...</span>
        </div>
      </div>
    );
  }

  if (scenes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 mb-2">
      <div className="flex flex-wrap gap-2">
        {scenes.map((scene, index) => {
          const scenePosition = scene.order + 1; // Convert back to 1-indexed for display
          return (
            <div 
              key={scene.id} 
              className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg shadow-sm"
              title={`Scene ${scenePosition}: ${scene.name}`}
            >
              <span className="text-xs text-gray-700 font-medium max-w-[120px] truncate">
                {scene.name}
              </span>
              <span className="text-[10px] text-gray-500 ml-1">
                Scene {scenePosition}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-1 text-xs opacity-75">
        <span>🎬</span>
        <span>{scenes.length} scene{scenes.length > 1 ? 's' : ''} included</span>
      </div>
    </div>
  );
}
