"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "~/trpc/react";

export function NewProjectButton() {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  // Setup mutation for creating a new project
  const utils = api.useUtils();
  
  const createProject = api.project.create.useMutation({
    onSuccess: async (data) => {
      // Set redirecting state to prevent multiple clicks
      setIsRedirecting(true);
      
      try {
        // Invalidate the projects list query to refetch it
        await utils.project.list.invalidate();
        
        // Redirect to the editor page for the new project
        router.push(`/projects/${data.projectId}/edit`);
      } catch (error) {
        console.error("Error after project creation:", error);
        setIsRedirecting(false);
      }
    },
    onError: (error) => {
      // Handle error
      console.error("Failed to create project:", error);
      setIsRedirecting(false);
    },
  });

  const handleCreateProject = () => {
    if (createProject.isPending || isRedirecting) return;
    createProject.mutate();
  };

  // Disable button during any pending state or when redirecting
  const isDisabled = createProject.isPending || isRedirecting;

  return (
    <button
      onClick={handleCreateProject}
      disabled={isDisabled}
      className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded disabled:bg-blue-300"
    >
      {isDisabled ? "Creating..." : "Create New Project"}
    </button>
  );
} 