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
  
  // Check for existing projects (for title generation and smart redirect)
  const { data: existingProjects, isLoading: projectsLoading } = api.project.list.useQuery(undefined, {
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

    // Wait for projects to load
    if (projectsLoading) return;

    // Smart redirect logic: if user has projects, redirect to latest
    if (existingProjects && existingProjects.length > 0) {
      console.log('[QuickCreate] User has projects, redirecting to latest');
      const latestProject = existingProjects[0]; // Already sorted by updatedAt
      if (latestProject?.id) {
        router.push(`/projects/${latestProject.id}/generate`);
        return;
      }
    }

    // User has no projects, create a new one
    console.log('[QuickCreate] User has no projects, creating new one');
    
    // Don't create if already creating
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
  }, [session, status, router, createProjectMutation, existingProjects, lastFormat, projectsLoading]);

  // Loading state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100">
      <div className="relative">
        {/* Subtle background decoration */}
        <div className="absolute -inset-40 bg-gradient-to-r from-indigo-100/20 via-purple-100/20 to-pink-100/20 blur-3xl opacity-70" />
        
        <div className="relative text-center px-8">
          {/* Modern loader with multiple elements */}
          <div className="relative w-16 h-16 mx-auto mb-8">
            {/* Outer ring */}
            <div className="absolute inset-0 border-2 border-slate-200 rounded-full" />
            
            {/* Spinning gradient ring */}
            <div className="absolute inset-0 border-2 border-transparent border-t-indigo-500 border-r-purple-500 rounded-full animate-spin" />
            
            {/* Inner dot with pulse */}
            <div className="absolute inset-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full animate-pulse" />
            
            {/* Center dot */}
            <div className="absolute inset-6 bg-white rounded-full" />
          </div>
          
          {/* Text content with better typography */}
          <div className="space-y-3 max-w-sm mx-auto">
            <h1 className="text-2xl font-light text-slate-800 tracking-tight">
              {projectsLoading ? "Checking your projects..." : 
               existingProjects && existingProjects.length > 0 ? "Opening your latest project..." :
               "Setting up your canvas"}
            </h1>
            
            {/* Format badge - only show when creating new project */}
            {(!projectsLoading && (!existingProjects || existingProjects.length === 0)) && (
              <div className="flex items-center justify-center gap-2">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-full text-sm">
                  <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d={lastFormat === 'portrait' 
                        ? "M12 18v-5l-4 4m4-4l4 4M8 7h8M6 3h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2z" 
                        : lastFormat === 'square'
                        ? "M4 4h16v16H4z"
                        : "M7 4v16m10-16v16M3 12h18M3 4h18v16H3z"
                      } 
                    />
                  </svg>
                  <span className="text-slate-600 font-medium capitalize">{lastFormat}</span>
                </div>
              </div>
            )}
            
            {/* Progress indicator */}
            <div className="flex items-center justify-center gap-1.5 mt-6">
              <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-pulse" />
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse [animation-delay:200ms]" />
              <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-pulse [animation-delay:400ms]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 