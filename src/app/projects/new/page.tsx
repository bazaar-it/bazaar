// src/app/projects/new/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { FormatSelector, type VideoFormat } from "./FormatSelector";
import { api } from "~/trpc/react";
import { createDefaultProjectProps } from "~/lib/types/video/remotion-constants";

export default function NewProjectPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [selectedFormat, setSelectedFormat] = useState<VideoFormat | null>(null);
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      router.push("/login");
    }
  }, [session, status, router]);

  // Check for existing projects (for title generation)
  const { data: existingProjects } = api.project.list.useQuery(undefined, {
    enabled: !!session?.user,
  });

  // Create project mutation
  const createProjectMutation = api.project.create.useMutation({
    onSuccess: (result) => {
      console.log(`Created project with format: ${selectedFormat}`);
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

  // Loading state
  if (status === "loading" || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }
  
  // Creating project state
  if (createProjectMutation.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Creating project...</div>
      </div>
    );
  }

  // Show format selector
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <FormatSelector 
        onSelect={handleFormatSelect} 
        isCreating={createProjectMutation.isPending}
      />
    </div>
  );
}