// src/app/projects/[id]/edit/InterfaceShell.tsx
'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Separator } from '~/components/ui/separator';
import { Button } from '~/components/ui/button';
import type { InputProps } from '~/types/input-props';
import { ChatPanel, PreviewPanel, FilesPanel } from "./panels";
import TimelinePanel from "./panels/TimelinePanel";
import Sidebar from "./Sidebar";
import AppHeader from "~/components/AppHeader";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import { useVideoState } from '~/stores/videoState';
import { TimelineProvider } from '~/components/client/Timeline/TimelineContext';
import type { TimelineItemUnion } from '~/types/timeline';
import { TimelineItemType } from '~/types/timeline';
import { DraggableTimeline } from '~/components/client/DraggableTimeline';
import WorkspacePanels, { type WorkspacePanelsHandle } from './WorkspacePanels';

// New: Floating/collapsible sidebar state
function useSidebarCollapse() {
  const [collapsed, setCollapsed] = useState(true);
  const toggle = () => setCollapsed((c) => !c);
  return { collapsed, toggle };
}

type TimelineMode = 'hidden' | 'vertical' | 'floating';

type Props = {
  projectId: string;
  initialProps: InputProps;
  initialProjects: { id: string; name: string }[];
};

export default function InterfaceShell({ projectId, initialProps, initialProjects }: Props) {
  const { setProject } = useVideoState();
  const workspacePanelsRef = useRef<WorkspacePanelsHandle>(null);
  const [sidebarWidth, setSidebarWidth] = useState(256); // Default width

  // Ensure Zustand store always loads the correct project on projectId change
  useEffect(() => {
    setProject(projectId, initialProps);
  }, [projectId, initialProps, setProject]);
  const [title, setTitle] = useState(initialProjects.find(p => p.id === projectId)?.name || "Untitled Project");
  
  // Customizable layout state
  const [timelineMode, setTimelineMode] = useState<TimelineMode>('vertical');
  const { collapsed, toggle: toggleSidebar } = useSidebarCollapse();
  
  // Handle timeline mode toggle
  const toggleTimeline = useCallback(() => {
    // Use the workspacePanels ref to toggle timeline visibility
    if (workspacePanelsRef.current) {
      workspacePanelsRef.current.toggleTimeline();
    }
  }, []);
  
  // Close timeline entirely
  const closeTimeline = useCallback(() => {
    setTimelineMode('hidden');
  }, []);
  
  // Handle adding a panel from sidebar click
  const handleAddPanel = useCallback((panelType: string) => {
    // Forward to the WorkspacePanels component if the ref is available
    if (workspacePanelsRef.current) {
      workspacePanelsRef.current.addPanel(panelType as any);
    }
  }, []);

  // Handle panel button click from sidebar
  const handlePanelButtonClick = useCallback((panelType: string) => {
    // Forward to the WorkspacePanels component if the ref is available
    if (workspacePanelsRef.current) {
      workspacePanelsRef.current.addPanel(panelType as any);
    }
  }, []);

  // Handle panel drag start from sidebar
  const handlePanelDragStart = useCallback((panelType: string, panelLabel: string) => {
    console.log(`Started dragging ${panelLabel} (${panelType}) from sidebar`);
    // Any additional drag start logic could go here
  }, []);

  // Handle sidebar width change
  const handleSidebarWidth = useCallback((width: number) => {
    setSidebarWidth(width);
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

  // Setup a ref to get the sidebar DOM element 
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  // Effect to get the sidebar width from the data attribute
  useEffect(() => {
    if (collapsed) return;
    const sidebar = sidebarRef.current?.querySelector('aside');
    if (sidebar) {
      const width = sidebar.getAttribute('data-sidebar-width');
      if (width) {
        setSidebarWidth(parseInt(width));
      }
    }
  }, [collapsed]);

  // --- Layout ---
  return (
    <div className="relative min-h-screen min-w-screen bg-background text-foreground overflow-hidden">
      {/* Floating Header */}
      <div className="fixed top-0 left-2.5 right-2.5 z-30 rounded-[15px] shadow-lg bg-white/90 flex items-center justify-between px-6 py-3" style={{borderRadius:15}}>
        <AppHeader
          projectTitle={title}
          onRename={handleRename}
          onRender={handleRender}
          isRenaming={renameMutation.isPending}
          isRendering={renderMutation.isPending}
          user={user}
        />
      </div>

      {/* Sidebar with icons */}
      <div ref={sidebarRef} className="fixed top-[76px] left-2.5 z-20 rounded-[15px] shadow-lg bg-white/90 flex flex-col h-[calc(100vh-86px)]" style={{borderRadius:15}}>
        <Sidebar
          projects={initialProjects}
          currentProjectId={projectId}
          collapsed={collapsed}
          onToggleCollapse={toggleSidebar}
          onToggleTimeline={toggleTimeline}
          onAddPanel={handleAddPanel}
          onPanelDragStart={handlePanelDragStart}
          onWidthChange={handleSidebarWidth}
          onPanelButtonClick={handlePanelButtonClick}
        />
      </div>

      {/* Main Content Area */}
      <div
        className="absolute top-[76px] right-2.5 bottom-2.5 flex flex-col z-10"
        style={{
          borderRadius: 15,
          left: collapsed ? 'calc(2.5px + 58px + 20px)' : `calc(2.5px + ${sidebarWidth}px + 20px)`, // left margin + sidebar width + 20px gap
          transition: 'left 0.3s cubic-bezier(0.4,0,0.2,1)'
        }}
      >
        <TimelineProvider initialItems={timelineItems} initialDuration={initialDuration}>
          <WorkspacePanels 
            projectId={projectId} 
            initialProps={initialProps}
            projects={initialProjects}
            ref={workspacePanelsRef}
          />
        </TimelineProvider>
      </div>
    </div>
  );
}