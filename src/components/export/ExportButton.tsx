"use client";

import { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Download, Loader2, Check, X, AlertCircle, RefreshCw } from "lucide-react";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { ExportOptionsModal, type ExportFormat, type ExportQuality } from "./ExportOptionsModal";
import { generateCleanFilename } from "~/lib/utils/filename";
import { useVideoState } from "~/stores/videoState";

interface ExportButtonProps {
  projectId: string;
  projectTitle?: string;
  className?: string;
  size?: "default" | "sm" | "lg";
}

export function ExportButton({ projectId, projectTitle = "video", className, size = "sm" }: ExportButtonProps) {
  const [renderId, setRenderId] = useState<string | null>(null);
  const [hasDownloaded, setHasDownloaded] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [currentFormat, setCurrentFormat] = useState<ExportFormat>('mp4');
  const [currentQuality, setCurrentQuality] = useState<ExportQuality>('high');
  
  // Get audio from Zustand state
  const projectAudio = useVideoState(state => state.projects[projectId]?.audio);
  
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
        (async () => {
          try {
            if (!status.outputUrl) return;
            
            const response = await fetch(status.outputUrl);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = blobUrl;
            const extension = status.outputUrl.match(/\.(mp4|gif|webm)$/)?.[1] || 'mp4';
            // Use clean filename utility
            link.download = generateCleanFilename(projectTitle, currentQuality, extension as ExportFormat);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up the blob URL after a short delay
            setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
          } catch (error) {
            console.log('[ExportButton] Auto-download failed, user can click button:', error);
          }
        })();
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
    setCurrentFormat(format);
    setCurrentQuality(quality);
    
    console.log('[ExportButton] Starting render (audio will be fetched from database)');
    
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
            // Use clean filename utility
            link.download = generateCleanFilename(projectTitle, currentQuality, extension as ExportFormat);
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
          // Use clean filename utility
          link.download = generateCleanFilename(projectTitle, currentQuality, extension as ExportFormat);
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

  // Failed state - show error details
  if (status?.status === 'failed') {
    const errorMessage = status.error || 'Render failed';
    const isNetworkError = errorMessage.includes('network error');
    const isFontError = errorMessage.includes('font') || errorMessage.includes('loadFont');
    
    return (
      <div className="flex flex-col gap-2">
        <Button 
          variant="outline" 
          disabled 
          size={size} 
          className={`${className} border-red-500/50`}
        >
          <X className="mr-2 h-4 w-4 text-red-500" />
          Render Failed
        </Button>
        <div className="text-xs text-red-500 max-w-xs">
          {isNetworkError && isFontError ? (
            <p>Font loading failed - send us an email and we will fix it.</p>
          ) : isNetworkError ? (
            <p>Network error during rendering. Please try again.</p>
          ) : (
            <p>{errorMessage}</p>
          )}
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            setRenderId(null);
            setDownloadUrl(null);
            setHasDownloaded(false);
          }}
        >
          <RefreshCw className="mr-2 h-3 w-3" />
          Try Again
        </Button>
      </div>
    );
  }

  // Rendering state with visual progress indicator
  if (renderId && status) {
    const progress = status.progress || 0; // Progress is already 0-100
    const isFFmpegFinalizing = status.isFinalizingFFmpeg;
    
    return (
      <TooltipProvider>
        <Tooltip open={isFFmpegFinalizing}>
          <TooltipTrigger asChild>
            <div className={`${className} relative inline-flex overflow-hidden rounded-md`}>
              {/* Gray background button */}
              <Button 
                disabled 
                variant="secondary" 
                size={size} 
                className="relative w-full border-0"
                style={{
                  backgroundColor: 'rgb(107 114 128)', // gray-500
                  padding: size === 'sm' ? '0.5rem 1rem' : '0.625rem 1.25rem'
                }}
              >
                {/* Orange progress fill - absolute positioned */}
                <div 
                  className="absolute left-0 top-0 bottom-0 bg-orange-500"
                  style={{
                    width: `${progress}%`,
                    transition: 'width 0.5s ease-out',
                    background: 'linear-gradient(90deg, rgb(251 146 60) 0%, rgb(249 115 22) 100%)'
                  }}
                />
                
                {/* Button content - above the progress bar */}
                <span className="relative z-10 flex items-center font-medium text-white">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {status.status === 'rendering' ? (
                    <>
                      Rendering {progress}%
                      {isFFmpegFinalizing && (
                        <AlertCircle className="ml-1 h-3 w-3" />
                      )}
                    </>
                  ) : (
                    'Starting...'
                  )}
                </span>
              </Button>
            </div>
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