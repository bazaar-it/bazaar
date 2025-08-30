"use client";

import React, { useState } from "react";
import { api } from "~/trpc/react";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Search, Copy, ExternalLink, Music, Clock, Film, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function AdminProjectSearchPage() {
  const router = useRouter();
  const [searchId, setSearchId] = useState("");
  const [expandedMessages, setExpandedMessages] = useState<string | null>(null);

  const { data: project, isLoading, refetch } = api.admin.searchProject.useQuery(
    { projectId: searchId },
    { enabled: searchId.length > 10 }
  );

  const duplicateProject = api.admin.duplicateProject.useMutation({
    onSuccess: (newProject) => {
      toast.success(`Project duplicated! New ID: ${newProject.id}`);
      router.push(`/projects/${newProject.id}/generate`);
    },
    onError: (error) => {
      toast.error(`Failed to duplicate: ${error.message}`);
    },
  });

  const handleSearch = () => {
    if (searchId.trim()) {
      refetch();
    }
  };

  const handleDuplicate = () => {
    if (project) {
      duplicateProject.mutate({ projectId: project.id });
    }
  };

  const handleOpenProject = () => {
    if (project) {
      window.open(`/projects/${project.id}/generate`, '_blank');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Project Search & Management</h1>

      {/* Search Bar */}
      <Card className="p-6 mb-8">
        <div className="flex gap-4">
          <Input
            placeholder="Enter project ID (e.g., 8dc9f430-91ef-4844-bca6-83b33d41b374)"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={!searchId.trim() || isLoading}>
            <Search className="w-4 h-4 mr-2" />
            {isLoading ? "Searching..." : "Search"}
          </Button>
        </div>
      </Card>

      {/* Project Details */}
      {project && (
        <Card className="p-6">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-semibold">{project.name || "Untitled Project"}</h2>
                <p className="text-sm text-muted-foreground mt-1">ID: {project.id}</p>
                <p className="text-sm text-muted-foreground">
                  Created: {formatDistanceToNow(new Date(project.createdAt))} ago
                </p>
                <p className="text-sm text-muted-foreground">
                  User: {project.user?.name || project.user?.email || "Unknown"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleOpenProject} variant="outline">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Project
                </Button>
                <Button onClick={handleDuplicate} disabled={duplicateProject.isPending}>
                  <Copy className="w-4 h-4 mr-2" />
                  {duplicateProject.isPending ? "Duplicating..." : "Duplicate"}
                </Button>
              </div>
            </div>

            {/* Project Stats */}
            <div className="grid grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Film className="w-4 h-4" />
                  <span>Scenes</span>
                </div>
                <p className="text-2xl font-bold">{project.scenes?.length || 0}</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MessageSquare className="w-4 h-4" />
                  <span>Messages</span>
                </div>
                <p className="text-2xl font-bold">{project.messages?.length || 0}</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Total Duration</span>
                </div>
                <p className="text-2xl font-bold">
                  {project.scenes?.reduce((acc, scene) => acc + (scene.duration || 0), 0) || 0}s
                </p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Music className="w-4 h-4" />
                  <span>Has Music</span>
                </div>
                <p className="text-2xl font-bold">
                  {project.music ? "Yes" : "No"}
                </p>
              </Card>
            </div>

            {/* Scenes */}
            {project.scenes && project.scenes.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Scenes ({project.scenes.length})</h3>
                <div className="space-y-3">
                  {project.scenes.map((scene, index) => (
                    <Card key={scene.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium">
                            Scene {index + 1}: {scene.name || "Untitled"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Duration: {scene.duration}s | Order: {scene.order}
                          </p>
                          {scene.tsxCode && (
                            <details className="mt-2">
                              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                                View Code ({scene.tsxCode.length} characters)
                              </summary>
                              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                                <code>{scene.tsxCode.substring(0, 500)}...</code>
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {project.messages && project.messages.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">
                  Chat Messages ({project.messages.length})
                </h3>
                <Button
                  onClick={() => setExpandedMessages(expandedMessages ? null : project.id)}
                  variant="outline"
                  size="sm"
                  className="mb-3"
                >
                  {expandedMessages ? "Collapse" : "Expand"} Messages
                </Button>
                {expandedMessages && (
                  <ScrollArea className="h-96 border rounded-lg p-4">
                    <div className="space-y-3">
                      {project.messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`p-3 rounded-lg ${
                            msg.role === "user" ? "bg-primary/10" : "bg-muted"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium capitalize">{msg.role}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(msg.createdAt))} ago
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}

            {/* Music */}
            {project.music && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Music</h3>
                <Card className="p-4">
                  <audio controls className="w-full">
                    <source src={project.music.url} type="audio/mpeg" />
                  </audio>
                  <p className="text-sm text-muted-foreground mt-2">
                    {project.music.name || "Background Music"}
                  </p>
                </Card>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}