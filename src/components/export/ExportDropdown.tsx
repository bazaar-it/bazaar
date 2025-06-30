"use client";

import { useState } from "react";
import { Download, Loader2, Check, ChevronDown, FileVideo, Globe, Image } from "lucide-react";
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

export type ExportFormat = "mp4" | "webm" | "gif";
export type ExportQuality = "high" | "medium" | "low";

interface ExportDropdownProps {
  projectId: string;
  className?: string;
  size?: "default" | "sm" | "lg";
}

export function ExportDropdown({ projectId, className, size = "sm" }: ExportDropdownProps) {
  const [format, setFormat] = useState<ExportFormat>("mp4");
  const [quality, setQuality] = useState<ExportQuality>("high");
  const [renderId, setRenderId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hasDownloaded, setHasDownloaded] = useState(false);
  
  // Mutations and queries
  const startRender = api.render.startRender.useMutation({
    onSuccess: (data) => {
      setRenderId(data.renderId);
      toast.info("Download started! This may take a few minutes...");
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
      quality: selectedQuality || quality,
    });
  };

  // Handle completion - DON'T auto-close, let user download
  if (status?.status === 'completed' && renderId && status.outputUrl && !hasDownloaded) {
    setHasDownloaded(true);
    toast.success('Export complete! Click the download button.');
  }

  // Handle failure
  if (status?.status === 'failed') {
    toast.error(`Download failed: ${status.error || 'Unknown error'}`);
    setRenderId(null);
    setIsOpen(false);
  }

  // Rendering states
  const isRendering = !!renderId && status?.status === 'rendering';
  const isCompleted = status?.status === 'completed';
  const progress = status?.progress || 0;

  const formatIcons = {
    mp4: FileVideo,
    webm: Globe,
    gif: Image,
  };

  const FormatIcon = formatIcons[format];

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
              Downloaded!
            </>
          ) : isRendering ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {progress}%
            </>
          ) : startRender.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Download
              <ChevronDown className="h-3 w-3 opacity-50" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-48">
        {/* Format Selection */}
        <DropdownMenuLabel className="text-xs font-normal opacity-70">Format</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
          <DropdownMenuRadioItem value="mp4" className="gap-2" onSelect={(e) => e.preventDefault()}>
            <FileVideo className="h-3 w-3" />
            MP4
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="webm" className="gap-2" onSelect={(e) => e.preventDefault()}>
            <Globe className="h-3 w-3" />
            WebM
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="gif" className="gap-2" onSelect={(e) => e.preventDefault()}>
            <Image className="h-3 w-3" />
            GIF
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        
        <DropdownMenuSeparator />
        
        {/* Quality Selection */}
        <DropdownMenuLabel className="text-xs font-normal opacity-70">Quality</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={quality} onValueChange={(v) => setQuality(v as ExportQuality)}>
          <DropdownMenuRadioItem value="high" onSelect={(e) => e.preventDefault()}>High</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="medium" onSelect={(e) => e.preventDefault()}>Medium</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="low" onSelect={(e) => e.preventDefault()}>Low</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        
        <DropdownMenuSeparator />
        
        {/* Export/Progress/Download Button */}
        {isCompleted && status?.outputUrl ? (
          // Show download button when complete
          <DropdownMenuItem 
            onClick={() => {
              const proxyUrl = `/api/download/${renderId}?projectId=${projectId}&format=${format}`;
              window.open(proxyUrl, '_blank');
              
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
                Exporting... {progress}%
              </>
            ) : (
              <>
                <FormatIcon className="h-3 w-3" />
                Export as {format.toUpperCase()}
              </>
            )}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}