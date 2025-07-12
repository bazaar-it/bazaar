"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { PlusIcon, MonitorIcon, SmartphoneIcon, SquareIcon } from "lucide-react";
import { FormatSelectorModal } from "./FormatSelectorModal";
import { type VideoFormat } from "~/app/projects/new/FormatSelector";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import { useLastUsedFormat } from "~/hooks/use-last-used-format";

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
  enableQuickCreate = false,
  disableFormatDropdown = false
}: NewProjectButtonProps = {}) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showFormatOptions, setShowFormatOptions] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<VideoFormat | null>(null);
  const { lastFormat, updateLastFormat } = useLastUsedFormat();
  
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
    // Update the last used format
    updateLastFormat(formatId);
    
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
    
    // Hide format options and create project
    setShowFormatOptions(false);
    setIsModalOpen(false);
    
    // Create project with selected format
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
    
    // Hide dropdown if showing
    setShowFormatOptions(false);
    
    // Create project with last used format (defaults to landscape)
    handleFormatSelect(lastFormat);
  }, [onStart, session?.user, router, lastFormat, handleFormatSelect]);

  // Handle button click
  const handleButtonClick = useCallback(() => {
    // If it was a long press, don't handle the click
    if (isLongPressRef.current) {
      return;
    }
    
    handleQuickCreate();
  }, [handleQuickCreate]);

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

  // Long press handlers for mobile/touch
  const handleMouseDown = useCallback(() => {
    if (!enableQuickCreate || disableFormatDropdown) return;
    
    isLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setShowFormatOptions(true);
    }, 500); // 500ms for long press
  }, [enableQuickCreate, disableFormatDropdown]);

  const handleMouseUp = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    
    // If it wasn't a long press, the mouse up will be handled by onClick
    isLongPressRef.current = false;
  }, []);

  // Touch handlers for mobile
  const handleTouchStart = useCallback(() => {
    if (!enableQuickCreate || disableFormatDropdown) return;
    
    isLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setShowFormatOptions(true);
    }, 500);
  }, [enableQuickCreate, disableFormatDropdown]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    
    // If it wasn't a long press, do quick create
    if (!isLongPressRef.current && enableQuickCreate) {
      handleQuickCreate();
    }
  }, [enableQuickCreate, handleQuickCreate]);

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
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-[180px]"
          style={{
            left: 'calc(4rem + 20px)', // Same as workspace left positioning (4rem sidebar + 10px margin + 10px gap)
            top: 'calc(68px + 10px)', // Header height (68px) + 10px buffer zone = 78px
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
      
      {/* Legacy Modal for non-quick-create usage */}
      {!enableQuickCreate && (
        <FormatSelectorModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          onSelect={handleFormatSelect}
          isCreating={createProjectMutation.isPending}
        />
      )}
    </div>
  );
}