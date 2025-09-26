"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useLastUsedFormat } from "~/hooks/use-last-used-format";
import { analytics } from "~/lib/utils/analytics";

const VALID_FORMATS = new Set(["landscape", "portrait", "square"]);

const resolveFormat = (candidate?: string | null) => {
  if (candidate && VALID_FORMATS.has(candidate)) {
    return candidate as "landscape" | "portrait" | "square";
  }
  return "landscape" as const;
};

export default function QuickCreatePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { lastFormat } = useLastUsedFormat({ enableRemoteFallback: false });
  const hasNavigatedRef = useRef(false);

  const displayFormat = resolveFormat(typeof lastFormat === "string" ? lastFormat : undefined);

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (!session?.user) {
      router.push("/login?redirect=/projects/quick-create");
      return;
    }

    if (hasNavigatedRef.current) {
      return;
    }

    hasNavigatedRef.current = true;

    const formatParam = resolveFormat(typeof lastFormat === "string" ? lastFormat : undefined);
    analytics.featureUsed("quick_create_redirect", {
      format: formatParam,
    });

    const params = new URLSearchParams({
      intent: "auto",
      format: formatParam,
    });

    router.replace(`/projects/new?${params.toString()}`);
  }, [status, session?.user, lastFormat, router]);

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
                <span className="text-white uppercase">{displayFormat}</span>
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
