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
import { ExportOptionsModal, type ExportFormat, type ExportQuality } from "./ExportOptionsModal";

interface ExportButtonProps {
  projectId: string;
  className?: string;
  size?: "default" | "sm" | "lg";
}

export function ExportButton({ projectId, className, size = "sm" }: ExportButtonProps) {
  const [renderId, setRenderId] = useState<string | null>(null);
  const [hasDownloaded, setHasDownloaded] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  
  // Mutations and queries
  const startRender = api.render.startRender.useMutation({
    onSuccess: (data) => {
      setRenderId(data.renderId);
      toast.info("Render started! This may take a few minutes...");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const { data: status } = api.render.getRenderStatus.useQuery(
    { renderId: renderId! },
    {
      enabled: !!renderId,
      refetchInterval: (query) => {
        const data = query.state.data;
        console.log('[ExportButton] Status query data:', data);
        if (data?.status === 'completed' || data?.status === 'failed') {
          return false;
        }
        return 1000; // Poll every second
      },
    }
  );
  
  const trackDownload = api.render.trackDownload.useMutation();

  // Handle completion and auto-download
  useEffect(() => {
    console.log('[ExportButton] Status changed:', status);
    
    if (status?.status === 'completed' && !hasDownloaded) {
      // Check if we have an output URL (Lambda) or need to download locally
      if (status.outputUrl) {
        toast.success("Render complete! Starting download...");
        setHasDownloaded(true);
        setDownloadUrl(status.outputUrl);
        
        // Auto-download with improved approach
        try {
          const response = await fetch(status.outputUrl);
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          
          const link = document.createElement('a');
          link.href = blobUrl;
          const extension = status.outputUrl.match(/\.(mp4|gif|webm)$/)?.[1] || 'mp4';
          // Create a cleaner filename with timestamp
          const date = new Date().toISOString().split('T')[0];
          link.download = `video-${date}-${projectId.slice(-6)}.${extension}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Clean up the blob URL after a short delay
          setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        } catch (error) {
          console.log('[ExportButton] Auto-download failed, user can click button:', error);
        }
      } else {
        // Fallback for local render (if implemented later)
        toast.success("Render complete!");
      }
    } else if (status?.status === 'failed') {
      toast.error(`Render failed: ${status.error || 'Unknown error'}`);
      setTimeout(() => {
        setRenderId(null);
        setHasDownloaded(false);
      }, 5000);
    }
  }, [status?.status, status?.outputUrl, projectId, status?.error, renderId, trackDownload, hasDownloaded]);

  const handleExport = (format: ExportFormat, quality: ExportQuality) => {
    setShowExportModal(false);
    startRender.mutate({ 
      projectId,
      format,
      quality,
    });
  };

  const handleExportClick = () => {
    setShowExportModal(true);
  };

  // Completed state - show download button
  if (status?.status === 'completed' || downloadUrl) {
    const handleDownload = async () => {
      if (downloadUrl || status?.outputUrl) {
        const url = downloadUrl || status?.outputUrl!;
        
        // Track the download
        if (renderId) {
          trackDownload.mutate({ renderId });
        }
        
        try {
          // First, try direct download from S3 (if CORS allows)
          console.log('[ExportButton] Attempting direct download from:', url);
          
          const directResponse = await fetch(url, { mode: 'cors' });
          if (directResponse.ok) {
            const blob = await directResponse.blob();
            const blobUrl = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = blobUrl;
            const extension = url.match(/\.(mp4|gif|webm)$/)?.[1] || 'mp4';
            // Use same cleaner filename format
            const date = new Date().toISOString().split('T')[0];
            link.download = `video-${date}-${projectId.slice(-6)}.${extension}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
            toast.success("Download started!");
            return;
          }
        } catch (directError) {
          console.log('[ExportButton] Direct download failed, trying proxy:', directError);
        }
        
        try {
          // Fallback to proxy endpoint
          toast.info("Downloading video...");
          
          const extension = url.match(/\.(mp4|gif|webm)$/)?.[1] || 'mp4';
          const proxyUrl = `/api/download/${renderId}?projectId=${projectId}&format=${extension}`;
          
          console.log('[ExportButton] Using proxy endpoint:', proxyUrl);
          
          const response = await fetch(proxyUrl);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('[ExportButton] Proxy download failed:', response.status, errorText);
            throw new Error(`Proxy download failed: ${response.status} ${errorText}`);
          }
          
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          
          const link = document.createElement('a');
          link.href = blobUrl;
          const date = new Date().toISOString().split('T')[0];
          link.download = `video-${date}-${projectId.slice(-6)}.${extension}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
          toast.success("Download started!");
        } catch (error) {
          console.error('[ExportButton] All download methods failed:', error);
          // Show user-friendly error without redirect
          toast.error("Download failed. Please try again or contact support.");
        }
      }
    };
    
    return (
      <div className="flex gap-2">
        <Button 
          variant="default" 
          size={size} 
          className={className}
          onClick={handleDownload}
        >
          <Download className="mr-2 h-4 w-4" />
          Download Video
        </Button>
        <Button 
          variant="outline" 
          size={size}
          onClick={() => {
            setRenderId(null);
            setDownloadUrl(null);
            setHasDownloaded(false);
          }}
        >
          <Download className="mr-2 h-4 w-4" />
          Render Again
        </Button>
      </div>
    );
  }

  // Failed state
  if (status?.status === 'failed') {
    return (
      <Button variant="outline" disabled size={size} className={className}>
        <X className="mr-2 h-4 w-4 text-red-500" />
        Render Failed
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
    <>
      <Button 
        onClick={handleExportClick} 
        disabled={startRender.isPending}
        variant="default"
        size={size}
        className={className}
      >
        {startRender.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Starting...
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            Render
          </>
        )}
      </Button>
      
      <ExportOptionsModal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
        isExporting={startRender.isPending}
      />
    </>
  );
}