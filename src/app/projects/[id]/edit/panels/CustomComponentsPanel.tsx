//src/app/projects/[id]/edit/panels/CustomComponentsPanel.tsx

'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { 
  BookOpen,
  Check,
  CheckCircle,
  Code,
  Code2,
  Code2Icon,
  WrenchIcon,
  Loader2, 
  PlusCircle, 
  RefreshCw,
  MoreVerticalIcon, 
  EditIcon, 
  TrashIcon, 
  SearchIcon, 
  ChevronDownIcon,
  ChevronUpIcon,
  Bug as BugIcon
} from "lucide-react";
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
    refetchInterval: 5000, // Refetch every 5 seconds for quicker updates
    retry: 3
  });
  
  useEffect(() => {
    if (data) {
      console.log(`[CustomComponentsPanel] Received ${data.length} components from backend.`);
    }
  }, [data]);

  // Using inline feedback instead of toast notifications
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | 'info'; details?: React.ReactNode } | null>(null);
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
  const [fixingComponentId, setFixingComponentId] = useState<string | null>(null);
  const [isDebugging, setIsDebugging] = useState(false);
  const [addingComponentId, setAddingComponentId] = useState<string | null>(null);
  
  const retryBuildMutation = api.customComponent.retryComponentBuild.useMutation();
  
  const handleRebuildComponent = useCallback(async (componentId: string) => {
    try {
      setFixingComponentId(componentId);
      
      console.log(`[CustomComponentsPanel] Rebuilding component ${componentId} that was ready but missing outputUrl`);
      
      await retryBuildMutation.mutateAsync({
        componentId: componentId
      });
      
      setComponentStatuses(prev => ({
        ...prev,
        [componentId]: { status: "pending" }
      }));
      
      setFeedback({
        type: 'success',
        message: 'Component Queued',
        details: 'Component has been reset to pending status and will be rebuilt.',
      });
      
      refetch();
    } catch (error) {
      console.error(`[CustomComponentsPanel] Error rebuilding component:`, error);
      setFeedback({
        type: 'error',
        message: 'Rebuild Failed',
        details: 'Failed to reset component for rebuilding. Please try again.',
      });
    } finally {
      setFixingComponentId(null);
    }
  }, [retryBuildMutation, refetch, setFeedback]);

  const handleAddToVideo = useCallback(async (component: any) => {
    const componentId = component.id;
    setAddingComponentId(componentId);

    const currentStatusInfo = componentStatuses[componentId];
    const liveOutputUrl = currentStatusInfo?.outputUrl || component.outputUrl;
    const liveStatus = currentStatusInfo?.status || component.status;

    console.log(`[CustomComponentsPanel] Attempting to add component to video: `, {
      componentId,
      componentEffect: component.effect,
      componentDbStatus: component.status, 
      liveStatus: liveStatus,             
      retrievedOutputUrl: liveOutputUrl,
      componentData: { ...component, status: liveStatus, outputUrl: liveOutputUrl }
    });

    try {
      if (liveStatus !== 'ready' && liveStatus !== 'complete' && liveStatus !== 'success') {
        console.warn(`[CustomComponentsPanel] Component ${componentId} is not in 'ready', 'complete', or 'success' state (current: ${liveStatus}). Cannot add.`);
        setFeedback({
          type: 'error',
          message: 'Add Failed',
          details: `Component '${component.effect}' is not ready (status: ${liveStatus}). Please wait or try rebuilding.`,
        });
        setAddingComponentId(null);
        return;
      }
      
      if (!liveOutputUrl) {
        console.warn(`[CustomComponentsPanel] Component ${componentId} has no output URL (liveStatus: ${liveStatus}). Cannot add to video.`);
        
        if (liveStatus === 'ready' || liveStatus === 'complete') {
          console.log(`[CustomComponentsPanel] Triggering rebuild for component ${componentId} (status: ${liveStatus}) because outputUrl is missing.`);
          await handleRebuildComponent(componentId); 
          setFeedback({
            type: 'info',
            message: 'Component Rebuilding',
            details: `Component '${component.effect}' was marked ready but its video data is missing. It has been queued for rebuilding. Please try adding it again in a few moments.`,
          });
        } else {
          setFeedback({
            type: 'error',
            message: 'Add Failed',
            details: `Component '${component.effect}' is missing its video data (status: ${liveStatus}). Please try fixing or re-rendering it.`,
          });
        }
        setAddingComponentId(null);
        return;
      }

      const currentProps = getCurrentProps();
      const scenes = currentProps?.scenes || [];
      const lastSceneEnd = scenes.length > 0 
        ? Math.max(...scenes.map(s => s.start + s.duration))
        : 0;
      
      // Conditionally construct the data object for the scene
      const sceneData: { 
        componentId: string; 
        name: string; 
        src: string; 
        durationInFrames?: number;
        fps?: number;
      } = {
        componentId: component.id,
        name: component.effect || "Custom Scene",
        src: liveOutputUrl,
      };

      if (typeof component.durationInFrames === 'number') {
        sceneData.durationInFrames = component.durationInFrames;
      }
      if (typeof component.fps === 'number') {
        sceneData.fps = component.fps;
      }

      const operations: Operation[] = [
        {
          op: "add",
          path: "/scenes/-",
          value: {
            id: uuidv4(),
            type: "custom",
            start: lastSceneEnd,
            duration: sceneData.durationInFrames ? (sceneData.durationInFrames / (sceneData.fps || 30)) * (sceneData.fps || 30) : 150, 
            data: sceneData
          }
        }
      ];
      
      console.log('[CustomComponentsPanel] Applying patch to add custom scene:', operations);
      applyPatch(projectId, operations);
      
      // Ensure forceRefresh is commented out here
      // console.log(`[CustomComponentsPanel] Forcing refresh for project ${projectId} after adding component ${component.id}`);
      // forceRefresh(projectId);
      
      console.log(`Added "${component.effect}" to the timeline.`);
      
      if (!processedComponents.includes(component.id)) {
        setProcessedComponents(prev => [...prev, component.id]);
      }
      
    } catch (error) {
      console.error("Error adding component to video:", error);
      setFeedback({
        type: 'error',
        message: 'Error Adding Component',
        details: error instanceof Error ? error.message : 'An unknown error occurred.',
      });
    } finally {
      setAddingComponentId(null);
    }
  }, [projectId, getCurrentProps, applyPatch, processedComponents, componentStatuses, setFeedback, handleRebuildComponent, setAddingComponentId]);

  const handleStatusUpdate = useCallback((componentId: string, status: string, outputUrl?: string) => {
    setComponentStatuses(prev => ({ ...prev, [componentId]: { status, outputUrl } }));

    if (status === 'ready') {
      console.log(`[CustomComponentsPanel] Component reported ready: id=${componentId}, outputUrl=${outputUrl || 'null'}`);
      const wasRebuildingForMissingUrl = componentStatuses[componentId]?.status === 'pending' && fixingComponentId === componentId; 
      if (outputUrl && wasRebuildingForMissingUrl) {
        const component = data?.find(c => c.id === componentId);
        if (component) {
          console.log(`[CustomComponentsPanel] Component ${componentId} was rebuilt (due to missing outputUrl) and is now ready with URL. Attempting to add to video...`);
          setTimeout(() => {
            handleAddToVideo({...component, status: 'ready', outputUrl});
          }, 500);
        }
      }
    } else if (status === 'error' || status === 'failed') {
      console.warn(`[CustomComponentsPanel] Component reported error/failed: id=${componentId}`);
    }
    
    if (isAutoAddEnabled && status === 'complete' && outputUrl && !processedComponents.includes(componentId) && data) {
      const component = data?.find(c => c.id === componentId);
      if (component) {
        handleAddToVideo({...component, status, outputUrl});
        setProcessedComponents(prev => [...prev, componentId]);
      }
    }
  }, [isAutoAddEnabled, processedComponents, data, componentStatuses, fixingComponentId, handleAddToVideo, setComponentStatuses]);

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
      localStorage.setItem(`processed-components-${projectId}`, JSON.stringify(processedComponents));
    }
  }, [processedComponents, projectId]);

  // Restore Mutation definitions here as they were before handleStatusUpdate
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

  const applyFixMutation = api.customComponent.applySyntaxFix.useMutation();
  const confirmFixMutation = api.customComponent.confirmSyntaxFix.useMutation();

  // Restore handler functions here
  const handleFixComponent = useCallback(async (componentId: string) => {
    try {
      setFixingComponentId(componentId);
      const fixData = await applyFixMutation.mutateAsync({ componentId });
      setFeedback({
        message: "Syntax Fix Preview",
        details: (
          <div className="max-h-48 overflow-y-auto">
            <p className="mb-2">Found and fixed {fixData.issues.length} issues:</p>
            <ul className="list-disc pl-4 text-sm">
              {fixData.issues.map((issue: string, index: number) => (
                <li key={index}>{issue}</li>
              ))}
            </ul>
            <div className="mt-4 flex gap-2">
              <Button 
                size="sm" 
                onClick={async () => {
                  setFeedback(null);
                  await confirmFixMutation.mutateAsync({ componentId });
                  setFeedback({
                    message: "Syntax Fix Applied",
                    details: "The component syntax has been fixed and a rebuild has been triggered. Check the status shortly.",
                    type: "success"
                  });
                  await refetch();
                }}
              >
                Apply Fix & Rebuild
              </Button>
              <Button size="sm" variant="outline" onClick={() => setFeedback(null)}>
                Dismiss
              </Button>
            </div>
          </div>
        ),
        type: "info"
      });
    } catch (error: unknown) {
      setFeedback({
        message: "Error",
        details: "Failed to apply syntax fix. Please try again or contact support.",
        type: "error"
      });
      console.error("Failed to apply syntax fix:", error);
    } finally {
      setFixingComponentId(null);
    }
  }, [applyFixMutation, confirmFixMutation, refetch, setFeedback]);

  const handleRemoveFromVideo = useCallback(async (component: any) => {
    if (!component?.id) {
      console.error("Component data is invalid or missing ID");
      return;
    }
    try {
      const currentProps = getCurrentProps();
      const scenes = currentProps?.scenes || [];
      const componentScenes = scenes.filter(scene => 
        scene.type === "custom" && 
        scene.data?.componentId === component.id
      );
      if (componentScenes.length === 0) {
        console.log(`No scenes found with component ID ${component.id}`);
        setProcessedComponents(prev => prev.filter(id => id !== component.id));
        return;
      }
      const operations: Operation[] = [];
      const sceneIndexes = componentScenes
        .map(scene => scenes.findIndex(s => s.id === scene.id))
        .filter(index => index !== -1)
        .sort((a, b) => b - a);
      sceneIndexes.forEach(index => {
        operations.push({ op: "remove", path: `/scenes/${index}` });
      });
      console.log('[CustomComponentsPanel] Removing component scenes:', operations);
      applyPatch(projectId, operations);
      forceRefresh(projectId);
      console.log(`Removed "${component.effect}" from the timeline.`);
      setProcessedComponents(prev => prev.filter(id => id !== component.id));
    } catch (error) {
      console.error("Error removing component from video:", error);
    }
  }, [projectId, getCurrentProps, applyPatch, forceRefresh, setProcessedComponents]);

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
    renameMutation.mutate({ id: selectedComponent.id, effect: newName });
  };
  
  const handleDeleteConfirm = () => {
    if (!selectedComponent) return;
    deleteMutation.mutate({ id: selectedComponent.id });
  };

  // Query for fixable components - moved before conditional return to avoid hooks order issues
  const { data: fixableComponents, isLoading: isLoadingFixable } = api.customComponent.getFixableComponents.useQuery({
    projectId
  }, {
    // Keep this query enabled
    enabled: true,
  });

  const filteredComponents = useMemo(() => {
    if (!data) return [];
    const results = data.filter(component => 
      component.effect?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    console.log(`[CustomComponentsPanel] Displaying ${results.length} components after applying search query: "${searchQuery}".`);
    return results;
  }, [data, searchQuery]);

  // Debug function to check and repair inconsistent components
  const checkAndFixInconsistentComponents = async () => {
    if (!data) return;
    
    setIsDebugging(true);
    
    try {
      console.log('[DEBUG] Checking for inconsistent components...');
      
      // Find components that are 'ready' but have missing outputUrl
      const inconsistentComponents = data.filter(
        component => (component.status === 'ready' || component.status === 'complete') && !component.outputUrl
      );
      
      if (inconsistentComponents.length === 0) {
        console.log('[DEBUG] No inconsistent components found.');
        setFeedback({
          type: 'info',
          message: 'Debug Complete',
          details: 'No inconsistent components found. All components look good!',
        });
        setIsDebugging(false); // Ensure debugging state is reset
        return;
      }
      
      console.log(`[DEBUG] Found ${inconsistentComponents.length} inconsistent components:`, 
        inconsistentComponents.map(c => `${c.effect} (${c.id})`));
      
      // Automatic fix - no confirmation needed
      setFeedback({
        type: 'info',
        message: 'Fixing Components',
        details: `Found ${inconsistentComponents.length} components that need rebuilding. Fixing now...`,
      });
      
      // Reset all inconsistent components to pending status
      let fixedCount = 0;
      for (const component of inconsistentComponents) {
        console.log(`[DEBUG] Resetting component ${component.id} (${component.effect}) to pending state...`);
        try {
          await retryBuildMutation.mutateAsync({
            componentId: component.id
          });
          fixedCount++;
        } catch (error) {
          console.error(`[DEBUG] Error resetting component ${component.id}:`, error);
        }
      }
      
      setFeedback({
        type: 'success',
        message: 'Debug Complete',
        details: `Reset ${fixedCount} of ${inconsistentComponents.length} components. They will be rebuilt automatically. The component list will refresh in a moment.`,
      });
      
      // Refetch the component list
      await refetch();
    } catch (error) {
      console.error('[DEBUG] Error fixing inconsistent components:', error);
      setFeedback({
        type: 'error',
        message: 'Debug Failed',
        details: 'Failed to reset inconsistent components. See console for details.',
      });
    } finally {
      setIsDebugging(false);
    }
  };

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
              <div className="flex items-center">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={checkAndFixInconsistentComponents}
                  disabled={isDebugging || isLoading}
                  className="h-7 mr-2 text-blue-500 flex items-center"
                  title="Fix all inconsistent components"
                >
                  {isDebugging ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <WrenchIcon className="h-4 w-4 mr-1" />}
                  Fix All Components
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} className="h-7 w-7">
                  {isExpanded ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
                </Button>
              </div>
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

                <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
                  {filteredComponents.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      No components found
                    </div>
                  ) : (
                    filteredComponents.map((component) => {
                      const isCurrentlyAddingThis = addingComponentId === component.id;
                      
                      const currentStatusInfo = componentStatuses[component.id];
                      const liveStatus = currentStatusInfo?.status || component.status;
                      const liveOutputUrl = currentStatusInfo?.outputUrl || component.outputUrl;

                      const isAddButtonDisabled = 
                        isLoading || 
                        !!addingComponentId || 
                        !((liveStatus === 'ready' || liveStatus === 'complete' || liveStatus === 'success')); 

                      return (
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
                            {componentStatuses[component.id]?.status === 'pending' && (
                              <span className="ml-1.5 text-[10px] text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20 px-1 py-0.5 rounded flex items-center">
                                <Loader2 className="h-2 w-2 mr-1 animate-spin" />
                                Rebuilding
                              </span>
                            )}
                          </div>
                          <div className="flex items-center flex-shrink-0 ml-1.5">
                            {(component.status === "error" || component.status === "failed" || component.status === "queued" || componentStatuses[component.id]?.status === "error" || componentStatuses[component.id]?.status === "failed" || componentStatuses[component.id]?.status === "queued") && (
                              <Button 
                                variant="outline"
                                size="sm" 
                                onClick={() => handleFixComponent(component.id)}
                                disabled={fixingComponentId === component.id}
                                className="h-6 px-1.5 text-xs mr-1 border-yellow-500/50 text-yellow-600 hover:bg-yellow-100 dark:border-yellow-600/40 dark:text-yellow-500 dark:hover:bg-yellow-900/20"
                              >
                                {fixingComponentId === component.id ? (
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <WrenchIcon className="h-3 w-3 mr-1" />
                                )}
                                Fix
                              </Button>
                            )}
                            
                            {/* Special action button for components marked as ready but missing outputUrl */}
                            {(component.status === "ready" && !component.outputUrl) && (
                              <Button 
                                variant="outline"
                                size="sm" 
                                onClick={() => handleRebuildComponent(component.id)}
                                disabled={fixingComponentId === component.id}
                                className="h-6 px-1.5 text-xs mr-1 border-blue-500/50 text-blue-600 hover:bg-blue-100 dark:border-blue-600/40 dark:text-blue-500 dark:hover:bg-blue-900/20"
                              >
                                {fixingComponentId === component.id ? (
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                )}
                                Rebuild
                              </Button>
                            )}
                            
                            <Button
                              variant={processedComponents.includes(component.id) ? "destructive" : "outline"}
                              size="sm"
                              className={`px-2 py-1 h-6 text-xs`}
                              onClick={() => {
                                if (processedComponents.includes(component.id)) {
                                  handleRemoveFromVideo(component);
                                } else {
                                  const componentToAdd = {
                                    ...component,
                                    status: liveStatus, // Pass the most current live status
                                    outputUrl: liveOutputUrl, // Pass the most current live output URL
                                  };
                                  handleAddToVideo(componentToAdd);
                                }
                              }}
                              disabled={isAddButtonDisabled}
                            >
                              {processedComponents.includes(component.id) ? (
                                <>
                                  <span className="h-3 w-3 mr-1">-</span> Remove
                                </>
                              ) : (
                                <>
                                  <PlusCircle className="h-3 w-3 mr-1" /> Add
                                </>
                              )}
                            </Button>
                            
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
                      );
                    })
                  )}
                </div>

                  <div className="p-2 border-t border-gray-200 dark:border-gray-700 mt-auto">
                    <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading} className="w-full h-8 text-xs">
                      {isLoading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />} 
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
                isFixing={!!fixingComponentId}
                fixingComponentId={fixingComponentId || ''}
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Feedback Toast */}
        {feedback && (
          <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg max-w-md z-50 ${feedback.type === 'error' ? 'bg-red-500' : feedback.type === 'success' ? 'bg-green-500' : 'bg-blue-500'} text-white`}>
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-medium mb-1">{feedback.message}</h3>
              <button onClick={() => setFeedback(null)} className="text-white hover:text-gray-200">
                <span className="text-xl">×</span>
              </button>
            </div>
            <div className="text-sm">{feedback.details}</div>
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
