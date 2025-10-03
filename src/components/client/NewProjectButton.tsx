"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { PlusIcon, MonitorIcon, SmartphoneIcon, SquareIcon } from "lucide-react";
import { type VideoFormat } from "~/lib/types/video/remotion-constants";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import { useLastUsedFormat } from "~/hooks/use-last-used-format";
import { useIsMobile } from "~/hooks/use-breakpoint";

interface NewProjectButtonProps {
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  showIcon?: boolean;
  onStart?: () => void;
  onProjectCreated?: (projectId: string) => void;
  children?: React.ReactNode; // Allow custom children content
  enableQuickCreate?: boolean; // Enable quick create with last format + long press for options
  disableFormatDropdown?: boolean; // Disable format dropdown even with quick create enabled (for landing page)
}

export function NewProjectButton({ 
  className, 
  variant = "default", 
  size = "default",
  showIcon = false,
  onStart,
  onProjectCreated,
  children,
  enableQuickCreate = true,
  disableFormatDropdown = false
}: NewProjectButtonProps = {}) {
  const router = useRouter();
  const { data: session } = useSession();
  const [showFormatOptions, setShowFormatOptions] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<VideoFormat | null>(null);
  const { lastFormat, updateLastFormat } = useLastUsedFormat();
  const isMobile = useIsMobile();
  const [showMobileFormatSheet, setShowMobileFormatSheet] = useState(false);

  // Refs for handling long press and hover
  const buttonRef = useRef<HTMLButtonElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Timeout functions for dropdown
  const clearCloseTimeout = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const setCloseTimeout = useCallback(() => {
    clearCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => {
      setShowFormatOptions(false);
    }, 100);
  }, [clearCloseTimeout]);

  // Check for existing projects (for title generation)
  const { data: existingProjects } = api.project.list.useQuery(undefined, {
    enabled: !!session?.user,
  });

  // Add effect to listen for external close events and cleanup
  useEffect(() => {
    const handleCloseFormatOptions = () => {
      try {
        // Immediately disable pointer events on the overlay to avoid intercepting clicks
        const el = document.getElementById('new-project-format-overlay');
        if (el) {
          (el as HTMLElement).style.pointerEvents = 'none';
        }
      } catch {}
      setShowFormatOptions(false);
    };

    const handleContainerMouseEnter = () => {
      if (enableQuickCreate) {
        clearCloseTimeout();
        setShowFormatOptions(true);
      }
    };

    const handleContainerMouseLeave = () => {
      if (enableQuickCreate) {
        setCloseTimeout();
      }
    };

    if (enableQuickCreate) {
      document.addEventListener('closeFormatDropdown', handleCloseFormatOptions);
      
      // Listen for navigation events to close dropdown
      const handleBeforeUnload = () => setShowFormatOptions(false);
      const handleVisibilityChange = () => {
        if (document.hidden) {
          setShowFormatOptions(false);
        }
      };
      const handleRouteChange = () => setShowFormatOptions(false);
      
      window.addEventListener('beforeunload', handleBeforeUnload);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('popstate', handleRouteChange);
      
      // Listen for events from the sidebar container
      const container = document.querySelector('[data-new-project-container]');
      if (container) {
        container.addEventListener('mouseenter', handleContainerMouseEnter);
        container.addEventListener('mouseleave', handleContainerMouseLeave);
      }
      
      return () => {
        // Cleanup all timeouts
        clearCloseTimeout();
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
        }
        
        document.removeEventListener('closeFormatDropdown', handleCloseFormatOptions);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('popstate', handleRouteChange);
        
        if (container) {
          container.removeEventListener('mouseenter', handleContainerMouseEnter);
          container.removeEventListener('mouseleave', handleContainerMouseLeave);
        }
      };
    }
  }, [enableQuickCreate, clearCloseTimeout, setCloseTimeout]);

  // Create project mutation
  const createProjectMutation = api.project.create.useMutation({
    onSuccess: (result) => {
      console.log(`Created project with format: ${selectedFormat}`);
      console.log(`Navigating to: /projects/${result.projectId}/generate`);
      if (onProjectCreated) {
        onProjectCreated(result.projectId);
      }
      // Use window.location for more reliable navigation
      window.location.href = `/projects/${result.projectId}/generate?onboarding=1`;
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
    
    // Use last format or default to landscape
    handleFormatSelect(lastFormat);
  };

  const handleFormatSelect = async (formatId: VideoFormat) => {
    if (!session?.user) return;
    
    setSelectedFormat(formatId);
    // Update the last used format
    updateLastFormat(formatId);
    
    // Hide format options and create project
    setShowFormatOptions(false);
    
    // Create project with selected format - title is generated server-side
    createProjectMutation.mutate({
      format: formatId
    });
  };

  // Quick create with last used format
  const handleQuickCreate = useCallback(() => {
    // Call the onStart callback if provided
    if (onStart) {
      onStart();
    }
    
    // If no session, redirect to login
    if (!session?.user) {
      router.push('/login');
      return;
    }
    
    const formatParam = (typeof lastFormat === 'string' && ['landscape', 'portrait', 'square'].includes(lastFormat))
      ? (lastFormat as VideoFormat)
      : 'landscape';

    if (isMobile) {
      try {
        sessionStorage.setItem('bazaar:new-project-mobile', '1');
      } catch {}
    }

    router.push(`/projects/new?format=${formatParam}&intent=create`);
  }, [onStart, session?.user, router, isMobile, lastFormat]);

  // Auto-close mobile format sheet when not applicable
  useEffect(() => {
    if (!isMobile || disableFormatDropdown) {
      setShowMobileFormatSheet(false);
    }
  }, [isMobile, disableFormatDropdown]);

  // Handle button click
  const handleButtonClick = useCallback(() => {
    if (isLongPressRef.current) {
      return;
    }

    const shouldShowFormatSelection = !disableFormatDropdown && isMobile;

    if (enableQuickCreate) {
      if (shouldShowFormatSelection) {
        setShowMobileFormatSheet(true);
      } else {
        handleQuickCreate();
      }
    } else {
      if (shouldShowFormatSelection) {
        setShowMobileFormatSheet(true);
      } else {
        handleCreateProject();
      }
    }
  }, [enableQuickCreate, disableFormatDropdown, isMobile, handleQuickCreate, handleCreateProject]);

  // Hover handlers - only trigger when in sidebar context
  const handleMouseEnter = useCallback(() => {
    if (!enableQuickCreate || disableFormatDropdown) return;
    
    // Only show format options if we're in the sidebar context
    const isInSidebar = buttonRef.current?.closest('[data-new-project-container]');
    if (!isInSidebar) return;
    
    clearCloseTimeout();
    setShowFormatOptions(true);
  }, [enableQuickCreate, disableFormatDropdown, clearCloseTimeout]);

  const handleMouseLeave = useCallback(() => {
    if (!enableQuickCreate || disableFormatDropdown) return;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setCloseTimeout();
  }, [enableQuickCreate, disableFormatDropdown, setCloseTimeout]);

  // Long press handlers for desktop only
  const handleMouseDown = useCallback(() => {
    if (!enableQuickCreate || disableFormatDropdown || isMobile) return;
    
    isLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setShowFormatOptions(true);
    }, 500); // 500ms for long press
  }, [enableQuickCreate, disableFormatDropdown, isMobile]);

  const handleMouseUp = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    
    // If it wasn't a long press, the mouse up will be handled by onClick
    isLongPressRef.current = false;
  }, []);

  // Touch handlers for mobile - disabled since we use modal on mobile
  const handleTouchStart = useCallback(() => {
    // Disabled on mobile - we show modal instead
    return;
  }, []);

  const handleTouchEnd = useCallback(() => {
    // Disabled on mobile - we show modal instead
    return;
  }, []);

  // Format options data
  const formatOptions = [
    { id: 'landscape' as VideoFormat, label: 'Landscape', icon: MonitorIcon, subtitle: '16:9' },
    { id: 'portrait' as VideoFormat, label: 'Portrait', icon: SmartphoneIcon, subtitle: '9:16' },
    { id: 'square' as VideoFormat, label: 'Square', icon: SquareIcon, subtitle: '1:1' },
  ];

  return (
    <div className="relative"
      onMouseEnter={enableQuickCreate && !disableFormatDropdown ? handleMouseEnter : undefined}
      onMouseLeave={enableQuickCreate && !disableFormatDropdown ? handleMouseLeave : undefined}
    >
      <Button
        ref={buttonRef}
        onClick={enableQuickCreate ? handleButtonClick : handleCreateProject}
        onMouseDown={enableQuickCreate && !disableFormatDropdown ? handleMouseDown : undefined}
        onMouseUp={enableQuickCreate && !disableFormatDropdown ? handleMouseUp : undefined}
        onTouchStart={enableQuickCreate && !disableFormatDropdown ? handleTouchStart : undefined}
        onTouchEnd={enableQuickCreate && !disableFormatDropdown ? handleTouchEnd : undefined}
        variant={variant}
        size={size}
        className={className}
        disabled={createProjectMutation.isPending}
      >
        {children ? (
          children
        ) : (
          <>
            {showIcon && <PlusIcon className="h-4 w-4 mr-2" />}
            New Project
          </>
        )}
      </Button>
      
      {/* Format Options Dropdown */}
      {enableQuickCreate && !disableFormatDropdown && showFormatOptions && (
        <div 
          id="new-project-format-overlay"
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-[180px]"
          style={{
            left: 'calc(4rem + 20px)',
            top: 'calc(68px + 10px)',
          }}
          onMouseEnter={() => setShowFormatOptions(true)}
          onMouseLeave={() => setShowFormatOptions(false)}
        >
          <div className="p-3">
            <div className="text-xs font-semibold text-gray-700 mb-3 px-1 uppercase tracking-wider">Format:</div>
            {formatOptions.map((format) => {
              const Icon = format.icon;
              const isCurrentFormat = format.id === lastFormat;
              
              return (
                <button
                  key={format.id}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleFormatSelect(format.id);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-all duration-150 ${
                    isCurrentFormat 
                      ? 'bg-blue-500 text-white shadow-sm' 
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                  disabled={createProjectMutation.isPending}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isCurrentFormat ? 'text-white' : 'text-gray-500'}`} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${isCurrentFormat ? 'text-white' : 'text-gray-900'}`}>
                      {format.label}
                    </div>
                    <div className={`text-xs ${isCurrentFormat ? 'text-blue-100' : 'text-gray-500'}`}>{format.subtitle}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isMobile && !disableFormatDropdown && showMobileFormatSheet && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-black/50 backdrop-blur-sm">
          <div className="mt-auto w-full rounded-t-3xl bg-white p-5 pb-8 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Choose format</h2>
              <button
                type="button"
                onClick={() => setShowMobileFormatSheet(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
              >
                <PlusIcon className="h-4 w-4 rotate-45" />
                <span className="sr-only">Close</span>
              </button>
            </div>
            <div className="space-y-2">
              {formatOptions.map((format) => {
                const Icon = format.icon;
                const isCurrentFormat = format.id === lastFormat;
                return (
                  <button
                    key={format.id}
                    onClick={() => handleFormatSelect(format.id)}
                    className={`w-full flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
                      isCurrentFormat ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                    disabled={createProjectMutation.isPending}
                  >
                    <Icon className={`h-5 w-5 ${isCurrentFormat ? 'text-blue-600' : 'text-gray-500'}`} />
                    <div className="flex-1 text-sm font-medium">{format.label}</div>
                    <div className="text-xs text-gray-500">{format.subtitle}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
