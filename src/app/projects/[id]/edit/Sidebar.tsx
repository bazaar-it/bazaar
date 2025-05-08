// src/app/projects/[id]/edit/Sidebar.tsx
"use client";

import { useState, useMemo } from 'react';
import { useRouter } from "next/navigation";
import { 
  FolderIcon, 
  MessageSquareIcon, 
  UploadIcon, 
  PlayIcon, 
  Code2Icon, 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  PlusIcon,
  GanttChartIcon
} from "~/components/ui/icons";
import { Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "~/components/ui/tooltip";
import { api } from "~/trpc/react";

// Enhanced navItems with panel types for drag-and-drop
const navItems = [
  { label: "Projects", icon: FolderIcon, panelType: "projects" },
  { label: "Chat", icon: MessageSquareIcon, panelType: "chat" },
  { label: "Uploads", icon: UploadIcon, panelType: "uploads" },
  { label: "Preview", icon: PlayIcon, panelType: "preview" },
  { label: "Code", icon: Code2Icon, panelType: "code" },
  { label: "Timeline", icon: GanttChartIcon, panelType: "timeline" },
];

interface SidebarProps {
  projects?: any[];
  currentProjectId?: string;
  onToggleTimeline?: () => void;
  timelineActive?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onPanelDragStart?: (panelType: string, label: string) => void;
  onAddPanel?: (panelType: string) => void;
  onPanelButtonClick?: (panelType: string) => void;
}

export default function Sidebar({ 
  projects, 
  currentProjectId, 
  onToggleTimeline, 
  timelineActive = false, 
  collapsed = false, 
  onToggleCollapse,
  onPanelDragStart,
  onAddPanel,
  onPanelButtonClick
}: SidebarProps) {
  const [showProjectsPanel, setShowProjectsPanel] = useState(false);
  const router = useRouter();
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  
  // API mutation for creating a new project
  const createProject = api.project.create.useMutation({
    onSuccess: (data) => {
      if (data?.projectId) {
        router.push(`/projects/${data.projectId}/edit`);
      }
      setIsCreatingProject(false);
    },
    onError: (error) => {
      console.error("Failed to create project:", error);
      setIsCreatingProject(false);
      // Could show an error toast here
    }
  });

  // Calculate dynamic width based on the longest menu item label
  const sidebarWidth = useMemo(() => {
    // Include "New Project" label in the calculation
    const allLabels = ["New Project", ...navItems.map(item => item.label)];
    
    // Find the longest label
    const longestLabel = allLabels.reduce((longest, current) => 
      current.length > longest.length ? current : longest, "");
    
    // Calculate width: 
    // icon size (44px) + margin (12px) + text + right padding (16px)
    // Approximate 0.6rem per character for text-sm font plus 1rem extra buffer
    const textWidth = longestLabel.length * 0.6 + 1; // in rem
    const totalWidth = 44 + 12 + (textWidth * 16); // convert rem to px (16px = 1rem)
    
    // Ensure minimum width of 170px and add slight buffer (+10px)
    return Math.max(170, Math.round(totalWidth + 10));
  }, []);

  // Handler for creating a new project
  const handleCreateProject = async () => {
    if (isCreatingProject) return;
    
    setIsCreatingProject(true);
    try {
      await createProject.mutateAsync({});
    } catch (error) {
      // Error is handled in the mutation's onError callback
      console.error("Error in handleCreateProject:", error);
    }
  };

  // Handle panel button click based on its type
  const handlePanelButtonClick = (item: typeof navItems[0]) => {
    if (item.label === "Timeline") {
      onToggleTimeline?.();
    } else if (item.panelType === "projects") {
      setShowProjectsPanel(!showProjectsPanel);
      onPanelButtonClick?.(item.panelType);
    } else if (item.panelType) {
      // Add panel to workspace if it has a valid panel type
      onAddPanel?.(item.panelType);
      onPanelButtonClick?.(item.panelType);
    }
  };

  // Handle starting a drag operation from a sidebar item
  const handleDragStart = (e: React.DragEvent, item: typeof navItems[0]) => {
    if (!item.panelType) return;
    
    // Set drag data
    e.dataTransfer.setData("text/plain", item.panelType);
    e.dataTransfer.effectAllowed = "copy";
    
    // Create a drag preview
    const dragPreview = document.createElement("div");
    dragPreview.className = "bg-white shadow-lg rounded-lg p-3 border border-gray-300";
    dragPreview.innerHTML = `<span>${item.label} Panel</span>`;
    dragPreview.style.position = "absolute";
    dragPreview.style.top = "-1000px";
    document.body.appendChild(dragPreview);
    
    // Use the custom drag preview
    // Note: setDragImage is not fully supported in all browsers
    try {
      e.dataTransfer.setDragImage(dragPreview, 50, 25);
    } catch (error) {
      console.warn("Custom drag preview not supported", error);
    }
    
    // Call the parent handler if provided
    if (onPanelDragStart) {
      onPanelDragStart(item.panelType, item.label);
    }
    
    // Clean up the drag preview element after a short delay
    setTimeout(() => {
      document.body.removeChild(dragPreview);
    }, 100);
  };

  return (
    <aside
      className={`transition-all duration-200 h-full bg-white border border-gray-200 shadow-sm rounded-t-xl rounded-b-[15px] flex flex-col items-stretch ${collapsed ? 'w-[58px]' : ''}`}
      style={{ 
        position: 'relative',
        width: collapsed ? '58px' : `${sidebarWidth}px` 
      }}
      data-sidebar-width={sidebarWidth}
    >
      {/* Expand/Collapse Floating Button */}
      <button
        className="absolute -right-3 top-4 z-20 bg-white border border-gray-200 rounded-full w-7 h-7 flex items-center justify-center hover:bg-gray-50 transition"
        style={{ transform: 'translateY(-50%)' }}
        onClick={() => onToggleCollapse?.()}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
        {collapsed ? <ChevronRightIcon className="h-[14px] w-[14px] text-gray-500" /> : <ChevronLeftIcon className="h-[14px] w-[14px] text-gray-500" />}
      </button>
      
      {/* New Project Button */}
      <div className={`${collapsed ? 'flex items-center justify-center mt-5' : 'flex items-start px-4 mt-[20px]'}`}>
        <Button
          variant="ghost"
          className={`h-11 w-11 flex items-center ${collapsed ? 'justify-center' : 'justify-start w-full'} rounded-full transition-all duration-200 hover:bg-gray-100`}
          onClick={handleCreateProject}
          disabled={isCreatingProject}
          aria-label="New Project"
        >
          {isCreatingProject ? (
            <Loader2 className="h-[34px] w-[34px] text-gray-500 animate-spin" />
          ) : (
            <PlusIcon className="h-[34px] w-[34px] text-gray-500" />
          )}
          {!collapsed && <span className="ml-3 text-sm font-normal whitespace-nowrap" style={{ fontFamily: 'system-ui' }}>{isCreatingProject ? "Creating..." : "New Project"}</span>}
        </Button>
      </div>

      {/* Tool icons only */}
      <nav className={`flex flex-col gap-2 flex-1 ${collapsed ? 'items-center' : 'items-start'} ${collapsed ? '' : 'px-4'}`}>
        {navItems.map((item) => (
            <Tooltip key={item.label}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className={`h-11 w-11 flex items-center ${collapsed ? 'justify-center' : 'justify-start w-full'} rounded-full transition-all duration-200 ${
                    item.label === 'Projects' && showProjectsPanel ? 'bg-primary/10' : ''
                  } hover:bg-gray-100 ${item.panelType ? 'cursor-grab active:cursor-grabbing' : ''}`}
                  onClick={() => handlePanelButtonClick(item)}
                  draggable={!!item.panelType}
                  onDragStart={item.panelType ? (e) => handleDragStart(e, item) : undefined}
                  aria-label={item.label}
                >
                  <item.icon className="h-[34px] w-[34px] text-gray-500" />
                  {!collapsed && <span className="ml-3 text-sm font-normal whitespace-nowrap" style={{ fontFamily: 'system-ui' }}>{item.label}</span>}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className={!collapsed ? 'hidden' : ''}>
                {item.label}
              </TooltipContent>
            </Tooltip>
          ))}
        </nav>
    </aside>
  );
}