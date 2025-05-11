"use client";

// src/app/projects/[id]/edit/panels/ProjectsPanel.tsx
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { MoreVertical, Trash } from "lucide-react";
import { useState } from "react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "~/components/ui/dropdown-menu";

interface Project {
  id: string;
  name: string;
  createdAt?: string;
  thumbnail?: string;
  // Add other project properties as needed
}

interface ProjectsPanelProps {
  projects?: Project[];
  currentProjectId?: string;
  onDeleteProject?: (projectId: string) => Promise<void>; // Optional callback for deleting projects
}

export default function ProjectsPanel({ 
  projects = [], 
  currentProjectId,
  onDeleteProject 
}: ProjectsPanelProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleProjectClick = (projectId: string) => {
    if (projectId !== currentProjectId) {
      router.push(`/projects/${projectId}/edit`);
    }
  };
  
  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation(); // Prevent project selection
    
    if (!onDeleteProject) {
      console.warn("Delete functionality not provided. Implement onDeleteProject prop to enable deletion.");
      return;
    }
    
    try {
      setIsDeleting(projectId);
      await onDeleteProject(projectId);
      
      // If we're deleting the current project, navigate away
      if (projectId === currentProjectId) {
        router.push('/projects');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="flex h-full flex-col p-4">
      {/* Projects Grid */}
      <div className="flex-1 overflow-y-auto">
        {projects.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {projects.map((project) => (
              <div
                key={project.id}
                className={`relative cursor-pointer rounded-[15px] overflow-hidden transition-all hover:shadow-md ${
                  project.id === currentProjectId 
                    ? "border-2 border-black shadow-md" 
                    : "border border-gray-100 shadow-sm"
                }`}
                onClick={() => handleProjectClick(project.id)}
              >
                {/* Project Thumbnail */}
                <div className="aspect-video w-full bg-gray-50 relative">
                  {project.thumbnail ? (
                    <img
                      src={project.thumbnail}
                      alt={project.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                      <span className="text-xs">No preview</span>
                    </div>
                  )}
                </div>
                
                {/* Project Info with Three Dots Menu */}
                <div className="p-3 bg-white/90 dark:bg-gray-800 flex justify-between items-center">
                  <h3 className="font-medium text-sm truncate mr-2">{project.name}</h3>
                  
                  {/* Three Dots Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button 
                        className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
                        onClick={(e) => e.stopPropagation()} // Prevent triggering card click
                      >
                        <MoreVertical className="h-4 w-4 text-gray-500" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem
                        className="text-red-600 hover:text-red-700 focus:text-red-700 cursor-pointer"
                        onClick={(e) => handleDeleteProject(e, project.id)}
                        disabled={isDeleting === project.id}
                      >
                        <Trash className="h-4 w-4 mr-2" />
                        {isDeleting === project.id ? 'Deleting...' : 'Delete'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  {/* Project Date (hidden but preserved) */}
                  {project.createdAt && (
                    <p className="hidden text-xs text-gray-500 mt-1">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center rounded-[15px] bg-gray-50/50">
            <h3 className="mb-1 text-lg font-medium">No projects available</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Projects will appear here when created.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
