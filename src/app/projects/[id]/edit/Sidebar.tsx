// src/app/projects/[id]/edit/Sidebar.tsx
"use client";

import { useState, useCallback, useMemo, useEffect } from 'react';
import Link from "next/link";
import { useRouter } from "next/navigation";
import TimelinePanel from './panels/TimelinePanel';
import { NewProjectButton } from "~/components/client/NewProjectButton";
import type { PanelType } from './WorkspaceContentArea';
import { Button } from "~/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "~/components/ui/tooltip";
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
      setSelectedComponent(null);
    }
  });

  // Filter components by search query
  const filteredComponents = useMemo(() => {
    if (!data) return [];
    
    return data.filter(component => 
      component.effect.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [data, searchQuery]);

  // Track component status changes
  const handleStatusUpdate = useCallback((componentId: string, status: string, outputUrl?: string) => {
    setComponentStatuses(prev => ({
      ...prev,
      [componentId]: { status, outputUrl }
    }));
  }, []);

  // Function to convert component to a scene in the video
  const handleAddToVideo = useCallback(async (component: any) => {
    if (!component || insertComponentMutation.isPending) return;
    
    try {
      // Get the component's output URL
      const outputUrl = component.outputUrl || componentStatuses[component.id]?.outputUrl;
      if (!outputUrl) {
        console.error("Component has no output URL");
        return;
      }
      
      // Set up the scene adding operation
      const currentProps = getCurrentProps();
      const operations: Operation[] = [
        {
          op: "add",
          path: "/scenes/-",
          value: {
            id: `component-${component.id}`,
            type: "customComponent",
            startAt: 0,
            duration: 5000,
            props: {
              src: outputUrl,
              componentId: component.id,
              componentName: component.effect
            }
          }
        }
      ];
      
      // Apply the operation optimistically
      applyVideoPatch(projectId, operations);
      
    } catch (error) {
      console.error("Error adding component to video:", error);
    }
  }, [projectId, insertComponentMutation, componentStatuses, getCurrentProps, applyVideoPatch]);

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
      effect: newName // use 'effect' instead of 'newName' for the API
    });
  };
  
  // Handle component delete confirmation
  const handleDeleteConfirm = () => {
    if (!selectedComponent) return;
    
    deleteMutation.mutate({
      id: selectedComponent.id
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Enhanced header with improved styling */}
      <div className={`flex items-center justify-between px-2 py-2 ${isCollapsed ? 'justify-center' : ''}`}>
        <h3 className={`text-xs font-semibold text-gray-500 uppercase tracking-wide ${isCollapsed ? 'sr-only' : ''}`}>
          Components
        </h3>
        {!isCollapsed && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0 rounded-[15px] hover:bg-gray-300"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUpIcon className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDownIcon className="h-4 w-4 text-gray-400" />
            )}
          </Button>
        )}
      </div>
      
      {/* Enhanced search with modern styling */}
      {isExpanded && !isCollapsed && (
        <div className="px-2 py-1">
          <div className="relative">
            <SearchIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input
              placeholder="Search components..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs rounded-[15px] border-gray-300 bg-gray-200 focus:ring-1 focus:ring-primary/30 shadow-sm"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-5 w-5 p-0"
                onClick={() => setSearchQuery("")}
              >
                <TrashIcon className="h-3 w-3 text-gray-400" />
              </Button>
            )}
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-gray-500">{filteredComponents.length} components</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 rounded-[15px] hover:bg-gray-300"
              onClick={() => refetch()}
            >
              <RefreshCwIcon className="h-3.5 w-3.5 text-gray-400" />
            </Button>
          </div>
        </div>
      )}
      
      {/* Components list with enhanced styling */}
      <div className={`flex-1 overflow-auto ${isExpanded ? '' : 'hidden'}`}>
        {isLoading ? (
          <div className="flex justify-center items-center h-20">
            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
          </div>
        ) : filteredComponents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-20 px-3 text-center">
            <span className="text-xs text-gray-500">
              {searchQuery ? "No matching components" : "No custom components yet"}
            </span>
          </div>
        ) : (
          filteredComponents.map((component) => (
            <div 
              key={component.id}
              className="flex items-center gap-2 p-2 hover:bg-gray-200 transition-colors rounded-[15px] mx-2 my-1 group cursor-pointer border border-gray-100 shadow-sm"
              onClick={() => handleAddToVideo(component)}
            >
              {/* Component icon/thumbnail */}
              <div className="flex-shrink-0 h-9 w-9 bg-gray-300 rounded-[15px] flex items-center justify-center overflow-hidden">
                {component.outputUrl ? (
                  <img 
                    src={component.outputUrl} 
                    alt={component.effect} 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Code2Icon className="h-5 w-5 text-gray-500" />
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
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-full shadow-sm hover:bg-gray-300">
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

export default function Sidebar({ 
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
  
  // Calculate approx sidebar width based on the longest project name
  const sidebarWidth = useMemo(() => {
    if (isCollapsed) return 58; // collapsed width
    
    // Find longest project name
    const longestName = projects?.reduce((longest, current) => 
      current.name.length > longest.length ? current.name : longest, ""
    ) || "";
    
    // Calculate width: icon (40px) + padding (24px) + text width (approx 8px per char) + buffer (40px)
    const width = Math.max(240, 40 + 24 + (longestName.length * 8) + 40);
    return Math.min(width, 320); // cap at 320px max
  }, [isCollapsed, projects]);
  
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

  return (
    <TooltipProvider>
      <aside 
        className={`flex flex-col h-full bg-white border border-gray-200 shadow-sm rounded-[15px] transition-all duration-200 ${isCollapsed ? 'items-center' : ''}`}
        style={{ 
          width: `${sidebarWidth}px`, 
          maxWidth: '100%',
          position: 'relative'
        }}
      >
        {/* Collapse/Expand button with improved styling */}
        <button
          className="absolute -right-4 top-4 z-10 bg-white border border-gray-200 rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-all duration-200 shadow-md"
          onClick={toggleCollapse}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRightIcon className="h-4 w-4 text-gray-700" />
          ) : (
            <ChevronLeftIcon className="h-4 w-4 text-gray-700" />
          )}
        </button>

        {/* New Project Button with enhanced styling */}
        <div className={`mt-4 ${isCollapsed ? 'mx-auto' : 'px-3'}`}>
          {isCollapsed ? (
            <Button
              className="h-11 w-11 rounded-[15px] flex items-center justify-center"
              variant="default"
              onClick={() => {
                router.push('/projects/new');
              }}
            >
              <PlusIcon className="h-5 w-5" />
            </Button>
          ) : (
            <NewProjectButton
              className="h-11 w-full justify-start rounded-[15px] text-sm font-normal text-gray-900"
              variant="default"
              showIcon={true}
            />
          )}
        </div>

        {/* Panel Navigation with draggable items */}
        <nav className={`flex flex-col ${isCollapsed ? 'items-center mt-3' : 'px-3 mt-3'} space-y-1`}>
          {navItems.map((item) => (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <div
                  className={`h-11 ${isCollapsed ? 'w-11 justify-center' : 'w-full'}`}
                  draggable={item.type !== 'timeline'}
                  onDragStart={(e) => handleDragStart(e, item.type)}
                  onDragEnd={handleDragEnd}
                >
                  <Button 
                    variant="ghost"
                    className={`h-full w-full ${isCollapsed ? 'justify-center' : 'justify-start'} rounded-[15px] transition-all duration-200 hover:bg-gray-300 ${item.type === 'timeline' && timelineActive ? 'bg-primary/20' : 'bg-gray-200'} border border-gray-100 shadow-sm`}
                    onClick={() => handlePanelClick(item.type)}
                    data-panel-type={item.type}
                  >
                    <item.icon className={`h-5 w-5 ${item.type === 'timeline' && timelineActive ? 'text-primary' : 'text-gray-600'} ${isCollapsed ? '' : 'mr-3'}`} />
                    {!isCollapsed && (
                      <span className={`text-sm font-normal ${item.type === 'timeline' && timelineActive ? 'text-primary' : 'text-gray-900'}`}>{item.name}</span>
                    )}
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className={!isCollapsed ? 'hidden' : ''}>
                {item.name}
              </TooltipContent>
            </Tooltip>
          ))}
        </nav>

        {/* Timeline is now handled in the main navigation */}

      {/* Project List Section (Commented out as it's redundant with the Projects Panel) */}
      {/* 
      <div className="mt-6 mb-2">
        <div 
          className={`flex items-center justify-between ${isCollapsed ? 'justify-center mx-auto' : 'px-4'} py-1 cursor-pointer hover:bg-gray-300 bg-gray-200 rounded-[15px] transition-colors border border-gray-100 shadow-sm`}
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
                  className={`flex items-center gap-2 rounded-[15px] px-3 py-2 text-sm transition-colors whitespace-nowrap ${
                    project.id === currentProjectId
                      ? "bg-gray-300 text-gray-900 font-medium border border-gray-100 shadow-sm"
                      : "bg-gray-200 hover:bg-gray-300 text-gray-800 border border-gray-100 shadow-sm"
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
      )
      */}

      {/* Enhanced Custom Components Section with better styling */}
      <div className="flex-1 overflow-auto border-t mt-4">
        <div className={`${isCollapsed ? 'px-1' : 'px-3'} py-3`}>
          <CustomComponentsSidebar isCollapsed={isCollapsed} projectId={currentProjectId} />
        </div>
      </div>
    </aside>
  </TooltipProvider>
  );
}
