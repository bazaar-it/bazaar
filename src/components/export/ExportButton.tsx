"use client";

import { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Download, Loader2, Check, X, AlertCircle } from "lucide-react";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";

interface ExportButtonProps {
  projectId: string;
  className?: string;
  size?: "default" | "sm" | "lg";
}

export function ExportButton({ projectId, className, size = "sm" }: ExportButtonProps) {
  const [renderId, setRenderId] = useState<string | null>(null);
  
  // Mutations and queries
  const startRender = api.render.startRender.useMutation({
    onSuccess: (data) => {
      setRenderId(data.renderId);
      toast.info("Export started! This may take a few minutes...");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const { data: status, isLoading: statusLoading } = api.render.getRenderStatus.useQuery(
    { renderId: renderId! },
    {
      enabled: !!renderId,
      refetchInterval: (data) => {
        if (data?.status === 'completed' || data?.status === 'failed') {
          return false;
        }
        return 1000; // Poll every second
      },
    }
  );

  // Handle completion and auto-download
  useEffect(() => {
    if (status?.status === 'completed') {
      // Check if we have an output URL (Lambda) or need to download locally
      if (status.outputUrl) {
        toast.success("Export complete! Starting download...");
        
        // Download from S3/Lambda URL
        const link = document.createElement('a');
        link.href = status.outputUrl;
        link.download = `bazaar-vid-${projectId}.mp4`;
        link.target = '_blank'; // Open in new tab for S3 URLs
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Fallback for local render (if implemented later)
        toast.success("Export complete!");
      }
      
      // Reset after a delay
      setTimeout(() => setRenderId(null), 5000);
    } else if (status?.status === 'failed') {
      toast.error(`Export failed: ${status.error || 'Unknown error'}`);
      setTimeout(() => setRenderId(null), 5000);
    }
  }, [status?.status, status?.outputUrl, projectId, status?.error]);

  const handleExport = () => {
    startRender.mutate({ 
      projectId,
      format: 'mp4',
      quality: 'high',
    });
  };

  // Completed state
  if (status?.status === 'completed') {
    return (
      <Button variant="outline" disabled size={size} className={className}>
        <Check className="mr-2 h-4 w-4 text-green-500" />
        Download Started!
      </Button>
    );
  }

  // Failed state
  if (status?.status === 'failed') {
    return (
      <Button variant="outline" disabled size={size} className={className}>
        <X className="mr-2 h-4 w-4 text-red-500" />
        Export Failed
      </Button>
    );
  }

  // Rendering state
  if (renderId && status) {
    const progress = status.progress || 0; // Progress is already 0-100
    const isFFmpegFinalizing = status.isFinalizingFFmpeg;
    
    return (
      <TooltipProvider>
        <Tooltip open={isFFmpegFinalizing}>
          <TooltipTrigger asChild>
            <Button disabled variant="outline" size={size} className={className}>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {status.status === 'rendering' ? (
                <>
                  {progress}%
                  {isFFmpegFinalizing && (
                    <AlertCircle className="ml-1 h-3 w-3" />
                  )}
                </>
              ) : (
                'Starting...'
              )}
            </Button>
          </TooltipTrigger>
          {isFFmpegFinalizing && (
            <TooltipContent side="bottom" className="max-w-[200px]">
              <p className="text-xs">
                FFmpeg is finalizing your video. This may take 30-60 seconds but is normal!
              </p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Default state - ready to export
  return (
    <Button 
      onClick={handleExport} 
      disabled={startRender.isLoading}
      variant="default"
      size={size}
      className={className}
    >
      {startRender.isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Starting...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Export
        </>
      )}
    </Button>
  );
}