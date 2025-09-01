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
  const { data: projectScenes } = api.generation.getProjectScenes.useQuery(
    { projectId },
    { 
      enabled: sceneIds.length > 0,
      staleTime: 5 * 60 * 1000, // 5 minute cache
    }
  );

  useEffect(() => {
    if (projectScenes && sceneIds.length > 0) {
      // Filter scenes to only include the attached ones and sort by order
      const attachedScenes = projectScenes
        .filter(scene => sceneIds.includes(scene.id))
        .sort((a, b) => a.order - b.order)
        .map(scene => ({
          id: scene.id,
          name: scene.name || `Scene ${scene.order + 1}`,
          order: scene.order
        }));
      
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
        {scenes.map((scene, index) => (
          <div 
            key={scene.id} 
            className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg shadow-sm"
            title={`Scene ${scene.order + 1}: ${scene.name}`}
          >
            <span className="text-xs text-gray-700 font-medium max-w-[120px] truncate">
              {scene.name}
            </span>
            <span className="text-[10px] text-gray-500 ml-1">
              Scene {scene.order + 1}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 text-xs opacity-75">
        <span>🎬</span>
        <span>{scenes.length} scene{scenes.length > 1 ? 's' : ''} included</span>
      </div>
    </div>
  );
}
