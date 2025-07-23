"use client";

import { useState } from "react";
import React from "react";
import { Download, Loader2, Check, ChevronDown, FileVideo } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
} from "~/components/ui/dropdown-menu";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { cn } from "~/lib/cn";
import { generateCleanFilename } from "~/lib/utils/filename";

export type ExportFormat = "mp4" | "webm" | "gif";
export type ExportQuality = "1080p" | "720p" | "480p";

// Map resolution labels to legacy quality values for database
const qualityMap: Record<ExportQuality, 'high' | 'medium' | 'low'> = {
  '1080p': 'high',
  '720p': 'medium', 
  '480p': 'low',
};

interface ExportDropdownProps {
  projectId: string;
  projectTitle?: string;
  className?: string;
  size?: "default" | "sm" | "lg";
}

export function ExportDropdown({ projectId, projectTitle = "video", className, size = "sm" }: ExportDropdownProps) {
  const [format, setFormat] = useState<ExportFormat>("mp4");
  const [quality, setQuality] = useState<ExportQuality>("1080p");
  const [renderId, setRenderId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hasDownloaded, setHasDownloaded] = useState(false);
  
  // When format changes to GIF, default to 720p for reasonable file size
  React.useEffect(() => {
    if (format === 'gif' && quality === '1080p') {
      setQuality('720p');
    }
  }, [format, quality]);
  
  // Mutations and queries
  const startRender = api.render.startRender.useMutation({
    onSuccess: (data) => {
      setRenderId(data.renderId);
      toast.info("Render started! This may take a few minutes...");
    },
    onError: (error) => {
      toast.error(error.message);
      setIsOpen(false);
    },
  });

  const { data: status } = api.render.getRenderStatus.useQuery(
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

  // Handle export
  const handleExport = (selectedFormat?: ExportFormat, selectedQuality?: ExportQuality) => {
    if (selectedFormat) setFormat(selectedFormat);
    if (selectedQuality) setQuality(selectedQuality);
    
    // Don't close dropdown when starting export
    startRender.mutate({ 
      projectId,
      format: selectedFormat || format,
      quality: qualityMap[selectedQuality || quality],
    });
  };

  // Handle completion - auto-download
  React.useEffect(() => {
    if (status?.status === 'completed' && renderId && status.outputUrl && !hasDownloaded) {
      setHasDownloaded(true);
      toast.success('Render complete! Starting download...');
      
      // Auto-download after a short delay
      setTimeout(async () => {
        try {
          const response = await fetch(status.outputUrl!);
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = generateCleanFilename(projectTitle, quality, format);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
          
          // Reset state after successful download
          setTimeout(() => {
            setRenderId(null);
            setHasDownloaded(false);
            setIsOpen(false);
          }, 1500);
        } catch (error) {
          console.error('Auto-download failed:', error);
          toast.error('Auto-download failed. Please click the download button.');
        }
      }, 500);
    }
  }, [status?.status, renderId, status?.outputUrl, hasDownloaded, projectTitle, quality, format]);

  // Handle failure
  React.useEffect(() => {
    if (status?.status === 'failed') {
      toast.error(`Render failed: ${status.error || 'Unknown error'}`);
      setRenderId(null);
      setIsOpen(false);
    }
  }, [status?.status, status?.error]);

  // Rendering states
  const isRendering = !!renderId && status?.status === 'rendering';
  const isCompleted = status?.status === 'completed';
  const progress = status?.progress || 0;


  // If variant is dropdown-item, render as a menu item that opens a sub-menu
  if (variant === "dropdown-item") {
    return (
      <DropdownMenuItem
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleExport();
        }}
        disabled={isRendering || startRender.isPending}
        className="gap-2"
      >
        <Download className="h-4 w-4" />
        <span>Download Video</span>
      </DropdownMenuItem>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="default" 
          size={size} 
          className={cn("gap-2", className)}
          disabled={isRendering || startRender.isPending}
        >
          {isCompleted ? (
            <>
              <Check className="h-4 w-4 text-green-500" />
              {!iconOnly && "Rendered!"}
            </>
          ) : isRendering ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {!iconOnly && `${progress}%`}
            </>
          ) : startRender.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {!iconOnly && "Starting..."}
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              {!iconOnly && "Download"}
              {!iconOnly && <ChevronDown className="h-3 w-3 opacity-50" />}
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-48">
        {/* Format Selection */}
        <DropdownMenuLabel className="text-xs font-normal opacity-70">Format</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
          <DropdownMenuRadioItem value="mp4" onSelect={(e) => e.preventDefault()}>MP4</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="webm" onSelect={(e) => e.preventDefault()}>WebM</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="gif" onSelect={(e) => e.preventDefault()}>GIF</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        
        <DropdownMenuSeparator />
        
        {/* Quality Selection - only show for video formats */}
        {format !== 'gif' && (
          <>
            <DropdownMenuLabel className="text-xs font-normal opacity-70">Resolution</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={quality} onValueChange={(v) => setQuality(v as ExportQuality)}>
              <DropdownMenuRadioItem value="1080p" onSelect={(e) => e.preventDefault()}>1080p</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="720p" onSelect={(e) => e.preventDefault()}>720p</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="480p" onSelect={(e) => e.preventDefault()}>480p</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
          </>
        )}
        
        {/* GIF-specific resolution for GIF format */}
        {format === 'gif' && (
          <>
            <DropdownMenuLabel className="text-xs font-normal opacity-70">GIF Size</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={quality} onValueChange={(v) => setQuality(v as ExportQuality)}>
              <DropdownMenuRadioItem value="720p" onSelect={(e) => e.preventDefault()}>720p</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="480p" onSelect={(e) => e.preventDefault()}>480p</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
          </>
        )}
        
        {/* Export/Progress/Download Button */}
        {isCompleted && status?.outputUrl ? (
          // Show download button when complete
          <DropdownMenuItem 
            onClick={async () => {
              try {
                // First try to download from S3 URL directly
                const response = await fetch(status.outputUrl!);
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);
                
                const link = document.createElement('a');
                link.href = blobUrl;
                // Use clean filename utility
                link.download = generateCleanFilename(projectTitle, quality, format);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
                toast.success("Download started!");
              } catch (error) {
                console.error('Manual download failed:', error);
                toast.error('Download failed. Please try again.');
              }
              
              // Reset after download
              setTimeout(() => {
                setRenderId(null);
                setHasDownloaded(false);
                setIsOpen(false);
              }, 500);
            }}
            className="gap-2 font-medium"
          >
            <Download className="h-3 w-3 text-green-500" />
            Download {format.toUpperCase()}
          </DropdownMenuItem>
        ) : (
          // Show export/progress button
          <DropdownMenuItem 
            onClick={() => !isRendering && handleExport()}
            disabled={isRendering || startRender.isPending}
            className="gap-2 font-medium"
            onSelect={(e) => e.preventDefault()} // Keep dropdown open
          >
            {isRendering ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Rendering {progress}%
              </>
            ) : (
              <>
                <FileVideo className="h-3 w-3" />
                Download as {format.toUpperCase()}
              </>
            )}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}