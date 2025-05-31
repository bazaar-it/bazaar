//src/app/share/[shareId]/SharePageClient.tsx
"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";

interface SharePageClientProps {
  shareUrl: string;
  video: {
    title?: string | null;
    description?: string | null;
  };
}

export default function SharePageClient({ shareUrl, video }: SharePageClientProps) {
  const [justCopied, setJustCopied] = useState(false);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: video.title || "Amazing video",
          text: video.description || "Check out this awesome video!",
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled share or share failed, fallback to copy
        await copyToClipboard();
      }
    } else {
      await copyToClipboard();
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2 px-4 py-2 text-white/80 hover:text-white transition-colors"
    >
      <Share2 size={16} />
      {justCopied ? "Copied!" : "Share"}
    </button>
  );
}
