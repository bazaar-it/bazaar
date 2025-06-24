'use client';

import React, { useState, useCallback } from 'react';
import { PreviewPanelG } from './panels/PreviewPanelG';
import ChatPanelG from './panels/ChatPanelG';
import TemplatesPanelG from './panels/TemplatesPanelG';
import MyProjectsPanelG from './panels/MyProjectsPanelG';
import { CodePanelG } from './panels/CodePanelG';
import { StoryboardPanelG } from './panels/StoryboardPanelG';
import type { InputProps } from '~/lib/types/video/input-props';
import { MessageSquareIcon, LayoutTemplateIcon, FolderIcon, Code2Icon, ListIcon, MenuIcon, PlusIcon } from 'lucide-react';
import { cn } from '~/lib/cn';
import { useRouter } from 'next/navigation';
import { api } from '~/trpc/react';

type MobilePanel = 'chat' | 'templates' | 'myprojects' | 'code' | 'storyboard' | 'menu';

interface MobileWorkspaceLayoutProps {
  projectId: string;
  initialProps: InputProps;
  projects?: { id: string; name: string }[];
  onProjectRename?: (newTitle: string) => void;
}

export function MobileWorkspaceLayout({
  projectId,
  initialProps,
  projects = [],
  onProjectRename
}: MobileWorkspaceLayoutProps) {
  const [activePanel, setActivePanel] = useState<MobilePanel>('chat');
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
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
    if (panel === 'menu') {
      setShowMenu(true);
    } else {
      setActivePanel(panel);
      setShowMenu(false);
    }
  };

  const renderActivePanel = () => {
    switch (activePanel) {
      case 'chat':
        return (
          <ChatPanelG
            projectId={projectId}
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
      case 'code':
        return (
          <CodePanelG 
            projectId={projectId} 
            selectedSceneId={selectedSceneId} 
            onClose={() => setActivePanel('chat')}
            onSceneSelect={setSelectedSceneId}
          />
        );
      case 'storyboard':
        return (
          <StoryboardPanelG 
            projectId={projectId} 
            selectedSceneId={selectedSceneId} 
            onSceneSelect={setSelectedSceneId}
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
    { id: 'menu' as MobilePanel, label: 'More', icon: MenuIcon },
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
            className={cn(
              "flex-1 flex flex-col items-center justify-center py-2 px-1 transition-colors",
              activePanel === item.id
                ? "text-blue-600 bg-blue-50"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            )}
          >
            <item.icon className="h-5 w-5 mb-1" />
            <span className="text-xs">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Slide-up Menu */}
      {showMenu && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl z-50 transform transition-transform">
            <div className="p-4">
              <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-4">More Options</h3>
              <button
                onClick={() => {
                  setActivePanel('code');
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Code2Icon className="h-5 w-5 text-gray-600" />
                <span>Code Editor</span>
              </button>
              <button
                onClick={() => {
                  setActivePanel('storyboard');
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <ListIcon className="h-5 w-5 text-gray-600" />
                <span>Storyboard</span>
              </button>
              <div className="my-2 border-t border-gray-200" />
              <button
                onClick={() => {
                  setShowMenu(false);
                  createProject.mutate();
                }}
                disabled={createProject.isPending}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <PlusIcon className="h-5 w-5 text-gray-600" />
                <span>{createProject.isPending ? "Creating..." : "New Project"}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}