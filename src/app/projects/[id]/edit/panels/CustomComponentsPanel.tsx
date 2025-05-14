//src/app/projects/[id]/edit/panels/CustomComponentsPanel.tsx

'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { 
  MoreVerticalIcon, 
  EditIcon, 
  TrashIcon, 
  SearchIcon, 
  ChevronDownIcon, 
  ChevronUpIcon, 
  RefreshCwIcon,
  Code2Icon,
  WrenchIcon
} from "lucide-react";
import { Loader2, PlusCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "~/components/ui/dropdown-menu";
import { useLocalStorage } from "~/hooks/useLocalStorage";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { CustomComponentStatus } from "~/components/CustomComponentStatus";
import { useVideoState } from "~/stores/videoState";
import { v4 as uuidv4 } from 'uuid';
import type { Operation } from "fast-json-patch";
// No toast imports - using inline feedback instead
import { FixableComponentsList } from "./components/FixableComponentsList";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";

interface CustomComponentsPanelProps {
  projectId: string;
}

interface RenameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRename: (newName: string) => void;
  currentName: string;
  isSubmitting: boolean;
}

interface DeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  isDeleting: boolean;
}

// Simple rename dialog component
const RenameComponentDialog = ({ isOpen, onClose, onRename, currentName, isSubmitting }: RenameDialogProps) => {
  const [newName, setNewName] = useState(currentName);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-lg font-semibold mb-4">Rename Component</h2>
        <Input 
          className="mb-4"
          placeholder="Component name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button 
            onClick={() => onRename(newName)}
            disabled={isSubmitting || !newName.trim()}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Rename
          </Button>
        </div>
      </div>
    </div>
  );
};

// Simple delete confirmation dialog
const DeleteConfirmationDialog = ({ isOpen, onClose, onConfirm, title, description, isDeleting }: DeleteDialogProps) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        <p className="mb-4">{description}</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>Cancel</Button>
          <Button 
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
};

export default function CustomComponentsPanel({ projectId }: CustomComponentsPanelProps) {
  // Show all components, including failed ones (by setting successfulOnly to false)
  const { data, isLoading, refetch } = api.customComponent.listAllForUser.useQuery({ 
    successfulOnly: false 
  }, {
    refetchInterval: 10000, // Refetch every 10 seconds
    retry: 3
  });
  
  // Using inline feedback instead of toast notifications
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | 'info'; details?: string } | null>(null);
  const router = useRouter();
  const { applyPatch, getCurrentProps, forceRefresh } = useVideoState();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isExpanded, setIsExpanded] = useLocalStorage(`bazaar-components-panel-expanded-${projectId}`, true);
  const [selectedComponent, setSelectedComponent] = useState<any | null>(null);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [processedComponents, setProcessedComponents] = useState<string[]>([]);
  const [isAutoAddEnabled, setIsAutoAddEnabled] = useState(false);
  const [componentStatuses, setComponentStatuses] = useState<Record<string, { status: string, outputUrl?: string }>>({});
  
  const renameMutation = api.customComponent.rename.useMutation({
    onSuccess: () => {
      refetch();
      setIsRenameDialogOpen(false);
      console.log("Component renamed successfully");
    }
  });
  
  const deleteMutation = api.customComponent.delete.useMutation({
    onSuccess: () => {
      refetch();
      setIsDeleteDialogOpen(false);
      setSelectedComponent(null);
      console.log("Component deleted successfully");
    }
  });

  // Add the fix component mutation
  const fixMutation = api.customComponent.fixComponent.useMutation({
    onSuccess: (data) => {
      refetch();
      setFeedback({
        message: data.fixed ? "Component fixed!" : "Component processed",
        details: data.fixed 
          ? `Fixed issues: ${data.issues.join(", ")}` 
          : "No issues were found to fix",
        type: data.fixed ? "success" : "error"
      });
      
      // Clear feedback after 5 seconds
      setTimeout(() => setFeedback(null), 5000);
    },
    onError: (error) => {
      setFeedback({
        message: "Failed to fix component",
        details: error.message,
        type: "error"
      });
      
      // Clear feedback after 5 seconds
      setTimeout(() => setFeedback(null), 5000);
    }
  });

  const filteredComponents = useMemo(() => {
    if (!data) return [];
    return data.filter(component => 
      component.effect.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [data, searchQuery]);

  const handleStatusUpdate = useCallback((componentId: string, status: string, outputUrl?: string) => {
    setComponentStatuses(prev => ({
      ...prev,
      [componentId]: { status, outputUrl }
    }));
    
    // Auto-add logic for newly completed components
    if (isAutoAddEnabled && 
        status === 'complete' && 
        !processedComponents.includes(componentId) &&
        data) {
      
      const component = data.find(c => c.id === componentId);
      if (component) {
        handleAddToVideo(component);
        setProcessedComponents(prev => [...prev, componentId]);
      }
    }
  }, [isAutoAddEnabled, processedComponents, data]);

  // On mount, load processed components from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`processed-components-${projectId}`);
    if (stored) {
      try {
        setProcessedComponents(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse stored processed components:", e);
      }
    }
  }, [projectId]);

  // Save processed components to localStorage when they change
  useEffect(() => {
    if (processedComponents.length > 0) {
      localStorage.setItem(
        `processed-components-${projectId}`,
        JSON.stringify(processedComponents)
      );
    }
  }, [processedComponents, projectId]);

  const handleAddToVideo = useCallback(async (component: any) => {
    if (!component || !component.id) {
      console.error("Component data is invalid or missing ID");
      return;
    }
    
    try {
      // Get current video state to determine end position
      const currentProps = getCurrentProps();
      const scenes = currentProps?.scenes || [];
      const lastSceneEnd = scenes.length > 0 
        ? Math.max(...scenes.map(s => s.start + s.duration))
        : 0;
      
      const operations: Operation[] = [
        {
          op: "add",
          path: "/scenes/-",
          value: {
            id: uuidv4(),
            type: "custom",
            start: lastSceneEnd,
            duration: 150, // Default duration, can be adjusted
            data: {
              componentId: component.id,
              name: component.effect || "Custom Scene"
            }
          }
        }
      ];
      
      console.log('[CustomComponentsPanel] Applying patch to add custom scene:', operations);
      applyPatch(projectId, operations);
      
      // Force refresh the component loading to ensure the new component appears
      console.log('[CustomComponentsPanel] Forcing refresh for new component:', component.id);
      forceRefresh(projectId);
      
      console.log(`Added "${component.effect}" to the timeline.`);
      
      // Track this component as processed
      if (!processedComponents.includes(component.id)) {
        setProcessedComponents(prev => [...prev, component.id]);
      }
      
    } catch (error) {
      console.error("Error adding component to video:", error);
    }
  }, [projectId, getCurrentProps, applyPatch, forceRefresh, processedComponents]); 

  const handleRenameClick = (component: any) => {
    setSelectedComponent(component);
    setIsRenameDialogOpen(true);
  };

  const handleDeleteClick = (component: any) => {
    setSelectedComponent(component);
    setIsDeleteDialogOpen(true);
  };
  
  const handleRenameSubmit = (newName: string) => {
    if (!selectedComponent) return;
    renameMutation.mutate({
      id: selectedComponent.id,
      effect: newName
    });
  };
  
  const handleDeleteConfirm = () => {
    if (!selectedComponent) return;
    deleteMutation.mutate({
      id: selectedComponent.id
    });
  };

  const handleFixComponent = (componentId: string) => {
    fixMutation.mutate({ componentId });
  };

  // Query for fixable components - moved before conditional return to avoid hooks order issues
  const { data: fixableComponents, isLoading: isLoadingFixable } = api.customComponent.getFixableByProjectId.useQuery({
    projectId
  }, {
    // Keep this query enabled
    enabled: true,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Loading components...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full">
      <Tabs defaultValue="custom" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="custom">Custom Components</TabsTrigger>
          <TabsTrigger value="fixable">Fixable Components</TabsTrigger>
        </TabsList>
        
        <TabsContent value="custom">
          <div className="h-full flex flex-col p-1 bg-white dark:bg-gray-900 rounded-lg shadow mt-2">
            <div className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Custom Components</h3>
              <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} className="h-7 w-7">
                {isExpanded ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
              </Button>
            </div>

            {isExpanded && (
              <>
                <div className="p-2">
                  <div className="relative">
                    <SearchIcon className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <Input
                      placeholder="Search components..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-9 pl-9 text-xs rounded-md border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 focus:ring-1 focus:ring-primary/30 shadow-sm"
                    />
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1.5 top-1/2 transform -translate-y-1/2 h-6 px-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                        onClick={() => setSearchQuery("")}
                      >
                        ✕
                      </Button>
                    )}
                  </div>
                  
                  <div className="flex items-center mt-2">
                    <label className="flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={isAutoAddEnabled}
                        onChange={() => setIsAutoAddEnabled(!isAutoAddEnabled)}
                        className="form-checkbox h-3.5 w-3.5 text-primary border-gray-300 rounded"
                      />
                      <span className="ml-1.5 text-xs">Auto-add new components</span>
                    </label>
                  </div>
                </div>

                <div className="flex-grow overflow-y-auto p-2 space-y-1.5 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                  {filteredComponents.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-xs text-gray-500 dark:text-gray-400">No components found.</p>
                    </div>
                  ) : (
                    filteredComponents.map((component) => (
                      <div 
                        key={component.id} 
                        className={cn(
                          "flex items-center justify-between p-1.5 rounded-md bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors duration-150 shadow-sm border border-gray-200 dark:border-gray-700/50",
                          processedComponents.includes(component.id) && "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/30",
                          component.status === "error" && "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30"
                        )}
                      >
                        <div className="flex items-center min-w-0">
                          <CustomComponentStatus 
                            componentId={component.id} 
                            onStatusChange={(status, outputUrl) => handleStatusUpdate(component.id, status, outputUrl)} 
                          />
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate ml-2" title={component.effect}>
                            {component.effect}
                          </span>
                          {processedComponents.includes(component.id) && (
                            <span className="ml-1.5 text-[10px] text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20 px-1 py-0.5 rounded">
                              Added
                            </span>
                          )}
                        </div>
                        <div className="flex items-center flex-shrink-0 ml-1.5">
                          {/* Render Fix button for error components */}
                          {(component.status === "error" || componentStatuses[component.id]?.status === "error") && (
                            <Button 
                              variant="outline"
                              size="sm" 
                              onClick={() => handleFixComponent(component.id)}
                              disabled={fixMutation.isPending}
                              className="h-6 px-1.5 text-xs mr-1 border-yellow-500/50 text-yellow-600 hover:bg-yellow-100 dark:border-yellow-600/40 dark:text-yellow-500 dark:hover:bg-yellow-900/20"
                            >
                              {fixMutation.isPending && fixMutation.variables?.componentId === component.id ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <WrenchIcon className="h-3 w-3 mr-1" />
                              )}
                              Fix
                            </Button>
                          )}
                          
                          {/* Existing Add button */}
                          <Button 
                            variant="outline"
                            size="sm" 
                            onClick={() => handleAddToVideo(component)}
                            disabled={(component.status !== 'complete' && componentStatuses[component.id]?.status !== 'complete') || (!component.outputUrl && !componentStatuses[component.id]?.outputUrl)}
                            className="h-6 px-1.5 text-xs mr-1 border-primary/50 text-primary hover:bg-primary/10 dark:border-primary/40 dark:text-primary/90 dark:hover:bg-primary/20"
                          >
                            <PlusCircle className="h-3 w-3 mr-1" /> Add
                          </Button>
                          
                          {/* Rest of existing buttons */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <MoreVerticalIcon className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="text-xs">
                              <DropdownMenuItem onClick={() => handleRenameClick(component)} className="cursor-pointer">
                                <EditIcon className="h-3 w-3 mr-1.5" /> Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteClick(component)} className="text-red-500 dark:text-red-400 hover:!text-red-600 dark:hover:!text-red-500 cursor-pointer">
                                <TrashIcon className="h-3 w-3 mr-1.5" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-2 border-t border-gray-200 dark:border-gray-700 mt-auto">
                  <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading} className="w-full h-8 text-xs">
                    {isLoading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCwIcon className="h-3.5 w-3.5 mr-1.5" />} 
                    Refresh List
                  </Button>
                </div>
              </>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="fixable">
          {/* Fixable components tab content */}
          <div className="mt-2">
            <FixableComponentsList
              projectId={projectId}
              components={fixableComponents || []}
              isLoading={isLoadingFixable}
              onFixComponent={handleFixComponent}
              isFixing={fixMutation.isPending}
              fixingComponentId={fixMutation.variables?.componentId}
            />
          </div>
        </TabsContent>
      </Tabs>

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
