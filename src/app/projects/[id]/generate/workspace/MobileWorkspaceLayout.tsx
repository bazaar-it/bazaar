'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { PreviewPanelG } from './panels/PreviewPanelG';
import ChatPanelG from './panels/ChatPanelG';
import TemplatesPanelG from './panels/TemplatesPanelG';
import MyProjectsPanelG from './panels/MyProjectsPanelG';
import type { InputProps } from '~/lib/types/video/input-props';
import { MessageSquareIcon, LayoutTemplateIcon, FolderIcon, PlusIcon, Smartphone, Monitor, Square } from 'lucide-react';
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

  // Get video format from props
  const videoFormat = initialProps?.meta?.format || 'landscape';
  const [previewHeight, setPreviewHeight] = useState({ minHeight: '200px', maxHeight: '50vh' });
  
  // Calculate optimal preview height based on format
  useEffect(() => {
    const calculateHeight = () => {
      const viewportHeight = window.innerHeight;
      const bottomNavHeight = 56; // Approximate height of bottom nav
      const availableHeight = viewportHeight - bottomNavHeight;
      
      let newHeight;
      switch (videoFormat) {
        case 'portrait':
          // Portrait videos need more height
          newHeight = {
            minHeight: '300px',
            maxHeight: `${Math.min(availableHeight * 0.65, 600)}px`
          };
          break;
        case 'square':
          // Square videos need moderate height
          newHeight = {
            minHeight: '250px',
            maxHeight: `${Math.min(availableHeight * 0.5, 400)}px`
          };
          break;
        case 'landscape':
        default:
          // Landscape videos need less height
          newHeight = {
            minHeight: '200px',
            maxHeight: `${Math.min(availableHeight * 0.4, 350)}px`
          };
      }
      
      setPreviewHeight(newHeight);
    };
    
    calculateHeight();
    window.addEventListener('resize', calculateHeight);
    
    return () => window.removeEventListener('resize', calculateHeight);
  }, [videoFormat]);

  // Get format icon and label
  const getFormatInfo = () => {
    switch (videoFormat) {
      case 'portrait':
        return { icon: <Smartphone className="h-3 w-3" />, label: '9:16' };
      case 'square':
        return { icon: <Square className="h-3 w-3" />, label: '1:1' };
      case 'landscape':
      default:
        return { icon: <Monitor className="h-3 w-3" />, label: '16:9' };
    }
  };

  const formatInfo = getFormatInfo();

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Preview Panel - Dynamic aspect ratio based on format */}
      <div 
        className="w-full bg-white flex items-center justify-center transition-all duration-300 relative"
        style={previewHeight}
      >
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