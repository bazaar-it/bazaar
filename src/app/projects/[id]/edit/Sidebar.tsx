// src/app/projects/[id]/edit/Sidebar.tsx
"use client";

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useLocalStorage } from "~/hooks/useLocalStorage";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TimelinePanel from './panels/TimelinePanel';
import { NewProjectButton } from "~/components/client/NewProjectButton";
import type { PanelType } from './WorkspaceContentArea';
import { Button } from "~/components/ui/button";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "~/components/ui/tooltip";
import { Input } from "~/components/ui/input";
import type { Operation } from "fast-json-patch";
import { Loader2, FileText, Video } from "lucide-react";
import { 
  MenuIcon, 
  FolderIcon, 
  MessageSquareIcon, 
  UploadIcon, 
  ClockIcon, 
  PlayIcon, 
  Code2Icon, 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  PlusIcon, 
  ListIcon,
  MoreVerticalIcon,
  EditIcon,
  TrashIcon,
  SearchIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  RefreshCwIcon,
} from "~/components/ui/icons";
import { ListChecksIcon as ShapesIcon } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "~/components/ui/dropdown-menu";

type Project = {
  id: string;
  name: string;
};

interface SidebarProps {
  projects: Project[];
  currentProjectId: string;
  onToggleTimeline?: () => void;
  onAddPanel?: (panelType: PanelType) => void;
  timelineActive?: boolean;
  isCollapsed?: boolean; // Control sidebar collapse state
  onToggleCollapse?: () => void; // Toggle sidebar collapse/expand
}

// Using imported PanelType from WorkspaceContentArea

interface WorkspacePanel {
  type: PanelType;
  id: string;
  name: string;
  icon: any;
  href: string;
}

// Updated navItems to separate out each panel type instead of using tabs within a panel
const navItems: WorkspacePanel[] = [
  { type: 'projects', id: 'projects', name: "Projects", icon: FolderIcon, href: "#projects" },
  { type: 'templates', id: 'templates', name: "Templates", icon: FileText, href: "#templates" },
  { type: 'uploads', id: 'uploads', name: "Uploads", icon: UploadIcon, href: "#uploads" },
  { type: 'scenes', id: 'scenes', name: "Scenes", icon: Video, href: "#scenes" },
  { type: 'chat', id: 'chat', name: "Chat", icon: MessageSquareIcon, href: "#chat" },
  { type: 'timeline', id: 'timeline', name: "Timeline", icon: ClockIcon, href: "#timeline" },
  { type: 'preview', id: 'preview', name: "Preview", icon: PlayIcon, href: "#preview" },
  { type: 'code', id: 'code', name: "Code", icon: Code2Icon, href: "#code" },
  { type: 'sceneplanning', id: 'sceneplanning', name: "Scene Planner", icon: ListIcon, href: "#sceneplanning" },
  { type: 'customComponents', id: 'customComponents', name: "Components", icon: ShapesIcon, href: "#customComponents" }, // Added Custom Components panel
];

export function Sidebar({ 
  projects, 
  currentProjectId, 
  onToggleTimeline, 
  onAddPanel, 
  timelineActive = false,
  isCollapsed = false, 
  onToggleCollapse 
}: SidebarProps) {
  const [projectsExpanded, setProjectsExpanded] = useLocalStorage("bazaar-projects-expanded", true);
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  
  // Toggle the sidebar collapsed state
  const toggleCollapse = useCallback(() => {
    if (onToggleCollapse) {
      onToggleCollapse();
    }
  }, [onToggleCollapse]);
  
  // Calculate sidebar width based on collapsed state
  const sidebarWidth = useMemo(() => {
    return isCollapsed ? '3rem' : '10rem'; // 3rem (collapsed) / 10rem (expanded)
  }, [isCollapsed]);
  
  // Handle dragging panel icons from sidebar
  const handleDragStart = (e: React.DragEvent, panelType: PanelType) => {
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
  const handlePanelClick = (panelType: PanelType) => {
    if (panelType === 'timeline') {
      onToggleTimeline?.();
    } else if (onAddPanel) {
      onAddPanel(panelType);
    }
  };

  // Filter navItems to show preview, chat, scene planning, projects, and custom components panels
  const visibleNavItems = navItems.filter(item => 
    item.type === 'preview' || item.type === 'chat' || item.type === 'sceneplanning' || item.type === 'projects' || item.type === 'customComponents'
  );

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
          paddingRight: isCollapsed ? '10px' : '20px' // More padding on right when expanded for text
        }}
      >
        {/* Collapse/Expand button with improved styling - reduced padding and moved higher */}
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

        {/* New Project Button with enhanced styling - aligned left when expanded */}
        <div className={`w-full ${isCollapsed ? 'flex justify-center' : ''}`}>
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-lg flex items-center justify-center bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                  onClick={() => router.push('/projects/new')}
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

        {/* Panel Navigation with only Preview and Chat visible - aligned left when expanded */}
        <nav className={`flex flex-col w-full mt-3 gap-3 ${isCollapsed ? 'items-center' : ''}`}>
          {visibleNavItems.map((item) => (
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
                      draggable={item.type !== 'timeline'}
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
                      draggable={item.type !== 'timeline'}
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

      </aside>
    </TooltipProvider>
  );
}
