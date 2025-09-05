"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import { useLastUsedFormat } from "~/hooks/use-last-used-format";

export default function QuickCreatePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { lastFormat, updateLastFormat } = useLastUsedFormat();
  const [hasAttemptedCreate, setHasAttemptedCreate] = useState(false);
  const [timeoutReached, setTimeoutReached] = useState(false);
  
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
      // Fallback to home page on error
      setTimeout(() => {
        router.push("/");
      }, 2000);
    }
  });

  // Set a timeout to fallback after 10 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!createProjectMutation.isSuccess) {
        console.log('[QuickCreate] Timeout reached, redirecting to home page');
        setTimeoutReached(true);
        router.push("/");
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, [createProjectMutation.isSuccess, router]);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (status === "loading") return;
    if (!session?.user) {
      router.push("/login?redirect=/projects/quick-create");
      return;
    }

    // Wait for projects to load
    if (projectsLoading) return;

    // Prevent multiple attempts or actions after timeout
    if (hasAttemptedCreate || timeoutReached) return;

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

    // Mark that we've attempted to create
    setHasAttemptedCreate(true);

    // Auto-create project with last used format (defaults to landscape)
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
      format: lastFormat,
      title: title  // Pass the title to avoid undefined
    });
    // Fixed dependencies - using specific mutation state flags instead of the whole object
  }, [session, status, router, createProjectMutation.isPending, createProjectMutation.isSuccess, existingProjects, lastFormat, projectsLoading, hasAttemptedCreate, timeoutReached]);

  // Loading state
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="relative">
        <div className="relative text-center px-8">
          {/* Professional tech-focused loader */}
          <div className="relative w-20 h-20 mx-auto mb-8">
            {/* Binary code animation background */}
            <div className="absolute -inset-8 overflow-hidden opacity-20">
              <div className="text-[10px] font-mono text-white whitespace-nowrap animate-pulse">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-slide-vertical" style={{ animationDelay: `${i * 0.3}s` }}>
                    10110100101011010010101101001010
                  </div>
                ))}
              </div>
            </div>
            
            {/* Main loader - circuit board inspired */}
            <svg className="w-20 h-20" viewBox="0 0 80 80">
              {/* Background circuit paths */}
              <g className="opacity-10">
                <path d="M10 40 L30 40 L40 30 L50 30" stroke="white" strokeWidth="1" fill="none" />
                <path d="M70 40 L50 40 L40 50 L30 50" stroke="white" strokeWidth="1" fill="none" />
                <path d="M40 10 L40 30" stroke="white" strokeWidth="1" fill="none" />
                <path d="M40 50 L40 70" stroke="white" strokeWidth="1" fill="none" />
              </g>
              
              {/* Animated squares - data blocks */}
              <g className="animate-spin" style={{ transformOrigin: '40px 40px', animationDuration: '3s' }}>
                <rect x="35" y="10" width="10" height="10" fill="white" opacity="0.8">
                  <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1.5s" repeatCount="indefinite" />
                </rect>
                <rect x="60" y="35" width="10" height="10" fill="white" opacity="0.6">
                  <animate attributeName="opacity" values="0.6;0.2;0.6" dur="1.5s" repeatCount="indefinite" begin="0.3s" />
                </rect>
                <rect x="35" y="60" width="10" height="10" fill="white" opacity="0.4">
                  <animate attributeName="opacity" values="0.4;0.2;0.4" dur="1.5s" repeatCount="indefinite" begin="0.6s" />
                </rect>
                <rect x="10" y="35" width="10" height="10" fill="white" opacity="0.2">
                  <animate attributeName="opacity" values="0.2;0.8;0.2" dur="1.5s" repeatCount="indefinite" begin="0.9s" />
                </rect>
              </g>
              
              {/* Center core */}
              <g>
                <rect x="35" y="35" width="10" height="10" fill="white" opacity="1">
                  <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" />
                </rect>
                {/* Connection lines */}
                <line x1="40" y1="35" x2="40" y2="20" stroke="white" strokeWidth="0.5" opacity="0.5">
                  <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" />
                </line>
                <line x1="45" y1="40" x2="60" y2="40" stroke="white" strokeWidth="0.5" opacity="0.5">
                  <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" begin="0.5s" />
                </line>
                <line x1="40" y1="45" x2="40" y2="60" stroke="white" strokeWidth="0.5" opacity="0.5">
                  <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" begin="1s" />
                </line>
                <line x1="35" y1="40" x2="20" y2="40" stroke="white" strokeWidth="0.5" opacity="0.5">
                  <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" begin="1.5s" />
                </line>
              </g>
            </svg>
          </div>
          
          {/* Text content with monospace font */}
          <div className="space-y-3 max-w-sm mx-auto">
            <h1 className="text-xl font-mono font-light text-white tracking-wide">
              {projectsLoading ? "INITIALIZING..." : 
               existingProjects && existingProjects.length > 0 ? "LOADING PROJECT..." :
               "CREATING WORKSPACE..."}
            </h1>
            
            {/* Format indicator - tech style */}
            {(!projectsLoading && (!existingProjects || existingProjects.length === 0)) && (
              <div className="flex items-center justify-center gap-2">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/20 rounded text-xs font-mono">
                  <span className="text-white/60">FORMAT:</span>
                  <span className="text-white uppercase">{lastFormat}</span>
                </div>
              </div>
            )}
            
            {/* Progress indicator - terminal style */}
            <div className="flex items-center justify-center gap-1 mt-6 font-mono text-white/40 text-xs">
              <span className="animate-pulse">[</span>
              <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>=</span>
              <span className="animate-pulse" style={{ animationDelay: '0.4s' }}>=</span>
              <span className="animate-pulse" style={{ animationDelay: '0.6s' }}>=</span>
              <span className="animate-pulse" style={{ animationDelay: '0.8s' }}>]</span>
            </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes slide-vertical {
          0% { transform: translateY(0); }
          100% { transform: translateY(-20px); }
        }
      `}</style>
    </div>
  );
} 