'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { PreviewPanelG } from './panels/PreviewPanelG';
import ChatPanelG from './panels/ChatPanelG';
import TemplatesPanelG from './panels/TemplatesPanelG';
import MyProjectsPanelG from './panels/MyProjectsPanelG';
import type { InputProps } from '~/lib/types/video/input-props';
import {
  MessageSquareIcon,
  LayoutTemplateIcon,
  FolderIcon,
  PlusIcon,
  X,
} from 'lucide-react';
import { cn } from '~/lib/cn';
import { NewProjectButton } from '~/components/client/NewProjectButton';
import dynamic from 'next/dynamic';

const TimelinePanel = dynamic(() => import('./panels/TimelinePanel'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-white text-xs text-gray-500">
      Loading timeline…
    </div>
  )
});


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
  projects: _projects = [],
  onProjectRename: _onProjectRename
}: MobileWorkspaceLayoutProps) {
  const storageKey = `bazaar:workspace:${projectId}:mobile-panel`;
  const [activePanel, setActivePanel] = useState<MobilePanel>('chat');
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [isTimelineDrawerOpen, setIsTimelineDrawerOpen] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(storageKey) as MobilePanel | null;
      if (stored && stored !== 'newproject') {
        setActivePanel(stored);
      }
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(storageKey, activePanel);
    } catch {}
  }, [activePanel, storageKey]);

  useEffect(() => {
    setActivePanel('chat');
    setSelectedSceneId(null);
  }, [projectId]);



  const triggerHaptic = useCallback((pattern: number | number[] = 10) => {
    if (typeof window === 'undefined') return;
    const nav: Navigator & { webkitVibrate?: (pattern: number | number[]) => void } =
      window.navigator as any;
    try {
      if (typeof nav.vibrate === 'function') {
        nav.vibrate(pattern);
      } else if (typeof nav.webkitVibrate === 'function') {
        nav.webkitVibrate(pattern);
      }
    } catch {}
  }, []);

  const handleSceneGenerated = useCallback(async (sceneId: string) => {
    setSelectedSceneId(sceneId);
  }, []);

  const handlePanelChange = (panel: MobilePanel) => {
    if (panel !== 'newproject') {
      triggerHaptic();
      setActivePanel(panel);
    }
  };

  const handleCloseTimeline = useCallback(() => {
    triggerHaptic();
    setIsTimelineDrawerOpen(false);
  }, [triggerHaptic]);

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

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Preview Panel - Dynamic aspect ratio based on format */}
      <div
        className="w-full bg-gray-900 flex items-center justify-center transition-all duration-300 relative overflow-hidden"
        style={previewHeight}
      >
        <div className="w-full h-full">
          <PreviewPanelG projectId={projectId} initial={initialProps} selectedSceneId={selectedSceneId} />
        </div>

        {!isTimelineDrawerOpen && (
          <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
          </div>
        )}
      </div>

      {/* Active Panel - Remaining space */}
      <div className="flex-1 overflow-hidden bg-white">
        {renderActivePanel()}
      </div>

      {isTimelineDrawerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/40 backdrop-blur-sm">
          <div className="flex items-center justify-between bg-white px-4 py-3 shadow-sm">
            <div className="text-sm font-medium text-gray-900">Timeline</div>
            <button
              type="button"
              onClick={handleCloseTimeline}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close timeline</span>
            </button>
          </div>
          <div className="flex-1 overflow-hidden bg-white">
            <TimelinePanel
              projectId={projectId}
              userId={userId}
              onClose={handleCloseTimeline}
            />
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="flex border-t border-gray-200 bg-white">
        {bottomNavItems.map((item) => {
          if (item.id === 'newproject') {
            // Special handling for new project button with enhanced behavior
            return (
              <div key={item.id} className="flex-1">
                <NewProjectButton
                  enableQuickCreate={true}
                  onStart={triggerHaptic}
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
              aria-current={activePanel === item.id ? 'page' : undefined}
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