// src/app/projects/[id]/generate/workspace/GenerateWorkspaceRoot.tsx

'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useSession } from "next-auth/react";
import { useVideoState } from '~/stores/videoState';
import { api } from "~/trpc/react";
import AppHeader from "~/components/AppHeader";
import type { InputProps } from '~/lib/types/video/input-props';
import { GenerateSidebar } from "./GenerateSidebar";
import WorkspaceContentAreaG from './WorkspaceContentAreaG';
import type { WorkspaceContentAreaGHandle, PanelTypeG } from './WorkspaceContentAreaG';
import { MobileWorkspaceLayout } from './MobileWorkspaceLayout';
import { useBreakpoint } from '~/hooks/use-breakpoint';
import MobileAppHeader from '~/components/MobileAppHeader';
import { CreateTemplateModal } from '~/components/CreateTemplateModal';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import TimelinePanel from './panels/TimelinePanel';

// ✅ NEW: Debug flag for production logging
const DEBUG = process.env.NODE_ENV === 'development';

type Props = {
  projectId: string;
  userId: string;
  initialProps: InputProps;
  initialProjects: { id: string; name: string }[];
};

export default function GenerateWorkspaceRoot({ projectId, userId, initialProps, initialProjects }: Props) {
  const [userProjects, setUserProjects] = useState(initialProjects);
  const [isCreateTemplateModalOpen, setIsCreateTemplateModalOpen] = useState(false);
  const [isTimelineVisible, setIsTimelineVisible] = useState(false);
  const workspaceContentAreaRef = useRef<WorkspaceContentAreaGHandle>(null);
  
  const { data: session } = useSession();
  const { setProject, getCurrentProps } = useVideoState();
  const breakpoint = useBreakpoint();
  
  // Debug breakpoint detection
  useEffect(() => {
    console.log('[GenerateWorkspaceRoot] Current breakpoint:', breakpoint);
    console.log('[GenerateWorkspaceRoot] Window dimensions:', {
      width: typeof window !== 'undefined' ? window.innerWidth : 'SSR',
      height: typeof window !== 'undefined' ? window.innerHeight : 'SSR'
    });
  }, [breakpoint]);

  // ✅ NEW: Fetch current project details to get updated title
  const { data: currentProjectData } = api.project.getById.useQuery(
    { id: projectId },
    { 
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  );

  // Save current project ID to localStorage for redirect after purchase
  useEffect(() => {
    if (projectId) {
      localStorage.setItem("lastProjectId", projectId);
    }
  }, [projectId]);

  // Initialize video state on mount - but only if not already loaded
  useEffect(() => {
    const currentProps = useVideoState.getState().getCurrentProps();
    const isProjectLoaded = currentProps && useVideoState.getState().projects[projectId];
    
    if (DEBUG) console.log('[GenerateWorkspaceRoot] Checking if project needs initialization:', {
      projectId,
      isProjectLoaded,
      hasCurrentScenes: currentProps?.scenes?.length || 0,
      initialScenes: initialProps?.scenes?.length || 0
    });
    
    // Only initialize if:
    // 1. Project is not loaded yet, OR
    // 2. Current state has no scenes but initial props has scenes (fresh data from server)
    if (!isProjectLoaded || (!currentProps?.scenes?.length && initialProps?.scenes?.length)) {
      if (DEBUG) console.log('[GenerateWorkspaceRoot] Initializing project with server data');
      setProject(projectId, initialProps, { force: true });
    } else {
      if (DEBUG) console.log('[GenerateWorkspaceRoot] Project already loaded, skipping initialization');
    }
  }, [projectId]); // Remove initialProps from dependencies to prevent re-runs
  
  // ✅ UPDATED: Use current project data title or fallback to initial title
  const [title, setTitle] = useState(
    currentProjectData?.title || 
    initialProjects.find(p => p.id === projectId)?.name || 
    "Untitled Project"
  );

  // ✅ NEW: Update title when project data changes (auto-generated titles)
  useEffect(() => {
    if (currentProjectData?.title && currentProjectData.title !== title) {
      console.log(`[GenerateWorkspaceRoot] Updating title from "${title}" to "${currentProjectData.title}"`);
      setTitle(currentProjectData.title);
    }
  }, [currentProjectData?.title, title]);

  // Handle panel add when clicked or dragged from sidebar
  const handleAddPanel = useCallback((panelType: PanelTypeG | 'timeline') => {
    // Special handling for timeline panels
    if (panelType === 'timeline') {
      setIsTimelineVisible(true);
      return;
    }
    
    workspaceContentAreaRef.current?.addPanel(panelType);
  }, []);

  // ✅ NEW: Auto-open media panel with audio tab when flag is set
  const shouldOpenAudioPanel = useVideoState(state => state.projects[projectId]?.shouldOpenAudioPanel);
  useEffect(() => {
    if (shouldOpenAudioPanel) {
      console.log('[GenerateWorkspaceRoot] Auto-opening media panel with audio tab');
      // Open media panel instead of audio panel
      handleAddPanel('media');
      // TODO: Need to signal that audio tab should be active
      // Clear the flag after opening
      useVideoState.getState().setShouldOpenAudioPanel(projectId, false);
    }
  }, [shouldOpenAudioPanel, projectId, handleAddPanel]);

  // Sidebar is now fixed width, no expansion state needed

  const handleProjectRenamed = useCallback((newTitle: string) => {
    setTitle(newTitle);
    setUserProjects((prev) => prev.map(p => p.id === projectId ? { ...p, name: newTitle } : p));
  }, [projectId]);
  
  // Set up rename mutation
  const renameMutation = api.project.rename.useMutation({
    onSuccess: (data) => {
      if (data) {
        setTitle(data.title);
      }
    },
    onError: (error: unknown) => {
      console.error("Failed to rename project:", error);
      
      if (error instanceof Error && error.message.includes("A project with this title already exists")) {
        alert("Error: A project with this title already exists. Please choose a different title.");
        setTitle(initialProjects.find(p => p.id === projectId)?.name || "Untitled Project");
      } else {
        alert(`Error renaming project: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  });
  
  // Set up render mutation
  const renderMutation = api.render.startRender.useMutation({
    onSuccess: () => {
      if (DEBUG) console.log("Render started successfully");
    },
    onError: (error: unknown) => {
      console.error("Failed to start render:", error);
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
  
  // Access user info from session with admin status
  const user = session?.user ? { 
    name: session.user.name ?? "User", 
    email: session.user.email ?? undefined,
    isAdmin: session.user.isAdmin ?? false
  } : undefined;
  
  // Get current scenes for template creation
  const currentScenes = getCurrentProps()?.scenes || [];

  // Use mobile layout for mobile breakpoint
  if (breakpoint === 'mobile') {
    return (
      <div className="h-[100dvh] flex flex-col overflow-hidden bg-white dark:bg-gray-900">
        {/* Mobile Header - Compact version */}
        <div className="sticky top-0 z-40 w-full">
          <MobileAppHeader
            projectTitle={title}
            projectId={projectId}
            userId={userId}
            onRename={handleRename}
            isRenaming={renameMutation.isPending}
          />
        </div>
        
        {/* Mobile Workspace */}
        <div className="flex-1 overflow-hidden">
          <MobileWorkspaceLayout
            projectId={projectId}
            userId={userId}
            initialProps={initialProps}
            projects={userProjects}
            onProjectRename={handleProjectRenamed}
          />
        </div>
      </div>
    );
  }

  // Desktop/Tablet layout
  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden relative bg-white dark:bg-gray-900">
      {/* App Header - Fixed at top with proper z-index and rounded bottom corners */}
      <div className="sticky top-0 z-40 w-full bg-white dark:bg-gray-900 shadow-sm border-b border-gray-100 dark:border-gray-800 rounded-bl-[15px] rounded-br-[15px]">
        <AppHeader
          projectTitle={title}
          onRename={handleRename}
          isRenaming={renameMutation.isPending}
          onRender={handleRender}
          isRendering={renderMutation.isPending}
          user={user}
          projectId={projectId}
          onCreateTemplate={() => setIsCreateTemplateModalOpen(true)}
        />
      </div>
      
      {/* Create a uniform 10px buffer zone below the header */}
      <div className="h-[10px] w-full flex-shrink-0 bg-white dark:bg-gray-900"></div>
      
      {/* Main container with horizontal buffer zones on both sides */}
      <div className="flex-1 relative overflow-hidden px-[10px]">
        {/* Main Content Area - Fixed position with sidebar width */}
        <div
          className="absolute inset-0 z-0 bg-white dark:bg-gray-900 rounded-lg overflow-hidden" 
          style={{
            left: 'calc(4rem + 20px)', // Fixed sidebar width of 4rem + 10px left margin + 10px gap
            right: '10px',
            top: '0',
            bottom: '10px'
          }}
        >
          <div className="h-full flex flex-col overflow-hidden relative">
            {/* Conditional vertical layout based on timeline visibility */}
            {isTimelineVisible ? (
              <PanelGroup direction="vertical" className="h-full">
                {/* Main workspace panels */}
                <Panel defaultSize={75} minSize={30}>
                  <WorkspaceContentAreaG
                    ref={workspaceContentAreaRef}
                    projectId={projectId}
                    userId={userId}
                    initialProps={initialProps}
                    projects={userProjects}
                    onProjectRename={handleProjectRenamed}
                  />
                </Panel>
                
                {/* Resize handle between main area and timeline */}
                <PanelResizeHandle className="h-[8px] bg-gray-100 hover:bg-gray-200 transition-colors border-t border-b border-gray-200" />
                
                {/* Timeline panel at bottom */}
                <Panel defaultSize={25} minSize={15} maxSize={50}>
                  <div className="h-full bg-gray-900 rounded-lg overflow-hidden border border-gray-200 relative">
                    {/* Close button for timeline */}
                    <button
                      onClick={() => setIsTimelineVisible(false)}
                      className="absolute top-2 right-2 z-50 p-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors"
                      title="Close Timeline"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                    <TimelinePanel
                      key={`timeline-${projectId}`}
                      projectId={projectId}
                      userId={userId}
                    />
                  </div>
                </Panel>
              </PanelGroup>
            ) : (
              /* No timeline - just the main workspace */
              <WorkspaceContentAreaG
                ref={workspaceContentAreaRef}
                projectId={projectId}
                userId={userId}
                initialProps={initialProps}
                projects={userProjects}
                onProjectRename={handleProjectRenamed}
              />
            )}
          </div>
        </div>
        
        {/* Sidebar with fixed positioning */}
        <div 
          className="absolute left-[10px] top-0 bottom-[10px] z-40">
          <GenerateSidebar
            onAddPanel={handleAddPanel}
          />
        </div>
      </div>
      
      {/* Create Template Modal */}
      <CreateTemplateModal
        isOpen={isCreateTemplateModalOpen}
        onClose={() => setIsCreateTemplateModalOpen(false)}
        projectId={projectId}
        scenes={currentScenes.map(scene => ({
          id: scene.id,
          name: String(scene.data.name || 'Untitled'),
          duration: scene.duration,
          tsxCode: String(scene.data.code || ''),
          order: 0,
          projectId,
          props: scene.data.props || {},
          layoutJson: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }))}
      />
    </div>
  );
} 