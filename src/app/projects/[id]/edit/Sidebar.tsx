// src/app/projects/[id]/edit/Sidebar.tsx
"use client";

import { useState, useCallback, useMemo, useEffect } from 'react';
import Link from "next/link";
import { useRouter } from "next/navigation";
import TimelinePanel from './panels/TimelinePanel';
import { NewProjectButton } from "~/components/client/NewProjectButton";
import { Button } from "~/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "~/components/ui/tooltip";
import { Input } from "~/components/ui/input";
import type { Operation } from "fast-json-patch";
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
} from "~/components/ui/icons";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "~/components/ui/dropdown-menu";
import { RenameComponentDialog } from "~/components/RenameComponentDialog";
import { DeleteConfirmationDialog } from "~/components/DeleteConfirmationDialog";
import { useLocalStorage } from "~/hooks/useLocalStorage";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { CustomComponentStatus } from "~/components/CustomComponentStatus";
import { useVideoState } from "~/stores/videoState";

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
}

type PanelType = 'chat' | 'preview' | 'code' | 'uploads' | 'projects' | 'timeline' | 'sceneplanning';

interface WorkspacePanel {
  type: PanelType;
  id: string;
  name: string;
  icon: any;
  href: string;
}

const navItems: WorkspacePanel[] = [
  { type: 'projects', id: 'projects', name: "Projects", icon: FolderIcon, href: "#projects" },
  { type: 'chat', id: 'chat', name: "Chat", icon: MessageSquareIcon, href: "#chat" },
  { type: 'uploads', id: 'uploads', name: "Uploads", icon: UploadIcon, href: "#uploads" },
  { type: 'timeline', id: 'timeline', name: "Timeline", icon: ClockIcon, href: "#timeline" },
  { type: 'preview', id: 'preview', name: "Preview", icon: PlayIcon, href: "#preview" },
  { type: 'code', id: 'code', name: "Code", icon: Code2Icon, href: "#code" },
  { type: 'sceneplanning', id: 'sceneplanning', name: "Scene Planning", icon: ListIcon, href: "#sceneplanning" },
];

function CustomComponentsSidebar({ isCollapsed, projectId }: { isCollapsed: boolean, projectId: string }) {
  // This query now fetches only successful components with outputUrl (stored in R2)
  // providing successfulOnly=true (the default) filters out duplicates and failed jobs
  const { data, isLoading, refetch } = api.customComponent.listAllForUser.useQuery({ 
    successfulOnly: true 
  });
  const router = useRouter();
  const { applyPatch: applyVideoPatch, getCurrentProps } = useVideoState();
  
  // Get the mutation at component level, not inside the callback
  const insertComponentMutation = api.video.insertComponent.useMutation();
  
  // Local state for UI
  const [searchQuery, setSearchQuery] = useState("");
  const [isExpanded, setIsExpanded] = useLocalStorage("bazaar-components-expanded", true);
  const [selectedComponent, setSelectedComponent] = useState<any | null>(null);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [componentStatuses, setComponentStatuses] = useState<Record<string, { status: string, outputUrl?: string }>>({});
  
  // Rename and delete mutations
  const renameMutation = api.customComponent.rename.useMutation({
    onSuccess: () => {
      refetch();
      setIsRenameDialogOpen(false);
    }
  });
  
  const deleteMutation = api.customComponent.delete.useMutation({
    onSuccess: () => {
      refetch();
      setIsDeleteDialogOpen(false);
    }
  });
  
  // Filter components based on search query
  const filteredComponents = useMemo(() => {
    if (!data) return [];
    if (!searchQuery.trim()) return data;
    
    const query = searchQuery.toLowerCase();
    return data.filter(component => 
      component.effect.toLowerCase().includes(query)
    );
  }, [data, searchQuery]);
  
  // Track component status updates from CustomComponentStatus
  const handleStatusUpdate = useCallback((id: string, status: string, outputUrl?: string) => {
    console.log('Component status update:', id, status, outputUrl);
    
    // Only update if something changed to avoid unnecessary rerenders
    setComponentStatuses(prev => {
      const currentStatus = prev[id];
      
      // Skip if status and outputUrl are both the same
      if (
        currentStatus && 
        currentStatus.status === status && 
        currentStatus.outputUrl === outputUrl
      ) {
        return prev; // No change needed
      }
      
      // Otherwise update the status
      return {
        ...prev,
        [id]: { status, outputUrl }
      };
    });
  }, []);
  
  // Insert component handler
  const handleInsertComponent = useCallback((job: any) => {
    console.log('Inserting component:', job);
    
    // Determine if the component is ready to be inserted
    let isReady = false;
    let componentUrl = '';
    
    // First check the locally tracked status
    const storedStatus = componentStatuses[job.id];
    if (storedStatus?.status === 'success' && storedStatus.outputUrl) {
      // We have a successful status in our local state
      console.log('Using locally tracked status for component:', job.id);
      isReady = true;
      componentUrl = storedStatus.outputUrl;
    } 
    // Fall back to checking the job object directly
    else if (job.status === 'success' && job.outputUrl) {
      isReady = true;
      componentUrl = job.outputUrl;
    }
    
    if (!isReady) {
      alert("Component not ready. It's still being generated or has errored.");
      return;
    }
    
    // Call the mutation using the reference from component level
    insertComponentMutation.mutate({
      projectId: projectId,
      componentId: job.id,
      componentName: job.effect,
      // Let the backend determine the insert position by default
    }, {
      onSuccess: (response) => {
        console.log('Component inserted successfully:', response);
        
        // The backend has applied the patch, but we should update our local state as well
        // to ensure the UI updates immediately
        if (response.patch) {
          applyVideoPatch(projectId, response.patch);
        }
    
        // Show success message
        alert(`Added "${job.effect}" to your timeline and preview!`);
      },
      onError: (error) => {
        console.error('Error inserting component:', error);
        alert(`Error adding component: ${error.message}`);
      }
    });
    
  }, [projectId, componentStatuses, insertComponentMutation, applyVideoPatch]);
  
  // Open rename dialog with the selected component
  const handleRenameClick = (component: any) => {
    setSelectedComponent(component);
    setIsRenameDialogOpen(true);
  };
  
  // Open delete dialog with the selected component
  const handleDeleteClick = (component: any) => {
    setSelectedComponent(component);
    setIsDeleteDialogOpen(true);
  };
  
  // Handle component rename submission
  const handleRenameSubmit = (newName: string) => {
    if (!selectedComponent) return;
    
    renameMutation.mutate({
      id: selectedComponent.id,
      effect: newName
    });
  };
  
  // Handle component delete confirmation
  const handleDeleteConfirm = () => {
    if (!selectedComponent) return;
    
    deleteMutation.mutate({
      id: selectedComponent.id
    });
  };

  if (isLoading) {
    return <div className={cn("text-xs text-muted-foreground px-2", isCollapsed && "text-center px-0")}>Loading...</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Improved Section header with toggle */}
      <div 
        className={cn(
          "flex items-center justify-between py-1 cursor-pointer hover:bg-gray-200 rounded-md transition-colors",
          isCollapsed ? "justify-center mx-auto" : "px-2"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className={cn("font-medium text-xs text-gray-700 uppercase tracking-wide", isCollapsed && "sr-only")}>
          Custom Components
        </span>
        {!isCollapsed && (
          isExpanded ? 
            <ChevronUpIcon className="h-4 w-4 text-gray-600" /> : 
            <ChevronDownIcon className="h-4 w-4 text-gray-600" />
        )}
      </div>
      
      {/* Enhanced Search input with better styling */}
      {isExpanded && !isCollapsed && (
        <div className="px-2 py-1">
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-600" />
            <Input
              placeholder="Search components..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-7 text-xs rounded-md bg-white border-gray-300 focus-visible:ring-1 focus-visible:ring-gray-400 focus-visible:ring-offset-0"
            />
          </div>
        </div>
      )}
      
      {/* Enhanced Component list with improved styling */}
      {isExpanded && (
        <div className={cn("space-y-1 overflow-y-auto max-h-[35vh] pb-2", !isCollapsed && "px-2")}>
          {filteredComponents.length === 0 ? (
            <div className={cn("text-xs text-gray-700 px-2 py-2", isCollapsed && "text-center px-0")}>
              {searchQuery.trim() ? "No components found" : "No components yet"}
            </div>
          ) : (
            filteredComponents.map(component => (
              <div
                key={component.id}
                className={cn(
                  "group relative flex items-center gap-2 p-2 rounded-md hover:bg-gray-200 cursor-pointer transition-colors",
                  isCollapsed && "justify-center flex-col gap-1"
                )}
                onClick={() => handleInsertComponent(component)}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", component.id);
                  e.dataTransfer.setData("application/jsonld", JSON.stringify(component));
                  // Add visual indicator for drag operation
                  e.dataTransfer.effectAllowed = "copy";
                }}
              >
                {/* Component thumbnail/preview with improved styling */}
                <div className="h-9 w-9 rounded-md bg-white flex items-center justify-center text-xs font-medium overflow-hidden border border-gray-300 shadow-sm">
                  {component.outputUrl ? (
                    <img 
                      src={component.outputUrl} 
                      alt={component.effect} 
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='18' height='18' x='3' y='3' rx='2' ry='2'/%3E%3Cpath d='M3 15v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2'/%3E%3Cpath d='M21 9V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2'/%3E%3C/svg%3E";
                      }}
                    />
                  ) : (
                    component.effect.charAt(0).toUpperCase()
                  )}
                </div>

                {/* Component name and actions with improved styling */}
                {!isCollapsed && (
                  <div className="flex-1 min-w-0 flex flex-col">
                    <span className="text-xs font-medium truncate text-gray-900">{component.effect}</span>
                    
                    {/* Render status indicator when needed */}
                    <CustomComponentStatus 
                      componentId={component.id} 
                      onStatusChange={(status, outputUrl) => handleStatusUpdate(component.id, status, outputUrl || undefined)}
                    />
                  </div>
                )}

                {/* Actions menu with improved animation and styling */}
                {!isCollapsed && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-full hover:bg-gray-300">
                          <MoreVerticalIcon className="h-3.5 w-3.5 text-gray-700" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-md shadow-md border border-gray-300 bg-white">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleRenameClick(component);
                        }}>
                          <EditIcon className="mr-2 h-3.5 w-3.5" />
                          <span>Rename</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(component);
                          }}
                        >
                          <TrashIcon className="mr-2 h-3.5 w-3.5" />
                          <span>Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
      
      {/* Dialogs */}
      {selectedComponent && (
        <>
          <RenameComponentDialog
            isOpen={isRenameDialogOpen}
            onClose={() => setIsRenameDialogOpen(false)}
            onRename={handleRenameSubmit}
            currentName={selectedComponent.effect}
            isSubmitting={renameMutation.isPending}
          />
          
          <DeleteConfirmationDialog
            isOpen={isDeleteDialogOpen}
            onClose={() => setIsDeleteDialogOpen(false)}
            onConfirm={handleDeleteConfirm}
            title="Delete Component"
            description={`Are you sure you want to delete "${selectedComponent.effect}"? This action cannot be undone.`}
            isDeleting={deleteMutation.isPending}
          />
        </>
      )}
    </div>
  );
}

export default function Sidebar({ projects, currentProjectId, onToggleTimeline, onAddPanel, timelineActive = false }: SidebarProps) {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useLocalStorage("sidebar-collapsed", false);
  const [projectsExpanded, setProjectsExpanded] = useLocalStorage("bazaar-projects-expanded", true);
  
  // Calculate dynamic width based on the longest menu item name
  const [sidebarWidth] = useState(224); // Default width
  const [draggedPanel, setDraggedPanel] = useState<PanelType | null>(null);

  // Toggle the sidebar collapsed state
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };
  
  // Handle dragging panel icons from sidebar
  const handleDragStart = (e: React.DragEvent, panelType: PanelType) => {
    e.dataTransfer.setData("text/plain", panelType);
    setDraggedPanel(panelType);
  };
  
  const handleDragEnd = () => {
    setDraggedPanel(null);
  };
  
  // Handle clicking on panel icons in sidebar
  const handlePanelClick = (panelType: PanelType) => {
    // Call the parent component's handler if available
    if (typeof onAddPanel === 'function') {
      // For the timeline button, we want to toggle the timeline panel directly
      if (panelType === 'timeline') {
        onToggleTimeline?.();
      } else {
        onAddPanel(panelType);
      }
    }
  };
  
  return (
    <aside
      className={`transition-all duration-200 h-[calc(100vh-40px)] bg-white border border-gray-300 shadow-sm rounded-t-xl rounded-b-[15px] flex flex-col items-stretch overflow-hidden ${isCollapsed ? 'w-[58px]' : ''}`}
      style={{ 
        position: 'relative',
        width: isCollapsed ? '58px' : `${sidebarWidth}px` 
      }}
      data-sidebar-width={sidebarWidth}
    >
      {/* Header with toggle button */}
      <div className="flex items-center justify-between h-14 px-2 border-b">
        {!isCollapsed && (
          <Link href="/" className="font-semibold text-lg flex items-center gap-2">
            <MenuIcon className="h-5 w-5" />
            <span>Bazaar-Vid</span>
          </Link>
        )}

        <div className="relative">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="absolute -right-3 top-4 z-20 bg-white border border-gray-200 rounded-full w-7 h-7 flex items-center justify-center hover:bg-gray-50 transition"
                style={{ transform: 'translateY(-50%)' }}
                onClick={() => setIsCollapsed(!isCollapsed)}
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isCollapsed ? <ChevronRightIcon className="h-[14px] w-[14px] text-gray-500" /> : <ChevronLeftIcon className="h-[14px] w-[14px] text-gray-500" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Enhanced New Project Button */}
      <div className={`${isCollapsed ? 'flex items-center justify-center mt-5' : 'flex items-start px-4 mt-[20px]'}`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <NewProjectButton
              variant="ghost"
              className={`h-11 ${isCollapsed ? 'w-11 justify-center' : 'w-full justify-start'} rounded-full transition-all duration-200 hover:bg-gray-100 flex items-center`}
              showIcon={true}
              onStart={() => {}}
            />
          </TooltipTrigger>
          {isCollapsed && <TooltipContent side="right">New Project</TooltipContent>}
        </Tooltip>
      </div>

      {/* Improved Main Navigation with better styling and drag indicators */}
      <nav className={`flex flex-col gap-2 mt-4 ${isCollapsed ? 'items-center' : 'items-start'} ${isCollapsed ? '' : 'px-4'}`}>
        {navItems.map((item) => {
          // Don't render the Timeline item as we'll add a custom version
          if (item.name === "Timeline") return null;
          
          // Define if this item can be used as a panel
          const isPanelItem = item.href.startsWith('#');
          
          return (
            <Tooltip key={item.name}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className={`h-11 ${isCollapsed ? 'w-11 justify-center' : 'w-full justify-start'} rounded-md transition-all duration-200 ${isPanelItem ? 'cursor-grab active:cursor-grabbing' : ''} hover:bg-gray-300 bg-gray-200 border border-gray-300`}
                  onClick={() => {
                    if (item.href.startsWith('#')) {
                      // For panel items, use onAddPanel callback
                      onAddPanel?.(item.type);
                    } else {
                      router.push(item.href);
                    }
                  }}
                  draggable={isPanelItem}
                  onDragStart={isPanelItem ? (e) => {
                    // Set data for drag operation
                    e.dataTransfer.setData("text/plain", item.type);
                    e.dataTransfer.effectAllowed = "copy";
                  } : undefined}
                  aria-label={item.name}
                >
                  <item.icon className={`h-[22px] w-[22px] text-gray-700 ${isCollapsed ? '' : 'mr-3'}`} />
                  {!isCollapsed && <span className="text-sm font-medium text-gray-800">{item.name}</span>}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className={!isCollapsed ? 'hidden' : ''}>
                {item.name}
              </TooltipContent>
            </Tooltip>
          );
        })}
        
        {/* Enhanced Timeline toggle button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className={`h-11 ${isCollapsed ? 'w-11 justify-center' : 'w-full justify-start'} rounded-md transition-all duration-200 hover:bg-gray-300 ${timelineActive ? 'bg-primary/20' : 'bg-gray-200'} border border-gray-300`}
              onClick={() => onToggleTimeline?.()}
            >
              <ClockIcon className={`h-[22px] w-[22px] ${timelineActive ? 'text-primary' : 'text-gray-600'} ${isCollapsed ? '' : 'mr-3'}`} />
              {!isCollapsed && (
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm font-normal">Timeline</span>
                  {timelineActive && (
                    <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                      On
                    </span>
                  )}
                </div>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className={!isCollapsed ? 'hidden' : ''}>
            {timelineActive ? 'Hide Timeline' : 'Show Timeline'}
          </TooltipContent>
        </Tooltip>
      </nav>

      {/* Improved Projects Section Header */}
      <div className="mt-6 mb-2">
        <div 
          className={`flex items-center justify-between ${isCollapsed ? 'justify-center mx-auto' : 'px-4'} py-1 cursor-pointer hover:bg-gray-300 bg-gray-200 rounded-md transition-colors border border-gray-300`}
          onClick={() => setProjectsExpanded(!projectsExpanded)}
        >
          <span className={`font-medium text-xs text-gray-500 uppercase tracking-wide ${isCollapsed ? 'sr-only' : ''}`}>
            Project List
          </span>
          {!isCollapsed && (
            projectsExpanded ? 
              <ChevronUpIcon className="h-4 w-4 text-gray-400" /> : 
              <ChevronDownIcon className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Enhanced Project List with better styling */}
      {projectsExpanded && (
        <nav className={`overflow-y-auto ${isCollapsed ? 'px-0' : 'px-3'} py-1 space-y-1 max-h-[30vh]`}>
          {projects.map((project) => (
            <Tooltip key={project.id}>
              <TooltipTrigger asChild>
                <Link
                  href={`/projects/${project.id}/edit`}
                  scroll={false}
                  replace={true}
                  prefetch={true}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors whitespace-nowrap ${
                    project.id === currentProjectId
                      ? "bg-gray-300 text-gray-900 font-medium border border-gray-400"
                      : "bg-gray-200 hover:bg-gray-300 text-gray-800 border border-gray-300"
                  } ${isCollapsed ? 'justify-center w-10 h-10 mx-auto' : 'w-full'} cursor-pointer`}
                  onClick={(e) => {
                    // Prevent navigation if this is the current project
                    if (project.id === currentProjectId) {
                      e.preventDefault();
                    }
                  }}
                >
                  <ListIcon className="h-5 w-5 shrink-0" />
                  {!isCollapsed && (
                    <span
                      className="truncate transition-all duration-200"
                      style={{ maxWidth: 160 }}
                    >
                      {project.name}
                    </span>
                  )}
                </Link>
              </TooltipTrigger>
              {isCollapsed && <TooltipContent side="right">{project.name}</TooltipContent>}
            </Tooltip>
          ))}
        </nav>
      )}

      {/* Enhanced Custom Components Section with better styling */}
      <div className="flex-1 overflow-auto border-t mt-4">
        <div className={`${isCollapsed ? 'px-1' : 'px-3'} py-3`}>
          <CustomComponentsSidebar isCollapsed={isCollapsed} projectId={currentProjectId} />
        </div>
      </div>
    </aside>
  );
}