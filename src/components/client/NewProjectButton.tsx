"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { PlusIcon } from "lucide-react";

interface NewProjectButtonProps {
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  showIcon?: boolean;
  onStart?: () => void;
}

export function NewProjectButton({ 
  className, 
  variant = "default", 
  size = "default",
  showIcon = false,
  onStart
}: NewProjectButtonProps = {}) {
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
    
    // Call the onStart callback if provided
    if (onStart) {
      onStart();
    }
    
    createProject.mutate();
  };

  // Disable button during any pending state or when redirecting
  const isDisabled = createProject.isPending || isRedirecting;

  return (
    <Button
      onClick={handleCreateProject}
      disabled={isDisabled}
      variant={variant}
      size={size}
      className={className}
    >
      {showIcon && <PlusIcon className="h-4 w-4 mr-2" />}
      {isDisabled ? "Creating..." : "New Project"}
    </Button>
  );
} 