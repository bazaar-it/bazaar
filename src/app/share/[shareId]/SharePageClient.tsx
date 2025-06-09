//src/app/share/[shareId]/SharePageClient.tsx
"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Copy, Share2, Check } from "lucide-react";

interface ShareButtonsProps {
  shareUrl: string;
  shareTitle: string;
  shareDescription?: string;
}

export default function ShareButtons({ shareUrl, shareTitle, shareDescription }: ShareButtonsProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareDescription || "Check out this video!",
          url: shareUrl,
        });
      } else {
        // Fallback to copy
        await handleCopy();
      }
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopy}
        className="gap-2"
      >
        {isCopied ? (
          <>
            <Check className="h-4 w-4 text-green-600" />
            Copied!
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" />
            Copy Link
          </>
        )}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleShare}
        className="gap-2"
      >
        <Share2 className="h-4 w-4" />
        Share
      </Button>
    </div>
  );
}
