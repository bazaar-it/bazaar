// src/app/projects/[id]/edit/InterfaceShell.tsx
'use client';

import { useState, useCallback, useEffect } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Separator } from '~/components/ui/separator';
import type { InputProps } from '~/types/input-props';
import { ChatPanel, PreviewPanel } from "./panels";
import Sidebar from "./Sidebar";
import AppHeader from "~/components/AppHeader";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";

type Props = {
  projectId: string;
  initialProps: InputProps;
  initialProjects: { id: string; name: string }[];
};

export default function InterfaceShell({ projectId, initialProps, initialProjects }: Props) {
  const [title, setTitle] = useState(initialProjects.find(p => p.id === projectId)?.name || "Untitled Project");
  
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

  // Get authenticated user (server-side)
  // Get user info from session
  const { data: session } = useSession();
  const user = session?.user ? { name: session.user.name ?? "User", email: session.user.email ?? undefined } : undefined;

  return (
    <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden">
      {/* Persistent Sidebar */}
      <Sidebar
        projects={initialProjects}
        currentProjectId={projectId}
      />
      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* AppHeader with project title and user info */}
        <AppHeader
          projectTitle={title}
          onRename={handleRename}
          onRender={handleRender}
          isRenaming={renameMutation.isPending}
          isRendering={renderMutation.isPending}
          user={user}
        />
        {/* Main panels */}
        <div className="flex-1 overflow-hidden min-h-0">
          <PanelGroup direction="horizontal" className="h-full">
            {/* Left panel: Chat */}
            <Panel defaultSize={35} minSize={20} maxSize={50}>
              <div className="h-full border-r bg-background overflow-auto">
                <ChatPanel projectId={projectId} />
              </div>
            </Panel>
            <PanelResizeHandle className="w-1.5 bg-muted hover:bg-primary/20 transition-colors" />
            {/* Right panel: Preview */}
            <Panel minSize={50}>
              <div className="h-full bg-black">
                <PreviewPanel projectId={projectId} initial={initialProps} />
              </div>
            </Panel>
          </PanelGroup>
        </div>
      </div>
    </div>
  );
}