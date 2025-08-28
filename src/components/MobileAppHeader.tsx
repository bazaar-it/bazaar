"use client";

import Image from "next/image";
import { ShareIcon, Copy, CheckIcon, XIcon, Download, MoreVertical } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { ExportDropdown } from "~/components/export/ExportDropdown";

interface MobileAppHeaderProps {
  projectTitle?: string;
  projectId?: string;
  userId?: string;
  onRename?: (newName: string) => void;
  isRenaming?: boolean;
}

export default function MobileAppHeader({
  projectTitle,
  projectId,
  userId,
  onRename,
  isRenaming = false,
}: MobileAppHeaderProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newTitle, setNewTitle] = useState(projectTitle || "");

  // Check for existing share
  const { data: existingShare } = api.share.getProjectShare.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId }
  );

  // Create share mutation
  const createShare = api.share.createShare.useMutation({
    onSuccess: async (data) => {
      await handleMobileShareSuccess(data.shareUrl, false);
      setIsSharing(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create share link");
      setIsSharing(false);
    },
  });

  // Helper function to handle mobile share success
  const handleMobileShareSuccess = async (shareUrl: string, isExisting: boolean) => {
    // Try to copy to clipboard with fallback for Safari mobile
    try {
      // Check if we have share API (mobile Safari supports this)
      if (navigator.share && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
        await navigator.share({
          title: projectTitle || 'Bazaar Video',
          url: shareUrl
        });
        toast.success("Share completed!");
      } else if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
        toast.success(isExisting ? "Share link copied!" : "Share link created and copied!");
      } else {
        // Fallback for mobile browsers
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
            toast.success(isExisting ? "Share link copied!" : "Share link created and copied!");
          } else {
            // Show URL for manual copy
            toast.info(
              <div className="text-xs">
                <p className="mb-1">Share link {isExisting ? "copied" : "created"}!</p>
                <p className="break-all font-mono text-[10px]">{shareUrl}</p>
              </div>,
              { duration: 10000 }
            );
          }
        } catch (err) {
          toast.info(`Share link: ${shareUrl}`, { duration: 10000 });
        } finally {
          document.body.removeChild(textArea);
        }
      }
    } catch (error) {
      console.error("Failed to share/copy:", error);
      toast.info(`Share link: ${shareUrl}`, { duration: 10000 });
    }

    // Auto-open in new tab for mobile (only if not using native share API)
    if (!navigator.share || !/iPhone|iPad|iPod/.test(navigator.userAgent)) {
      setTimeout(() => {
        window.open(shareUrl, '_blank');
      }, 1000);
    }
  };

  const handleShare = async () => {
    if (!projectId) return;
    
    setIsSharing(true);
    
    // Check if share already exists
    if (existingShare) {
      // Share exists - copy to clipboard and redirect
      await handleMobileShareSuccess(existingShare.shareUrl, true);
      setIsSharing(false);
    } else {
      // Create new share
      createShare.mutate({
        projectId,
        title: projectTitle,
      });
    }
  };

  const handleRenameClick = () => {
    if (onRename && newTitle.trim()) {
      onRename(newTitle);
    }
    setIsEditingName(false);
  };

  return (
    <header className="flex items-center px-3 py-2 w-full bg-white border-b border-gray-200">
      {/* Logo - Fixed width */}
      <div className="w-16">
        <a href="/" className="flex items-center" aria-label="Go to homepage">
          <Image 
            src="/bazaar-logo.png" 
            alt="Bazaar" 
            width={60} 
            height={24} 
            className="object-contain" 
            priority 
          />
        </a>
      </div>

      {/* Center: Project Title (editable on click) - Flex grow and center */}
      <div className="flex-1 flex justify-center px-2">
        {projectTitle && (
          <div className="max-w-[200px]">
            {isEditingName ? (
              <div className="flex items-center gap-1">
              <Input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="h-7 text-xs px-2 font-medium"
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
              <Button 
                type="button" 
                size="icon" 
                variant="ghost" 
                className="h-6 w-6"
                onClick={handleRenameClick} 
                disabled={isRenaming}
              >
                <CheckIcon className="h-3 w-3 text-green-600" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => {
                  setNewTitle(projectTitle || "");
                  setIsEditingName(false);
                }}
                disabled={isRenaming}
              >
                <XIcon className="h-3 w-3 text-red-600" />
              </Button>
            </div>
          ) : (
            <h1 
              className="text-sm font-medium text-gray-900 truncate cursor-pointer hover:text-gray-700"
              onClick={() => {
                setNewTitle(projectTitle);
                setIsEditingName(true);
              }}
            >
              {projectTitle}
            </h1>
          )}
        </div>
      )}

      </div>

      {/* Actions dropdown - Fixed width */}
      <div className="w-16 flex justify-end">
        {projectId && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <ShareIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={handleShare}
                disabled={isSharing}
                className="gap-2"
              >
                <ShareIcon className="h-4 w-4" />
                <span>Share Link</span>
              </DropdownMenuItem>
              <ExportDropdown
                projectId={projectId}
                className="w-full"
              />
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}