"use client";

import Image from "next/image";
import { ShareIcon, Copy, CheckIcon, XIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { useState } from "react";

interface MobileAppHeaderProps {
  projectTitle?: string;
  projectId?: string;
  onRename?: (newName: string) => void;
  isRenaming?: boolean;
}

export default function MobileAppHeader({
  projectTitle,
  projectId,
  onRename,
  isRenaming = false,
}: MobileAppHeaderProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newTitle, setNewTitle] = useState(projectTitle || "");

  // Create share mutation
  const createShare = api.share.createShare.useMutation({
    onSuccess: async (data) => {
      try {
        await navigator.clipboard.writeText(data.shareUrl);
        toast.success("Share link copied!");
      } catch (error) {
        toast.error("Failed to copy link");
        console.error("Failed to copy to clipboard:", error);
      }
      setIsSharing(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create share link");
      setIsSharing(false);
    },
  });

  const handleShare = () => {
    if (!projectId) return;
    
    setIsSharing(true);
    createShare.mutate({
      projectId,
      title: projectTitle,
    });
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
        <a href="/?view" className="flex items-center" aria-label="Go to homepage">
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

      {/* Share button - Fixed width */}
      <div className="w-16 flex justify-end">
        {projectId && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-xs p-2"
            onClick={handleShare}
            disabled={isSharing}
          >
            {isSharing ? (
              <Copy className="h-4 w-4" />
            ) : (
              <ShareIcon className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">{isSharing ? "Copied!" : "Share"}</span>
          </Button>
        )}
      </div>
    </header>
  );
}