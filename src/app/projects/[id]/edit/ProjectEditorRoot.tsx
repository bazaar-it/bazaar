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
import type { WorkspaceContentAreaHandle } from './WorkspaceContentArea';

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
  
  // Handle timeline mode toggle
  const toggleTimeline = useCallback(() => {
    console.log('Timeline toggle clicked');
    setTimelineMode(prev => {
      // Only toggle between hidden and vertical for now (no floating mode)
      const newMode = prev === 'hidden' ? 'vertical' : 'hidden';
      console.log(`Toggling timeline mode from ${prev} to ${newMode}`);
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
  const handleAddPanel = useCallback((panelType: 'chat' | 'preview' | 'code' | 'uploads' | 'projects' | 'timeline' | 'sceneplanning') => {
    if (panelType === 'timeline') {
      toggleTimeline();
    } else {
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

    // Update optimistically
    setTitle(newName);
    
    // Call the mutation
    renameMutation.mutate({
      id: projectId,
      title: newName
    });
  }, [projectId, renameMutation, title]);

  // Handle render action
  const handleRender = useCallback(() => {
    // Call the render mutation
    renderMutation.mutate({ 
      projectId: projectId 
    });
  }, [projectId, renderMutation]);

  // Get authenticated user from session
  const { data: session } = useSession();
  const user = session?.user ? { name: session.user.name ?? "User", email: session.user.email ?? undefined } : undefined;
  
  const { getCurrentProps } = useVideoState();
  const inputProps = getCurrentProps();
  
  useEffect(() => {
    setProject(projectId, initialProps);
  }, [projectId, initialProps, setProject]);
  
  const timelineItems = useMemo<TimelineItemUnion[]>(() => {
    if (!inputProps) return [];
    return inputProps.scenes.map((scene, index): TimelineItemUnion => {
      const id = parseInt(scene.id, 10) || index;
      switch (scene.type) {
        case 'text':
          return { id, type: TimelineItemType.TEXT, from: scene.start, durationInFrames: scene.duration, row: index % 3, content: scene.data?.text as string || 'Text', color: scene.data?.color as string || '#FFFFFF', fontSize: scene.data?.fontSize as number || 24, fontFamily: scene.data?.fontFamily as string || 'Arial' };
        case 'image':
          return { id, type: TimelineItemType.IMAGE, from: scene.start, durationInFrames: scene.duration, row: index % 3, src: scene.data?.src as string || '' };
        default:
          return { id, type: TimelineItemType.TEXT, from: scene.start, durationInFrames: scene.duration, row: index % 3, content: scene.type, fontSize: 24, fontFamily: 'Arial', color: '#FFFFFF' };
      }
    });
  }, [inputProps]);
  
  const initialDuration = inputProps?.meta.duration || 0;

  return (
    <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden">
      {/* Persistent Sidebar */}
      <Sidebar
        projects={initialProjects}
        currentProjectId={projectId}
        onToggleTimeline={toggleTimeline}
        onAddPanel={handleAddPanel}
        timelineActive={timelineMode !== 'hidden'}
      />
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* AppHeader with project title and user info */}
        <AppHeader
          projectTitle={title}
          onRename={handleRename}
          onRender={handleRender}
          isRenaming={renameMutation.isPending}
          isRendering={renderMutation.isPending}
          user={user}
        />
        
        {/* Main workspace with flexible layout */}
        <div className="flex-1 overflow-hidden min-h-0 relative">
          <TimelineProvider initialItems={timelineItems} initialDuration={initialDuration}>
            {/* Use the WorkspaceContentArea component for flexible UI */}
            <WorkspaceContentArea 
              ref={workspaceContentAreaRef}
              projectId={projectId} 
              initialProps={initialProps}
              projects={initialProjects}
            />
            
            {/* Timeline panel - now integrated more directly */}
            {timelineMode === 'vertical' && (
              <div 
                className="absolute bottom-0 left-0 right-0 border-t border-gray-300 bg-gray-100 overflow-hidden"
                style={{ height: `${timelineHeight}px` }}
              >
                <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-200">
                  <span className="font-medium text-sm text-gray-800">Timeline</span>
                  <div className="flex items-center gap-2">
                    <button 
                      className="cursor-ns-resize p-1 rounded hover:bg-gray-300 transition-colors"
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
                      className="text-gray-600 hover:text-red-600 transition-colors p-1 rounded hover:bg-gray-300"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="p-2 h-full overflow-y-auto bg-white text-gray-900">
                  <TimelinePanel />
                </div>
              </div>
            )}
          </TimelineProvider>
        </div>
      </div>
    </div>
  );
}
