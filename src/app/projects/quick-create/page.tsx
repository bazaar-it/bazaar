"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import { useLastUsedFormat } from "~/hooks/use-last-used-format";

export default function QuickCreatePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { lastFormat } = useLastUsedFormat({ enableRemoteFallback: false });
  const hasRedirectedRef = useRef(false);
  const redirectTargetRef = useRef<string | null>(null);
  const pruneScheduledRef = useRef(false);
  const [cachedProjectId, setCachedProjectId] = useState<string | null>(null);
  const [isCacheLoaded, setIsCacheLoaded] = useState(false);
  
  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsCacheLoaded(true);
      return;
    }
    try {
      const stored = window.localStorage.getItem("lastProjectId");
      setCachedProjectId(stored && stored.length > 0 ? stored : null);
    } catch (error) {
      console.warn('[QuickCreate] Failed to read lastProjectId from localStorage:', error);
      setCachedProjectId(null);
    } finally {
      setIsCacheLoaded(true);
    }
  }, []);

  // Create project mutation
  const createProjectMutation = api.project.create.useMutation({
    onSuccess: (result) => {
      console.log(`[QuickCreate] Project created, redirecting to: /projects/${result.projectId}/generate`);
      redirectTo(result.projectId, 'created');
    },
    onError: (error) => {
      console.error("[QuickCreate] Failed to create project:", error);
      // Fallback to home page on error
      router.push("/");
    }
  });
  const pruneMutation = api.project.pruneEmpty.useMutation();
  const latestIdQuery = api.project.getLatestId.useQuery(undefined, {
    enabled: status === 'authenticated',
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const redirectTo = useCallback((projectId: string, reason: 'cached' | 'latest' | 'created') => {
    if (!projectId) return;
    if (hasRedirectedRef.current && redirectTargetRef.current === projectId) return;

    hasRedirectedRef.current = true;
    redirectTargetRef.current = projectId;

    const path = `/projects/${projectId}/generate`;
    const method = reason === 'created' ? router.push : router.replace;
    console.log(`[QuickCreate] Redirecting (${reason}) to: ${path}`);
    method(path);

    if (!pruneScheduledRef.current) {
      pruneScheduledRef.current = true;
      queueMicrotask(() => {
        // Run prune in background after navigation is triggered
        pruneMutation.mutate(undefined, { onError: (err) => console.warn('[QuickCreate] pruneEmpty failed:', err) });
      });
    }
  }, [router, pruneMutation]);

  // (Optional) We no longer rely on lastProjectId for speed — prefer latestId fast path.

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

    if (!isCacheLoaded) {
      return;
    }

    // 3. If we already redirected (cached or mutation), nothing else to do
    if (hasRedirectedRef.current) {
      return;
    }

    // 4. Cached project wins for instant redirect
    if (cachedProjectId) {
      redirectTo(cachedProjectId, 'cached');
      return;
    }

    // 5. If server responded with a latest project, redirect there
    if (latestIdQuery.data) {
      redirectTo(latestIdQuery.data, 'latest');
      return;
    }

    // 6. If the query finished and there is no existing project, create one now
    if (latestIdQuery.status === 'success' && !latestIdQuery.data && !createProjectMutation.isPending) {
      console.log('[QuickCreate] No existing project found, creating new with format:', lastFormat);
      createProjectMutation.mutate({ format: lastFormat });
      return;
    }

    // 7. Handle query errors by creating a new project (best effort)
    if (latestIdQuery.status === 'error' && !createProjectMutation.isPending) {
      console.warn('[QuickCreate] Failed to load latest project, creating new. Error:', latestIdQuery.error);
      createProjectMutation.mutate({ format: lastFormat });
    }
  }, [status, session, cachedProjectId, isCacheLoaded, latestIdQuery.data, latestIdQuery.status, createProjectMutation.isPending, lastFormat, redirectTo]);

  // If we redirected based on cache and later receive a different latest ID, swap targets
  useEffect(() => {
    if (!latestIdQuery.data) return;
    if (!hasRedirectedRef.current) return;
    if (redirectTargetRef.current === latestIdQuery.data) return;

    redirectTo(latestIdQuery.data, 'latest');
  }, [latestIdQuery.data]);

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
