// src/app/projects/[id]/edit/InterfaceShell.tsx
'use client';

import { useState, useCallback } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Separator } from '~/components/ui/separator';
import type { InputProps } from '~/types/input-props';
import { ChatPanel, PreviewPanel } from "./panels";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { api } from "~/trpc/react";

type Props = {
  projectId: string;
  initialProps: InputProps;
  initialProjects: { id: string; name: string }[];
};

export default function InterfaceShell({ projectId, initialProps, initialProjects }: Props) {
  const [title, setTitle] = useState(initialProjects.find(p => p.id === projectId)?.name || "Untitled Project");
  
  // This would be an actual mutation in the future
  const handleRename = useCallback((newName: string) => {
    setTitle(newName);
    // Here you would call a mutation like:
    // renameProject.mutate({ id: projectId, title: newName });
  }, [projectId]);

  const handleRender = useCallback(() => {
    // Here you would call your render mutation
    console.log("Rendering project:", projectId);
    // renderProject.mutate({ id: projectId });
  }, [projectId]);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-background text-foreground">
      {/* Include Sidebar (the component manages its own visibility) */}
      <Sidebar
        projects={initialProjects}
        currentProjectId={projectId}
      />
      
      {/* TopBar with project title */}
      <TopBar 
        projectTitle={title} 
        onRename={handleRename}
        onRender={handleRender}
      />

      {/* Main content area with panels */}
      <div className="flex-1 overflow-hidden">
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
  );
}