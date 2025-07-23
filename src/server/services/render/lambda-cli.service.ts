// src/server/services/render/lambda-cli.service.ts
import { exec } from "child_process";
import { promisify } from "util";
import type { RenderConfig } from "./render.service";
import { getQualityForFormat } from "./render.service";

const execAsync = promisify(exec);

// Lambda render configuration
export interface LambdaRenderConfig extends RenderConfig {
  webhookUrl?: string;
  renderWidth?: number;
  renderHeight?: number;
}

// Use newly deployed v3 production site
const DEPLOYED_SITE_URL = "https://remotionlambda-useast1-yb1vzou9i7.s3.us-east-1.amazonaws.com/sites/bazaar-vid-v3-prod/index.html";

// Main Lambda rendering function using CLI approach
export async function renderVideoOnLambda({
  projectId,
  scenes,
  format = 'mp4',
  quality = 'high',
  webhookUrl,
  renderWidth,
  renderHeight,
}: LambdaRenderConfig) {
  console.log(`[LambdaRender] Starting Lambda render for project ${projectId}`);
  console.log(`[LambdaRender] Using site URL: ${DEPLOYED_SITE_URL}`);
  console.log(`[LambdaRender] REMOTION_SERVE_URL env var: ${process.env.REMOTION_SERVE_URL || 'not set'}`);
  
  // Check required environment variables
  if (!process.env.AWS_REGION || !process.env.REMOTION_FUNCTION_NAME || !process.env.REMOTION_BUCKET_NAME) {
    const missing = [];
    if (!process.env.AWS_REGION) missing.push('AWS_REGION');
    if (!process.env.REMOTION_FUNCTION_NAME) missing.push('REMOTION_FUNCTION_NAME');
    if (!process.env.REMOTION_BUCKET_NAME) missing.push('REMOTION_BUCKET_NAME');
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Get quality settings adjusted for format
  const settings = getQualityForFormat(quality, format);
  
  // Declare propsFile outside try block for proper cleanup scope
  let propsFile: string | null = null;
  
  try {
    // Calculate total duration
    const totalDuration = scenes.reduce((sum, scene) => {
      return sum + (scene.duration || 150); // Default 5 seconds at 30fps
    }, 0);
    
    console.log(`[LambdaRender] Total duration: ${totalDuration} frames`);
    console.log(`[LambdaRender] Format: ${format}, Quality: ${quality}`);
    
    // Use provided render dimensions or fall back to quality settings
    const width = renderWidth || settings.resolution.width;
    const height = renderHeight || settings.resolution.height;
    
    console.log(`[LambdaRender] Resolution: ${width}x${height}`);
    
    // Log what we're sending to Lambda
    console.log(`[LambdaRender] Scenes being sent to Lambda:`, scenes.map(s => ({
      id: s.id,
      hasJsCode: !!s.jsCode,
      hasCompiledCode: !!s.compiledCode,
      hasTsxCode: !!s.tsxCode,
      jsCodePreview: s.jsCode ? s.jsCode.substring(0, 100) + '...' : 'none',
    })));
    
    // Prepare minimal input props for Lambda - only include pre-compiled jsCode
    const inputProps = {
      scenes: scenes.map(scene => {
        // Log what we're actually sending for each scene
        console.log(`[LambdaRender] Preparing scene ${scene.id} for Lambda:`, {
          hasJsCode: !!scene.jsCode,
          hasCompiledCode: !!scene.compiledCode,
          jsCodeLength: scene.jsCode?.length || 0,
          jsCodePreview: scene.jsCode ? scene.jsCode.substring(0, 200) + '...' : 'none'
        });
        
        return {
          id: scene.id,
          name: scene.name,
          duration: scene.duration,
          jsCode: scene.jsCode || scene.compiledCode, // Use pre-compiled code
          // Don't include tsxCode as it has problematic characters for CLI
        };
      }),
      projectId,
      width,
      height,
    };
    
    // Determine codec based on format
    const codec = format === 'gif' ? 'gif' : format === 'webm' ? 'vp8' : 'h264';
    
    console.log(`[LambdaRender] Using CLI to render...`);
    
    // Write props to a temporary file to avoid shell escaping issues
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    propsFile = path.join(os.tmpdir(), `remotion-props-${projectId}-${Date.now()}.json`);
    const propsContent = JSON.stringify(inputProps, null, 2);
    fs.writeFileSync(propsFile, propsContent);
    console.log(`[LambdaRender] Props written to: ${propsFile}`);
    
    // DEBUG: Also save a copy for debugging
    const debugFile = `/tmp/last-render-props.json`;
    fs.writeFileSync(debugFile, propsContent);
    console.log(`[LambdaRender] Debug copy saved to: ${debugFile}`);
    
    // Debug: Log first 500 chars of each scene's jsCode
    console.log(`[LambdaRender] Props file contents preview:`);
    inputProps.scenes.forEach((scene, idx) => {
      console.log(`[LambdaRender] Scene ${idx} jsCode (first 500 chars):`);
      console.log(scene.jsCode?.substring(0, 500) || 'NO JSCODE');
      console.log('---');
    });
    
    // Build CLI command - use node to run the installed remotion CLI
    const remotionPath = path.join(process.cwd(), 'node_modules', '.bin', 'remotion');
    const cliArgs = [
      'node', remotionPath, 'lambda', 'render',
      DEPLOYED_SITE_URL,
      'MainComposition',
      '--props', propsFile, // Use file path instead of inline JSON
      '--codec', codec,
      '--image-format', format === 'gif' ? 'png' : 'jpeg',
      '--jpeg-quality', String(settings.jpegQuality),
      '--frames', `0-${totalDuration - 1}`,
      '--out-name', `${projectId}.${format}`,
      '--privacy', 'public',
      '--download-behavior', 'download',
      '--region', process.env.AWS_REGION!,
      '--function-name', process.env.REMOTION_FUNCTION_NAME!,
      '--log', 'info',
    ];
    
    // Add format-specific options
    if (format !== 'gif' && settings.crf) {
      cliArgs.push('--crf', String(settings.crf));
    }
    
    if (format === 'gif') {
      cliArgs.push('--every-nth-frame', '2'); // 15fps for smaller GIFs
    }
    
    if (webhookUrl && process.env.WEBHOOK_SECRET) {
      cliArgs.push('--webhook', webhookUrl);
      cliArgs.push('--webhook-secret', process.env.WEBHOOK_SECRET);
    }
    
    const command = cliArgs.join(' ');
    console.log(`[LambdaRender] Executing command:`, command);
    
    // Execute the CLI command
    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
      env: {
        ...process.env,
        AWS_REGION: process.env.AWS_REGION,
        AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
      }
    });
    
    if (stderr && !stderr.includes('deprecated')) {
      console.warn(`[LambdaRender] CLI stderr:`, stderr);
    }
    
    console.log(`[LambdaRender] CLI output:`, stdout);
    
    // Extract render ID from output
    const renderIdMatch = stdout.match(/Render ID:\s*([a-zA-Z0-9]+)/);
    const bucketMatch = stdout.match(/Bucket:\s*([\w-]+)/);
    const s3UrlMatch = stdout.match(/\+\s*S3\s+(https:\/\/[^\s]+)/);
    
    if (!renderIdMatch || !bucketMatch) {
      console.error('[LambdaRender] Failed to extract render ID or bucket from output');
      throw new Error('Failed to start render - could not parse CLI output');
    }
    
    const renderId = renderIdMatch[1];
    const bucketName = bucketMatch[1];
    
    console.log(`[LambdaRender] Render started successfully`);
    console.log(`[LambdaRender] Render ID: ${renderId}`);
    console.log(`[LambdaRender] Bucket: ${bucketName}`);
    
    // Cleanup temp props file
    try {
      fs.unlinkSync(propsFile);
      console.log(`[LambdaRender] Cleaned up props file`);
    } catch (cleanupError) {
      console.warn(`[LambdaRender] Failed to cleanup props file:`, cleanupError);
    }
    
    // If we got the S3 URL directly from output, return it
    if (s3UrlMatch) {
      const outputUrl = s3UrlMatch[1];
      console.log(`[LambdaRender] ✅ Export complete! Download URL: ${outputUrl}`);
      return { 
        renderId, 
        bucketName,
        outputUrl
      };
    }
    
    // Otherwise return without URL (will be polled later)
    console.log(`[LambdaRender] Render started, will poll for progress`);
    return { 
      renderId, 
      bucketName,
      outputUrl: undefined 
    };
  } catch (error) {
    // Cleanup temp file on error - propsFile is declared above, so this should work
    try {
      const fs = require('fs');
      if (propsFile) {
        fs.unlinkSync(propsFile);
      }
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
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
    
    // Use CLI to get progress - use installed remotion CLI directly
    const path = require('path');
    const remotionPath = path.join(process.cwd(), 'node_modules', '.bin', 'remotion');
    const command = [
      'node', remotionPath, 'lambda', 'progress',
      renderId,
      '--bucket-name', bucketName,
      '--function-name', process.env.REMOTION_FUNCTION_NAME!,
      '--region', process.env.AWS_REGION!,
    ].join(' ');
    
    const { stdout } = await execAsync(command, {
      env: {
        ...process.env,
        AWS_REGION: process.env.AWS_REGION,
        AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
      }
    });
    
    // Parse the CLI output to extract progress information
    const progressMatch = stdout.match(/Overall progress:\s*([\d.]+)%/);
    const overallProgress = progressMatch ? parseFloat(progressMatch[1]) / 100 : 0;
    const doneMatch = stdout.match(/Render\s+status:\s*(DONE|RENDERING|ERROR)/i);
    const done = doneMatch ? doneMatch[1].toUpperCase() === 'DONE' : false;
    const outputMatch = stdout.match(/Output:\s*(https:\/\/[^\s]+)/);
    const outputFile = outputMatch ? outputMatch[1] : null;
    
    const progress = {
      overallProgress,
      done,
      outputFile,
      errors: [],
    };
    
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