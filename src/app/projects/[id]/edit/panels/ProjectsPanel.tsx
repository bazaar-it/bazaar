"use client";

import { useRouter } from "next/navigation";

interface Project {
  id: string;
  name: string;
}

interface ProjectsPanelProps {
  projects: Project[];
  currentProjectId: string;
}

export default function ProjectsPanel({ projects, currentProjectId }: ProjectsPanelProps) {
  const router = useRouter();

  const handleProjectClick = (projectId: string) => {
    if (projectId !== currentProjectId) {
      router.push(`/projects/${projectId}/edit`);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-4">
          {projects && projects.length > 0 ? (
            projects.map((project) => (
              <div
                key={project.id}
                className={`relative cursor-pointer rounded-md overflow-hidden transition-all hover:shadow-md group ${
                  project.id === currentProjectId 
                    ? "ring-2 ring-primary ring-offset-2" 
                    : "border border-gray-200"
                }`}
                onClick={() => handleProjectClick(project.id)}
              >
                {/* Video Preview */}
                <div className="aspect-video w-full bg-black">
                  <video
                    className="w-full h-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                    src={`/api/projects/${project.id}/preview.mp4`}
                    poster={`/api/projects/${project.id}/thumbnail.jpg`}
                  />
                </div>
                
                {/* Hover effect without duplicate title */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                {/* Always visible title area */}
                <div className="p-2 bg-white dark:bg-gray-800">
                  <h3 className="font-medium text-sm truncate">{project.name}</h3>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 text-center py-8 text-muted-foreground bg-muted/20 rounded-lg flex flex-col items-center justify-center">
              <p>No projects found</p>
              <p className="text-xs mt-1">Create a new project using the + button in the sidebar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 