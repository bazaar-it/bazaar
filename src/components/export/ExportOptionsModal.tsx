"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Label } from "~/components/ui/label";
import { FileVideo, Image, Sparkles, Gauge, Package, Zap, Globe } from "lucide-react";

export type ExportFormat = "mp4" | "webm" | "gif";
export type ExportQuality = "high" | "medium" | "low";

interface ExportOptionsModalProps {
  open: boolean;
  onClose: () => void;
  onExport: (format: ExportFormat, quality: ExportQuality) => void;
  isExporting?: boolean;
}

export function ExportOptionsModal({
  open,
  onClose,
  onExport,
  isExporting = false,
}: ExportOptionsModalProps) {
  const [format, setFormat] = useState<ExportFormat>("mp4");
  const [quality, setQuality] = useState<ExportQuality>("high");

  const handleExport = () => {
    onExport(format, quality);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Options</DialogTitle>
          <DialogDescription>
            Choose your export format and quality settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Format</Label>
            <RadioGroup value={format} onValueChange={(v: string) => setFormat(v as ExportFormat)}>
              <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent">
                <RadioGroupItem value="mp4" id="mp4" className="mt-1" />
                <Label htmlFor="mp4" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 font-medium">
                    <FileVideo className="h-4 w-4" />
                    MP4 Video
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                      Recommended
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Most compatible format. Works everywhere: web, mobile, desktop.
                    Best for sharing and social media.
                  </p>
                </Label>
              </div>

              <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent">
                <RadioGroupItem value="webm" id="webm" className="mt-1" />
                <Label htmlFor="webm" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 font-medium">
                    <Globe className="h-4 w-4" />
                    WebM Video
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Modern web format. Smaller file sizes. Great for web embedding.
                    Not supported on all devices.
                  </p>
                </Label>
              </div>

              <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent">
                <RadioGroupItem value="gif" id="gif" className="mt-1" />
                <Label htmlFor="gif" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 font-medium">
                    <Image className="h-4 w-4" />
                    Animated GIF
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    No audio support. Larger file sizes. Perfect for quick previews,
                    memes, or embedding in emails/chat.
                  </p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Quality Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Quality</Label>
            <RadioGroup value={quality} onValueChange={(v: string) => setQuality(v as ExportQuality)}>
              <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent">
                <RadioGroupItem value="high" id="high" className="mt-1" />
                <Label htmlFor="high" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 font-medium">
                    <Sparkles className="h-4 w-4" />
                    High Quality
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Best visual quality. Larger file sizes. 1080p resolution.
                  </p>
                </Label>
              </div>

              <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent">
                <RadioGroupItem value="medium" id="medium" className="mt-1" />
                <Label htmlFor="medium" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 font-medium">
                    <Gauge className="h-4 w-4" />
                    Medium Quality
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Balanced quality and file size. Good for most uses.
                  </p>
                </Label>
              </div>

              <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent">
                <RadioGroupItem value="low" id="low" className="mt-1" />
                <Label htmlFor="low" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 font-medium">
                    <Zap className="h-4 w-4" />
                    Low Quality
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Fastest export. Smallest file size. 720p resolution.
                  </p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Info Box */}
          <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="font-medium">Export Details</span>
            </div>
            <p className="mt-1">
              {format === "mp4" 
                ? "Your video will include audio and be encoded with H.264 for maximum compatibility."
                : format === "webm"
                ? "WebM videos use VP8 codec for efficient compression. Great for web but may not work on all devices."
                : "GIF animations are limited to 256 colors and don't support audio."}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? "Exporting..." : "Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}