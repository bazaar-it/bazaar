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
  timelineActive?: boolean;
}

const navItems = [
  { label: "Projects", icon: FolderIcon, href: "/projects" },
  { label: "Chat", icon: MessageSquareIcon, href: "#chat" },
  { label: "Uploads", icon: UploadIcon, href: "#uploads" },
  { label: "Timeline", icon: ClockIcon, href: "#timeline" },
  { label: "Preview", icon: PlayIcon, href: "#preview" },
  { label: "Code", icon: Code2Icon, href: "#code" },
];

function CustomComponentsSidebar({ collapsed, projectId }: { collapsed: boolean, projectId: string }) {
  // This query now fetches only successful components with outputUrl (stored in R2)
  // providing successfulOnly=true (the default) filters out duplicates and failed jobs
  const { data, isLoading, refetch } = api.customComponent.listAllForUser.useQuery({ 
    successfulOnly: true 
  });
  const router = useRouter();
  const { applyPatch: applyVideoPatch, getCurrentProps } = useVideoState();
  
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
    
    // Get current video properties
    const currentProps = getCurrentProps();
    if (!currentProps) {
      alert("Error: Cannot access current video properties.");
      return;
    }
    
    // Generate UUID for the new scene
    const newSceneId = crypto.randomUUID();
    
    // Create new scene at the end of the timeline
    const insertPosition = currentProps.meta.duration;
    
    // Create a JSON patch to add the component as a new scene
    const patch: Operation[] = [
      {
        // Add new scene to the scenes array
        op: "add" as const,
        path: `/scenes/-`,
        value: {
          id: newSceneId,
          type: "custom" as const, 
          start: insertPosition,
          duration: 60, // Default 2 second duration (60 frames at 30fps)
          data: {
            componentId: job.id,
            name: job.effect,
            outputUrl: componentUrl // Include the output URL for reference
          }
        }
      },
      {
        // Update the total duration if needed
        op: "replace" as const,
        path: "/meta/duration",
        value: Math.max(currentProps.meta.duration, insertPosition + 60)
      }
    ];
    
    console.log('Applying patch:', patch);
    
    // Apply patch to update the UI immediately
    applyVideoPatch(projectId, patch);
    
    // Force sync with the timeline by updating the duration
    const componentEndPosition = insertPosition + 60; // Using the same calculation as in patch
    console.log(`Added component at position ${insertPosition}, ends at ${componentEndPosition}`);
    console.log(`Current duration: ${currentProps.meta.duration}, New end: ${componentEndPosition}`);
    
    // Save to database using the existing API - show more clear messaging
    alert(`Added "${job.effect}" to your timeline and preview!\n\nIf you don't see it in the timeline, it may be added beyond the current view. Check the debug overlay for details.`);
    
    // Optional: Navigate to preview tab if desired
    // router.push(`/projects/${projectId}/edit#preview`);
  }, [projectId, applyVideoPatch, getCurrentProps, componentStatuses]);
  
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
    return <div className={cn("text-xs text-muted-foreground px-2", collapsed && "text-center px-0")}>Loading...</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Section header with toggle */}
      <div 
        className={cn(
          "flex items-center justify-between px-2 py-1 cursor-pointer hover:bg-accent/50 rounded",
          collapsed && "justify-center px-0"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className={cn("font-semibold text-xs uppercase tracking-wide", collapsed && "sr-only")}>
          Custom Components
        </span>
        {!collapsed && (
          isExpanded ? 
            <ChevronUpIcon className="h-4 w-4 text-muted-foreground" /> : 
            <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      
      {/* Search input - show only when expanded and not collapsed */}
      {isExpanded && !collapsed && (
        <div className="px-2">
          <div className="relative">
            <SearchIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              type="text"
              placeholder="Search components..."
              className="pl-8 h-8 text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      )}
      
      {/* Components list */}
      {isExpanded && (
        filteredComponents.length > 0 ? (
          <ul className={cn("flex flex-col gap-1", collapsed && "items-center")}>
            {filteredComponents.map((component) => {
              // Check for status in our local state first, then fall back to component.status
              const storedStatus = componentStatuses[component.id];
              const status = storedStatus?.status || component.status;
              const isReady = status === 'success';

              return (
                <li 
                  key={component.id} 
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded group",
                    collapsed && "justify-center px-0",
                    isReady ? "hover:bg-accent/50 cursor-pointer" : "hover:bg-accent/10"
                  )}
                  title={component.effect}
                  onClick={() => isReady && handleInsertComponent({
                    ...component,
                    status, // Use the most up-to-date status
                    outputUrl: storedStatus?.outputUrl || component.outputUrl // Use the most up-to-date URL
                  })}
                >
                  {/* Component icon */}
                  <Code2Icon 
                    className={cn("h-4 w-4 shrink-0", isReady ? "text-primary" : "text-muted-foreground")}
                  />
                  
                  {/* Component name - only show if not collapsed */}
                  {!collapsed && (
                    <span 
                      className="truncate flex-1 text-xs"
                      style={{ maxWidth: 120 }}
                    >
                      {component.effect}
                    </span>
                  )}
                  
                  {/* Status indicator */}
                  <CustomComponentStatus 
                    componentId={component.id} 
                    onSuccess={(outputUrl) => handleStatusUpdate(component.id, 'success', outputUrl)}
                    onStatusChange={(status, outputUrl) => handleStatusUpdate(component.id, status, outputUrl)}
                    collapsed={collapsed}
                  />
                  
                  {/* Actions menu - only show if not collapsed */}
                  {!collapsed && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                          onClick={(e) => e.stopPropagation()} // Prevent click from bubbling to parent
                        >
                          <MoreVerticalIcon className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent click from bubbling
                            handleRenameClick(component);
                          }}
                          className="text-xs"
                        >
                          <EditIcon className="h-3.5 w-3.5 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent click from bubbling
                            handleDeleteClick(component);
                          }}
                          className="text-destructive text-xs"
                        >
                          <TrashIcon className="h-3.5 w-3.5 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className={cn("text-xs text-muted-foreground px-2", collapsed && "text-center px-0")}>
            {searchQuery ? "No matching components" : "No custom components yet"}
          </div>
        )
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

export default function Sidebar({ projects, currentProjectId, onToggleTimeline, timelineActive = false }: SidebarProps) {
  const [collapsed, setCollapsed] = useLocalStorage("bazaar-sidebar-collapsed", false);
  const [projectsExpanded, setProjectsExpanded] = useLocalStorage("bazaar-projects-expanded", true);
  const router = useRouter();

  return (
    <aside
      className={`transition-all duration-200 h-full bg-background border-r flex flex-col items-stretch ${collapsed ? 'w-16' : 'w-64'}`}
      style={{ minWidth: collapsed ? 64 : 256 }}
    >
      {/* Header with toggle button */}
      <div className="flex items-center justify-between h-14 px-2 border-b">
        {!collapsed ? (
          <Link href="/" className="font-semibold text-lg flex items-center gap-2">
            <MenuIcon className="h-5 w-5" />
            <span>Bazaar-Vid</span>
          </Link>
        ) : (
          <div className="w-full flex justify-center">
            <MenuIcon className="h-5 w-5" />
          </div>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setCollapsed(prev => !prev)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRightIcon className="h-5 w-5" /> : <ChevronLeftIcon className="h-5 w-5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          </TooltipContent>
        </Tooltip>
      </div>
      
      {/* New Project Button */}
      <div className={collapsed ? 'flex justify-center items-center p-2' : 'px-3 py-2'}>
        <Tooltip>
          <TooltipTrigger asChild>
            <NewProjectButton
              variant={collapsed ? 'ghost' : 'outline'}
              size={collapsed ? 'icon' : 'sm'}
              className={collapsed ? 'w-10 h-10 p-0' : 'w-full min-w-[140px] justify-start'}
              showIcon={true}
              onStart={() => {}}
            />
          </TooltipTrigger>
          {collapsed && <TooltipContent side="right">New Project</TooltipContent>}
        </Tooltip>
      </div>

      {/* Main Navigation */}
      <div className="border-b py-2">
        {navItems.map((item) => {
          // Don't render the Timeline item as we'll add a custom version
          if (item.label === "Timeline") return null;
          
          return (
            <Tooltip key={item.label}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className={`w-full justify-start px-3 mb-1`}
                  onClick={() => {
                    if (item.href.startsWith('#')) {
                      // Handle internal tab navigation here
                    } else {
                      router.push(item.href);
                    }
                  }}
                >
                  <item.icon className={`h-5 w-5 ${collapsed ? 'mx-auto' : 'mr-2'}`} />
                  {!collapsed && <span>{item.label}</span>}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className={!collapsed ? 'hidden' : ''}>
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
        
        {/* Timeline toggle button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={timelineActive ? "default" : "ghost"}
              className={`w-full justify-start px-3 mb-1 ${timelineActive ? 'bg-primary/20' : ''}`}
              onClick={() => onToggleTimeline?.()}
            >
              <ClockIcon className={`h-5 w-5 ${collapsed ? 'mx-auto' : 'mr-2'} ${timelineActive ? 'text-primary' : ''}`} />
              {!collapsed && (
                <div className="flex items-center justify-between w-full">
                  <span>Timeline</span>
                  {timelineActive && (
                    <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                      On
                    </span>
                  )}
                </div>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className={!collapsed ? 'hidden' : ''}>
            {timelineActive ? 'Hide Timeline' : 'Show Timeline'}
          </TooltipContent>
        </Tooltip>
      </div>
      
      {/* Projects Section Header */}
      <div 
        className={`flex items-center justify-between px-2 py-1 cursor-pointer hover:bg-accent/50 rounded ${collapsed ? 'justify-center px-0' : ''}`}
        onClick={() => setProjectsExpanded(!projectsExpanded)}
      >
        <span className={`font-semibold text-xs uppercase tracking-wide ${collapsed ? 'sr-only' : ''}`}>
          Project List
        </span>
        {!collapsed && (
          projectsExpanded ? 
            <ChevronUpIcon className="h-4 w-4 text-muted-foreground" /> : 
            <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      {/* Project List */}
      {projectsExpanded && (
        <nav className="overflow-y-auto px-1 py-2 space-y-1 max-h-[30vh]">
          {projects.map((project) => (
            <Tooltip key={project.id}>
              <TooltipTrigger asChild>
                <Link
                  href={`/projects/${project.id}/edit`}
                  className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                    project.id === currentProjectId
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-accent text-foreground"
                  } ${collapsed ? 'justify-center' : ''}`}
                >
                  <ListIcon className="h-5 w-5 shrink-0" />
                  <span
                    className={`truncate transition-all duration-200 ml-2 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}
                    style={{ display: "inline-block", minWidth: 0, maxWidth: collapsed ? 0 : 160 }}
                  >
                    {project.name}
                  </span>
                </Link>
              </TooltipTrigger>
              {collapsed && <TooltipContent side="right">{project.name}</TooltipContent>}
            </Tooltip>
          ))}
        </nav>
      )}

      {/* Custom Components Section */}
      <div className="flex-1 overflow-auto border-t">
        <div className="px-1 py-2">
          <CustomComponentsSidebar collapsed={collapsed} projectId={currentProjectId} />
        </div>
      </div>
    </aside>
  );
}