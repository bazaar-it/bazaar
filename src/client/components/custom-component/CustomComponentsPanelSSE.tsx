// src/client/components/custom-component/CustomComponentsPanelSSE.tsx
// @ts-nocheck

'use client';

import { useState, useCallback, useMemo } from 'react';
import { api } from '~/trpc/react';
import { ComponentStatusSSE } from './ComponentStatusSSE';
import { useVideoState } from '~/stores/videoState';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '~/components/ui/tabs';
import type { Operation } from 'fast-json-patch';
import {
  BookOpen,
  Check,
  CheckCircle,
  Code,
  Code2,
  Loader2,
  PlusCircle,
  RefreshCw,
  MoreVerticalIcon,
  EditIcon,
  TrashIcon,
  SearchIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '~/components/ui/dropdown-menu';

interface CustomComponentsPanelSSEProps {
  projectId: string;
}

type ComponentStatusMap = Record<string, {
    status?: string;
    outputUrl?: string;
  }>;

/**
 * SSE-based CustomComponentsPanel
 * 
 * Replaces the polling-based components list with SSE for real-time updates.
 */
export function CustomComponentsPanelSSE({ projectId }: CustomComponentsPanelSSEProps) {
  // State for component management
  const [searchTerm, setSearchTerm] = useState('');
  const [componentStatuses, setComponentStatuses] = useState<ComponentStatusMap>({});
  const [selectedComponent, setSelectedComponent] = useState<any | null>(null);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    details?: string;
  } | null>(null);

  // Get current video state for adding to video
  const { getCurrentProps, applyVideoPatch } = useVideoState();

  // Query components, but don't use polling since we'll use SSE for updates
  const { 
    data: componentsList, 
    isLoading: isComponentsLoading, 
    refetch: refetchComponents 
  } = api.customComponent.listAllForUser.useQuery({ 
    successfulOnly: false 
  }, {
    refetchOnWindowFocus: false,
    retry: 3
  });

  // Handle rename and delete mutations
  const renameMutation = api.customComponent.renameComponent.useMutation({
    onSuccess: () => {
      setIsRenameDialogOpen(false);
      setSelectedComponent(null);
      refetchComponents();
      setFeedback({
        type: 'success',
        message: 'Component renamed',
        details: 'The component was successfully renamed.'
      });

      // Clear feedback after 3 seconds
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (error) => {
      setFeedback({
        type: 'error',
        message: 'Failed to rename component',
        details: error.message
      });
    }
  });

  const deleteMutation = api.customComponent.deleteComponent.useMutation({
    onSuccess: () => {
      setIsDeleteDialogOpen(false);
      setSelectedComponent(null);
      refetchComponents();
      setFeedback({
        type: 'success',
        message: 'Component deleted',
        details: 'The component was successfully deleted.'
      });

      // Clear feedback after 3 seconds
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (error) => {
      setFeedback({
        type: 'error',
        message: 'Failed to delete component',
        details: error.message
      });
    }
  });

  // Filter components based on search term
  const filteredComponents = useMemo(() => {
    if (!componentsList) return [];
    
    return componentsList.filter(component => {
      const searchLower = searchTerm.toLowerCase();
      return (
        component.effect.toLowerCase().includes(searchLower) ||
        component.description?.toLowerCase().includes(searchLower)
      );
    });
  }, [componentsList, searchTerm]);

  // Update component status from SSE updates
  const handleStatusChange = useCallback((componentId: string, status: string, outputUrl?: string) => {
    setComponentStatuses(prev => ({
      ...prev,
      [componentId]: {
        status,
        outputUrl
      }
    }));
  }, []);

  // Add component to video
  const handleAddToVideo = useCallback((component: any) => {
    if (!component) return;
    
    // Get the component's output URL
    const outputUrl = component.outputUrl || componentStatuses[component.id]?.outputUrl;
    if (!outputUrl) {
      setFeedback({
        type: 'error',
        message: 'Cannot add component',
        details: 'Component has no output URL'
      });
      return;
    }
    
    // Create operation to add scene to video
    const currentProps = getCurrentProps();
    const operations: Operation[] = [
      {
        op: "add",
        path: "/scenes/-",
        value: {
          id: `component-${component.id}`,
          type: "custom",
          startAt: 0,
          durationInFrames: 150, 
          data: {
            src: outputUrl,
            componentId: component.id,
            name: component.effect
          }
        }
      }
    ];
    
    // Apply the operation
    try {
      applyVideoPatch(projectId, operations);
      setFeedback({
        type: 'success',
        message: 'Component added',
        details: `${component.effect} has been added to the video`
      });
      
      // Clear feedback after 3 seconds
      setTimeout(() => setFeedback(null), 3000);
    } catch (error) {
      console.error("Error adding component to video:", error);
      setFeedback({
        type: 'error',
        message: 'Failed to add component',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, [projectId, componentStatuses, getCurrentProps, applyVideoPatch]);

  // Handle dialog actions
  const handleRenameClick = useCallback((component: any) => {
    setSelectedComponent(component);
    setIsRenameDialogOpen(true);
  }, []);

  const handleDeleteClick = useCallback((component: any) => {
    setSelectedComponent(component);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleRenameSubmit = useCallback((newName: string) => {
    if (!selectedComponent) return;
    renameMutation.mutate({
      id: selectedComponent.id,
      name: newName
    });
  }, [selectedComponent, renameMutation]);

  const handleDeleteConfirm = useCallback(() => {
    if (!selectedComponent) return;
    deleteMutation.mutate({
      id: selectedComponent.id
    });
  }, [selectedComponent, deleteMutation]);

  // Render components list
  const renderComponentsList = useMemo(() => {
    if (isComponentsLoading) {
      return (
        <div className="py-6 flex justify-center">
          <Loader2 className="animate-spin h-5 w-5 text-gray-400" />
        </div>
      );
    }

    if (!filteredComponents?.length) {
      return (
        <div className="py-6 text-center text-gray-500">
          {searchTerm ? 'No components match your search' : 'No components available'}
        </div>
      );
    }

    return filteredComponents.map((component) => (
      <div
        key={component.id}
        className="border-b border-gray-200 dark:border-gray-700 last:border-0 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{component.effect}</div>
              {component.description && (
                <div className="text-xs text-gray-500 truncate">{component.description}</div>
              )}
            </div>
            <ComponentStatusSSE
              componentId={component.id}
              onStatusChange={(status, outputUrl) => handleStatusChange(component.id, status, outputUrl)}
              collapsed
            />
          </div>

          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-500">
              ID: {component.id.substring(0, 8)}...
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => handleAddToVideo(component)}
                disabled={!component.outputUrl && !componentStatuses[component.id]?.outputUrl}
              >
                {!component.outputUrl && !componentStatuses[component.id]?.outputUrl ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Waiting...
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-3 w-3 mr-1" />
                    Add to Video
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
        </div>
      </div>
    ));
  }, [filteredComponents, isComponentsLoading, componentStatuses, searchTerm, handleStatusChange, handleAddToVideo, handleRenameClick, handleDeleteClick]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="font-medium text-gray-900 dark:text-gray-100">Custom Components</h2>
        <p className="text-sm text-gray-500">Add custom components to your video</p>
      </div>

      <div className="relative p-3">
        <SearchIcon className="absolute left-5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          className="pl-8"
          placeholder="Search components..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        <Tabs defaultValue="components" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
            <TabsTrigger
              value="components"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none"
            >
              Components
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="components" className="pt-0 px-0">
            {renderComponentsList}
          </TabsContent>
        </Tabs>
      </div>

      <div className="p-2 border-t border-gray-200 dark:border-gray-700">
        <Button variant="outline" size="sm" onClick={() => refetchComponents()} disabled={isComponentsLoading} className="w-full h-8 text-xs">
          {isComponentsLoading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />} 
          Refresh List
        </Button>
      </div>

      {/* Feedback toast */}
      {feedback && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg max-w-md z-50 ${
          feedback.type === 'error' 
            ? 'bg-red-500' 
            : feedback.type === 'success' 
              ? 'bg-green-500' 
              : 'bg-blue-500'
        } text-white`}>
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-medium mb-1">{feedback.message}</h3>
            <button onClick={() => setFeedback(null)} className="text-white hover:text-gray-200">
              <span className="text-xl">×</span>
            </button>
          </div>
          {feedback.details && <div className="text-sm">{feedback.details}</div>}
        </div>
      )}

      {/* Dialog components */}
      {selectedComponent && (
        <>
          {/* Rename Dialog */}
          {isRenameDialogOpen && (
            <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg max-w-md w-full">
                <h2 className="text-lg font-semibold mb-4">Rename Component</h2>
                <Input
                  className="mb-4"
                  placeholder="Component name"
                  defaultValue={selectedComponent.effect}
                  id="rename-input"
                />
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsRenameDialogOpen(false)} 
                    disabled={renameMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      const input = document.getElementById('rename-input') as HTMLInputElement;
                      handleRenameSubmit(input?.value || '');
                    }}
                    disabled={renameMutation.isPending}
                  >
                    {renameMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 
                        Renaming...
                      </>
                    ) : 'Rename'}
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {/* Delete Dialog */}
          {isDeleteDialogOpen && (
            <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg max-w-md w-full">
                <h2 className="text-lg font-semibold mb-4">Delete Component</h2>
                <p className="mb-4">
                  Are you sure you want to delete "{selectedComponent.effect}"? This action cannot be undone.
                </p>
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsDeleteDialogOpen(false)} 
                    disabled={deleteMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteConfirm}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 
                        Deleting...
                      </>
                    ) : 'Delete'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
