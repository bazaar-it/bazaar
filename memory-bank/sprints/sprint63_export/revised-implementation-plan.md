# Revised Export Implementation Plan

## SSR → Lambda Migration Path (No Wasted Work!)

### What Gets Reused When Moving to Lambda

1. **Database Schema** - Same tables, just add Lambda-specific fields
2. **Export UI Components** - Identical user experience
3. **Progress Tracking UI** - Switch from SSE to polling/webhooks
4. **R2/S3 Storage Logic** - Same upload patterns
5. **Quality Presets & Codecs** - Shared configuration
6. **Error Handling** - Most patterns transfer directly
7. **API Interface** - Same tRPC procedures, different implementation

### What Changes

- `renderMedia()` → `renderMediaOnLambda()`
- Local file paths → S3 URLs
- Synchronous → Asynchronous rendering
- Direct progress → Webhook/polling

## Week 1: Hardened SSR Implementation

### Day 1-2: Core Render Service with Queue

```typescript
// src/server/services/queue/render-queue.ts
import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import { renderVideo } from "../render/render.service";

// Redis connection for queue
const connection = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  maxRetriesPerRequest: null,
});

// Create render queue
export const renderQueue = new Queue("video-renders", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

// Create worker with concurrency limit
export const renderWorker = new Worker(
  "video-renders",
  async (job) => {
    const { projectId, scenes, format, quality, renderId } = job.data;
    
    // Update progress
    await job.updateProgress(0);
    
    try {
      const result = await renderVideo({
        projectId,
        scenes,
        format,
        quality,
        onProgress: (progress) => {
          job.updateProgress(Math.round(progress * 100));
        },
      });
      
      return result;
    } catch (error) {
      // Log detailed error for debugging
      console.error(`Render failed for ${projectId}:`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 1, // Only 1 render at a time to prevent OOM
    limiter: {
      max: 1,
      duration: 1000,
    },
  }
);

// Monitor worker events
renderWorker.on("completed", (job, result) => {
  console.log(`Render completed: ${job.id}`);
});

renderWorker.on("failed", (job, err) => {
  console.error(`Render failed: ${job?.id}`, err);
});
```

### Day 2-3: Enhanced Render Service with Caching

```typescript
// src/server/services/render/render.service.ts
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

// Cache bundled output for development
const BUNDLE_CACHE = new Map<string, string>();
const BUNDLE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function renderVideo({
  projectId,
  scenes,
  format = "mp4",
  quality = "high",
  onProgress,
}: {
  projectId: string;
  scenes: any[];
  format: "mp4" | "webm" | "gif";
  quality: "low" | "medium" | "high";
  onProgress?: (progress: number) => void;
}) {
  // Generate cache key for bundle
  const bundleKey = crypto
    .createHash("md5")
    .update(JSON.stringify({ scenes: scenes.length }))
    .digest("hex");

  let bundleLocation: string;
  
  // Use cached bundle in development
  if (process.env.NODE_ENV === "development" && BUNDLE_CACHE.has(bundleKey)) {
    bundleLocation = BUNDLE_CACHE.get(bundleKey)!;
    console.log("Using cached bundle");
  } else {
    // Bundle with increased memory
    bundleLocation = await bundle({
      entryPoint: path.resolve("./src/remotion/index.ts"),
      onProgress: (progress) => {
        console.log(`Bundling: ${Math.round(progress * 100)}%`);
        onProgress?.(progress * 0.1); // Bundle is 10% of total progress
      },
    });
    
    if (process.env.NODE_ENV === "development") {
      BUNDLE_CACHE.set(bundleKey, bundleLocation);
      setTimeout(() => BUNDLE_CACHE.delete(bundleKey), BUNDLE_CACHE_TTL);
    }
  }

  // Get composition with validation
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "MainComposition",
    inputProps: { scenes, projectId },
  });

  // Resolution and quality mappings
  const qualitySettings = {
    low: { 
      crf: 28, 
      jpegQuality: 70,
      resolution: { width: 1280, height: 720 },
      videoBitrate: "1M",
    },
    medium: { 
      crf: 23, 
      jpegQuality: 80,
      resolution: { width: 1920, height: 1080 },
      videoBitrate: "2.5M",
    },
    high: { 
      crf: 18, 
      jpegQuality: 90,
      resolution: { width: 1920, height: 1080 },
      videoBitrate: "5M",
    },
  };

  const settings = qualitySettings[quality];

  // Ensure output directory exists
  const outputDir = `/tmp/renders/${projectId}`;
  await fs.mkdir(outputDir, { recursive: true });
  
  const outputPath = `${outputDir}/${Date.now()}.${format}`;
  
  // Render with proper settings
  await renderMedia({
    composition: {
      ...composition,
      width: settings.resolution.width,
      height: settings.resolution.height,
    },
    serveUrl: bundleLocation,
    codec: format === "gif" ? "gif" : "h264",
    outputLocation: outputPath,
    inputProps: { scenes, projectId },
    crf: format !== "gif" ? settings.crf : undefined,
    jpegQuality: settings.jpegQuality,
    videoBitrate: format === "mp4" ? settings.videoBitrate : undefined,
    onProgress: ({ progress }) => {
      // Bundle was 10%, render is remaining 90%
      const totalProgress = 0.1 + (progress * 0.9);
      console.log(`Rendering: ${Math.round(totalProgress * 100)}%`);
      onProgress?.(totalProgress);
    },
    // Prevent timeouts on long renders
    timeoutInMilliseconds: 30 * 60 * 1000, // 30 minutes
    // Use more threads for faster rendering
    concurrency: "50%",
  });

  // Get file stats
  const stats = await fs.stat(outputPath);
  
  // Upload to R2
  const uploadUrl = await uploadToR2({
    filePath: outputPath,
    key: `renders/${projectId}/${path.basename(outputPath)}`,
    metadata: {
      format,
      quality,
      fileSize: stats.size.toString(),
      duration: composition.durationInFrames / composition.fps,
    },
  });

  // Clean up temp file
  await fs.unlink(outputPath).catch(() => {});

  return {
    url: uploadUrl,
    format,
    quality,
    fileSize: stats.size,
    duration: composition.durationInFrames / composition.fps,
    resolution: settings.resolution,
  };
}
```

### Day 3-4: SSE Progress Implementation

```typescript
// src/app/api/render-progress/[renderId]/route.ts
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "~/server/auth";
import { renderQueue } from "~/server/services/queue/render-queue";

export async function GET(
  req: NextRequest,
  { params }: { params: { renderId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: any) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      // Get job from queue
      const job = await renderQueue.getJob(params.renderId);
      
      if (!job) {
        sendEvent({ error: "Render job not found" });
        controller.close();
        return;
      }

      // Send initial status
      sendEvent({
        status: await job.getState(),
        progress: job.progress || 0,
      });

      // Poll for updates
      const interval = setInterval(async () => {
        const state = await job.getState();
        const progress = job.progress || 0;

        sendEvent({ status: state, progress });

        // Close stream when done
        if (["completed", "failed"].includes(state)) {
          if (state === "completed") {
            const result = await job.returnvalue;
            sendEvent({ status: "completed", result });
          } else {
            const failedReason = job.failedReason;
            sendEvent({ status: "failed", error: failedReason });
          }
          
          clearInterval(interval);
          controller.close();
        }
      }, 1000);

      // Clean up on disconnect
      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

### Day 5: Updated Database Schema

```typescript
// src/server/db/schema.ts
export const videoRenders = pgTable("video_renders", {
  id: uuid("id").defaultRandom().primaryKey(),
  
  // User & Project
  userId: varchar("user_id", { length: 255 }).notNull(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  
  // Render Details
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  format: varchar("format", { length: 10 }).notNull().default("mp4"),
  quality: varchar("quality", { length: 20 }).notNull().default("high"),
  
  // Queue Details (works for both SSR and Lambda)
  queueJobId: varchar("queue_job_id", { length: 255 }),
  
  // Lambda Details (null for SSR, populated for Lambda)
  lambdaRenderId: varchar("lambda_render_id", { length: 255 }),
  lambdaFunctionName: varchar("lambda_function_name", { length: 255 }),
  lambdaBucketName: varchar("lambda_bucket_name", { length: 255 }),
  
  // Output
  outputUrl: text("output_url"),
  thumbnailUrl: text("thumbnail_url"),
  
  // Metadata
  metadata: json("metadata").$type<{
    duration?: number;
    fileSize?: number;
    resolution?: { width: number; height: number };
    fps?: number;
    codec?: string;
    bitrate?: string;
  }>(),
  
  // Error Tracking
  errorMessage: text("error_message"),
  errorStack: text("error_stack"),
  retryCount: integer("retry_count").default(0),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  
  // Indexes for performance
}, (table) => ({
  statusCreatedAtIdx: index("status_created_at_idx").on(table.status, table.createdAt),
  userIdIdx: index("user_id_idx").on(table.userId),
  projectIdIdx: index("project_id_idx").on(table.projectId),
}));
```

## Week 2: Hardening & Polish

### Key Improvements

1. **Memory Management**
```bash
# package.json scripts
"scripts": {
  "dev": "NODE_OPTIONS='--max-old-space-size=4096' next dev",
  "render-worker": "NODE_OPTIONS='--max-old-space-size=8192' tsx src/server/workers/render.worker.ts"
}
```

2. **Asset Pre-fetching**
```typescript
// src/server/services/render/asset-prefetch.ts
export async function prefetchAssets(scenes: any[]) {
  const assetUrls = extractAssetUrls(scenes);
  
  // Download and cache all assets
  await Promise.all(
    assetUrls.map(async (url) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Asset not found: ${url}`);
      }
      // Cache to local temp directory
      return cacheAsset(url, await response.buffer());
    })
  );
}
```

3. **User Quotas**
```typescript
// Check quota before queuing
const todayRenders = await db.query.videoRenders.findMany({
  where: and(
    eq(videoRenders.userId, ctx.session.user.id),
    gte(videoRenders.createdAt, startOfDay(new Date()))
  ),
});

if (todayRenders.length >= USER_DAILY_EXPORT_LIMIT) {
  throw new Error(`Daily export limit reached (${USER_DAILY_EXPORT_LIMIT})`);
}
```

## Week 3-4: Lambda Migration

### What Changes in Code

```typescript
// src/server/services/render/render.service.ts
// Add Lambda-specific implementation

import { renderMediaOnLambda, getRenderProgress } from "@remotion/lambda/client";

export async function renderVideoLambda({
  projectId,
  scenes,
  format,
  quality,
  webhookUrl,
}: RenderOptions & { webhookUrl?: string }) {
  const settings = qualitySettings[quality];
  
  // Deploy site if needed (cached in production)
  const { serveUrl } = await deploySite({
    entryPoint: "./src/remotion/index.ts",
    siteName: "bazaar-vid-compositions",
  });
  
  // Start Lambda render
  const { renderId, bucketName } = await renderMediaOnLambda({
    region: process.env.AWS_REGION!,
    functionName: process.env.REMOTION_FUNCTION_NAME!,
    serveUrl,
    composition: "MainComposition",
    inputProps: { scenes, projectId },
    codec: format === "gif" ? "gif" : "h264",
    imageFormat: "jpeg",
    jpegQuality: settings.jpegQuality,
    crf: settings.crf,
    privacy: "public",
    downloadBehavior: {
      type: "download",
      fileName: `${projectId}-${Date.now()}.${format}`,
    },
    webhook: webhookUrl ? {
      url: webhookUrl,
      secret: process.env.WEBHOOK_SECRET,
    } : undefined,
    // Lambda-specific optimizations
    maxRetries: 3,
    framesPerLambda: 20, // Tune based on video length
    memorySizeInMb: 3008, // 3GB default, increase for 4K
    diskSizeInMb: 10240, // 10GB default, increase for long videos
    timeoutInSeconds: 900, // 15 minutes max
  });
  
  return { renderId, bucketName };
}
```

### Environment-based Routing

```typescript
// src/server/api/routers/render.ts
const isLambdaEnabled = process.env.RENDER_MODE === "lambda";

// In startRender mutation
if (isLambdaEnabled) {
  const { renderId, bucketName } = await renderVideoLambda({
    // ... options
    webhookUrl: `${process.env.NEXTAUTH_URL}/api/webhooks/render`,
  });
  
  // Store Lambda-specific details
  render.lambdaRenderId = renderId;
  render.lambdaBucketName = bucketName;
} else {
  // Queue for SSR
  const job = await renderQueue.add("render", {
    renderId: render.id,
    projectId: input.projectId,
    scenes: project.scenes,
    format: input.format,
    quality: input.quality,
  });
  
  render.queueJobId = job.id;
}
```

## Cost Controls & Monitoring

```typescript
// src/server/services/monitoring/render-costs.ts
export async function estimateRenderCost(duration: number, quality: string) {
  const memoryGB = quality === "high" ? 3 : 2;
  const estimatedSeconds = duration * 2; // Rough estimate
  
  // Lambda pricing: $0.0000166667 per GB-second
  const lambdaCost = (memoryGB * estimatedSeconds * 0.0000166667);
  
  // S3 storage: $0.023 per GB
  const estimatedSizeGB = (duration / 60) * (quality === "high" ? 0.5 : 0.2);
  const storageCost = estimatedSizeGB * 0.023;
  
  return {
    estimated: lambdaCost + storageCost,
    breakdown: { compute: lambdaCost, storage: storageCost },
  };
}

// Check before render
if (estimatedCost.estimated > MAX_RENDER_COST) {
  throw new Error(`Render too expensive: $${estimatedCost.estimated.toFixed(2)}`);
}
```

## Migration Checklist

- [ ] Set up AWS account with billing alerts
- [ ] Request Lambda concurrency increase (default 1000 → 5000)
- [ ] Deploy Remotion site to S3
- [ ] Create Lambda function with 10GB+ disk
- [ ] Set up CloudFront distribution
- [ ] Update environment variables
- [ ] Test webhook signature verification
- [ ] Switch RENDER_MODE="lambda" in production
- [ ] Monitor first production renders closely

## Timeline Summary

| Week | SSR Work | Lambda Prep | Status |
|------|----------|-------------|---------|
| 1 | Core implementation + Queue + SSE | - | ✅ MVP Ready |
| 2 | Error handling + Quotas + Polish | AWS account setup | ✅ Production SSR |
| 3 | - | Lambda deploy + Testing | 🔄 Parallel work |
| 4 | - | Migration + Monitoring | ✅ Lambda ready |

The beauty: 90% of Week 1-2 code stays unchanged. You're just swapping the render engine!