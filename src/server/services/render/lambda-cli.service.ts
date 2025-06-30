// src/server/services/render/lambda-cli.service.ts
import { exec, execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { renderState } from "../render/render-state";
import type { RenderConfig } from "./render.service";
import { qualitySettings } from "./render.service";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

// Lambda render configuration
export interface LambdaRenderConfig extends RenderConfig {
  webhookUrl?: string;
}

// Use the deployed site URL from environment or the new fixed version
const DEPLOYED_SITE_URL = process.env.REMOTION_SERVE_URL || "https://remotionlambda-useast1-yb1vzou9i7.s3.us-east-1.amazonaws.com/sites/bazaar-vid-fixed/index.html";

// Main Lambda rendering function using CLI
export async function renderVideoOnLambda({
  projectId,
  scenes,
  format = 'mp4',
  quality = 'high',
  webhookUrl,
}: LambdaRenderConfig) {
  console.log(`[LambdaRender] Starting Lambda render for project ${projectId}`);
  
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
    
    // Prepare input props - properly escape for shell
    const inputProps = JSON.stringify({
      scenes,
      projectId,
    });
    
    // Build CLI command
    const outputName = `${projectId}.${format}`;
    const cliArgs = [
      'lambda', 'render',
      DEPLOYED_SITE_URL,
      'MainComposition',
      '--props', inputProps,
      '--codec', format === 'gif' ? 'gif' : format === 'webm' ? 'vp8' : 'h264',
      '--image-format', format === 'gif' ? 'png' : 'jpeg',
      '--jpeg-quality', settings.jpegQuality.toString(),
      ...(format !== 'gif' ? ['--crf', settings.crf.toString()] : []),
      '--frames', `0-${totalDuration - 1}`,
      '--out-name', outputName,
      '--privacy', 'public',
      '--download-behavior', 'download',
      ...(process.env.WEBHOOK_SECRET && webhookUrl ? ['--webhook-custom-data', JSON.stringify({secret: process.env.WEBHOOK_SECRET})] : []),
    ];
    
    console.log(`[LambdaRender] Executing CLI command...`);
    
    // Use the locally installed remotion CLI directly
    const remotionPath = path.join(process.cwd(), 'node_modules/.bin/remotion');
    
    // Execute the command using execFile to avoid shell escaping issues
    const { stdout, stderr } = await execFileAsync(remotionPath, cliArgs, {
      env: {
        ...process.env,
        AWS_REGION: process.env.AWS_REGION,
        REMOTION_FUNCTION_NAME: process.env.REMOTION_FUNCTION_NAME,
        HOME: '/tmp', // Lambda has write access to /tmp
        NPM_CONFIG_CACHE: '/tmp/.npm', // Set npm cache to writable directory
      },
    });
    
    if (stderr && !stderr.includes('Render finished')) {
      console.error(`[LambdaRender] CLI stderr:`, stderr);
    }
    
    // Parse output to get render ID and bucket
    // The CLI output format is different than expected, let's parse from stderr/stdout
    console.log(`[LambdaRender] CLI stdout:`, stdout);
    console.log(`[LambdaRender] CLI stderr:`, stderr);
    
    // Extract render ID from the output
    let renderId: string | undefined;
    let bucketName = process.env.REMOTION_BUCKET_NAME!;
    let outputUrl: string | undefined;
    
    // Look for render ID in the output
    const renderIdMatch = stdout.match(/Render ID:\s*([^\s]+)/);
    if (renderIdMatch) {
      renderId = renderIdMatch[1];
    }
    
    // Look for the actual S3 URL in the output (this is the public URL)
    // Match mp4, gif, or webm files
    const s3UrlMatch = stdout.match(/\+ S3\s+(https:\/\/s3[^\s]+\.(mp4|gif|webm))/);
    if (s3UrlMatch) {
      outputUrl = s3UrlMatch[1];
      console.log(`[LambdaRender] ✅ Export complete! Download URL: ${outputUrl}`);
      console.log(`[LambdaRender] Found public S3 URL: ${outputUrl}`);
    }
    
    if (!renderId && !outputUrl) {
      console.error("[LambdaRender] Could not extract render ID or output URL from output");
      throw new Error("Failed to parse render output");
    }
    
    // If we have outputUrl but no renderId, extract it from the URL
    if (outputUrl && !renderId) {
      const renderIdFromUrl = outputUrl.match(/renders\/([^\/]+)\//);
      if (renderIdFromUrl) {
        renderId = renderIdFromUrl[1];
      }
    }
    
    console.log(`[LambdaRender] Render completed successfully`);
    console.log(`[LambdaRender] Render ID: ${renderId}`);
    console.log(`[LambdaRender] Bucket: ${bucketName}`);
    console.log(`[LambdaRender] Output URL: ${outputUrl}`);
    
    return { 
      renderId: renderId!, 
      bucketName: bucketName!,
      outputUrl: outputUrl! 
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

// Get render progress from Lambda using S3
export async function getLambdaRenderProgress(renderId: string, bucketName: string, projectId: string, format: string = 'mp4') {
  try {
    // Check if the output file exists in S3
    const outputName = `${projectId}.${format}`;
    const s3Key = `renders/${renderId}/${outputName}`;
    
    // Use AWS CLI to check if file exists
    const checkCommand = `aws s3 ls s3://${bucketName}/${s3Key}`;
    
    try {
      const { stdout } = await execAsync(checkCommand, {
        env: {
          ...process.env,
          AWS_REGION: process.env.AWS_REGION,
        },
      });
      
      // If file exists, render is complete
      if (stdout.includes(`.${format}`)) {
        // Use the public S3 URL format
        const outputUrl = `https://s3.${process.env.AWS_REGION}.amazonaws.com/${bucketName}/${s3Key}`;
        return {
          overallProgress: 1,
          renderedFrames: 100,
          encodedFrames: 100,
          done: true,
          outputFile: outputUrl,
          errors: [],
        };
      }
    } catch (checkError) {
      // File doesn't exist yet, still rendering
    }
    
    // Try to get progress.json if available
    try {
      const progressCommand = `aws s3 cp s3://${bucketName}/renders/${renderId}/progress.json -`;
      const { stdout: progressJson } = await execAsync(progressCommand);
      const progress = JSON.parse(progressJson);
      
      return {
        overallProgress: progress.overallProgress || 0.5,
        renderedFrames: progress.renderedFrames || 0,
        encodedFrames: progress.encodedFrames || 0,
        done: progress.done || false,
        outputFile: progress.outputFile,
        errors: progress.errors || [],
      };
    } catch (progressError) {
      // No progress file yet, assume still rendering
      return {
        overallProgress: 0.3,
        renderedFrames: 0,
        encodedFrames: 0,
        done: false,
        outputFile: undefined,
        errors: [],
      };
    }
  } catch (error) {
    console.error("[LambdaRender] Failed to get progress:", error);
    throw error;
  }
}