"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import { useLastUsedFormat } from "~/hooks/use-last-used-format";

export default function QuickCreatePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { lastFormat } = useLastUsedFormat();
  const hasRedirectedRef = useRef(false);
  const [storedLastId, setStoredLastId] = useState<string | null>(null);
  
  // Create project mutation
  const createProjectMutation = api.project.create.useMutation({
    onSuccess: (result) => {
      console.log(`[QuickCreate] Project created, redirecting to: /projects/${result.projectId}/generate`);
      router.push(`/projects/${result.projectId}/generate`);
    },
    onError: (error) => {
      console.error("[QuickCreate] Failed to create project:", error);
      // Fallback to home page on error
      router.push("/");
    }
  });
  const pruneMutation = api.project.pruneEmpty.useMutation();
  const listQuery = api.project.list.useQuery(undefined, { enabled: status === 'authenticated' });
  const lastProjectQuery = api.project.getById.useQuery(
    { id: storedLastId || '' },
    { enabled: status === 'authenticated' && !!storedLastId, retry: false }
  );

  // Load lastProjectId from localStorage once
  useEffect(() => {
    try {
      const id = localStorage.getItem('lastProjectId');
      if (id) setStoredLastId(id);
    } catch {}
  }, []);

  useEffect(() => {
    // Simple, direct logic - no complex dependencies
    
    // 1. Wait for auth to load
    if (status === "loading") {
      console.log('[QuickCreate] Waiting for auth...');
      return;
    }
    
    // 2. If not authenticated, redirect to login
    if (!session?.user) {
      console.log('[QuickCreate] No user session, redirecting to login');
      router.push("/login?redirect=/projects/quick-create");
      return;
    }

    // 3. If already creating or created, wait
    if (createProjectMutation.isPending || createProjectMutation.isSuccess) {
      console.log('[QuickCreate] Already creating or created');
      return;
    }

    // 4. Try fast path: validate last opened project before redirecting
    if (storedLastId && !hasRedirectedRef.current) {
      if (lastProjectQuery.isLoading || lastProjectQuery.isFetching) {
        console.log('[QuickCreate] Validating lastProjectId...');
        return; // wait until validated
      }
      if (lastProjectQuery.data?.id) {
        hasRedirectedRef.current = true;
        router.replace(`/projects/${lastProjectQuery.data.id}/generate`);
        return;
      }
      // Not found or error: clear the key and continue to latest/new flow
      try { localStorage.removeItem('lastProjectId'); } catch {}
    }

    // 5. First, prune empty projects in background (non-blocking)
    if (!pruneMutation.isPending && !pruneMutation.isSuccess) {
      pruneMutation.mutate();
    }

    // 6. Wait for projects to load
    if (listQuery.isLoading || listQuery.isFetching) {
      console.log('[QuickCreate] Waiting for projects list...');
      return;
    }

    // 7. If we have projects already, redirect to most recent (list is ordered by updatedAt desc server-side)
    const projects = listQuery.data;
    if (projects && projects.length > 0) {
      const latest = projects[0];
      if (latest?.id && !hasRedirectedRef.current) {
        hasRedirectedRef.current = true;
        router.replace(`/projects/${latest.id}/generate`);
        return;
      }
    }

    // 8. Otherwise, create a new project
    if (!createProjectMutation.isPending && !createProjectMutation.isSuccess) {
      console.log('[QuickCreate] No existing projects found, creating new with format:', lastFormat);
      createProjectMutation.mutate({ format: lastFormat });
    }
  }, [status, session, createProjectMutation.isPending, createProjectMutation.isSuccess, lastFormat, router, listQuery.isLoading, listQuery.isFetching, listQuery.data, pruneMutation.isPending, pruneMutation.isSuccess]);

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
              CREATING WORKSPACE...
            </h1>
            
            {/* Format indicator - tech style */}
            <div className="flex items-center justify-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/20 rounded text-xs font-mono">
                <span className="text-white/60">FORMAT:</span>
                <span className="text-white uppercase">{lastFormat}</span>
              </div>
            </div>
            
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
