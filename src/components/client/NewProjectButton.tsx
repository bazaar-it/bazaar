"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { PlusIcon } from "lucide-react";
import { FormatSelectorModal } from "./FormatSelectorModal";
import { type VideoFormat } from "~/app/projects/new/FormatSelector";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";

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
  const { data: session } = useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<VideoFormat | null>(null);

  // Check for existing projects (for title generation)
  const { data: existingProjects } = api.project.list.useQuery(undefined, {
    enabled: !!session?.user,
  });

  // Create project mutation
  const createProjectMutation = api.project.create.useMutation({
    onSuccess: (result) => {
      console.log(`Created project with format: ${selectedFormat}`);
      setIsModalOpen(false);
      if (onProjectCreated) {
        onProjectCreated(result.projectId);
      }
      router.push(`/projects/${result.projectId}/generate`);
    },
    onError: (error) => {
      console.error("Failed to create project:", error);
      // Try again with a numbered title
      if (error.message.includes('unique constraint') && selectedFormat) {
        handleFormatSelect(selectedFormat);
      }
    }
  });

  const handleCreateProject = () => {
    // Call the onStart callback if provided
    if (onStart) {
      onStart();
    }
    
    // If no session, redirect to login
    if (!session?.user) {
      router.push('/login');
      return;
    }
    
    // Open the format selector modal
    setIsModalOpen(true);
  };

  const handleFormatSelect = async (formatId: VideoFormat) => {
    if (!session?.user) return;
    
    setSelectedFormat(formatId);
    
    // Generate unique title
    let title = "Untitled Video";
    if (existingProjects && existingProjects.length > 0) {
      // Find the highest number
      const numbers = existingProjects
        .map((p: any) => {
          const match = /^Untitled Video (\d+)$/.exec(p.title || '');
          return match && match[1] ? parseInt(match[1], 10) : 0;
        })
        .filter((n: number) => !isNaN(n));
      
      const highestNumber = Math.max(0, ...numbers);
      title = highestNumber === 0 && !existingProjects.some((p: any) => p.title === "Untitled Video") 
        ? "Untitled Video" 
        : `Untitled Video ${highestNumber + 1}`;
    }
    
    // Create project with selected format
    createProjectMutation.mutate({
      format: formatId
    });
  };

  return (
    <>
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
      
      <FormatSelectorModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSelect={handleFormatSelect}
        isCreating={createProjectMutation.isPending}
      />
    </>
  );
} 