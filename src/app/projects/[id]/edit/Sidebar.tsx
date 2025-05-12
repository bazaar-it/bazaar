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
  { type: 'sceneplanning', id: 'sceneplanning', name: "Scene Planner", icon: ListIcon, href: "#sceneplanning" },
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
      {/* Search input */}
      {!isCollapsed && (
        <div className="mb-2">
          <div className="relative">
            <SearchIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
            <Input
              placeholder="Search components..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs rounded-lg border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 focus:ring-1 focus:ring-primary/30 shadow-sm"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-5 w-5 p-0"
                onClick={() => setSearchQuery("")}
              >
                <TrashIcon className="h-3 w-3 text-gray-500 dark:text-gray-400" />
              </Button>
            )}
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">{filteredComponents.length} components</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => refetch()}
            >
              <RefreshCwIcon className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
            </Button>
          </div>
        </div>
      )}
      
      {/* Components list */}
      <div className={`flex-1 overflow-auto ${isExpanded ? '' : 'hidden'}`}>
        {isLoading ? (
          <div className="flex justify-center items-center h-20">
            <Loader2 className="h-5 w-5 text-gray-500 dark:text-gray-400 animate-spin" />
          </div>
        ) : filteredComponents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-20 px-3 text-center">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {searchQuery ? "No matching components" : "No custom components yet"}
            </span>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredComponents.map((component) => (
              <div 
                key={component.id}
                className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 rounded-lg cursor-pointer"
                onClick={() => handleAddToVideo(component)}
              >
                {/* Component icon/thumbnail */}
                <div className="flex-shrink-0 h-9 w-9 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                  {component.outputUrl ? (
                    <img 
                      src={component.outputUrl} 
                      alt={component.effect} 
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Code2Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  )}
                </div>
                
                {/* Component name and actions */}
                {!isCollapsed && (
                  <div className="flex-1 min-w-0 flex flex-col">
                    <span className="text-xs font-medium truncate text-gray-700 dark:text-gray-300">{component.effect}</span>
                    
                    {/* Render status indicator when needed */}
                    <CustomComponentStatus 
                      componentId={component.id} 
                      onStatusChange={(status, outputUrl) => handleStatusUpdate(component.id, status, outputUrl || undefined)}
                    />
                  </div>
                )}

                {/* Actions menu */}
                {!isCollapsed && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                          <MoreVerticalIcon className="h-3.5 w-3.5 text-gray-700 dark:text-gray-300" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleRenameClick(component);
                        }}
                        className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">
                          <EditIcon className="mr-2 h-3.5 w-3.5" />
                          <span>Rename</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
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
            ))}
          </div>
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

  // Filter navItems to show preview, chat, scene planning, and projects panels
  const visibleNavItems = navItems.filter(item => 
    item.type === 'preview' || item.type === 'chat' || item.type === 'sceneplanning' || item.type === 'projects'
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

        {/* Enhanced Custom Components Section - TEMPORARILY HIDDEN */}
        {/* 
        <div className="border-t border-gray-200 dark:border-gray-800 mt-2">
          <div className={`p-2 ${isCollapsed ? 'px-1' : ''}`}>
            <div className="flex items-center justify-between mb-2">
              {!isCollapsed && (
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Components
                </h3>
              )}
            </div>
            <CustomComponentsSidebar isCollapsed={isCollapsed} projectId={currentProjectId} />
          </div>
        </div>
        */}
      </aside>
    </TooltipProvider>
  );
}
