// src/app/projects/[id]/edit/ProjectEditorRoot.tsx
'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Separator } from '~/components/ui/separator';
import { Button } from '~/components/ui/button';
import type { InputProps } from '~/types/input-props';
import { ChatPanel, PreviewPanel, ScenePlanningHistoryPanel, TimelinePanel } from "./panels";
import Sidebar from "./Sidebar";
import AppHeader from "~/components/AppHeader";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import { useVideoState } from '~/stores/videoState';
import { TimelineProvider } from '~/components/client/Timeline/TimelineContext';
import type { TimelineItemUnion } from '~/types/timeline';
import { TimelineItemType } from '~/types/timeline';
import { DraggableTimeline } from '~/components/client/DraggableTimeline';
// @ts-ignore
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import WorkspaceContentArea from './WorkspaceContentArea';
import type { WorkspaceContentAreaHandle, PanelType } from './WorkspaceContentArea';

type TimelineMode = 'hidden' | 'vertical' | 'floating';
type LeftPanelTab = 'chat' | 'planning';

type Props = {
  projectId: string;
  initialProps: InputProps;
  initialProjects: { id: string; name: string }[];
};

export default function ProjectEditorRoot({ projectId, initialProps, initialProjects }: Props) {
  const { setProject } = useVideoState();

  // Ensure Zustand store always loads the correct project on projectId change
  useEffect(() => {
    setProject(projectId, initialProps);
  }, [projectId, initialProps, setProject]);
  
  const [title, setTitle] = useState(initialProjects.find(p => p.id === projectId)?.name || "Untitled Project");
  
  // Customizable layout state
  const [timelineMode, setTimelineMode] = useState<TimelineMode>('hidden');
  const [leftPanelTab, setLeftPanelTab] = useState<LeftPanelTab>('chat');
  const [timelineHeight, setTimelineHeight] = useState(200); // Default timeline height in pixels
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false); // Track sidebar expanded state
  
  // Handle timeline mode toggle
  const toggleTimeline = useCallback(() => {
    setTimelineMode(prev => {
      const newMode = prev === 'hidden' ? 'vertical' : 'hidden';
      return newMode;
    });
  }, []);
  
  // Close timeline entirely
  const closeTimeline = useCallback(() => {
    setTimelineMode('hidden');
  }, []);
  
  // Reference to the WorkspaceContentArea component
  const workspaceContentAreaRef = useRef<WorkspaceContentAreaHandle>(null);
  
  // Handle panel add when clicked or dragged from sidebar
  const handleAddPanel = useCallback((panelType: PanelType) => {
    if (panelType === 'timeline') {
      // Special handling for timeline - toggle its visibility
      toggleTimeline();
    } else {
      // Normal panel handling for all other panel types
      workspaceContentAreaRef.current?.addPanel(panelType);
    }
  }, [toggleTimeline]);
  
  // Set up rename mutation
  const renameMutation = api.project.rename.useMutation({
    onSuccess: (data) => {
      // Update the local state when the mutation is successful
      if (data) {
        setTitle(data.title);
      }
    },
    onError: (error: unknown) => {
      console.error("Failed to rename project:", error);
      // Could add a toast notification here in the future
    }
  });
  
  // Set up render mutation
  const renderMutation = api.render.start.useMutation({
    onSuccess: () => {
      console.log("Render started successfully");
      // Could add a toast notification here in the future
    },
    onError: (error: unknown) => {
      console.error("Failed to start render:", error);
      // Could add a toast notification here in the future
    }
  });

  // Handle rename action
  const handleRename = useCallback((newName: string) => {
    if (newName.trim() === title || newName.trim() === "") return;

    renameMutation.mutate({
      id: projectId,
      title: newName.trim(),
    });
  }, [projectId, renameMutation, title]);
  
  // Handle render action
  const handleRender = useCallback(() => {
    renderMutation.mutate({
      projectId
    });
  }, [projectId, renderMutation]);
  
  // Access user info from session
  const { data: session } = useSession();
  const user = session?.user ? { name: session.user.name ?? "User", email: session.user.email ?? undefined } : undefined;

  // Initialize timeline items from initialProps scenes
  const timelineItems = useMemo<TimelineItemUnion[]>(() => {
    if (!initialProps?.scenes) return [];
    return initialProps.scenes.map((scene, index): TimelineItemUnion => {
      const id = parseInt(scene.id, 10) || index;
      switch (scene.type) {
        case 'text':
          return { 
            type: TimelineItemType.TEXT, 
            id: id, // Use numeric ID
            sceneId: scene.id, // Store original scene ID as reference
            from: parseFloat(String(scene.start || 0)), 
            durationInFrames: parseFloat(String(scene.duration || 0)),
            row: index % 3, 
            content: scene.data?.text as string || 'Text', 
            fontSize: Number(scene.data?.fontSize || 24), 
            fontFamily: scene.data?.fontFamily as string || 'Arial', 
            color: scene.data?.color as string || '#FFFFFF' 
          };
        case 'image':
          return { 
            type: TimelineItemType.IMAGE, 
            id: id, 
            sceneId: scene.id,
            from: parseFloat(String(scene.start || 0)), 
            durationInFrames: parseFloat(String(scene.duration || 0)),
            row: index % 3, 
            src: scene.data?.src as string || '' 
          };
        case 'background-color':
          return { 
            type: TimelineItemType.CUSTOM, 
            id: id, 
            sceneId: scene.id,
            from: parseFloat(String(scene.start || 0)), 
            durationInFrames: parseFloat(String(scene.duration || 0)),
            row: index % 3, 
            name: `Background: ${scene.data?.color as string || '#000000'}`, 
            componentId: `bg-color-${index}`,
            outputUrl: ''
          };
        default:
          return { 
            type: TimelineItemType.TEXT, 
            id: id, 
            sceneId: scene.id,
            from: parseFloat(String(scene.start || 0)), 
            durationInFrames: parseFloat(String(scene.duration || 0)),
            row: index % 3, 
            content: scene.type || 'Unknown scene type', 
            fontSize: 24, 
            fontFamily: 'Arial', 
            color: '#FFFFFF' 
          };
      }
    });
  }, [initialProps]);

  // Get initial duration from initial props
  const initialDuration = initialProps?.meta?.duration || 0;

  return (
    <div className="h-screen flex flex-col overflow-hidden relative bg-white dark:bg-gray-900">
      {/* App Header - Fixed at top with proper z-index and rounded bottom corners */}
      <div className="sticky top-0 z-40 w-full bg-white dark:bg-gray-900 shadow-sm border-b border-gray-100 dark:border-gray-800 rounded-bl-[15px] rounded-br-[15px]">
        <AppHeader
          projectTitle={title}
          onRename={handleRename}
          isRenaming={renameMutation.isPending}
          onRender={handleRender}
          isRendering={renderMutation.isPending}
          user={user}
        />
      </div>
      
      {/* Create a uniform 10px buffer zone below the header */}
      <div className="h-[10px] w-full flex-shrink-0 bg-white dark:bg-gray-900"></div>
      
      {/* Main container with horizontal buffer zones on both sides */}
      <div className="flex-1 relative overflow-hidden px-[10px]">
        {/* Main Content Area - Adjusts position based on sidebar expanded state */}
        <div
          className="absolute inset-0 z-0 bg-white dark:bg-gray-900 rounded-lg overflow-hidden" 
          style={{
            left: isSidebarExpanded ? 'calc(10rem + 20px)' : 'calc(3rem + 15px + 10px)', 
            right: '10px',
            top: '0',
            bottom: '10px',
            transition: 'left 0.3s cubic-bezier(0.4,0,0.2,1)'
          }}
        >
          <TimelineProvider initialItems={timelineItems} initialDuration={initialDuration}>
            {/* Use the WorkspaceContentArea component for flexible UI */}
            <div className="h-full flex flex-col overflow-hidden relative">
              <WorkspaceContentArea 
                ref={workspaceContentAreaRef}
                projectId={projectId} 
                initialProps={initialProps}
                projects={initialProjects}
              />
              
              {/* Timeline panel - now integrated more directly */}
              {timelineMode === 'vertical' && (
                <div 
                  className="absolute bottom-0 left-0 right-0 border-t border-gray-100 bg-white dark:bg-gray-900 overflow-hidden rounded-b-[15px]"
                  style={{ height: `${timelineHeight}px` }}
                >
                  <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50 dark:bg-gray-800">
                    <span className="font-medium text-sm text-gray-800 dark:text-gray-200">Timeline</span>
                    <div className="flex items-center gap-2">
                      <button 
                        className="cursor-ns-resize p-1 rounded-[8px] hover:bg-gray-200/70 dark:hover:bg-gray-700/70 transition-colors"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const startY = e.clientY;
                          const startHeight = timelineHeight;
                          
                          const handleMouseMove = (moveEvent: MouseEvent) => {
                            const deltaY = startY - moveEvent.clientY;
                            const newHeight = Math.max(100, Math.min(500, startHeight + deltaY));
                            setTimelineHeight(newHeight);
                          };
                          
                          const handleMouseUp = () => {
                            document.removeEventListener('mousemove', handleMouseMove);
                            document.removeEventListener('mouseup', handleMouseUp);
                          };
                          
                          document.addEventListener('mousemove', handleMouseMove);
                          document.addEventListener('mouseup', handleMouseUp);
                        }}
                      >
                        <svg width="14" height="5" viewBox="0 0 14 5" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect y="0" width="14" height="1" rx="0.5" fill="#666" />
                          <rect y="4" width="14" height="1" rx="0.5" fill="#666" />
                        </svg>
                      </button>
                      <button 
                        onClick={closeTimeline}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-[8px] hover:bg-gray-200/70 dark:hover:bg-gray-700/70"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="p-3 h-full overflow-y-auto bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
                    <TimelinePanel />
                  </div>
                </div>
              )}
            </div>
          </TimelineProvider>
        </div>
        
        {/* Sidebar with absolute positioning that adjusts width based on expanded state */}
        <div 
          className="absolute left-[10px] top-0 bottom-[10px] z-40">
          <Sidebar
            projects={initialProjects}
            currentProjectId={projectId}
            onToggleTimeline={toggleTimeline}
            onAddPanel={handleAddPanel}
            timelineActive={timelineMode !== 'hidden'}
            isCollapsed={!isSidebarExpanded}
            onToggleCollapse={() => setIsSidebarExpanded(!isSidebarExpanded)}
          />
        </div>
      </div>
    </div>
  );
}
