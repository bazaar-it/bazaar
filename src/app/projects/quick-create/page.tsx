"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import { useLastUsedFormat } from "~/hooks/use-last-used-format";

export default function QuickCreatePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { lastFormat, updateLastFormat } = useLastUsedFormat();
  
  // Check for existing projects (for title generation)
  const { data: existingProjects } = api.project.list.useQuery(undefined, {
    enabled: !!session?.user,
  });

  // Create project mutation
  const createProjectMutation = api.project.create.useMutation({
    onSuccess: (result) => {
      console.log(`Quick created project with format: ${lastFormat}`);
      updateLastFormat(lastFormat); // Save the format for next time
      router.push(`/projects/${result.projectId}/generate`);
    },
    onError: (error) => {
      console.error("Failed to quick create project:", error);
      // If creation fails, fallback to the regular new project page
      router.push('/projects/new');
    }
  });

  useEffect(() => {
    // Redirect to login if not authenticated
    if (status === "loading") return;
    if (!session?.user) {
      router.push("/login?redirect=/projects/quick-create");
      return;
    }

    // Don't create if already creating or if we have existing projects
    if (createProjectMutation.isPending || createProjectMutation.isSuccess) {
      return;
    }

    // Auto-create project with last used format (defaults to landscape)
    const createProject = async () => {
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
      
      // Create project with last used format (defaults to landscape)
      createProjectMutation.mutate({
        format: lastFormat
      });
    };

    createProject();
  }, [session, status, router, createProjectMutation, existingProjects, lastFormat]);

  // Loading state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-gray-700 mb-2">Creating your project...</h1>
        <p className="text-gray-500">Using {lastFormat} format</p>
      </div>
    </div>
  );
} 