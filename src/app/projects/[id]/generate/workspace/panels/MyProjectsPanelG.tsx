"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { Input } from "~/components/ui/input";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "~/components/ui/dialog";
import { SearchIcon, FolderIcon, Loader2, X, Heart, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";
import { Player } from "@remotion/player";
import { transform } from "sucrase";
import { toast } from "sonner";

import { useIsTouchDevice } from "~/hooks/use-is-touch";

interface MyProjectsPanelGProps {
  currentProjectId: string;
}

type Project = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date | null;
  userId: string;
  isWelcome: boolean;
  isFavorite: boolean;
  props: any;
};

// Project thumbnail showing static frame 15
const ProjectThumbnail = ({ project, isVisible = true }: { project: Project; isVisible?: boolean }) => {
  // ✅ HOOKS FIRST - Call all hooks before any conditional logic
  const { data: scenes, isLoading, error } = api.generation.getProjectScenes.useQuery(
    { projectId: project.id },
    { 
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      retry: 1,
      enabled: isVisible, // Only fetch when visible (on current page)
    }
  );
  
  const { component, isCompiling, compilationError, playerProps } = useCompiledProject(scenes);

  // ✅ CONDITIONAL LOGIC AFTER HOOKS
  if (error) {
    return (
      <div className="w-full h-full bg-gray-100 border-2 border-dashed border-gray-300 rounded overflow-hidden flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xs sm:text-sm font-medium">Error Loading</div>
          <div className="text-gray-500 text-[10px] sm:text-xs mt-1">Could not load project</div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full h-full bg-gray-100 border-2 border-dashed border-gray-300 rounded overflow-hidden flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-4 sm:h-6 w-4 sm:w-6 animate-spin text-gray-400 mx-auto mb-1 sm:mb-2" />
          <div className="text-gray-500 text-xs sm:text-sm">Loading...</div>
        </div>
      </div>
    );
  }

  if (!scenes || scenes.length === 0) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-200 rounded overflow-hidden flex items-center justify-center">
        <div className="text-center p-2 sm:p-4">
          <FolderIcon className="h-6 sm:h-8 w-6 sm:w-8 text-gray-300 mx-auto mb-1 sm:mb-2" />
          <div className="text-gray-500 text-xs sm:text-sm font-medium">Empty Project</div>
          <div className="text-gray-400 text-[10px] sm:text-xs mt-1">No scenes yet</div>
        </div>
      </div>
    );
  }

  if (compilationError) {
    return (
      <div className="w-full h-full bg-orange-50 border-2 border-dashed border-orange-200 rounded overflow-hidden flex items-center justify-center">
        <div className="text-center">
          <div className="text-orange-600 text-xs sm:text-sm font-medium">Scene Error</div>
          <div className="text-orange-500 text-[10px] sm:text-xs mt-1">Failed to compile</div>
        </div>
      </div>
    );
  }

  if (isCompiling || !component || !playerProps) {
    return (
      <div className="w-full h-full bg-blue-50 border-2 border-dashed border-blue-200 rounded overflow-hidden flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-4 sm:h-6 w-4 sm:w-6 animate-spin text-blue-400 mx-auto mb-1 sm:mb-2" />
          <div className="text-blue-600 text-xs sm:text-sm">Compiling...</div>
        </div>
      </div>
    );
  }

  // Calculate safe initial frame (frame 15 or halfway through if shorter)
  const safeInitialFrame = Math.min(15, Math.floor(playerProps.durationInFrames / 2));

  return (
    <div className="w-full h-full">
      <Player
        component={playerProps.component}
        durationInFrames={playerProps.durationInFrames}
        fps={playerProps.fps}
        compositionWidth={playerProps.compositionWidth}
        compositionHeight={playerProps.compositionHeight}
        controls={false}
        showVolumeControls={false}
        autoPlay={false}
        initialFrame={safeInitialFrame}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

// Project video player for hover state
const ProjectVideoPlayer = ({ project, isVisible = true }: { project: Project; isVisible?: boolean }) => {
  // ✅ HOOKS FIRST - Call all hooks before any conditional logic
  const { data: scenes, isLoading, error } = api.generation.getProjectScenes.useQuery(
    { projectId: project.id },
    { 
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      retry: 1,
      enabled: isVisible, // Only fetch when visible (on current page)
    }
  );
  
  const { component, isCompiling, compilationError, playerProps } = useCompiledProject(scenes);

  // ✅ CONDITIONAL LOGIC AFTER HOOKS
  if (compilationError || isCompiling || !component || !playerProps || error || isLoading || !scenes || scenes.length === 0) {
    // Fall back to thumbnail on error/loading/empty
    return <ProjectThumbnail project={project} isVisible={isVisible} />;
  }

  return (
    <div className="w-full h-full">
      <Player
        component={playerProps.component}
        durationInFrames={playerProps.durationInFrames}
        fps={playerProps.fps}
        compositionWidth={playerProps.compositionWidth}
        compositionHeight={playerProps.compositionHeight}
        controls={false}
        showVolumeControls={false}
        autoPlay={true}
        loop={true}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

// Project preview component with thumbnail/video toggle
const ProjectPreview = ({ 
  project, 
  onClick, 
  isCurrentProject, 
  onDelete,
  onToggleFavorite,
  onStartEdit,
  editingProject,
  editingValue,
  onEditValueChange,
  onEditKeyPress,
  onEditBlur,
  isVisible = true,
  isLoading = false,
  isTouchDevice = false
}: { 
  project: Project; 
  onClick: () => void;
  isCurrentProject: boolean;
  onDelete: (project: Project) => void;
  onToggleFavorite: (project: Project, e: React.MouseEvent) => void;
  onStartEdit: (project: Project, e: React.MouseEvent) => void;
  editingProject: string | null;
  editingValue: string;
  onEditValueChange: (value: string) => void;
  onEditKeyPress: (e: React.KeyboardEvent) => void;
  onEditBlur: () => void;
  isVisible?: boolean;
  isLoading?: boolean;
  isTouchDevice?: boolean;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const previewActive = isTouchDevice ? showPreview : isHovered;
  const shouldLoadScenes = isVisible || previewActive;
  const showChrome = isTouchDevice || isHovered;
  const lastUpdatedLabel = useMemo(() => {
    const source = project.updatedAt ?? project.createdAt;
    try {
      return new Date(source).toLocaleDateString();
    } catch {
      return '';
    }
  }, [project.updatedAt, project.createdAt]);

  const handleMouseEnter = useCallback(() => {
    if (!isTouchDevice) {
      setIsHovered(true);
    }
  }, [isTouchDevice]);

  const handleMouseLeave = useCallback(() => {
    if (!isTouchDevice) {
      setIsHovered(false);
    }
  }, [isTouchDevice]);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(project);
  }, [project, onDelete]);

  const handlePreviewToggle = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setShowPreview((prev) => !prev);
  }, []);

  const handleRenameClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onStartEdit(project, event);
  }, [project, onStartEdit]);

  React.useEffect(() => {
    if (!isTouchDevice && showPreview) {
      setShowPreview(false);
    }
  }, [isTouchDevice, showPreview]);

  React.useEffect(() => {
    setShowPreview(false);
  }, [project.id]);

  return (
    <div className="relative">
      <div
        className={`relative w-full aspect-video bg-black rounded overflow-hidden cursor-pointer transition-all duration-200 ${isCurrentProject ? 'ring-2 ring-orange-400 ring-offset-2' : ''}`}
        onClick={(e) => {
          if (editingProject !== project.id) {
            onClick();
          }
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {showChrome && (
          <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 bg-red-500/80 hover:bg-red-600 text-white rounded-full transition-all duration-200"
              onClick={handleDeleteClick}
            >
              <X className="h-3.5 w-3.5" />
            </Button>

            <div className="flex items-center gap-2">
              {isTouchDevice && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-3"
                  onClick={handlePreviewToggle}
                >
                  {showPreview ? 'Hide preview' : 'Preview'}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className={`h-7 w-7 p-0 rounded-full transition-all duration-200 ${project.isFavorite ? 'bg-pink-500/90 hover:bg-pink-600 text-white' : 'bg-black/50 hover:bg-black/70 text-white'}`}
                onClick={(e) => onToggleFavorite(project, e)}
              >
                <Heart className={`h-3.5 w-3.5 ${project.isFavorite ? 'fill-current' : ''}`} />
              </Button>
            </div>
          </div>
        )}

        <div className="absolute inset-0">
          {previewActive ? (
            <ProjectVideoPlayer project={project} isVisible={shouldLoadScenes} />
          ) : (
            <ProjectThumbnail project={project} isVisible={shouldLoadScenes} />
          )}
        </div>

        {isLoading && (
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm z-30 flex items-center justify-center rounded">
            <div className="bg-white/90 rounded-full p-3 shadow-lg">
              <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
            </div>
          </div>
        )}

        {isCurrentProject && (
          <div className="absolute top-1 sm:top-2 right-1 sm:right-2 z-10">
            <div className="bg-gradient-to-r from-orange-400 to-orange-300 text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full font-medium shadow-sm">
              Current
            </div>
          </div>
        )}

        {showChrome && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 z-10 space-y-2">
            <div className="text-white text-xs sm:text-sm font-medium">
              {editingProject === project.id ? (
                <input
                  type="text"
                  value={editingValue}
                  onChange={(e) => onEditValueChange(e.target.value)}
                  onKeyDown={onEditKeyPress}
                  onBlur={onEditBlur}
                  autoFocus
                  className="bg-transparent border-none outline-none text-white text-xs sm:text-sm font-medium w-full p-0 m-0"
                />
              ) : (
                <span
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onStartEdit(project, e);
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className="cursor-text hover:bg-white/10 rounded px-1 -mx-1 transition-colors"
                >
                  {project.title}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-300">
              {lastUpdatedLabel && <span>Updated {lastUpdatedLabel}</span>}
              {isTouchDevice && editingProject !== project.id && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-3 text-xs"
                  onClick={handleRenameClick}
                >
                  Rename
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Project compilation hook - compiles TSX from database scenes
const useCompiledProject = (scenes: any[] | undefined) => {
  const [component, setComponent] = useState<React.ComponentType<any> | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compilationError, setCompilationError] = useState<string | null>(null);

  React.useEffect(() => {
    // Handle undefined, null, or empty scenes
    if (!scenes || scenes.length === 0) {
      setComponent(null);
      setIsCompiling(false);
      setCompilationError(null);
      return;
    }

    setIsCompiling(true);
    setCompilationError(null);

    // Get the first scene with TSX code
    const firstScene = scenes.find(scene => scene.tsxCode);
    
    if (!firstScene?.tsxCode) {
      setComponent(null);
      setIsCompiling(false);
      setCompilationError("No TSX code found");
      return;
    }

    let blobUrl: string | null = null;
    
    try {
      // Validate TSX code before transformation
      if (typeof firstScene.tsxCode !== 'string' || firstScene.tsxCode.trim().length === 0) {
        throw new Error('Invalid TSX code: empty or non-string');
      }
      
      // Basic security check for potentially dangerous patterns
      const dangerousPatterns = [
        /eval\s*\(/,
        /Function\s*\(/,
        /document\.write/,
        /innerHTML\s*=/,
        /outerHTML\s*=/,
        /script>/i,
        /javascript:/i,
        /vbscript:/i,
        /data:text\/html/i
      ];
      
      if (dangerousPatterns.some(pattern => pattern.test(firstScene.tsxCode))) {
        throw new Error('TSX code contains potentially unsafe patterns');
      }

      // Transform TSX to JavaScript using Sucrase
      const transformedCode = transform(firstScene.tsxCode, {
        transforms: ['typescript', 'jsx'],
      }).code;

      // Create a blob URL for the component with proper MIME type
      const blob = new Blob([transformedCode], { 
        type: 'application/javascript' 
      });
      blobUrl = URL.createObjectURL(blob);

      // Set a timeout for dynamic import to prevent hanging
      const importTimeout = setTimeout(() => {
        if (blobUrl) {
          URL.revokeObjectURL(blobUrl);
          blobUrl = null;
        }
        setCompilationError('Component compilation timed out');
        setIsCompiling(false);
      }, 10000); // 10 second timeout

      // Dynamically import the component with proper error handling
      import(/* webpackIgnore: true */ blobUrl)
        .then((module) => {
          clearTimeout(importTimeout);
          
          if (!module?.default) {
            throw new Error('Component has no default export');
          }
          
          // Validate that the imported module is a React component
          if (typeof module.default !== 'function') {
            throw new Error('Default export is not a React component');
          }
          
          setComponent(() => module.default);
          setIsCompiling(false);
          setCompilationError(null);
          
          // Clean up blob URL
          if (blobUrl) {
            URL.revokeObjectURL(blobUrl);
            blobUrl = null;
          }
        })
        .catch((importError) => {
          clearTimeout(importTimeout);
          console.error('Failed to import compiled component:', importError);
          
          // Provide more specific error messages based on error type
          let errorMessage = 'Failed to compile component';
          
          if (importError.message?.includes('CSP')) {
            errorMessage = 'Component blocked by Content Security Policy';
          } else if (importError.message?.includes('network')) {
            errorMessage = 'Network error during component compilation';
          } else if (importError.message?.includes('syntax')) {
            errorMessage = 'Syntax error in component code';
          } else if (importError.message) {
            errorMessage = `Compilation error: ${importError.message}`;
          }
          
          setCompilationError(errorMessage);
          setIsCompiling(false);
          
          // Ensure blob URL cleanup
          if (blobUrl) {
            URL.revokeObjectURL(blobUrl);
            blobUrl = null;
          }
        });
        
    } catch (transformError) {
      console.error('Failed to transform TSX:', transformError);
      
      // Provide specific error message for transformation failures
      let errorMessage = 'Failed to transform component code';
      if (transformError instanceof Error) {
        if (transformError.message.includes('unsafe patterns')) {
          errorMessage = 'Component contains unsafe code patterns';
        } else if (transformError.message.includes('Invalid TSX')) {
          errorMessage = 'Invalid component code format';
        } else {
          errorMessage = `Transform error: ${transformError.message}`;
        }
      }
      
      setCompilationError(errorMessage);
      setIsCompiling(false);
      
      // Cleanup blob URL if it was created
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        blobUrl = null;
      }
    }
  }, [scenes]);

  // Only return playerProps when component is available
  const playerProps = component ? {
    component,
    durationInFrames: 90, // Default 3 seconds at 30fps
    fps: 30,
    compositionWidth: 1920,
    compositionHeight: 1080,
  } : null;

  return { 
    component, 
    isCompiling, 
    compilationError,
    playerProps
  };
};

// Delete confirmation modal component
const DeleteProjectModal = ({ 
  project, 
  isOpen, 
  onClose, 
  onConfirm,
  isLoading 
}: {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}) => {
  if (!project) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Project</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete <span className="font-semibold">"{project.title}"</span>? 
            This action cannot be undone and will permanently remove all scenes and data associated with this project.
          </p>
        </div>
        
        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function MyProjectsPanelG({ currentProjectId }: MyProjectsPanelGProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingProjectId, setLoadingProjectId] = useState<string | null>(null);
  const projectsPerPage = 10;
  const router = useRouter();
  const isTouchDevice = useIsTouchDevice();
  
  // Fetch all projects
  const { data: projects, isLoading, error } = api.project.list.useQuery();
  
  // Get tRPC utils for cache invalidation
  const utils = api.useUtils();
  
  // Rename project mutation
  const renameProjectMutation = api.project.rename.useMutation({
    onSuccess: async () => {
      // Invalidate projects list to trigger refetch
      await utils.project.list.invalidate();
      setEditingProject(null);
      setEditingValue("");
    },
    onError: (error) => {
      console.error('Rename project failed:', error);
      toast.error(`Failed to rename project: ${error.message}`);
      setEditingProject(null);
      setEditingValue("");
    },
  });
  
  // Toggle favorite mutation
  const toggleFavoriteMutation = api.project.toggleFavorite.useMutation({
    onSuccess: async () => {
      // Invalidate projects list to trigger refetch with new sort order
      await utils.project.list.invalidate();
    },
    onError: (error) => {
      console.error('Toggle favorite failed:', error);
      toast.error(`Failed to update favorite: ${error.message}`);
    },
  });
  
  // Delete project mutation
  const deleteProjectMutation = api.project.delete.useMutation({
    onSuccess: async (result) => {
      toast.success(`Project "${result.deletedProject.title}" deleted successfully`);
      
      // Invalidate projects list to trigger refetch
      await utils.project.list.invalidate();
      
      // If the deleted project is the current project, redirect to another project
      if (result.deletedProject.id === currentProjectId) {
        // Get the updated projects list
        const updatedProjects = await utils.project.list.fetch();
        
        if (updatedProjects && updatedProjects.length > 0) {
          // Redirect to the first available project
          router.push(`/projects/${updatedProjects[0]!.id}/generate`);
        } else {
          // No projects left, redirect to dashboard or create new project page
          router.push('/dashboard');
        }
      }
      
      // Close the modal
      setIsDeleteModalOpen(false);
      setProjectToDelete(null);
    },
    onError: (error) => {
      console.error('Delete project failed:', error);
      toast.error(`Failed to delete project: ${error.message}`);
    },
  });

  // Filter and sort projects based on search and current project
  const filteredAndSortedProjects = useMemo(() => {
    if (!projects) return [];
    
    // Memoize search query normalization to avoid repeated toLowerCase calls
    const normalizedSearchQuery = searchQuery.trim().toLowerCase();
    
    // Pre-filter and sort in a single pass for better performance
    const processed = projects
      .filter(project => {
        // Skip filtering if no search query
        if (!normalizedSearchQuery) return true;
        // Cache the lowercase title to avoid repeated calls
        return project.title.toLowerCase().includes(normalizedSearchQuery);
      })
      .map(project => {
        // Pre-calculate sort keys to avoid repeated Date parsing
        const updatedTime = project.updatedAt ? new Date(project.updatedAt).getTime() : 0;
        const isCurrentProject = project.id === currentProjectId;
        
        return {
          ...project,
          _sortKeys: {
            isCurrentProject,
            isFavorite: project.isFavorite,
            updatedTime
          }
        };
      })
      .sort((a, b) => {
        // Use pre-calculated sort keys for faster comparison
        const aKeys = a._sortKeys;
        const bKeys = b._sortKeys;
        
        // Current project always first
        if (aKeys.isCurrentProject) return -1;
        if (bKeys.isCurrentProject) return 1;
        
        // Then favorites
        if (aKeys.isFavorite && !bKeys.isFavorite) return -1;
        if (!aKeys.isFavorite && bKeys.isFavorite) return 1;
        
        // Then by updated date (newest first)
        return bKeys.updatedTime - aKeys.updatedTime;
      })
      .map(({ _sortKeys, ...project }) => project); // Remove temporary sort keys
    
    return processed;
  }, [projects, searchQuery, currentProjectId]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredAndSortedProjects.length / projectsPerPage);
  const startIndex = (currentPage - 1) * projectsPerPage;
  const endIndex = startIndex + projectsPerPage;
  const paginatedProjects = filteredAndSortedProjects.slice(startIndex, endIndex);

  // Reset to first page when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Clear loading state when currentProjectId changes (successful navigation)
  React.useEffect(() => {
    setLoadingProjectId(null);
  }, [currentProjectId]);

  // Handle project navigation
  const handleProjectClick = useCallback((projectId: string) => {
    if (projectId !== currentProjectId) {
      setLoadingProjectId(projectId);
      router.push(`/projects/${projectId}/generate`);
    }
  }, [currentProjectId, router]);
  
  // Handle delete project
  const handleDeleteProject = useCallback((project: Project) => {
    setProjectToDelete(project);
    setIsDeleteModalOpen(true);
  }, []);
  
  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(() => {
    if (projectToDelete) {
      deleteProjectMutation.mutate({ id: projectToDelete.id });
    }
  }, [projectToDelete, deleteProjectMutation]);
  
  // Handle delete modal close
  const handleDeleteModalClose = useCallback(() => {
    setIsDeleteModalOpen(false);
    setProjectToDelete(null);
  }, []);
  
  // Handle start editing project title
  const handleStartEdit = useCallback((project: Project, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the project click
    setEditingProject(project.id);
    setEditingValue(project.title);
  }, []);
  
  // Handle cancel edit
  const handleCancelEdit = useCallback(() => {
    setEditingProject(null);
    setEditingValue("");
  }, []);
  
  // Handle toggling favorite
  const handleToggleFavorite = useCallback((project: Project, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation
    toggleFavoriteMutation.mutate({ projectId: project.id });
  }, [toggleFavoriteMutation]);
  
  // Handle save edit
  const handleSaveEdit = useCallback(() => {
    if (editingProject && editingValue.trim().length > 0) {
      const newTitle = editingValue.trim();
      // Only save if the title actually changed
      const currentProject = projects?.find(p => p.id === editingProject);
      if (currentProject && newTitle !== currentProject.title) {
        renameProjectMutation.mutate({
          id: editingProject,
          title: newTitle
        });
      } else {
        // No change needed, just exit edit mode
        setEditingProject(null);
        setEditingValue("");
      }
    } else {
      // Empty title, cancel the edit
      setEditingProject(null);
      setEditingValue("");
    }
  }, [editingProject, editingValue, renameProjectMutation, projects]);
  
  // Handle key press in edit input
  const handleEditKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  }, [handleSaveEdit, handleCancelEdit]);
  
  if (error) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-red-500">
            <div className="text-sm font-medium">Failed to load projects</div>
            <div className="text-xs mt-1">Please try again</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Search */}
      <div className="flex-none p-2 border-b">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Projects Grid - Mobile-responsive */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400 mx-auto mb-2" />
              <div className="text-gray-500 text-sm">Loading projects...</div>
            </div>
          </div>
        ) : (
          <div
            className={isTouchDevice ? "flex flex-col gap-3" : "grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]"}
          >
            {paginatedProjects.map((project) => (
              <Card key={`project-${project.id}`} className="overflow-hidden hover:shadow-lg transition-shadow p-0">
                <ProjectPreview 
                  project={project} 
                  onClick={() => handleProjectClick(project.id)}
                  isCurrentProject={project.id === currentProjectId}
                  onDelete={handleDeleteProject}
                  onToggleFavorite={handleToggleFavorite}
                  onStartEdit={handleStartEdit}
                  editingProject={editingProject}
                  editingValue={editingValue}
                  onEditValueChange={setEditingValue}
                  onEditKeyPress={handleEditKeyPress}
                  onEditBlur={handleSaveEdit}
                  isVisible={true} // Projects on current page are visible
                  isLoading={loadingProjectId === project.id}
                  isTouchDevice={isTouchDevice}
                />
              </Card>
            ))}
          </div>
        )}

        {!isLoading && filteredAndSortedProjects.length === 0 && (
          <div className="text-center py-6 text-gray-500">
            <FolderIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No projects found</p>
            {searchQuery && (
              <p className="text-xs mt-1">Try a different search term</p>
            )}
          </div>
        )}
        
        {/* Pagination Controls */}
        {!isLoading && filteredAndSortedProjects.length > projectsPerPage && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t px-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </Button>
            
            <div className="flex items-center gap-1 text-center">
              <span className="text-sm text-gray-600">
                {currentPage}/{totalPages}
              </span>
              <span className="text-xs text-gray-500 hidden sm:inline">
                ({filteredAndSortedProjects.length})
              </span>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      
      {/* Delete confirmation modal */}
      <DeleteProjectModal
        project={projectToDelete}
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteModalClose}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteProjectMutation.isPending}
      />
    </div>
  );
} 
