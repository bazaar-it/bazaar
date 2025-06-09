"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { Input } from "~/components/ui/input";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "~/components/ui/dialog";
import { SearchIcon, FolderIcon, Loader2, X } from "lucide-react";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";
import { Player } from "@remotion/player";
import { transform } from "sucrase";
import { toast } from "sonner";

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
  props: any;
};

// Project thumbnail showing static frame 15
const ProjectThumbnail = ({ project }: { project: Project }) => {
  // ✅ HOOKS FIRST - Call all hooks before any conditional logic
  const { data: scenes, isLoading, error } = api.generation.getProjectScenes.useQuery(
    { projectId: project.id },
    { 
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      retry: 1,
    }
  );
  
  const { component, isCompiling, compilationError, playerProps } = useCompiledProject(scenes || []);

  // ✅ CONDITIONAL LOGIC AFTER HOOKS
  if (error) {
    return (
      <div className="w-full h-full bg-gray-100 border-2 border-dashed border-gray-300 rounded overflow-hidden flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-sm font-medium">Error Loading</div>
          <div className="text-gray-500 text-xs mt-1">Could not load project</div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full h-full bg-gray-100 border-2 border-dashed border-gray-300 rounded overflow-hidden flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400 mx-auto mb-2" />
          <div className="text-gray-500 text-sm">Loading...</div>
        </div>
      </div>
    );
  }

  if (!scenes || scenes.length === 0) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-200 rounded overflow-hidden flex items-center justify-center">
        <div className="text-center p-4">
          <FolderIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <div className="text-gray-500 text-sm font-medium">Empty Project</div>
          <div className="text-gray-400 text-xs mt-1">No scenes yet</div>
        </div>
      </div>
    );
  }

  if (compilationError) {
    return (
      <div className="w-full h-full bg-orange-50 border-2 border-dashed border-orange-200 rounded overflow-hidden flex items-center justify-center">
        <div className="text-center">
          <div className="text-orange-600 text-sm font-medium">Scene Error</div>
          <div className="text-orange-500 text-xs mt-1">Failed to compile</div>
        </div>
      </div>
    );
  }

  if (isCompiling || !component || !playerProps) {
    return (
      <div className="w-full h-full bg-blue-50 border-2 border-dashed border-blue-200 rounded overflow-hidden flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-6 w-6 animate-spin text-blue-400 mx-auto mb-2" />
          <div className="text-blue-600 text-sm">Compiling...</div>
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
const ProjectVideoPlayer = ({ project }: { project: Project }) => {
  // ✅ HOOKS FIRST - Call all hooks before any conditional logic
  const { data: scenes, isLoading, error } = api.generation.getProjectScenes.useQuery(
    { projectId: project.id },
    { 
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      retry: 1,
    }
  );
  
  const { component, isCompiling, compilationError, playerProps } = useCompiledProject(scenes || []);

  // ✅ CONDITIONAL LOGIC AFTER HOOKS
  if (compilationError || isCompiling || !component || !playerProps || error || isLoading || !scenes || scenes.length === 0) {
    // Fall back to thumbnail on error/loading/empty
    return <ProjectThumbnail project={project} />;
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
  onStartEdit,
  editingProject,
  editingValue,
  onEditValueChange,
  onEditKeyPress,
  onEditBlur
}: { 
  project: Project; 
  onClick: () => void;
  isCurrentProject: boolean;
  onDelete: (project: Project) => void;
  onStartEdit: (project: Project, e: React.MouseEvent) => void;
  editingProject: string | null;
  editingValue: string;
  onEditValueChange: (value: string) => void;
  onEditKeyPress: (e: React.KeyboardEvent) => void;
  onEditBlur: () => void;
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the onClick for navigation
    onDelete(project);
  }, [project, onDelete]);

  return (
    <div className="relative">
      <div 
        className={`relative w-full aspect-video bg-black rounded overflow-hidden cursor-pointer transition-all duration-200 group ${
          isCurrentProject ? 'ring-2 ring-blue-500 ring-offset-2' : ''
        }`}
        onClick={(e) => {
          // Only allow navigation if we're not currently editing this project's title
          if (editingProject !== project.id) {
            onClick();
          }
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Delete button - only visible on hover */}
        {isHovered && (
          <div className="absolute top-2 left-2 z-20">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 bg-red-500/80 hover:bg-red-600 text-white rounded-full transition-all duration-200"
              onClick={handleDeleteClick}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
        
        {/* Show static frame by default, playing video on hover */}
        {isHovered ? (
          <ProjectVideoPlayer project={project} />
        ) : (
          <ProjectThumbnail project={project} />
        )}
        
        {/* Current project badge */}
        {isCurrentProject && (
          <div className="absolute top-2 right-2 z-10">
            <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-medium">
              Current Project
            </div>
          </div>
        )}

        {/* Project name overlay - only visible on hover */}
        {isHovered && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 z-10">
            <div className="text-white text-sm font-medium">
              {editingProject === project.id ? (
                <input
                  type="text"
                  value={editingValue}
                  onChange={(e) => onEditValueChange(e.target.value)}
                  onKeyDown={onEditKeyPress}
                  onBlur={onEditBlur}
                  autoFocus
                  className="bg-transparent border-none outline-none text-white text-sm font-medium w-full p-0 m-0"
                  style={{ background: 'transparent' }}
                />
              ) : (
                <span
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // Force immediate edit mode without any navigation
                    onStartEdit(project, e);
                    return false;
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  style={{ pointerEvents: 'auto' }}
                  className="cursor-text hover:bg-white/10 rounded px-1 -mx-1 transition-colors relative z-30"
                >
                  {project.title}
                </span>
              )}
            </div>
            <div className="text-gray-300 text-xs mt-1">
              {new Date(project.updatedAt || '').toLocaleDateString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Project compilation hook - compiles TSX from database scenes
const useCompiledProject = (scenes: any[]) => {
  const [component, setComponent] = useState<React.ComponentType<any> | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compilationError, setCompilationError] = useState<string | null>(null);

  React.useEffect(() => {
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

    try {
      // Transform TSX to JavaScript using Sucrase
      const transformedCode = transform(firstScene.tsxCode, {
        transforms: ['typescript', 'jsx'],
      }).code;

      // Create a blob URL for the component
      const blob = new Blob([transformedCode], { type: 'application/javascript' });
      const blobUrl = URL.createObjectURL(blob);

      // Dynamically import the component
      import(/* webpackIgnore: true */ blobUrl)
        .then((module) => {
          setComponent(() => module.default);
          setIsCompiling(false);
          URL.revokeObjectURL(blobUrl); // Clean up
        })
        .catch((error) => {
          console.error('Failed to compile project scene:', error);
          setCompilationError(error.message);
          setIsCompiling(false);
          URL.revokeObjectURL(blobUrl); // Clean up
        });
    } catch (error) {
      console.error('Failed to transform TSX:', error);
      setCompilationError(error instanceof Error ? error.message : 'Transform failed');
      setIsCompiling(false);
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
  const [isCreatingNewProject, setIsCreatingNewProject] = useState(false);
  const router = useRouter();
  
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
          // No projects left, redirect directly to create new project page
          setIsCreatingNewProject(true);
          router.push('/projects/new');
          
          // Invalidate cache after a short delay to ensure the new project appears in the list
          setTimeout(async () => {
            await utils.project.list.invalidate();
          }, 1000);
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
    
    // Filter by search query
    let filtered = projects;
    if (searchQuery.trim()) {
      filtered = projects.filter(project =>
        project.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Sort: current project first, then by updated date
    return filtered.sort((a, b) => {
      // Current project always first
      if (a.id === currentProjectId) return -1;
      if (b.id === currentProjectId) return 1;
      
      // Then by updated date (newest first)
      return new Date(b.updatedAt || '').getTime() - new Date(a.updatedAt || '').getTime();
    });
  }, [projects, searchQuery, currentProjectId]);

  // Handle project navigation
  const handleProjectClick = useCallback((projectId: string) => {
    if (projectId !== currentProjectId) {
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

      {/* Projects Grid */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400 mx-auto mb-2" />
              <div className="text-gray-500 text-sm">Loading projects...</div>
            </div>
          </div>
        ) : isCreatingNewProject ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500 mx-auto mb-2" />
              <div className="text-blue-600 text-sm font-medium">Creating new project...</div>
            </div>
          </div>
        ) : (
          <div 
            className="grid gap-3"
            style={{
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'
            }}
          >
            {filteredAndSortedProjects.map((project) => (
              <Card key={`project-${project.id}`} className="overflow-hidden hover:shadow-lg transition-shadow p-0">
                <ProjectPreview 
                  project={project} 
                  onClick={() => handleProjectClick(project.id)}
                  isCurrentProject={project.id === currentProjectId}
                  onDelete={handleDeleteProject}
                  onStartEdit={handleStartEdit}
                  editingProject={editingProject}
                  editingValue={editingValue}
                  onEditValueChange={setEditingValue}
                  onEditKeyPress={handleEditKeyPress}
                  onEditBlur={handleSaveEdit}
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