# Day 1 Quick Start: Export Video (No Redis, No Docker)

## 30-Minute Implementation Guide

### Step 1: Update package.json (2 min)

Add to your `package.json` scripts:
```json
{
  "scripts": {
    "dev": "NODE_OPTIONS='--max-old-space-size=4096' next dev"
  }
}
```

### Step 2: Create Folder Structure (1 min)

```bash
mkdir -p src/server/services/render
mkdir -p src/components/export
mkdir -p src/app/api/download
mkdir -p tmp/renders
```

### Step 3: Copy These 5 Files (10 min)

#### File 1: Render State Manager
```typescript
// src/server/services/render/render-state.ts
interface RenderJob {
  id: string;
  status: 'pending' | 'rendering' | 'completed' | 'failed';
  progress: number;
  outputPath?: string;
  error?: string;
  userId: string;
  projectId: string;
}

const activeRenders = new Map<string, RenderJob>();

export const renderState = {
  get: (id: string) => activeRenders.get(id),
  set: (id: string, job: RenderJob) => activeRenders.set(id, job),
  isRendering: () => Array.from(activeRenders.values()).some(job => job.status === 'rendering'),
  updateProgress: (id: string, progress: number) => {
    const job = activeRenders.get(id);
    if (job) {
      job.progress = progress;
      activeRenders.set(id, job);
    }
  },
  getUserRenders: (userId: string) => 
    Array.from(activeRenders.values()).filter(job => job.userId === userId),
};
```

#### File 2: Render Service
```typescript
// src/server/services/render/render.service.ts
import { renderMedia, selectComposition } from "@remotion/renderer";
import { bundle } from "@remotion/bundler";
import path from "path";
import fs from "fs/promises";

export async function renderVideo({
  projectId,
  scenes,
  format = 'mp4',
  quality = 'high',
  onProgress,
}: {
  projectId: string;
  scenes: any[];
  format: 'mp4' | 'webm' | 'gif';
  quality: 'low' | 'medium' | 'high';
  onProgress?: (progress: number) => void;
}) {
  console.log(`Starting render for project ${projectId}`);
  
  // Bundle Remotion project
  const bundleLocation = await bundle({
    entryPoint: path.resolve("./src/remotion/index.ts"),
  });

  // Get composition
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "MainComposition",
    inputProps: { scenes },
  });

  // Simple quality settings
  const settings = quality === 'high' 
    ? { crf: 18, jpegQuality: 90 }
    : { crf: 23, jpegQuality: 80 };

  // Ensure output directory exists
  await fs.mkdir('tmp/renders', { recursive: true });
  const outputPath = `tmp/renders/${projectId}-${Date.now()}.${format}`;
  
  // Render video
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: format === 'gif' ? 'gif' : 'h264',
    outputLocation: outputPath,
    inputProps: { scenes },
    crf: format !== 'gif' ? settings.crf : undefined,
    jpegQuality: settings.jpegQuality,
    onProgress: ({ progress }) => {
      console.log(`Render progress: ${Math.round(progress * 100)}%`);
      onProgress?.(progress);
    },
  });

  console.log(`Render complete: ${outputPath}`);
  return { outputPath };
}
```

#### File 3: API Router
```typescript
// src/server/api/routers/render.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { renderVideo } from "~/server/services/render/render.service";
import { renderState } from "~/server/services/render/render-state";
import { TRPCError } from "@trpc/server";

export const renderRouter = createTRPCRouter({
  startRender: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      format: z.enum(['mp4']).default('mp4'), // Start with MP4 only
      quality: z.enum(['high']).default('high'), // Start with high only
    }))
    .mutation(async ({ ctx, input }) => {
      // Only one render at a time
      if (renderState.isRendering()) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: "Server busy. Please wait a moment and try again.",
        });
      }

      // Get project scenes
      const project = await ctx.db.query.projects.findFirst({
        where: (projects, { eq, and }) => and(
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
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: "Project not found",
        });
      }

      const renderId = crypto.randomUUID();
      
      // Create job
      renderState.set(renderId, {
        id: renderId,
        status: 'pending',
        progress: 0,
        userId: ctx.session.user.id,
        projectId: input.projectId,
      });

      // Start render in background
      renderVideo({
        projectId: input.projectId,
        scenes: project.scenes,
        format: input.format,
        quality: input.quality,
        onProgress: (progress) => {
          renderState.updateProgress(renderId, progress);
        },
      })
        .then((result) => {
          const job = renderState.get(renderId);
          if (job) {
            renderState.set(renderId, {
              ...job,
              status: 'completed',
              progress: 1,
              outputPath: result.outputPath,
            });
          }
        })
        .catch((error) => {
          const job = renderState.get(renderId);
          if (job) {
            renderState.set(renderId, {
              ...job,
              status: 'failed',
              error: error.message,
            });
          }
        });

      // Mark as rendering after a brief delay
      setTimeout(() => {
        const job = renderState.get(renderId);
        if (job && job.status === 'pending') {
          renderState.set(renderId, { ...job, status: 'rendering' });
        }
      }, 100);

      return { renderId };
    }),

  getRenderStatus: protectedProcedure
    .input(z.object({ renderId: z.string() }))
    .query(async ({ ctx, input }) => {
      const job = renderState.get(input.renderId);
      
      if (!job) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: "Render job not found",
        });
      }

      // Security check
      if (job.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "Access denied",
        });
      }

      return {
        status: job.status,
        progress: job.progress,
        error: job.error,
      };
    }),
});
```

#### File 4: Download Endpoint
```typescript
// src/app/api/download/[renderId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "~/server/auth";
import { renderState } from "~/server/services/render/render-state";
import fs from "fs";

export async function GET(
  req: NextRequest,
  { params }: { params: { renderId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const job = renderState.get(params.renderId);
  
  if (!job) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Security check
  if (job.userId !== session.user.id) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (job.status !== 'completed' || !job.outputPath) {
    return new NextResponse("Not ready", { status: 400 });
  }

  try {
    const file = await fs.promises.readFile(job.outputPath);
    
    return new NextResponse(file, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="bazaar-vid-export.mp4"`,
        'Content-Length': file.length.toString(),
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return new NextResponse("File error", { status: 500 });
  }
}
```

#### File 5: Export Button
```tsx
// src/components/export/ExportButton.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Download, Loader2, Check, X } from "lucide-react";
import { api } from "~/lib/api/client";
import { toast } from "sonner";

export function ExportButton({ projectId }: { projectId: string }) {
  const [renderId, setRenderId] = useState<string | null>(null);
  
  const startRender = api.render.startRender.useMutation({
    onSuccess: (data) => {
      setRenderId(data.renderId);
      toast.info("Export started!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const { data: status } = api.render.getRenderStatus.useQuery(
    { renderId: renderId! },
    {
      enabled: !!renderId && !['completed', 'failed'].includes(status?.status || ''),
      refetchInterval: 1000,
    }
  );

  // Handle completion
  useEffect(() => {
    if (status?.status === 'completed') {
      toast.success("Export complete! Starting download...");
      // Auto-download
      window.open(`/api/download/${renderId}`, '_blank');
      // Reset after a delay
      setTimeout(() => setRenderId(null), 3000);
    } else if (status?.status === 'failed') {
      toast.error(`Export failed: ${status.error}`);
      setTimeout(() => setRenderId(null), 3000);
    }
  }, [status?.status, renderId, status?.error]);

  const handleExport = () => {
    startRender.mutate({ projectId });
  };

  // Completed state
  if (status?.status === 'completed') {
    return (
      <Button variant="outline" disabled>
        <Check className="mr-2 h-4 w-4 text-green-500" />
        Download Started!
      </Button>
    );
  }

  // Failed state
  if (status?.status === 'failed') {
    return (
      <Button variant="outline" disabled>
        <X className="mr-2 h-4 w-4 text-red-500" />
        Export Failed
      </Button>
    );
  }

  // Rendering state
  if (renderId && status) {
    const progress = Math.round((status.progress || 0) * 100);
    return (
      <Button disabled variant="outline">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        {status.status === 'rendering' ? `${progress}%` : 'Starting...'}
      </Button>
    );
  }

  // Default state
  return (
    <Button 
      onClick={handleExport} 
      disabled={startRender.isLoading}
      variant="default"
      size="sm"
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
```

### Step 4: Add to Root Router (2 min)

```typescript
// src/server/api/root.ts
import { renderRouter } from "./routers/render";

export const appRouter = createTRPCRouter({
  // ... other routers
  render: renderRouter,
});
```

### Step 5: Add Export Button to UI (2 min)

In your preview panel or wherever you want the export button:

```tsx
// In PreviewPanelG.tsx or similar
import { ExportButton } from "~/components/export/ExportButton";

// Add to your UI
<ExportButton projectId={projectId} />
```

### Step 6: Test It! (5 min)

1. Start your dev server: `npm run dev`
2. Open a project with scenes
3. Click the Export button
4. Watch the progress percentage
5. Video downloads automatically when done!

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Cannot find module '@remotion/renderer'" | Run `npm install @remotion/renderer @remotion/bundler` |
| "MainComposition not found" | Create minimal `src/remotion/index.ts` (see below) |
| Out of memory error | Use `NODE_OPTIONS='--max-old-space-size=8192'` |
| No progress updates | Check browser console for errors |

### Minimal Remotion Setup

If you don't have `src/remotion/index.ts`:

```typescript
// src/remotion/index.ts
import { Composition } from "remotion";
import { VideoComposition } from "./VideoComposition";

export const RemotionRoot = () => {
  return (
    <Composition
      id="MainComposition"
      component={VideoComposition}
      durationInFrames={300}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
```

## What You Get

- ✅ Working export button
- ✅ Real-time progress updates
- ✅ Automatic download
- ✅ No Redis, no Docker
- ✅ Ready for Lambda migration
- ✅ Clean error handling

## Next Steps

Once this works:
1. Add more formats (webm, gif)
2. Add quality options
3. Save renders to database
4. Add R2 upload for permanent storage
5. Migrate to Lambda when you need scale

**Total time: ~30 minutes to working export!**