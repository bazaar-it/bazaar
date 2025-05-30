'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useSession } from "next-auth/react";
import { useVideoState } from '~/stores/videoState';
import { api } from "~/trpc/react";
import AppHeader from "~/components/AppHeader";
import type { InputProps } from '~/types/input-props';
import { GenerateSidebar } from "./GenerateSidebar";
import WorkspaceContentAreaG from './WorkspaceContentAreaG';
import type { WorkspaceContentAreaGHandle, PanelTypeG } from './WorkspaceContentAreaG';

type Props = {
  projectId: string;
  initialProps: InputProps;
  initialProjects: { id: string; name: string }[];
};

export default function GenerateWorkspaceRoot({ projectId, initialProps, initialProjects }: Props) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [userProjects, setUserProjects] = useState(initialProjects);
  const workspaceContentAreaRef = useRef<WorkspaceContentAreaGHandle>(null);
  
  // Handle new project creation - reset workspace state
  const handleNewProject = useCallback((newProjectId: string) => {
    console.log('[GenerateWorkspaceRoot] New project created, resetting workspace state:', newProjectId);
    // The redirect will happen automatically via the NewProjectButton
    // The workspace will reset when the new page loads with the new projectId
  }, []);
  
  const { data: session } = useSession();
  const { setProject } = useVideoState();

  // Initialize video state on mount
  useEffect(() => {
    console.log('Initializing video state for project:', projectId, 'with props:', initialProps);
    setProject(projectId, initialProps);
  }, [projectId, initialProps, setProject]);
  
  const [title, setTitle] = useState(initialProjects.find(p => p.id === projectId)?.name || "Untitled Project");
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  const handleProjectRenamed = useCallback((newTitle: string) => {
    setTitle(newTitle);
    setUserProjects((prev) => prev.map(p => p.id === projectId ? { ...p, name: newTitle } : p));
  }, [projectId]);
  
  // Handle panel add when clicked or dragged from sidebar
  const handleAddPanel = useCallback((panelType: PanelTypeG) => {
    workspaceContentAreaRef.current?.addPanel(panelType);
  }, []);
  
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
  const renderMutation = api.render.start.useMutation({
    onSuccess: () => {
      console.log("Render started successfully");
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
  
  // Access user info from session
  const user = session?.user ? { name: session.user.name ?? "User", email: session.user.email ?? undefined } : undefined;

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
          <div className="h-full flex flex-col overflow-hidden relative">
            <WorkspaceContentAreaG
              ref={workspaceContentAreaRef}
              projectId={projectId}
              initialProps={initialProps}
              projects={userProjects}
              onProjectRename={handleProjectRenamed}
            />
          </div>
        </div>
        
        {/* Sidebar with absolute positioning that adjusts width based on expanded state */}
        <div 
          className="absolute left-[10px] top-0 bottom-[10px] z-40">
          <GenerateSidebar
            currentProjectId={projectId}
            onAddPanel={handleAddPanel}
            isCollapsed={!isSidebarExpanded}
            onToggleCollapse={() => setIsSidebarExpanded(!isSidebarExpanded)}
            onNewProject={handleNewProject}
          />
        </div>
      </div>
    </div>
  );
} 