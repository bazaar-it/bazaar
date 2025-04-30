# Remotion Lambda Rendering Pipeline

## Summary
- Documents the complete Lambda rendering pipeline for Bazaar-Vid
- Covers AWS setup, deployment, monitoring, and error handling
- Provides code examples for tRPC integration with Lambda rendering

## Architecture Overview

Bazaar-Vid uses Remotion Lambda for scalable, serverless video rendering. The pipeline consists of:

1. **Client-side video editing**: Using Remotion Player and JSON Patches
2. **tRPC API layer**: Handles rendering requests securely
3. **AWS Lambda function**: Performs the actual rendering
4. **S3 storage**: Stores rendered videos
5. **Webhook notifications**: Updates UI when renders complete

## Setting Up Lambda Infrastructure

### 1. AWS Resources Setup

```typescript
// src/scripts/setup-lambda.ts
import { deploySite } from '@remotion/lambda/client';
import { LambdaClient, GetFunctionCommand } from '@aws-sdk/client-lambda';

async function setupLambdaInfrastructure() {
  console.log('Setting up Remotion Lambda infrastructure...');
  
  // Deploy Remotion site
  const { serveUrl, bucketName } = await deploySite({
    entryPoint: './src/remotion/index.ts',
    region: process.env.REMOTION_REGION!,
    cloudFrontDistributionId: process.env.REMOTION_CLOUDFRONT_DISTRIBUTION_ID,
  });
  
  console.log(`Remotion site deployed to: ${serveUrl}`);
  console.log(`S3 Bucket: ${bucketName}`);
  
  // Check if Lambda function already exists
  const lambdaClient = new LambdaClient({
    region: process.env.REMOTION_REGION,
    credentials: {
      accessKeyId: process.env.REMOTION_AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.REMOTION_AWS_SECRET_ACCESS_KEY!,
    },
  });
  
  try {
    await lambdaClient.send(
      new GetFunctionCommand({
        FunctionName: process.env.REMOTION_FUNCTION_NAME,
      })
    );
    console.log('Lambda function already exists');
  } catch (err) {
    console.log('Creating new Lambda function...');
    // Call the function to create Lambda resources
    await createLambdaFunction();
  }
}

// Execute if called directly
if (require.main === module) {
  setupLambdaInfrastructure()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Error setting up Lambda infrastructure:', err);
      process.exit(1);
    });
}
```

### 2. Lambda Function Setup

```typescript
// src/scripts/create-lambda.ts
import { MemorySize } from '@remotion/lambda';
import { getOrCreateBucket, deployFunction } from '@remotion/lambda/client';

export async function createLambdaFunction() {
  // Create or get S3 bucket for renders
  const { bucketName } = await getOrCreateBucket({
    region: process.env.REMOTION_REGION!,
  });
  
  // Deploy the Lambda function
  const { functionName } = await deployFunction({
    region: process.env.REMOTION_REGION!,
    timeoutInSeconds: 300, // 5 minutes
    memorySizeInMb: MemorySize.gb4,
    createCloudWatchLogGroup: true,
    overwrite: false,
    diskSizeInMb: 2048, // 2GB disk
  });
  
  console.log(`Lambda function "${functionName}" created successfully`);
  console.log(`Renders will be stored in bucket: ${bucketName}`);
  
  // Output instructions for environment variables
  console.log('\nAdd these to your .env file:');
  console.log(`REMOTION_FUNCTION_NAME=${functionName}`);
  console.log(`REMOTION_S3_BUCKET=${bucketName}`);
}
```

## tRPC Render Pipeline Integration

### 1. Render Router

```typescript
// src/server/api/routers/render.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { 
  renderMediaOnLambda, 
  getRenderProgress,
  cancelRender,
} from "@remotion/lambda/client";
import { getLambdaClient } from "~/lib/remotion-lambda";
import { videoRenders } from "~/db/schema";
import { eq } from "drizzle-orm";

export const renderRouter = createTRPCRouter({
  // Start a render job
  startRender: protectedProcedure
    .input(z.object({
      inputProps: z.any(),
      webhookUrl: z.string().url().optional(),
      composition: z.string().default("DynamicVideo"),
    }))
    .mutation(async ({ ctx, input }) => {
      const lambdaClient = getLambdaClient();
      
      try {
        const renderId = await renderMediaOnLambda({
          serveUrl: process.env.REMOTION_SERVE_URL!,
          composition: input.composition,
          inputProps: input.inputProps,
          codec: "h264",
          imageFormat: "jpeg",
          maxRetries: 3,
          privacy: "public",
          webhook: input.webhookUrl,
          region: process.env.REMOTION_REGION!,
          functionName: process.env.REMOTION_FUNCTION_NAME!,
          jpegQuality: 80,
        });
        
        // Store render details in database
        await ctx.db.insert(videoRenders).values({
          id: renderId,
          userId: ctx.session.user.id,
          status: "rendering",
          props: input.inputProps,
          createdAt: new Date(),
        });
        
        return { renderId };
      } catch (err) {
        console.error("Lambda render error:", err);
        throw new Error(`Failed to start render: ${err.message}`);
      }
    }),

  // Get render progress
  getRenderProgress: protectedProcedure
    .input(z.object({
      renderId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const lambdaClient = getLambdaClient();
      
      try {
        const progress = await getRenderProgress({
          renderId: input.renderId,
          functionName: process.env.REMOTION_FUNCTION_NAME!,
          region: process.env.REMOTION_REGION!,
        });
        
        // Update status in database if needed
        if (progress.status === 'done' || progress.status === 'error') {
          await ctx.db.update(videoRenders)
            .set({ 
              status: progress.status, 
              outputUrl: progress.outputUrl,
              updatedAt: new Date(),
            })
            .where(eq(videoRenders.id, input.renderId));
        }
        
        return progress;
      } catch (err) {
        console.error("Error getting render progress:", err);
        throw new Error(`Failed to get render progress: ${err.message}`);
      }
    }),

  // Cancel a render
  cancelRender: protectedProcedure
    .input(z.object({
      renderId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const lambdaClient = getLambdaClient();
      
      try {
        await cancelRender({
          renderId: input.renderId,
          functionName: process.env.REMOTION_FUNCTION_NAME!,
          region: process.env.REMOTION_REGION!,
        });
        
        // Update status in database
        await ctx.db.update(videoRenders)
          .set({ 
            status: "cancelled", 
            updatedAt: new Date(),
          })
          .where(eq(videoRenders.id, input.renderId));
        
        return { success: true };
      } catch (err) {
        console.error("Error cancelling render:", err);
        throw new Error(`Failed to cancel render: ${err.message}`);
      }
    }),
});
```

### 2. Database Schema

```typescript
// src/db/schema.ts
import { relations } from "drizzle-orm";
import { 
  pgTable, 
  text, 
  timestamp, 
  uuid, 
  json 
} from "drizzle-orm/pg-core";
import { users } from "./auth";

export const videoRenders = pgTable("video_renders", {
  id: text("id").primaryKey(), // Remotion render ID
  userId: text("user_id").notNull().references(() => users.id),
  projectId: uuid("project_id").references(() => projects.id),
  status: text("status").notNull().default("pending"),
  props: json("props").notNull(),
  outputUrl: text("output_url"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const videoRendersRelations = relations(videoRenders, ({ one }) => ({
  user: one(users, {
    fields: [videoRenders.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [videoRenders.projectId],
    references: [projects.id],
  }),
}));
```

## Client-Side Integration

### 1. Render Hook

```typescript
// src/hooks/useRenderVideo.ts
'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { useVideoState } from "~/store/videoState";
import { toast } from "~/components/ui/use-toast";

export function useRenderVideo() {
  const router = useRouter();
  const { inputProps } = useVideoState();
  const [renderId, setRenderId] = useState<string | null>(null);
  const [renderStatus, setRenderStatus] = useState<string | null>(null);
  
  // Start render mutation
  const startRender = api.render.startRender.useMutation({
    onSuccess: (data) => {
      setRenderId(data.renderId);
      setRenderStatus("rendering");
      toast({
        title: "Rendering started",
        description: "Your video is being rendered. This may take a few minutes.",
      });
    },
    onError: (error) => {
      toast({
        title: "Render failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Get render progress query
  const renderProgress = api.render.getRenderProgress.useQuery(
    { renderId: renderId! },
    {
      enabled: !!renderId && renderStatus === "rendering",
      refetchInterval: 2000, // Poll every 2 seconds
      onSuccess: (data) => {
        setRenderStatus(data.status);
        
        if (data.status === "done") {
          toast({
            title: "Render complete",
            description: "Your video has been rendered successfully.",
          });
          
          // Navigate to the video page
          if (data.outputUrl) {
            router.push(`/videos/${renderId}`);
          }
        }
        
        if (data.status === "error") {
          toast({
            title: "Render failed",
            description: data.errorMessage || "An unknown error occurred.",
            variant: "destructive",
          });
        }
      },
    }
  );
  
  // Cancel render mutation
  const cancelRender = api.render.cancelRender.useMutation({
    onSuccess: () => {
      setRenderStatus("cancelled");
      toast({
        title: "Render cancelled",
        description: "Your video render has been cancelled.",
      });
    },
  });
  
  // Handle render button click
  const handleRender = () => {
    startRender.mutate({
      inputProps,
      webhookUrl: `${window.location.origin}/api/webhooks/render`,
    });
  };
  
  // Handle cancel button click
  const handleCancel = () => {
    if (renderId) {
      cancelRender.mutate({ renderId });
    }
  };
  
  return {
    handleRender,
    handleCancel,
    isRendering: renderStatus === "rendering",
    renderProgress: renderProgress.data?.progress || 0,
    renderStatus,
    isRenderLoading: startRender.isLoading,
  };
}
```

### 2. Render Button Component

```tsx
// src/components/client/RenderButton.tsx
'use client';

import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { useRenderVideo } from "~/hooks/useRenderVideo";
import { IconMovie, IconX } from "~/components/ui/icons";

export const RenderButton: React.FC = () => {
  const {
    handleRender,
    handleCancel,
    isRendering,
    renderProgress,
    renderStatus,
    isRenderLoading,
  } = useRenderVideo();
  
  return (
    <div className="flex flex-col gap-2">
      {isRendering ? (
        <>
          <div className="flex items-center gap-2">
            <Progress value={renderProgress * 100} className="flex-1" />
            <span className="text-sm text-muted-foreground">
              {Math.round(renderProgress * 100)}%
            </span>
          </div>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={handleCancel}
            className="w-full"
          >
            <IconX className="mr-2 h-4 w-4" />
            Cancel Render
          </Button>
        </>
      ) : (
        <Button
          onClick={handleRender}
          disabled={isRenderLoading}
          className="w-full"
        >
          <IconMovie className="mr-2 h-4 w-4" />
          {isRenderLoading ? "Starting Render..." : "Render Video"}
        </Button>
      )}
    </div>
  );
};
```

## Webhook Handler for Render Completion

```typescript
// src/app/api/webhooks/render/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "~/db";
import { videoRenders } from "~/db/schema";
import { eq } from "drizzle-orm";
import { RenderCompleteWebhookBody } from "@remotion/lambda/client";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as RenderCompleteWebhookBody;
  
  // Validate webhook signature if needed
  // const signature = req.headers.get('x-remotion-signature');
  
  try {
    // Update video render status in database
    await db
      .update(videoRenders)
      .set({
        status: body.status,
        outputUrl: body.outputUrl,
        errorMessage: body.errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(videoRenders.id, body.id));
    
    // Send notifications, update cache, etc.
    // ...
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing render webhook:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}
```

## Cost Optimization and Performance Tuning

### Memory and Timeout Configuration

Optimal settings for different video types:

| Video Type | Memory Size | Timeout | Disk Size | Notes |
|------------|-------------|---------|-----------|-------|
| Short (< 30s) | 2GB | 120s | 512MB | Good for simple animations |
| Medium (30s-2m) | 4GB | 300s | 1GB | Standard settings |
| Long (2m+) | 8GB | 600s | 2GB+ | For complex compositions |
| 4K Video | 16GB | 900s | 4GB+ | High resolution renders |

### Cost-Saving Strategies

1. **Render preview at lower quality**: Use a lower resolution and bit rate for previews
2. **Batch processing**: Queue renders and process them in batches during off-peak hours
3. **Cache rendered segments**: Cache commonly used intro/outro sequences

```typescript
// Example of rendering at different qualities
export async function renderWithQualityPresets(
  inputProps: InputProps,
  quality: 'preview' | 'standard' | 'high'
) {
  const presets = {
    preview: {
      resolution: { width: 640, height: 360 },
      jpegQuality: 70,
      codec: 'h264',
      crf: 28,
    },
    standard: {
      resolution: { width: 1280, height: 720 },
      jpegQuality: 80,
      codec: 'h264',
      crf: 23,
    },
    high: {
      resolution: { width: 1920, height: 1080 },
      jpegQuality: 90,
      codec: 'h264',
      crf: 18,
    },
  };
  
  const settings = presets[quality];
  
  return renderMediaOnLambda({
    composition: 'DynamicVideo',
    serveUrl: process.env.REMOTION_SERVE_URL!,
    inputProps,
    codec: settings.codec as any,
    jpegQuality: settings.jpegQuality,
    crf: settings.crf,
    imageFormat: 'jpeg',
    fps: 30,
    width: settings.resolution.width,
    height: settings.resolution.height,
    // ...other settings
  });
}
```

## Error Handling and Monitoring

### CloudWatch Integration

Monitor Lambda metrics and logs via CloudWatch:

```typescript
// src/lib/monitoring.ts
import { CloudWatchLogsClient, GetLogEventsCommand } from "@aws-sdk/client-cloudwatch-logs";

export async function getLambdaLogs(renderId: string) {
  const client = new CloudWatchLogsClient({
    region: process.env.REMOTION_REGION!,
    credentials: {
      accessKeyId: process.env.REMOTION_AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.REMOTION_AWS_SECRET_ACCESS_KEY!,
    },
  });
  
  const logGroupName = `/aws/lambda/${process.env.REMOTION_FUNCTION_NAME}`;
  const logStreamName = `remotion-render-${renderId}`;
  
  try {
    const response = await client.send(
      new GetLogEventsCommand({
        logGroupName,
        logStreamName,
        startFromHead: true,
      })
    );
    
    return response.events?.map((event) => event.message).join("\n");
  } catch (err) {
    console.error("Error fetching Lambda logs:", err);
    return "No logs available";
  }
}
```

### Common Error Resolution

| Error Type | Possible Cause | Resolution |
|------------|----------------|------------|
| Memory Exceeded | Complex composition | Increase Lambda memory size |
| Timeout | Render takes too long | Increase timeout setting |
| Asset Loading | Failed to load external assets | Use preloadAssets() or check URLs |
| S3 Permissions | Lambda can't write to bucket | Check IAM permissions |
| Webhook Failure | Invalid webhook URL | Verify webhook URL format and accessibility |

## References

- [Remotion Lambda Documentation](https://www.remotion.dev/docs/lambda)
- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [tRPC Documentation](https://trpc.io/docs)

## Related Documentation

- [Next.js App Router Integration](./next-app-router-integration.md)
- [Tailwind and Shadcn UI Integration](./tailwind-shadcn-integration.md)
