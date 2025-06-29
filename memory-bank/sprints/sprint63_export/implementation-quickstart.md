# Export Feature Implementation Quick Start

## Phase 1: Server-Side Rendering (SSR) - Immediate Implementation

### Step 1: Update Database Schema

Add video renders table to track exports:

```typescript
// src/server/db/schema.ts
// Add this to your existing schema

export const videoRenders = pgTable("video_renders", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  format: varchar("format", { length: 10 }).notNull().default("mp4"),
  quality: varchar("quality", { length: 20 }).notNull().default("high"),
  outputUrl: text("output_url"),
  errorMessage: text("error_message"),
  metadata: json("metadata").$type<{
    duration?: number;
    fileSize?: number;
    resolution?: { width: number; height: number };
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});
```

### Step 2: Implement Render Service

```typescript
// src/server/services/render/render.service.ts
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import { uploadToR2 } from "~/server/services/upload.service";

export async function renderVideo({
  projectId,
  scenes,
  format = "mp4",
  quality = "high",
}: {
  projectId: string;
  scenes: any[];
  format: "mp4" | "webm" | "gif";
  quality: "low" | "medium" | "high";
}) {
  // Bundle the Remotion project
  const bundleLocation = await bundle({
    entryPoint: path.resolve("./src/remotion/index.ts"),
    // Use webpack override if needed
  });

  // Get composition
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "MainComposition",
    inputProps: { scenes },
  });

  // Quality settings
  const qualitySettings = {
    low: { crf: 28, jpegQuality: 70 },
    medium: { crf: 23, jpegQuality: 80 },
    high: { crf: 18, jpegQuality: 90 },
  };

  const settings = qualitySettings[quality];

  // Render video
  const outputPath = `/tmp/render-${projectId}-${Date.now()}.${format}`;
  
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: format === "gif" ? "gif" : "h264",
    outputLocation: outputPath,
    inputProps: { scenes },
    crf: settings.crf,
    jpegQuality: settings.jpegQuality,
    onProgress: (progress) => {
      console.log(`Rendering ${projectId}: ${Math.round(progress.progress * 100)}%`);
      // TODO: Send progress updates via SSE
    },
  });

  // Upload to R2
  const uploadUrl = await uploadToR2({
    filePath: outputPath,
    key: `renders/${projectId}/${Date.now()}.${format}`,
  });

  return {
    url: uploadUrl,
    format,
    quality,
  };
}
```

### Step 3: Update Render Router

```typescript
// src/server/api/routers/render.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { renderVideo } from "~/server/services/render/render.service";
import { db } from "~/server/db";
import { videoRenders } from "~/server/db/schema";
import { eq } from "drizzle-orm";

export const renderRouter = createTRPCRouter({
  startRender: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        format: z.enum(["mp4", "webm", "gif"]).default("mp4"),
        quality: z.enum(["low", "medium", "high"]).default("high"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate project ownership
      const project = await ctx.db.query.projects.findFirst({
        where: (projects, { eq, and }) =>
          and(
            eq(projects.id, input.projectId),
            eq(projects.userId, ctx.session.user.id)
          ),
        with: {
          scenes: {
            orderBy: (scenes, { asc }) => asc(scenes.order),
          },
        },
      });

      if (!project) {
        throw new Error("Project not found or access denied");
      }

      // Create render record
      const [render] = await ctx.db
        .insert(videoRenders)
        .values({
          userId: ctx.session.user.id,
          projectId: input.projectId,
          format: input.format,
          quality: input.quality,
          status: "rendering",
        })
        .returning();

      // Start async render process
      renderVideo({
        projectId: input.projectId,
        scenes: project.scenes,
        format: input.format,
        quality: input.quality,
      })
        .then(async (result) => {
          // Update render record on success
          await db
            .update(videoRenders)
            .set({
              status: "completed",
              outputUrl: result.url,
              completedAt: new Date(),
              metadata: {
                format: result.format,
                quality: result.quality,
              },
            })
            .where(eq(videoRenders.id, render.id));
        })
        .catch(async (error) => {
          // Update render record on error
          await db
            .update(videoRenders)
            .set({
              status: "failed",
              errorMessage: error.message,
              completedAt: new Date(),
            })
            .where(eq(videoRenders.id, render.id));
        });

      return {
        renderId: render.id,
        status: "started",
      };
    }),

  getRenderStatus: protectedProcedure
    .input(z.object({ renderId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const render = await ctx.db.query.videoRenders.findFirst({
        where: (renders, { eq, and }) =>
          and(
            eq(renders.id, input.renderId),
            eq(renders.userId, ctx.session.user.id)
          ),
      });

      if (!render) {
        throw new Error("Render not found");
      }

      return {
        status: render.status,
        outputUrl: render.outputUrl,
        error: render.errorMessage,
        createdAt: render.createdAt,
        completedAt: render.completedAt,
      };
    }),

  listRenders: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const renders = await ctx.db.query.videoRenders.findMany({
        where: (renders, { eq, and }) =>
          and(
            eq(renders.projectId, input.projectId),
            eq(renders.userId, ctx.session.user.id)
          ),
        orderBy: (renders, { desc }) => desc(renders.createdAt),
        limit: 10,
      });

      return renders;
    }),
});
```

### Step 4: Create Export Button Component

```tsx
// src/components/export/ExportButton.tsx
"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Download, Loader2 } from "lucide-react";
import { api } from "~/lib/api/client";
import { toast } from "sonner";

interface ExportButtonProps {
  projectId: string;
}

export function ExportButton({ projectId }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<"mp4" | "webm" | "gif">("mp4");
  const [quality, setQuality] = useState<"low" | "medium" | "high">("high");
  const [isExporting, setIsExporting] = useState(false);
  const [renderId, setRenderId] = useState<string | null>(null);

  const startRender = api.render.startRender.useMutation();
  const { data: renderStatus } = api.render.getRenderStatus.useQuery(
    { renderId: renderId! },
    {
      enabled: !!renderId,
      refetchInterval: (data) =>
        data?.status === "rendering" ? 2000 : false,
    }
  );

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await startRender.mutateAsync({
        projectId,
        format,
        quality,
      });
      
      setRenderId(result.renderId);
      toast.info("Export started! We'll notify you when it's ready.");
    } catch (error) {
      toast.error("Failed to start export");
      setIsExporting(false);
    }
  };

  // Handle completed render
  if (renderStatus?.status === "completed" && renderStatus.outputUrl) {
    window.open(renderStatus.outputUrl, "_blank");
    setOpen(false);
    setIsExporting(false);
    setRenderId(null);
    toast.success("Export completed! Downloading...");
  }

  // Handle failed render
  if (renderStatus?.status === "failed") {
    toast.error(`Export failed: ${renderStatus.error}`);
    setIsExporting(false);
    setRenderId(null);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Video</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Format</label>
            <Select value={format} onValueChange={(v: any) => setFormat(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mp4">MP4 (Recommended)</SelectItem>
                <SelectItem value="webm">WebM</SelectItem>
                <SelectItem value="gif">GIF</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Quality</label>
            <Select value={quality} onValueChange={(v: any) => setQuality(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low (720p)</SelectItem>
                <SelectItem value="medium">Medium (1080p)</SelectItem>
                <SelectItem value="high">High (1080p+)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full"
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {renderStatus?.status === "rendering"
                  ? "Exporting..."
                  : "Starting export..."}
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export Video
              </>
            )}
          </Button>

          {isExporting && (
            <p className="text-sm text-muted-foreground text-center">
              This may take a few minutes. You can close this dialog and we'll
              notify you when it's ready.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### Step 5: Add Export Button to UI

```tsx
// In PreviewPanelG.tsx or wherever your preview controls are
import { ExportButton } from "~/components/export/ExportButton";

// Add to your toolbar/controls section
<div className="flex items-center gap-2">
  {/* Other controls */}
  <ExportButton projectId={projectId} />
</div>
```

### Step 6: Run Database Migration

```bash
# Generate migration
npm run db:generate

# Apply migration
npm run db:migrate
```

## Quick Testing Guide

1. **Test basic export:**
   - Create a simple project with 1-2 scenes
   - Click Export button
   - Select MP4 format, High quality
   - Wait for completion

2. **Monitor logs:**
   ```bash
   # Watch server logs for render progress
   npm run dev
   ```

3. **Check R2 storage:**
   - Verify files are uploaded to `renders/[projectId]/` path
   - Check file sizes and formats

## Next Steps

Once SSR is working:
1. Add progress bar UI
2. Implement render queue for multiple exports
3. Add email notifications for completed renders
4. Consider Lambda migration for scale

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Out of memory | Increase Node.js memory: `NODE_OPTIONS='--max-old-space-size=4096'` |
| Render timeout | Split long videos into chunks |
| R2 upload fails | Check R2 credentials and bucket permissions |
| Preview works but export fails | Ensure all assets use absolute URLs |