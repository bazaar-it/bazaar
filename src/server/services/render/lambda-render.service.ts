// src/server/services/render/lambda-render.service.ts
import { renderState } from "../render/render-state";
import type { RenderConfig } from "./render.service";
import { qualitySettings } from "./render.service";
import type { AwsRegion } from "@remotion/lambda";

// Lambda render configuration
export interface LambdaRenderConfig extends RenderConfig {
  webhookUrl?: string;
  renderWidth?: number;
  renderHeight?: number;
}

// Use pre-deployed site URL (deployed via CLI: npx remotion lambda sites create)
const DEPLOYED_SITE_URL = process.env.REMOTION_SERVE_URL || "https://remotionlambda-useast1-yb1vzou9i7.s3.us-east-1.amazonaws.com/sites/bazaar-fresh-deploy/index.html";

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


// Main Lambda rendering function
export async function renderVideoOnLambda({
  projectId,
  scenes,
  format = 'mp4',
  quality = 'high',
  webhookUrl,
  renderWidth,
  renderHeight,
  audio,
}: LambdaRenderConfig) {
  console.log(`[LambdaRender] Starting Lambda render for project ${projectId}`);
  
  // Check configuration
  checkLambdaConfig();
  
  // Get quality settings
  const settings = qualitySettings[quality];
  
  try {
    // Use pre-deployed site URL
    const serveUrl = DEPLOYED_SITE_URL;
    console.log(`[LambdaRender] Using serve URL: ${serveUrl}`);
    
    // Calculate total duration
    const totalDuration = scenes.reduce((sum, scene) => {
      return sum + (scene.duration || 150); // Default 5 seconds at 30fps
    }, 0);
    
    // Use provided dimensions or fallback to quality settings
    const width = renderWidth || settings.resolution.width;
    const height = renderHeight || settings.resolution.height;
    
    console.log(`[LambdaRender] Starting render job...`);
    console.log(`[LambdaRender] Total duration: ${totalDuration} frames`);
    console.log(`[LambdaRender] Format: ${format}, Quality: ${quality}`);
    console.log(`[LambdaRender] Scenes: ${scenes.length}`);
    console.log(`[LambdaRender] Resolution: ${width}x${height} (provided: ${renderWidth}x${renderHeight}, settings: ${settings.resolution.width}x${settings.resolution.height})`);
    console.log(`[LambdaRender] Audio: ${audio ? `${audio.name} (${Math.round(audio.duration)}s)` : 'No audio'}`);
    if (audio) {
      console.log(`[LambdaRender] Audio URL: ${audio.url}`);
      console.log(`[LambdaRender] Audio volume: ${audio.volume}`);
      console.log(`[LambdaRender] Audio trim: ${audio.startTime}s - ${audio.endTime}s`);
    }
    
    // Log scene details to debug truncation issue
    console.log(`[LambdaRender] Scene data being passed to Lambda:`);
    scenes.forEach((scene, idx) => {
      console.log(`[LambdaRender] Scene ${idx}:`, {
        id: scene.id,
        name: scene.name,
        hasJsCode: !!scene.jsCode,
        jsCodeLength: scene.jsCode?.length || 0,
        jsCodeStart: scene.jsCode ? scene.jsCode.substring(0, 200) + '...' : 'NO JSCODE',
        jsCodeEnd: scene.jsCode ? '...' + scene.jsCode.substring(scene.jsCode.length - 200) : 'NO JSCODE',
        // Check if the jsCode contains the actual component functions
        hasComponentFunctions: scene.jsCode ? scene.jsCode.includes('function') && scene.jsCode.includes('return') : false,
        containsScriptArray: scene.jsCode ? scene.jsCode.includes('const script_') : false,
        hasExportDefault: scene.jsCode ? scene.jsCode.includes('export default') : false,
        hasReturnComponent: scene.jsCode ? scene.jsCode.includes('return Component') : false,
      });
    });
    
    // Dynamic import to avoid bundling issues
    const { renderMediaOnLambda } = await import("@remotion/lambda/client");
    
    // Start the render
    const { renderId, bucketName } = await renderMediaOnLambda({
      region: process.env.AWS_REGION as AwsRegion,
      functionName: process.env.REMOTION_FUNCTION_NAME!,
      serveUrl,
      composition: "MainCompositionSimple",
      inputProps: {
        scenes,
        projectId,
        width: width,
        height: height,
        audio,
      },
      codec: format === 'gif' ? 'gif' : 'h264',
      imageFormat: format === 'gif' ? 'png' : 'jpeg',
      jpegQuality: settings.jpegQuality,
      crf: format === 'gif' ? undefined : settings.crf,
      // Explicitly set audio codec for non-GIF formats
      audioCodec: format === 'gif' ? undefined : 'aac',
      audioBitrate: format === 'gif' ? undefined : '128k',
      privacy: "public",
      downloadBehavior: {
        type: "download",
        fileName: `bazaar-vid-export.${format}`,
      },
      webhook: webhookUrl ? {
        url: webhookUrl,
        secret: process.env.WEBHOOK_SECRET ?? null,
      } : undefined,
      maxRetries: 3,
      frameRange: totalDuration > 0 ? [0, totalDuration - 1] : undefined,
      outName: `renders/${projectId}-${Date.now()}.${format}`,
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
    const { getRenderProgress } = await import("@remotion/lambda/client");
    
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