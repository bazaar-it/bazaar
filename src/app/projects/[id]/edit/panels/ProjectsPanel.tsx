"use client";

// src/app/projects/[id]/edit/panels/ProjectsPanel.tsx
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Search, FilterIcon } from "lucide-react";
import { Input } from "~/components/ui/input";
import { NewProjectButton } from "~/components/client/NewProjectButton";

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
}

export default function ProjectsPanel({ 
  projects = [], 
  currentProjectId 
}: ProjectsPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "name">("recent");
  const router = useRouter();

  // Filter projects based on search query
  const filteredProjects = projects.filter(project => 
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort projects based on sort option
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    } else {
      // Recent first - assume createdAt is available, fall back to comparison by name
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return 0;
    }
  });

  const handleProjectClick = (projectId: string) => {
    if (projectId !== currentProjectId) {
      router.push(`/projects/${projectId}/edit`);
    }
  };

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">My Projects</h2>
        <NewProjectButton 
          variant="default" 
          size="sm"
          showIcon={true}
          className="h-9 px-3"
          onStart={() => {}}
        />
      </div>

      {/* Search and Filters */}
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search projects..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="relative">
          <select
            className="h-10 rounded-[15px] border border-input bg-background px-8 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "recent" | "name")}
          >
            <option value="recent">Recent</option>
            <option value="name">Name</option>
          </select>
          <FilterIcon className="absolute right-2.5 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Projects Grid */}
      <div className="flex-1 overflow-y-auto">
        {sortedProjects.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {sortedProjects.map((project) => (
              <div
                key={project.id}
                className={`relative cursor-pointer rounded-[15px] overflow-hidden transition-all hover:shadow-md ${
                  project.id === currentProjectId 
                    ? "ring-2 ring-primary ring-offset-2" 
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
                
                {/* Project Info */}
                <div className="p-3 bg-white/90 dark:bg-gray-800">
                  <h3 className="font-medium text-sm truncate">{project.name}</h3>
                  {project.createdAt && (
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center rounded-[15px] bg-gray-50/50">
            {searchQuery ? (
              <>
                <h3 className="mb-1 text-lg font-medium">No matching projects</h3>
                <p className="text-sm text-muted-foreground">
                  Try a different search term or clear your filters.
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setSearchQuery("")}
                >
                  Clear Search
                </Button>
              </>
            ) : (
              <>
                <h3 className="mb-1 text-lg font-medium">No projects yet</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Create your first project to get started.
                </p>
                <NewProjectButton
                  variant="default"
                  size="default"
                  showIcon={true}
                  className="flex items-center gap-1"
                  onStart={() => {}}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
