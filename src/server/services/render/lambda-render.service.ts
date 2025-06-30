// src/server/services/render/lambda-render.service.ts
import { renderState } from "../render/render-state";
import type { RenderConfig } from "./render.service";
import { qualitySettings } from "./render.service";
import type { AwsRegion } from "@remotion/lambda";

// Lambda render configuration
export interface LambdaRenderConfig extends RenderConfig {
  webhookUrl?: string;
}

// Cache the serve URL for better performance
let cachedServeUrl: string | null = null;
let lastDeployTime = 0;
const DEPLOY_CACHE_DURATION = 1000 * 60 * 60; // 1 hour

// Check if Lambda is properly configured
function checkLambdaConfig() {
  const required = [
    'REMOTION_FUNCTION_NAME',
    'REMOTION_BUCKET_NAME',
    'AWS_REGION',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `Lambda configuration incomplete. Missing environment variables: ${missing.join(', ')}. ` +
      `Please follow the setup guide in /memory-bank/sprints/sprint63_export/lambda-setup.md`
    );
  }
}

// Deploy site to S3 (cached for performance)
async function deployComposition() {
  const now = Date.now();
  
  // Use cached URL if recent
  if (cachedServeUrl && (now - lastDeployTime < DEPLOY_CACHE_DURATION)) {
    console.log("[LambdaRender] Using cached serve URL");
    return cachedServeUrl;
  }
  
  console.log("[LambdaRender] Deploying composition to S3...");
  
  try {
    // Dynamic import to avoid bundling issues
    const { deploySite } = await import("@remotion/lambda");
    
    const { serveUrl } = await deploySite({
      entryPoint: "./src/remotion/index.tsx",
      bucketName: process.env.REMOTION_BUCKET_NAME!,
      region: process.env.AWS_REGION as AwsRegion,
      options: {
        onBundleProgress: (progress) => {
          console.log(`[LambdaRender] Bundle progress: ${Math.round(progress * 100)}%`);
        },
      },
    });
    
    cachedServeUrl = serveUrl;
    lastDeployTime = now;
    
    console.log(`[LambdaRender] Composition deployed: ${serveUrl}`);
    return serveUrl;
  } catch (error) {
    console.error("[LambdaRender] Failed to deploy composition:", error);
    throw new Error("Failed to deploy composition to S3. Check AWS credentials and permissions.");
  }
}

// Main Lambda rendering function
export async function renderVideoOnLambda({
  projectId,
  scenes,
  format = 'mp4',
  quality = 'high',
  webhookUrl,
}: LambdaRenderConfig) {
  console.log(`[LambdaRender] Starting Lambda render for project ${projectId}`);
  
  // Check configuration
  checkLambdaConfig();
  
  // Get quality settings
  const settings = qualitySettings[quality];
  
  try {
    // Deploy composition to S3
    const serveUrl = await deployComposition();
    
    // Calculate total duration
    const totalDuration = scenes.reduce((sum, scene) => {
      return sum + (scene.duration || 150); // Default 5 seconds at 30fps
    }, 0);
    
    console.log(`[LambdaRender] Starting render job...`);
    console.log(`[LambdaRender] Total duration: ${totalDuration} frames`);
    console.log(`[LambdaRender] Format: ${format}, Quality: ${quality}`);
    
    // Dynamic import to avoid bundling issues
    const { renderMediaOnLambda } = await import("@remotion/lambda");
    
    // Start the render
    const { renderId, bucketName } = await renderMediaOnLambda({
      region: process.env.AWS_REGION as AwsRegion,
      functionName: process.env.REMOTION_FUNCTION_NAME!,
      serveUrl,
      composition: "MainComposition",
      inputProps: {
        scenes,
        projectId,
      },
      codec: format === 'gif' ? 'gif' : 'h264',
      imageFormat: format === 'gif' ? 'png' : 'jpeg',
      jpegQuality: settings.jpegQuality,
      crf: format === 'gif' ? undefined : settings.crf,
      privacy: "public",
      downloadBehavior: {
        type: "download",
        fileName: `bazaar-vid-${projectId}.${format}`,
      },
      webhook: webhookUrl ? {
        url: webhookUrl,
        secret: process.env.WEBHOOK_SECRET ?? null,
      } : undefined,
      maxRetries: 3,
      frameRange: totalDuration > 0 ? [0, totalDuration - 1] : undefined,
      outName: `${projectId}.${format}`,
    });
    
    console.log(`[LambdaRender] Render started successfully`);
    console.log(`[LambdaRender] Render ID: ${renderId}`);
    console.log(`[LambdaRender] Bucket: ${bucketName}`);
    
    return { renderId, bucketName };
  } catch (error) {
    console.error("[LambdaRender] Render failed:", error);
    
    // Provide helpful error messages
    if (error instanceof Error) {
      if (error.message.includes("UnrecognizedClientException")) {
        throw new Error(
          "AWS credentials not configured properly. Please run 'aws configure' and ensure your credentials have the necessary permissions."
        );
      }
      if (error.message.includes("NoSuchBucket")) {
        throw new Error(
          "S3 bucket not found. Please run 'npx remotion lambda buckets create' to create the required bucket."
        );
      }
      if (error.message.includes("ResourceNotFoundException")) {
        throw new Error(
          "Lambda function not found. Please run 'npx remotion lambda functions deploy' to deploy the rendering function."
        );
      }
      if (error.message.includes("TooManyRequestsException")) {
        throw new Error(
          "AWS Lambda quota exceeded. Please check your concurrent execution limits in the AWS console."
        );
      }
    }
    
    throw error;
  }
}

// Get render progress from Lambda
export async function getLambdaRenderProgress(renderId: string, bucketName: string) {
  try {
    // Dynamic import to avoid bundling issues
    const { getRenderProgress } = await import("@remotion/lambda");
    
    const progress = await getRenderProgress({
      renderId,
      bucketName,
      region: process.env.AWS_REGION as AwsRegion,
      functionName: process.env.REMOTION_FUNCTION_NAME!,
    });
    
    return {
      overallProgress: progress.overallProgress,
      renderedFrames: progress.framesRendered,
      encodedFrames: progress.encodingStatus?.framesEncoded || 0,
      currentTime: progress.costs?.accruedSoFar,
      done: progress.done,
      outputFile: progress.outputFile,
      errors: progress.errors,
    };
  } catch (error) {
    console.error("[LambdaRender] Failed to get progress:", error);
    throw error;
  }
}