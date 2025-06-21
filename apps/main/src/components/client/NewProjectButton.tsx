"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "@bazaar/ui";
import { PlusIcon, Loader2Icon } from "lucide-react";

interface NewProjectButtonProps {
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  showIcon?: boolean;
  onStart?: () => void;
  onProjectCreated?: (projectId: string) => void;
  children?: React.ReactNode; // Allow custom children content
}

export function NewProjectButton({ 
  className, 
  variant = "default", 
  size = "default",
  showIcon = false,
  onStart,
  onProjectCreated,
  children
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
        // Call the onProjectCreated callback if provided (for workspace reset)
        if (onProjectCreated) {
          onProjectCreated(data.projectId);
        }
        
        // Skip the expensive projects list invalidation for better performance
        // The list will be updated when user navigates back to projects page
        
        // Redirect immediately to the generate page for the new project
        router.push(`/projects/${data.projectId}/generate`);
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
      {children ? children : (
        <>
          {showIcon && !isDisabled && <PlusIcon className="h-4 w-4 mr-2" />}
          {showIcon && isDisabled && <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />}
          {isDisabled ? "Creating..." : "New Project"}
        </>
      )}
    </Button>
  );
} 