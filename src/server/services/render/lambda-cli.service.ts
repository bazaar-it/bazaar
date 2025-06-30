// src/server/services/render/lambda-cli.service.ts
import { renderMediaOnLambda, getRenderProgress } from "@remotion/lambda/client";
import type { AwsRegion } from "@remotion/lambda";
import type { RenderConfig } from "./render.service";
import { qualitySettings } from "./render.service";

// Lambda render configuration
export interface LambdaRenderConfig extends RenderConfig {
  webhookUrl?: string;
}

// Use the deployed site URL from environment or the new fixed version
const DEPLOYED_SITE_URL = process.env.REMOTION_SERVE_URL || "https://remotionlambda-useast1-yb1vzou9i7.s3.us-east-1.amazonaws.com/sites/bazaar-vid-fixed/index.html";

// Main Lambda rendering function using programmatic API
export async function renderVideoOnLambda({
  projectId,
  scenes,
  format = 'mp4',
  quality = 'high',
  webhookUrl,
}: LambdaRenderConfig) {
  console.log(`[LambdaRender] Starting Lambda render for project ${projectId}`);
  console.log(`[LambdaRender] Environment info:`, {
    NODE_ENV: process.env.NODE_ENV,
    AWS_REGION: process.env.AWS_REGION ? 'set' : 'missing',
    REMOTION_FUNCTION_NAME: process.env.REMOTION_FUNCTION_NAME ? 'set' : 'missing',
    REMOTION_BUCKET_NAME: process.env.REMOTION_BUCKET_NAME ? 'set' : 'missing',
  });
  
  // Check required environment variables
  if (!process.env.AWS_REGION || !process.env.REMOTION_FUNCTION_NAME || !process.env.REMOTION_BUCKET_NAME) {
    const missing = [];
    if (!process.env.AWS_REGION) missing.push('AWS_REGION');
    if (!process.env.REMOTION_FUNCTION_NAME) missing.push('REMOTION_FUNCTION_NAME');
    if (!process.env.REMOTION_BUCKET_NAME) missing.push('REMOTION_BUCKET_NAME');
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Get quality settings
  const settings = qualitySettings[quality];
  
  try {
    // Calculate total duration
    const totalDuration = scenes.reduce((sum, scene) => {
      return sum + (scene.duration || 150); // Default 5 seconds at 30fps
    }, 0);
    
    console.log(`[LambdaRender] Total duration: ${totalDuration} frames`);
    console.log(`[LambdaRender] Format: ${format}, Quality: ${quality}`);
    
    // Log what we're sending to Lambda
    console.log(`[LambdaRender] Scenes being sent to Lambda:`, scenes.map(s => ({
      id: s.id,
      hasJsCode: !!s.jsCode,
      hasCompiledCode: !!s.compiledCode,
      hasTsxCode: !!s.tsxCode,
      jsCodePreview: s.jsCode ? s.jsCode.substring(0, 100) + '...' : 'none',
    })));
    
    // Prepare input props
    const inputProps = {
      scenes,
      projectId,
    };
    
    // Determine codec based on format
    const codec = format === 'gif' ? 'gif' : format === 'webm' ? 'vp8' : 'h264';
    
    console.log(`[LambdaRender] Using programmatic API to render...`);
    
    // Use the programmatic API
    const { renderId, bucketName } = await renderMediaOnLambda({
      region: process.env.AWS_REGION as AwsRegion,
      functionName: process.env.REMOTION_FUNCTION_NAME!,
      serveUrl: DEPLOYED_SITE_URL,
      composition: "MainComposition",
      inputProps,
      codec,
      imageFormat: format === 'gif' ? 'png' : 'jpeg',
      jpegQuality: settings.jpegQuality,
      crf: format !== 'gif' ? settings.crf : undefined,
      frameRange: [0, totalDuration - 1],
      outName: `${projectId}.${format}`,
      privacy: "public",
      downloadBehavior: {
        type: "download",
        fileName: null, // Use default filename
      },
      webhook: webhookUrl && process.env.WEBHOOK_SECRET ? {
        url: webhookUrl,
        secret: process.env.WEBHOOK_SECRET,
      } : undefined,
      // Performance settings
      framesPerLambda: 180,
      concurrencyPerLambda: 1,
      maxRetries: 3,
      envVariables: {},
      chromiumOptions: {},
      logLevel: 'info',
    });
    
    console.log(`[LambdaRender] Render started successfully`);
    console.log(`[LambdaRender] Render ID: ${renderId}`);
    console.log(`[LambdaRender] Bucket: ${bucketName}`);
    
    // Try to get initial progress to check if URL is available
    try {
      const progress = await getRenderProgress({
        renderId,
        bucketName,
        functionName: process.env.REMOTION_FUNCTION_NAME!,
        region: process.env.AWS_REGION as AwsRegion,
      });
      
      if (progress.outputFile) {
        console.log(`[LambdaRender] ✅ Export complete! Download URL: ${progress.outputFile}`);
        return { 
          renderId, 
          bucketName,
          outputUrl: progress.outputFile 
        };
      }
    } catch (progressError) {
      console.log(`[LambdaRender] Initial progress check failed, render still in progress`);
    }
    
    // Return without immediate URL (will be polled later)
    return { 
      renderId, 
      bucketName,
      outputUrl: undefined 
    };
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
          "S3 bucket not found. Please run 'npx remotion lambda sites create' to create the required bucket."
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

// Get render progress from Lambda using programmatic API
export async function getLambdaRenderProgress(renderId: string, bucketName: string) {
  try {
    console.log(`[LambdaRender] Getting progress for render ${renderId}`);
    
    const progress = await getRenderProgress({
      renderId,
      bucketName,
      functionName: process.env.REMOTION_FUNCTION_NAME!,
      region: process.env.AWS_REGION as AwsRegion,
    });
    
    console.log(`[LambdaRender] Progress:`, {
      overallProgress: progress.overallProgress,
      done: progress.done,
      outputFile: progress.outputFile,
    });
    
    // Calculate frame progress from overall progress
    // Assuming 30fps and we know the total duration
    const estimatedFrames = Math.round(progress.overallProgress * 100);
    
    return {
      overallProgress: progress.overallProgress || 0,
      renderedFrames: estimatedFrames,
      encodedFrames: estimatedFrames,
      done: progress.done || false,
      outputFile: progress.outputFile,
      errors: progress.errors || [],
    };
  } catch (error) {
    console.error("[LambdaRender] Failed to get progress:", error);
    
    // Return a default progress state on error
    return {
      overallProgress: 0,
      renderedFrames: 0,
      encodedFrames: 0,
      done: false,
      outputFile: undefined,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}