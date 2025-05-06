// src/app/projects/[id]/edit/InterfaceShell.tsx
'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
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

type TimelineMode = 'hidden' | 'vertical' | 'floating';
type LeftPanelTab = 'chat' | 'planning';

type Props = {
  projectId: string;
  initialProps: InputProps;
  initialProjects: { id: string; name: string }[];
};

export default function InterfaceShell({ projectId, initialProps, initialProjects }: Props) {
  const { setProject } = useVideoState();

  // Ensure Zustand store always loads the correct project on projectId change
  useEffect(() => {
    setProject(projectId, initialProps);
  }, [projectId, initialProps, setProject]);
  const [title, setTitle] = useState(initialProjects.find(p => p.id === projectId)?.name || "Untitled Project");
  
  // Customizable layout state
  const [timelineMode, setTimelineMode] = useState<TimelineMode>('hidden');
  const [leftPanelTab, setLeftPanelTab] = useState<LeftPanelTab>('chat');
  
  // Handle timeline mode toggle
  const toggleTimeline = useCallback(() => {
    setTimelineMode(prev => {
      if (prev === 'hidden') return 'vertical';
      if (prev === 'vertical') return 'floating';
      return 'hidden';
    });
  }, []);
  
  // Close timeline entirely
  const closeTimeline = useCallback(() => {
    setTimelineMode('hidden');
  }, []);
  
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
            <PanelGroup direction="horizontal" className="h-full">
              {/* Left panel: Tabbed interface with Chat and Scene Planning History */}
              <Panel defaultSize={35} minSize={20} maxSize={50}>
                <div className="h-full border-r bg-background flex flex-col">
                  <Tabs 
                    value={leftPanelTab} 
                    onValueChange={(value) => setLeftPanelTab(value as LeftPanelTab)}
                    className="flex-1 flex flex-col min-h-0"
                  >
                    <TabsList className="grid grid-cols-2 m-2">
                      <TabsTrigger value="chat">Chat</TabsTrigger>
                      <TabsTrigger value="planning">Scene Planning</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="chat" className="flex-1 overflow-hidden">
                      <ChatPanel projectId={projectId} />
                    </TabsContent>
                    
                    <TabsContent value="planning" className="flex-1 min-h-0 overflow-hidden">
                      <ScenePlanningHistoryPanel />
                    </TabsContent>
                  </Tabs>
                </div>
              </Panel>
              
              <PanelResizeHandle className="w-1.5 bg-muted hover:bg-primary/20 transition-colors" />
              
              {/* Right panel: Preview and optional Timeline */}
              <Panel minSize={50}>
                <PanelGroup direction="vertical" className="h-full">
                  {/* Preview panel */}
                  <Panel defaultSize={timelineMode === 'vertical' ? 70 : 100} className="h-full bg-black">
                    <PreviewPanel projectId={projectId} initial={initialProps} />
                  </Panel>
                  
                  {/* Vertical Timeline panel (conditionally rendered) */}
                  {timelineMode === 'vertical' && (
                    <>
                      <PanelResizeHandle className="h-1.5 bg-muted hover:bg-primary/20 transition-colors" />
                      <Panel defaultSize={30} className="bg-background">
                        <TimelinePanel key={projectId} />
                      </Panel>
                    </>
                  )}
                </PanelGroup>
              </Panel>
            </PanelGroup>
            
            {/* Floating Draggable Timeline */}
            {timelineMode === 'floating' && (
              <DraggableTimeline onClose={closeTimeline} />
            )}
          </TimelineProvider>
        </div>
      </div>
    </div>
  );
}