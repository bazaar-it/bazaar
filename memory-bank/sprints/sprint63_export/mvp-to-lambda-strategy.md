# MVP to Lambda Strategy: No Redis, Future-Ready

## The Plan: Local Download → AWS Lambda

### Why Skip Redis/BullMQ?
1. **AWS Lambda doesn't need it** - Lambda has built-in concurrency control
2. **Simpler MVP** - One less dependency to manage
3. **Same API surface** - Code structure works for both approaches

## Phase 1: Local Download MVP (Day 1)

### Simple Architecture
```
User clicks Export → API checks if busy → Render in background → Poll for status
```

### 1. Install Only What We Need

```json
{
  "dependencies": {
    "@remotion/renderer": "^4.0.290",
    "@remotion/bundler": "^4.0.290"
  }
}
```

No Redis, no BullMQ, no Docker!

### 2. Simple State Management

```typescript
// src/server/services/render/render-state.ts
interface RenderJob {
  id: string;
  status: 'pending' | 'rendering' | 'completed' | 'failed';
  progress: number;
  outputPath?: string;
  error?: string;
}

// In-memory for MVP (will use database in production)
const activeRenders = new Map<string, RenderJob>();

export const renderState = {
  get: (id: string) => activeRenders.get(id),
  set: (id: string, job: RenderJob) => activeRenders.set(id, job),
  isRendering: () => {
    return Array.from(activeRenders.values()).some(
      job => job.status === 'rendering'
    );
  },
  updateProgress: (id: string, progress: number) => {
    const job = activeRenders.get(id);
    if (job) {
      job.progress = progress;
      activeRenders.set(id, job);
    }
  }
};
```

### 3. Render Service (Works for Both SSR and Lambda)

```typescript
// src/server/services/render/render.service.ts
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import { renderState } from "./render-state";

export interface RenderConfig {
  projectId: string;
  scenes: any[];
  format: 'mp4' | 'webm' | 'gif';
  quality: 'low' | 'medium' | 'high';
  onProgress?: (progress: number) => void;
}

// This function signature works for both local and Lambda
export async function renderVideo(config: RenderConfig) {
  const { projectId, scenes, format = 'mp4', quality = 'high' } = config;
  
  // Bundle (with caching in production)
  const bundleLocation = await bundle({
    entryPoint: path.resolve("./src/remotion/index.ts"),
    // In production, this would point to pre-bundled assets
  });

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "MainComposition",
    inputProps: { scenes, projectId },
  });

  // Quality presets that work for both local and Lambda
  const qualitySettings = {
    low: { 
      crf: 28, 
      jpegQuality: 70,
      resolution: { width: 1280, height: 720 },
    },
    medium: { 
      crf: 23, 
      jpegQuality: 80,
      resolution: { width: 1920, height: 1080 },
    },
    high: { 
      crf: 18, 
      jpegQuality: 90,
      resolution: { width: 1920, height: 1080 },
    },
  };

  const settings = qualitySettings[quality];
  
  // For MVP: Local file path
  // For Lambda: S3 path
  const outputPath = `/tmp/renders/${projectId}-${Date.now()}.${format}`;
  
  await renderMedia({
    composition: {
      ...composition,
      width: settings.resolution.width,
      height: settings.resolution.height,
    },
    serveUrl: bundleLocation,
    codec: format === 'gif' ? 'gif' : 'h264',
    outputLocation: outputPath,
    inputProps: { scenes, projectId },
    crf: format !== 'gif' ? settings.crf : undefined,
    jpegQuality: settings.jpegQuality,
    onProgress: ({ progress }) => {
      config.onProgress?.(progress);
    },
  });

  return {
    outputPath,
    format,
    quality,
    // In Lambda, this would include S3 URL
  };
}
```

### 4. API Router (Future-Ready for Lambda)

```typescript
// src/server/api/routers/render.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { renderVideo } from "~/server/services/render/render.service";
import { renderState } from "~/server/services/render/render-state";
import crypto from "crypto";

const isLambda = process.env.RENDER_MODE === 'lambda';

export const renderRouter = createTRPCRouter({
  startRender: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        format: z.enum(['mp4', 'webm', 'gif']).default('mp4'),
        quality: z.enum(['low', 'medium', 'high']).default('high'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if already rendering (MVP only allows one at a time)
      if (!isLambda && renderState.isRendering()) {
        throw new Error("Server is busy rendering. Please try again in a few minutes.");
      }

      // Get project and scenes
      const project = await ctx.db.query.projects.findFirst({
        where: (projects, { eq }) => eq(projects.id, input.projectId),
        with: {
          scenes: {
            orderBy: (scenes, { asc }) => asc(scenes.order),
          },
        },
      });

      if (!project) {
        throw new Error("Project not found");
      }

      const renderId = crypto.randomUUID();

      if (isLambda) {
        // Future: Lambda implementation
        // const { renderId: lambdaId } = await renderMediaOnLambda({...});
        throw new Error("Lambda rendering not yet implemented");
      } else {
        // MVP: Local rendering
        const job = {
          id: renderId,
          status: 'pending' as const,
          progress: 0,
        };
        
        renderState.set(renderId, job);

        // Start async render
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
            renderState.set(renderId, {
              ...job,
              status: 'completed',
              progress: 1,
              outputPath: result.outputPath,
            });
          })
          .catch((error) => {
            renderState.set(renderId, {
              ...job,
              status: 'failed',
              error: error.message,
            });
          });

        // Update status to rendering
        setTimeout(() => {
          const currentJob = renderState.get(renderId);
          if (currentJob && currentJob.status === 'pending') {
            renderState.set(renderId, { ...currentJob, status: 'rendering' });
          }
        }, 100);

        return { renderId };
      }
    }),

  getRenderStatus: protectedProcedure
    .input(z.object({ renderId: z.string() }))
    .query(async ({ input }) => {
      if (isLambda) {
        // Future: Check Lambda status
        // return await getRenderProgress({...});
      } else {
        const job = renderState.get(input.renderId);
        if (!job) {
          throw new Error("Render job not found");
        }
        return job;
      }
    }),

  downloadRender: protectedProcedure
    .input(z.object({ renderId: z.string() }))
    .query(async ({ input }) => {
      const job = renderState.get(input.renderId);
      if (!job || job.status !== 'completed' || !job.outputPath) {
        throw new Error("Render not ready for download");
      }

      // For MVP: Return local file path
      // For Lambda: Return S3 signed URL
      return {
        downloadUrl: `/api/download/${input.renderId}`,
      };
    }),
});
```

### 5. Simple Download Endpoint

```typescript
// src/app/api/download/[renderId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { renderState } from "~/server/services/render/render-state";
import fs from "fs";

export async function GET(
  req: NextRequest,
  { params }: { params: { renderId: string } }
) {
  const job = renderState.get(params.renderId);
  
  if (!job || job.status !== 'completed' || !job.outputPath) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  try {
    const file = await fs.promises.readFile(job.outputPath);
    
    return new NextResponse(file, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="video-${params.renderId}.mp4"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "File read error" }, { status: 500 });
  }
}
```

### 6. Simple Export Button

```tsx
// src/components/export/ExportButton.tsx
"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { api } from "~/lib/api/client";

export function ExportButton({ projectId }: { projectId: string }) {
  const [renderId, setRenderId] = useState<string | null>(null);
  
  const startRender = api.render.startRender.useMutation({
    onSuccess: (data) => {
      setRenderId(data.renderId);
    },
  });

  const { data: status } = api.render.getRenderStatus.useQuery(
    { renderId: renderId! },
    {
      enabled: !!renderId,
      refetchInterval: 1000,
    }
  );

  const handleExport = () => {
    startRender.mutate({ projectId });
  };

  const handleDownload = async () => {
    const { downloadUrl } = await api.render.downloadRender.query({
      renderId: renderId!,
    });
    window.open(downloadUrl, '_blank');
  };

  if (!renderId) {
    return (
      <Button onClick={handleExport} disabled={startRender.isLoading}>
        <Download className="mr-2 h-4 w-4" />
        Export Video
      </Button>
    );
  }

  if (status?.status === 'completed') {
    return (
      <Button onClick={handleDownload} variant="success">
        <Download className="mr-2 h-4 w-4" />
        Download Video
      </Button>
    );
  }

  return (
    <Button disabled>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      {status?.status === 'rendering' 
        ? `Rendering... ${Math.round((status.progress || 0) * 100)}%`
        : 'Starting...'}
    </Button>
  );
}
```

## Phase 2: Lambda Migration (When Ready)

### What Changes:
1. **Add Lambda packages**: `@remotion/lambda`
2. **Deploy compositions to S3**
3. **Switch `RENDER_MODE=lambda`**
4. **Update render service to use `renderMediaOnLambda`**
5. **Store results in database instead of memory**

### What Stays the Same:
- API interface (same tRPC procedures)
- Export button component
- Progress tracking pattern
- Quality presets

## Environment Variables

```env
# Start with these
NODE_OPTIONS="--max-old-space-size=4096"
RENDER_MODE=local
REMOTION_VERBOSE=1

# Add these for Lambda later
AWS_REGION=us-east-1
REMOTION_FUNCTION_NAME=bazaar-vid-render
REMOTION_BUCKET_NAME=bazaar-vid-renders
LAMBDA_DISK_SIZE_MB=10240
LAMBDA_MEMORY_SIZE_MB=3008
```

## Day 1 Success Metrics

- [ ] Click Export button
- [ ] See progress percentage updating
- [ ] Download MP4 to local machine
- [ ] No Redis, no Docker needed
- [ ] Code structure ready for Lambda

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| "JavaScript heap out of memory" | Increase to `NODE_OPTIONS="--max-old-space-size=8192"` |
| Bundle takes forever | Cache bundle in development (see render service) |
| Can't find composition | Ensure `src/remotion/index.ts` exports MainComposition |
| Progress stuck at 95% | Normal - FFmpeg finalizing, add user message |

## Next Steps After MVP Works

1. **Add database persistence** (replace in-memory state)
2. **Add R2 upload** (for permanent storage)
3. **Implement Lambda** (when you need scale)
4. **Add user quotas** (prevent abuse)

The beauty: Your API and UI don't change when you switch to Lambda!