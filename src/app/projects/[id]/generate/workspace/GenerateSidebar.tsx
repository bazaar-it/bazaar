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
  BrainIcon,
  LayoutTemplateIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "lucide-react";
import { Badge } from "~/components/ui/badge";

type Project = {
  id: string;
  name: string;
};

interface GenerateSidebarProps {
  projects: Project[];
  currentProjectId: string;
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

// Workspace panels for BAZAAR-304: Chat, Preview, Code (Storyboard commented out)
const navItems: WorkspacePanelG[] = [
  { type: 'chat', id: 'chat', name: "Chat", icon: MessageSquareIcon, href: "#chat" },
  { type: 'preview', id: 'preview', name: "Preview", icon: PlayIcon, href: "#preview" },
  { type: 'templates', id: 'templates', name: "Templates", icon: LayoutTemplateIcon, href: "#templates" },
  { type: 'storyboard', id: 'storyboard', name: "Storyboard", icon: ListIcon, href: "#storyboard" },
  { type: 'code', id: 'code', name: "Code", icon: Code2Icon, href: "#code" },
];

const PANEL_OPTIONS: PanelOption[] = [
  {
    type: 'chat',
    label: 'Chat',
    description: 'Interactive chat for scene generation',
    icon: <MessageSquareIcon className="h-5 w-5" />,
    color: 'from-blue-500 to-blue-600',
  },
  {
    type: 'chatai',
    label: 'AI Chat',
    description: 'Advanced AI conversation interface',
    icon: <BrainIcon className="h-5 w-5" />,
    badge: 'AI',
    color: 'from-purple-500 to-purple-600',
  },
  {
    type: 'preview',
    label: 'Video Player',
    description: 'Live preview of your video project',
    icon: <PlayIcon className="h-5 w-5" />,
    color: 'from-green-500 to-green-600',
  },
  {
    type: 'storyboard',
    label: 'Storyboard',
    description: 'Visual timeline of your scenes',
    icon: <ListIcon className="h-5 w-5" />,
    color: 'from-orange-500 to-orange-600',
  },
  {
    type: 'code',
    label: 'Code Editor',
    description: 'Direct code editing and debugging',
    icon: <Code2Icon className="h-5 w-5" />,
    color: 'from-gray-500 to-gray-600',
  },
  {
    type: 'templates',
    label: 'Templates',
    description: 'Professional pre-made templates',
    icon: <LayoutTemplateIcon className="h-5 w-5" />,
    badge: 'NEW',
    color: 'from-pink-500 to-pink-600',
  },
];

export function GenerateSidebar({ 
  projects, 
  currentProjectId, 
  onAddPanel, 
  isCollapsed = false, 
  onToggleCollapse 
}: GenerateSidebarProps) {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(false); // Default to collapsed
  
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

  // Handle project navigation
  const handleProjectClick = (projectId: string) => {
    if (projectId !== currentProjectId) {
      router.push(`/projects/${projectId}/generate`);
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
                  onClick={() => {
                    // Create project and redirect to /generate
                    const createProject = async () => {
                      try {
                        const response = await fetch('/api/trpc/project.create', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({}),
                        });
                        const data = await response.json();
                        if (data.result?.data?.projectId) {
                          router.push(`/projects/${data.result.data.projectId}/generate`);
                        }
                      } catch (error) {
                        console.error('Failed to create project:', error);
                      }
                    };
                    createProject();
                  }}
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

        {/* My Projects Section - Only show when expanded */}
        {!isCollapsed && projects.length > 0 && (
          <div className="w-full mt-4">
            {/* Section Header */}
            <div className="flex items-center mb-2 px-1">
              <FolderIcon className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-2" />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                My Projects
              </span>
              <button
                className="ml-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-all duration-200"
                onClick={() => setIsProjectsExpanded(!isProjectsExpanded)}
              >
                {isProjectsExpanded ? (
                  <ChevronUpIcon className="h-4 w-4" />
                ) : (
                  <ChevronDownIcon className="h-4 w-4" />
                )}
              </button>
            </div>
            
            {/* Projects List */}
            {isProjectsExpanded && (
              <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                {projects.slice(0, 8).map((project) => (
                  <Button
                    key={project.id}
                    variant="ghost"
                    className={`h-8 w-full flex items-center justify-start rounded-lg text-xs transition-all duration-200 px-2
                      ${project.id === currentProjectId 
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800' 
                        : 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                      }`}
                    onClick={() => handleProjectClick(project.id)}
                    title={project.name}
                  >
                    <span className="truncate text-left">
                      {project.name.length > 12 ? `${project.name.substring(0, 12)}...` : project.name}
                    </span>
                  </Button>
                ))}
                {projects.length > 8 && (
                  <div className="text-xs text-gray-400 dark:text-gray-500 px-2 py-1">
                    +{projects.length - 8} more
                  </div>
                )}
              </div>
            )}
          </div>
        )}

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