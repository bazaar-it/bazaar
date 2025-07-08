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
import { NewProjectButton } from '~/components/client/NewProjectButton';

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

  const handleSceneGenerated = useCallback(async (sceneId: string) => {
    setSelectedSceneId(sceneId);
  }, []);

  const handlePanelChange = (panel: MobilePanel) => {
    if (panel !== 'newproject') {
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
      {/* Preview Panel - Dynamic aspect ratio based on format */}
      <div className="w-full bg-white flex items-center justify-center" style={{ 
        minHeight: '200px',
        maxHeight: '60vh' // Increased from 50vh to give more space for portrait videos
      }}>
        <PreviewPanelG projectId={projectId} initial={initialProps} selectedSceneId={selectedSceneId} />
      </div>

      {/* Active Panel - Remaining space */}
      <div className="flex-1 overflow-hidden bg-white">
        {renderActivePanel()}
      </div>

      {/* Bottom Navigation */}
      <div className="flex border-t border-gray-200 bg-white">
        {bottomNavItems.map((item) => {
          if (item.id === 'newproject') {
            // Special handling for new project button with enhanced behavior
            return (
              <div key={item.id} className="flex-1">
                <NewProjectButton
                  enableQuickCreate={true}
                  className={cn(
                    "w-full h-full flex flex-col items-center justify-center py-2 px-1 transition-colors border-none bg-transparent",
                    "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  )}
                  variant="ghost"
                >
                  <item.icon className="h-5 w-5 mb-1" />
                  <span className="text-xs">{item.label}</span>
                </NewProjectButton>
              </div>
            );
          }
          
          return (
            <button
              key={item.id}
              onClick={() => handlePanelChange(item.id)}
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
          );
        })}
      </div>
    </div>
  );
}