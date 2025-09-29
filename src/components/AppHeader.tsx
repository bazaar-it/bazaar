"use client";
// src/components/AppHeader.tsx
import Image from "next/image";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { DownloadIcon, LogOutIcon, CheckIcon, XIcon, ShareIcon, Copy, Loader2, Layers, ChevronDown, FolderIcon } from "lucide-react";
import { signOut } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { PromptUsageDropdown } from "~/components/usage/PromptUsageDropdown";
import { generateCleanFilename } from "~/lib/utils/filename";
import React from "react";
import LiveBadge from "~/components/marketing/LiveBadge";

// Function to generate a consistent color based on the user's name
function stringToColor(string: string) {
  let hash = 0;
  for (let i = 0; i <string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).slice(-2);
  }
  return color;
}

// Avatar component that displays the first letter of the user's name
function UserAvatar({ name }: { name: string }) {
  const firstLetter = name.charAt(0).toUpperCase();
  const color = stringToColor(name);
  
  return (
    <div 
      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold cursor-pointer hover:ring-2 hover:ring-gray-200/60 transition-all shadow-sm"
      style={{ backgroundColor: color }}
    >
      {firstLetter}
    </div>
  );
}

interface AppHeaderProps {
  projectTitle?: string;
  onRename?: (newName: string) => void;
  isRenaming?: boolean;
  onRender?: () => void;
  isRendering?: boolean;
  user?: { name: string; email?: string; isAdmin?: boolean };
  projectId?: string;
  onCreateTemplate?: () => void;
  projects?: { id: string; name: string }[];
  currentProjectId?: string;
  onProjectSwitch?: (projectId: string) => void;
}

export default function AppHeader({
  projectTitle,
  onRename,
  isRenaming = false,
  onRender,
  isRendering = false,
  user,
  projectId,
  onCreateTemplate,
  projects,
  currentProjectId,
  onProjectSwitch,
}: AppHeaderProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [newTitle, setNewTitle] = useState(projectTitle || "");
  const [isSharing, setIsSharing] = useState(false);
  const [renderId, setRenderId] = useState<string | null>(null);
  const [hasDownloaded, setHasDownloaded] = useState(false);
  const currentProjectName = projects?.find((p) => p.id === currentProjectId)?.name;
  const canSwitchProjects = Boolean(onProjectSwitch && projects && projects.length > 0);

  const handleProjectSwitch = React.useCallback((targetId: string) => {
    if (!onProjectSwitch) return;
    onProjectSwitch(targetId);
  }, [onProjectSwitch]);

  // Sync newTitle with projectTitle prop when it changes
  React.useEffect(() => {
    setNewTitle(projectTitle || "");
  }, [projectTitle]);

  // Check for existing share
  const { data: existingShare } = api.share.getProjectShare.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId }
  );

  // Create share mutation
  const createShare = api.share.createShare.useMutation({
    onSuccess: async (data) => {
      // Copy the newly created share link to clipboard
      await handleShareSuccess(data.shareUrl, false);
      setIsSharing(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create share link");
      setIsSharing(false);
    },
  });

  // Helper function to handle share success (both new and existing)
  const handleShareSuccess = async (shareUrl: string, isExisting: boolean) => {
    // Copy to clipboard
    try {
      // Check if we're in a secure context and have clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
        toast.success(isExisting ? "Share link copied to clipboard!" : "Share link created and copied!");
      } else {
        // Fallback method using execCommand
        const textArea = document.createElement("textarea");
        textArea.value = shareUrl;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          const successful = document.execCommand('copy');
          if (successful) {
            toast.success(isExisting ? "Share link copied to clipboard!" : "Share link created and copied!");
          } else {
            // Show the URL in a toast with a copy button for Safari
            toast.info(
              <div className="flex flex-col gap-2">
                <p>Share link {isExisting ? "copied" : "created"}!</p>
                <div className="flex items-center gap-2">
                  <input 
                    value={shareUrl} 
                    readOnly 
                    className="text-xs bg-gray-100 px-2 py-1 rounded flex-1"
                    onClick={(e) => e.currentTarget.select()}
                  />
                  <button 
                    onClick={() => {
                      const input = document.querySelector<HTMLInputElement>('.sonner-toast input');
                      if (input) {
                        input.select();
                        document.execCommand('copy');
                        toast.success("Copied!");
                      }
                    }}
                    className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                  >
                    Copy
                  </button>
                </div>
              </div>,
              { duration: 10000 }
            );
          }
        } catch (err) {
          console.error("execCommand copy failed:", err);
          // Show URL in toast as final fallback
          toast.info(`Share link: ${shareUrl}`, { duration: 10000 });
        } finally {
          document.body.removeChild(textArea);
        }
      }
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      // Show URL in toast as fallback
      toast.info(`Share link: ${shareUrl}`, { duration: 10000 });
    }

  };

  // Export/render mutations
  const startRender = api.render.startRender.useMutation({
    onSuccess: (data) => {
      setRenderId(data.renderId);
      toast.info("Render started! This may take a few minutes...");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const { data: renderStatus } = api.render.getRenderStatus.useQuery(
    { renderId: renderId! },
    {
      enabled: !!renderId,
      refetchInterval: (query) => {
        const data = query.state.data;
        if (data?.status === 'completed' || data?.status === 'failed') {
          return false;
        }
        return 1000;
      },
    }
  );

  const buildSupportEmail = () => {
    const issues = (renderStatus as any)?.warnings as Array<{ type: string; message: string; sceneId?: string; data?: any }> | undefined;
    const lines: string[] = [];
    lines.push(`Subject: Export failed on project "${projectTitle || ''}"`);
    lines.push("");
    lines.push(`Hi Markus,`);
    lines.push("");
    lines.push(`An export failed.`);
    lines.push(`- Project: ${projectTitle || ''}`);
    lines.push(`- Render ID: ${renderId ?? 'unknown'}`);
    lines.push(`- Error: ${renderStatus?.error ?? 'Unknown error'}`);
    if (issues && issues.length > 0) {
      lines.push("- Issues:");
      for (const w of issues) {
        const scenePart = w.sceneId ? ` [scene ${w.sceneId}]` : "";
        lines.push(`  • ${w.type}${scenePart}: ${w.message}`);
      }
    }
    lines.push("");
    lines.push("If helpful, I can try a different element to avoid the failing one.");
    lines.push("Thanks!");
    return lines.join("\n");
  };

  // Handle export completion - auto-download
  React.useEffect(() => {
    if (renderStatus?.status === 'completed' && renderId && renderStatus.outputUrl && !hasDownloaded) {
      setHasDownloaded(true);
      toast.success('Render complete! Starting download...');
      
      // Auto-download after a short delay
      setTimeout(async () => {
        try {
          const response = await fetch(renderStatus.outputUrl!);
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = generateCleanFilename(projectTitle || "video", "1080p", "mp4");
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
          
          // Reset state after successful download
          setTimeout(() => {
            setRenderId(null);
            setHasDownloaded(false);
          }, 1500);
        } catch (error) {
          console.error('Download failed:', error);
          toast.error('Download failed');
        }
      }, 1000);
    }
  }, [renderStatus, renderId, hasDownloaded, projectTitle]);

  const handleShare = async () => {
    if (!projectId) return;
    
    setIsSharing(true);
    
    // Check if share already exists
    if (existingShare) {
      // Share exists - copy to clipboard
      await handleShareSuccess(existingShare.shareUrl, true);
      setIsSharing(false);
    } else {
      // Create new share
      createShare.mutate({
        projectId,
        title: projectTitle,
      });
    }
  };

  const handleDownload = () => {
    if (!projectId || startRender.isPending) return;
    
    // Trigger MP4 export at 1080p (high quality)
    startRender.mutate({
      projectId,
      format: "mp4",
      quality: "high", // 1080p maps to "high"
    });
  };

  React.useEffect(() => {
    // If completed with warnings, show degradation notice with copy-to-email
    if (renderStatus?.status === 'completed' && Array.isArray((renderStatus as any)?.warnings) && (renderStatus as any).warnings.length > 0) {
      const body = buildSupportEmail();
      toast.info(
        <div className="text-xs">
          <div>Export completed, but some elements used fallbacks.</div>
          <div className="mt-1 flex gap-2">
            <button
              className="px-2 py-1 rounded bg-gray-900 text-white"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(body);
                  toast.success('Copied email body for markus@bazaar.it');
                } catch {
                  const params = new URLSearchParams({ subject: `Export degraded: ${projectTitle || ''}`, body });
                  window.location.href = `mailto:markus@bazaar.it?${params.toString()}`;
                }
              }}
            >
              Copy email to markus@bazaar.it
            </button>
          </div>
        </div>,
        { duration: 10000 }
      );
    }
  }, [renderStatus?.status]);

  const handleRenameClick = () => {
    if (onRename && newTitle.trim()) {
      onRename(newTitle.trim());
    }
    setIsEditingName(false);
  };
  
  // Handle user logout
  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: '/' });
  };

  return (
    <header className="flex items-center px-6 py-3 w-full bg-background z-10" style={{ height: 68 }}>
      {/* Left: Logo */}
      <div className="flex items-center flex-shrink-0 gap-3">
        <a href="/" className="flex items-center" aria-label="Go to homepage">
          <Image src="/bazaar-logo.png" alt="Bazaar" width={79} height={30} className="object-contain" priority />
        </a>
        {/* Site-wide Live indicator */}
        <div className="hidden sm:inline-flex">
          <LiveBadge pollMs={60000} />
        </div>
      </div>

      {/* Center: Project Title - Responsive */}
      <div className="flex-1 flex justify-center px-4 min-w-0">
        {projectTitle ? (
          <div className="flex w-full max-w-[320px] flex-col items-center gap-2 min-w-0">
            {isEditingName ? (
              <div className="flex items-center w-full min-w-0 gap-2">
                
                <Input
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="flex-1 min-w-0 max-w-[240px] h-8 text-sm font-medium rounded-[15px] shadow-sm"
                  autoFocus
                  disabled={isRenaming}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleRenameClick();
                    } else if (e.key === 'Escape') {
                      setNewTitle(projectTitle || "");
                      setIsEditingName(false);
                    }
                  }}
                />
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button 
                    type="button" 
                    size="icon" 
                    variant="default" 
                    className="w-6 h-6 bg-green-500 hover:bg-green-600 rounded-[8px] shadow-sm"
                    onClick={handleRenameClick} 
                    disabled={isRenaming}
                  >
                    <CheckIcon className="h-3 w-3 text-white" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="w-6 h-6 rounded-[8px] shadow-sm"
                    onClick={() => {
                      setNewTitle(projectTitle || "");
                      setIsEditingName(false);
                    }}
                    disabled={isRenaming}
                  >
                    <XIcon className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1
                  className={`text-sm font-medium cursor-pointer hover:text-primary truncate min-w-0 ${
                    isRenaming ? 'text-gray-400 pointer-events-none' : ''
                  }`}
                  onClick={() => {
                    setNewTitle(projectTitle);
                    setIsEditingName(true);
                  }}
                  title={currentProjectName || projectTitle}
                >
                  {isRenaming ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>{newTitle}</span>
                    </div>
                  ) : (
                    projectTitle
                  )}
                </h1>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Right: Share button and User info */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Share button - simplified auto-copy functionality */}
        {projectId && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 rounded-[15px] shadow-sm border-gray-200 text-gray-600 hover:bg-gray-50"
              onClick={handleShare}
              disabled={isSharing}
            >
              {isSharing ? <Copy className="h-4 w-4 animate-pulse" /> : <ShareIcon className="h-4 w-4" />}
              {isSharing ? "Copied!" : "Share"}
            </Button>
            
            {/* Create Template button - Admin only */}
            {user?.isAdmin && onCreateTemplate && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 rounded-[15px] shadow-sm border-purple-200 text-purple-600 hover:bg-purple-50"
                onClick={onCreateTemplate}
              >
                <Layers className="h-4 w-4" />
                Template
              </Button>
            )}
            
            {/* Download button - MP4 1080p */}
            {(startRender.isPending || !!renderId) && renderStatus ? (
              renderStatus.status === 'failed' ? (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 rounded-[15px] shadow-sm border-red-300 text-red-600"
                    disabled
                  >
                    <XIcon className="h-4 w-4" />
                    Render Failed
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-2 rounded-[15px] shadow-sm"
                    onClick={async () => {
                      const body = buildSupportEmail();
                      try {
                        await navigator.clipboard.writeText(body);
                        toast.success('Copied email body for markus@bazaar.it');
                      } catch {
                        const params = new URLSearchParams({ subject: `Export failed: ${projectTitle || ''}`, body });
                        window.location.href = `mailto:markus@bazaar.it?${params.toString()}`;
                      }
                    }}
                  >
                    <Copy className="h-4 w-4" />
                    Copy email to markus@bazaar.it
                  </Button>
                </div>
              ) : (
                // Rendering state with visual progress bar
                <div className="relative inline-flex overflow-hidden rounded-[15px]">
                  <Button
                    variant="default"
                    size="sm"
                    className="relative gap-2 shadow-sm text-white border-0"
                    style={{
                      backgroundColor: 'rgb(107 114 128)', // gray-500
                    }}
                    disabled
                  >
                    {/* Orange progress fill */}
                    <div 
                      className="absolute left-0 top-0 bottom-0 bg-orange-500"
                      style={{
                        width: `${renderStatus.progress || 0}%`,
                        transition: 'width 0.5s ease-out',
                        background: 'linear-gradient(90deg, rgb(251 146 60) 0%, rgb(249 115 22) 100%)'
                      }}
                    />
                    
                    {/* Button content - above the progress bar */}
                    <span className="relative z-10 flex items-center">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="ml-2">Rendering {renderStatus.progress || 0}%</span>
                    </span>
                  </Button>
                </div>
              )
            ) : (
              // Default state
              <Button
                variant="default"
                size="sm"
                className="gap-2 rounded-[15px] shadow-sm bg-black hover:bg-gray-800 text-white"
                onClick={handleDownload}
                disabled={startRender.isPending}
              >
                <DownloadIcon className="h-4 w-4" />
                Download
              </Button>
            )}
          </>
        )}
        
        {user && (
          <div className="ml-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="outline-none">
                  <UserAvatar name={user.name || user.email || 'U'} />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-[15px] shadow-sm border-gray-100 overflow-hidden">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user.name}</p>
                  {user.email && (
                    <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
                  )}
                </div>
                <DropdownMenuSeparator />
                <PromptUsageDropdown />
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="text-red-600 cursor-pointer"
                >
                  <LogOutIcon className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </header>
  );
}
