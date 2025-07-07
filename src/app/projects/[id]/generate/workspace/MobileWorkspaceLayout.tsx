'use client';

import React, { useState, useCallback } from 'react';
import { PreviewPanelG } from './panels/PreviewPanelG';
import ChatPanelG from './panels/ChatPanelG';
import TemplatesPanelG from './panels/TemplatesPanelG';
import MyProjectsPanelG from './panels/MyProjectsPanelG';
import type { InputProps } from '~/lib/types/video/input-props';
import { MessageSquareIcon, LayoutTemplateIcon, FolderIcon, PlusIcon } from 'lucide-react';
import { cn } from '~/lib/cn';
import { useRouter } from 'next/navigation';
import { api } from '~/trpc/react';

type MobilePanel = 'chat' | 'templates' | 'myprojects' | 'newproject';

interface MobileWorkspaceLayoutProps {
  projectId: string;
  userId?: string;
  initialProps: InputProps;
  projects?: { id: string; name: string }[];
  onProjectRename?: (newTitle: string) => void;
}

export function MobileWorkspaceLayout({
  projectId,
  userId,
  initialProps,
  projects = [],
  onProjectRename
}: MobileWorkspaceLayoutProps) {
  const [activePanel, setActivePanel] = useState<MobilePanel>('chat');
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const router = useRouter();
  
  // Setup mutation for creating a new project
  const utils = api.useUtils();
  const createProject = api.project.create.useMutation({
    onSuccess: async (data) => {
      try {
        // Invalidate the projects list query to refetch it
        await utils.project.list.invalidate();
        
        // Redirect to the generate page for the new project
        router.push(`/projects/${data.projectId}/generate`);
      } catch (error) {
        console.error("Error after project creation:", error);
      }
    },
    onError: (error) => {
      console.error("Failed to create project:", error);
    },
  });

  const handleSceneGenerated = useCallback(async (sceneId: string) => {
    setSelectedSceneId(sceneId);
  }, []);

  const handlePanelChange = (panel: MobilePanel) => {
    if (panel === 'newproject') {
      createProject.mutate();
    } else {
      setActivePanel(panel);
    }
  };

  const renderActivePanel = () => {
    switch (activePanel) {
      case 'chat':
        return (
          <ChatPanelG
            projectId={projectId}
            userId={userId}
            selectedSceneId={selectedSceneId}
            onSceneGenerated={handleSceneGenerated}
          />
        );
      case 'templates':
        return (
          <TemplatesPanelG 
            projectId={projectId} 
            onSceneGenerated={handleSceneGenerated} 
          />
        );
      case 'myprojects':
        return (
          <MyProjectsPanelG 
            currentProjectId={projectId} 
          />
        );
      default:
        return null;
    }
  };

  const bottomNavItems = [
    { id: 'chat' as MobilePanel, label: 'Chat', icon: MessageSquareIcon },
    { id: 'templates' as MobilePanel, label: 'Templates', icon: LayoutTemplateIcon },
    { id: 'myprojects' as MobilePanel, label: 'Projects', icon: FolderIcon },
    { id: 'newproject' as MobilePanel, label: 'New', icon: PlusIcon },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Preview Panel - 16:9 aspect ratio */}
      <div className="w-full bg-white" style={{ aspectRatio: '16/9' }}>
        <PreviewPanelG projectId={projectId} initial={initialProps} />
      </div>

      {/* Active Panel - Remaining space */}
      <div className="flex-1 overflow-hidden bg-white">
        {renderActivePanel()}
      </div>

      {/* Bottom Navigation */}
      <div className="flex border-t border-gray-200 bg-white">
        {bottomNavItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handlePanelChange(item.id)}
            disabled={item.id === 'newproject' && createProject.isPending}
            className={cn(
              "flex-1 flex flex-col items-center justify-center py-2 px-1 transition-colors",
              activePanel === item.id
                ? "text-gray-900 bg-gray-100"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            )}
          >
            <item.icon className="h-5 w-5 mb-1" />
            <span className="text-xs">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}