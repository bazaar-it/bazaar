"use client";

import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { PlusIcon } from "lucide-react";

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

  const handleCreateProject = () => {
    // Call the onStart callback if provided
    if (onStart) {
      onStart();
    }
    
    // Redirect to the new project page where users can select format
    router.push('/projects/new');
  };

  return (
    <Button
      onClick={handleCreateProject}
      variant={variant}
      size={size}
      className={className}
    >
      {children ? children : (
        <>
          {showIcon && <PlusIcon className="h-4 w-4 mr-2" />}
          New Project
        </>
      )}
    </Button>
  );
} 