// src/app/projects/[id]/edit/EditorLayout.tsx
"use client";

import { useState } from "react";
import { PanelGroup, Panel, PanelResizeHandle } from "./PanelGroup";
import { ChatPanel, CodePanel, PreviewPanel, TimelinePanel, UploadsPanel, Sidebar } from "./panels";
import type { InputProps } from "~/types/input-props";
import type { ProjectListItem } from "~/types/project";

interface EditorLayoutProps {
  projectId: string;
  initialProjects?: ProjectListItem[];
  initialProps: InputProps;
}

export default function EditorLayout({ projectId, initialProjects = [], initialProps }: EditorLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const projects = initialProjects.length > 0 
    ? initialProjects 
    : [
        { id: projectId, name: "Current Project" },
        { id: "demo-1", name: "Demo Project 1" },
        { id: "demo-2", name: "Demo Project 2" },
      ];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar - outside of PanelGroup */}
      {sidebarOpen && (
        <Sidebar 
          projects={projects} 
          currentProjectId={projectId}
        />
      )}
      
      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b px-4 flex items-center">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <h1 className="ml-4 text-lg font-medium">Project Editor</h1>
        </header>
        
        {/* Panel Group - separate from Sidebar */}
        <div className="flex-1 overflow-hidden">
          <PanelGroup direction="horizontal">
            {/* Left panel: Chat */}
            <Panel defaultSize={30} minSize={20}>
              <div className="h-full p-4 overflow-auto">
                <ChatPanel projectId={projectId} />
              </div>
            </Panel>
            
            <PanelResizeHandle className="w-1.5 bg-gray-200 hover:bg-blue-400 transition-colors" />
            
            {/* Middle panel: Preview */}
            <Panel defaultSize={40}>
              <div className="h-full p-4 overflow-auto">
                <PreviewPanel projectId={projectId} initial={initialProps} />
              </div>
            </Panel>
            
            <PanelResizeHandle className="w-1.5 bg-gray-200 hover:bg-blue-400 transition-colors" />
            
            {/* Right panel: Multiple tabs */}
            <Panel defaultSize={30} minSize={20}>
              <PanelGroup direction="vertical">
                <Panel defaultSize={33}>
                  <div className="h-full p-4 overflow-auto">
                    <TimelinePanel />
                  </div>
                </Panel>
                
                <PanelResizeHandle className="h-1.5 bg-gray-200 hover:bg-blue-400 transition-colors" />
                
                <Panel defaultSize={33}>
                  <div className="h-full p-4 overflow-auto">
                    <CodePanel />
                  </div>
                </Panel>
                
                <PanelResizeHandle className="h-1.5 bg-gray-200 hover:bg-blue-400 transition-colors" />
                
                <Panel defaultSize={33}>
                  <div className="h-full p-4 overflow-auto">
                    <UploadsPanel projectId={projectId} />
                  </div>
                </Panel>
              </PanelGroup>
            </Panel>
          </PanelGroup>
        </div>
      </div>
    </div>
  );
}
