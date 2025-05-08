"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../../components/ui/tabs";
import { Button } from "~/components/ui/button";
import { Folder, FileText, Upload, Video, Plus, PlusCircle } from "lucide-react";

interface Project {
  id: string;
  name: string;
  // Add other project properties as needed
}

interface LibraryPanelProps {
  projects?: Project[];
  currentProjectId?: string;
}

export default function LibraryPanel({ projects = [], currentProjectId }: LibraryPanelProps) {
  const [activeTab, setActiveTab] = useState("projects");
  const router = useRouter();

  const handleProjectClick = (projectId: string) => {
    if (projectId !== currentProjectId) {
      router.push(`/projects/${projectId}/edit`);
    }
  };

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Library</h2>
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex items-center gap-1"
          onClick={() => router.push("/projects/new")}
        >
          <PlusCircle className="h-4 w-4" />
          <span>New</span>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="projects" className="flex items-center gap-1">
            <Folder className="h-4 w-4" />
            <span>My Projects</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            <span>Templates</span>
          </TabsTrigger>
          <TabsTrigger value="uploads" className="flex items-center gap-1">
            <Upload className="h-4 w-4" />
            <span>My Uploads</span>
          </TabsTrigger>
          <TabsTrigger value="scenes" className="flex items-center gap-1">
            <Video className="h-4 w-4" />
            <span>My Scenes</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="flex-1">
          {projects && projects.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {projects.map((project) => (
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
              ))}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <Folder className="mb-2 h-16 w-16 text-muted-foreground" />
              <h3 className="mb-1 text-lg font-medium">No projects found</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                You haven't created any projects yet.
              </p>
              <Button 
                onClick={() => router.push("/projects/new")} 
                className="flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                <span>Create New Project</span>
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="flex-1">
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <FileText className="mb-2 h-16 w-16 text-muted-foreground" />
            <h3 className="mb-1 text-lg font-medium">Templates Coming Soon</h3>
            <p className="text-sm text-muted-foreground">
              Pre-made templates to help you get started quickly will be available here.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="uploads" className="flex-1">
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <Upload className="mb-2 h-16 w-16 text-muted-foreground" />
            <h3 className="mb-1 text-lg font-medium">No uploads yet</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Upload media files to use in your projects.
            </p>
            <Button className="flex items-center gap-1">
              <Plus className="h-4 w-4" />
              <span>Upload Files</span>
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="scenes" className="flex-1">
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <Video className="mb-2 h-16 w-16 text-muted-foreground" />
            <h3 className="mb-1 text-lg font-medium">No saved scenes</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Create and save reusable scenes for your videos.
            </p>
            <Button className="flex items-center gap-1">
              <Plus className="h-4 w-4" />
              <span>Create Scene</span>
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 