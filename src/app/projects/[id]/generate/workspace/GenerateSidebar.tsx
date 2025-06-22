"use client";

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from "next/navigation";
import { NewProjectButton } from "~/components/client/NewProjectButton";
import { api } from "~/trpc/react";
import type { PanelTypeG } from './WorkspaceContentAreaG';
import { Button } from "~/components/ui/button";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "~/components/ui/tooltip";
import SidebarFeedbackButton from "~/components/ui/SidebarFeedbackButton";
import { 
  MessageSquareIcon, 
  PlayIcon, 
  Code2Icon, 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  PlusIcon,
  ListIcon,
  FolderIcon,
  LayoutTemplateIcon,
} from "lucide-react";


interface GenerateSidebarProps {
  onAddPanel?: (panelType: PanelTypeG) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface WorkspacePanelG {
  type: PanelTypeG;
  id: string;
  name: string;
  icon: any;
  href: string;
}

interface PanelOption {
  type: PanelTypeG;
  label: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
  color: string;
}

// Workspace panels - storyboard is hidden but can still be added through panel options
const navItems: WorkspacePanelG[] = [
  { type: 'myprojects', id: 'myprojects', name: "My Projects", icon: FolderIcon, href: "#myprojects" },
  { type: 'chat', id: 'chat', name: "Chat", icon: MessageSquareIcon, href: "#chat" },
  { type: 'preview', id: 'preview', name: "Preview", icon: PlayIcon, href: "#preview" },
  { type: 'templates', id: 'templates', name: "Templates", icon: LayoutTemplateIcon, href: "#templates" },
];


export function GenerateSidebar({ 
  onAddPanel, 
  isCollapsed = false, 
  onToggleCollapse 
}: GenerateSidebarProps) {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  
  // Setup mutation for creating a new project (for collapsed button)
  const utils = api.useUtils();
  const createProject = api.project.create.useMutation({
    onSuccess: async (data) => {
      try {
        // Invalidate the projects list query to refetch it
        await utils.project.list.invalidate();
        
        // Redirect to the generate page for the new project
        router.push(`/projects/${data.projectId}/generate`);
      } catch (error) {
        console.error("Error after project creation:", error);
      }
    },
    onError: (error) => {
      console.error("Failed to create project:", error);
    },
  });

  const handleCreateProject = () => {
    if (createProject.isPending) return;
    createProject.mutate();
  };
  
  // Toggle the sidebar collapsed state
  const toggleCollapse = useCallback(() => {
    if (onToggleCollapse) {
      onToggleCollapse();
    }
  }, [onToggleCollapse]);
  
  // Calculate sidebar width based on collapsed state
  const sidebarWidth = useMemo(() => {
    return isCollapsed ? '3rem' : '10rem';
  }, [isCollapsed]);
  
  // Handle dragging panel icons from sidebar
  const handleDragStart = (e: React.DragEvent, panelType: PanelTypeG) => {
    e.dataTransfer.setData("text/plain", panelType);
    e.dataTransfer.effectAllowed = "copy";
    setIsDragging(true);
    
    // Create a drag preview
    const dragPreview = document.createElement("div");
    dragPreview.className = "bg-white shadow-lg rounded-lg p-3 border border-gray-300";
    dragPreview.innerHTML = `<span>${panelType} Panel</span>`;
    dragPreview.style.position = "absolute";
    dragPreview.style.top = "-1000px";
    document.body.appendChild(dragPreview);
    
    // Use the custom drag preview if supported
    try {
      e.dataTransfer.setDragImage(dragPreview, 50, 25);
    } catch (error) {
      console.warn("Custom drag preview not supported", error);
    }
    
    // Clean up the drag preview element after a short delay
    setTimeout(() => {
      document.body.removeChild(dragPreview);
    }, 100);
  };
  
  const handleDragEnd = () => {
    setIsDragging(false);
  };
  
  // Handle clicking on panel icons in sidebar
  const handlePanelClick = (panelType: PanelTypeG) => {
    if (onAddPanel) {
      onAddPanel(panelType);
    }
  };



  return (
    <TooltipProvider>
      <aside 
        className={`flex flex-col h-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm rounded-lg transition-all duration-200 ease-linear ${isCollapsed ? 'items-center' : 'items-start'}`}
        style={{ 
          width: sidebarWidth,
          maxWidth: isCollapsed ? '3rem' : '10rem',
          minWidth: isCollapsed ? '3rem' : '10rem',
          paddingTop: '25px',
          paddingLeft: '10px',
          paddingRight: isCollapsed ? '10px' : '20px'
        }}
      >
        {/* Collapse/Expand button */}
        <button
          className="absolute -right-3 top-2 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full w-6 h-6 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm"
          onClick={toggleCollapse}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRightIcon className="h-3 w-3 text-gray-700 dark:text-gray-300" />
          ) : (
            <ChevronLeftIcon className="h-3 w-3 text-gray-700 dark:text-gray-300" />
          )}
        </button>

        {/* New Project Button */}
        <div className={`w-full ${isCollapsed ? 'flex justify-center' : ''}`}>
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-lg flex items-center justify-center bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                  onClick={handleCreateProject}
                  disabled={createProject.isPending}
                >
                  <PlusIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                New Project
              </TooltipContent>
            </Tooltip>
          ) : (
            <NewProjectButton 
              className="h-9 w-full justify-start rounded-lg text-sm font-normal text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 pr-4"
              variant="ghost"
              size="default"
              showIcon={true}
            />
          )}
        </div>

        {/* Panel Navigation - Chat, Preview, Storyboard, Code */}
        <nav className={`flex flex-col w-full mt-3 gap-3 ${isCollapsed ? 'items-center' : ''}`}>
          {navItems.map((item) => (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <div className={`flex ${isCollapsed ? 'justify-center w-full' : 'w-full'}`}>
                  {isCollapsed ? (
                    <Button 
                      variant="ghost"
                      className="h-9 w-9 rounded-lg flex items-center justify-center transition-all duration-200 
                        bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 
                        text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                      onClick={() => handlePanelClick(item.type)}
                      data-panel-type={item.type}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item.type)}
                      onDragEnd={handleDragEnd}
                    >
                      <item.icon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    </Button>
                  ) : (
                    <Button 
                      variant="ghost"
                      className="h-9 w-full flex items-center justify-start rounded-lg transition-all duration-200 
                        bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800
                        text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 pr-4"
                      onClick={() => handlePanelClick(item.type)}
                      data-panel-type={item.type}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item.type)}
                      onDragEnd={handleDragEnd}
                    >
                      <item.icon className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-3" />
                      <span className="text-sm font-normal">{item.name}</span>
                    </Button>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className={!isCollapsed ? 'hidden' : ''}>
                {item.name}
              </TooltipContent>
            </Tooltip>
          ))}
        </nav>



        {/* Separator */}
        <div className="flex-grow"></div>

        {/* Feedback Button - aligned to bottom */}
        <div className={`w-full ${isCollapsed ? 'flex justify-center' : ''}`}>
          <SidebarFeedbackButton isCollapsed={isCollapsed} />
        </div>

      </aside>
    </TooltipProvider>
  );
} 