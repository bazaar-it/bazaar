"use client";

import Image from "next/image";
import { ShareIcon, Copy } from "lucide-react";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { useState } from "react";

interface MobileAppHeaderProps {
  projectTitle?: string;
  projectId?: string;
}

export default function MobileAppHeader({
  projectTitle,
  projectId,
}: MobileAppHeaderProps) {
  const [isSharing, setIsSharing] = useState(false);

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

  return (
    <header className="flex items-center justify-between px-3 py-2 w-full bg-white border-b border-gray-200">
      {/* Logo */}
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

      {/* Center: Project Title (smaller on mobile) */}
      {projectTitle && (
        <h1 className="text-sm font-medium text-gray-900 truncate max-w-[140px]">
          {projectTitle}
        </h1>
      )}

      {/* Share button */}
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
    </header>
  );
}