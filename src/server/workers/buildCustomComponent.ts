// src/server/workers/buildCustomComponent.ts
import { db } from "~/server/db";
import { customComponentJobs } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import * as esbuild from "esbuild";
import os from "os";
import { measureDuration, recordMetric } from "~/lib/metrics";

// R2 configuration from environment variables
const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!;

// Config for the worker pool
const MAX_CONCURRENT_BUILDS = Math.max(1, os.cpus().length - 1); // cpuCount - 1, minimum 1
const buildQueue: { jobId: string; promise: Promise<void> }[] = [];
let activeBuilds = 0;

/**
 * Process pending custom component jobs
 * 
 * 1. Find pending jobs
 * 2. Queue jobs for processing with concurrency limit
 * 3. Process each job:
 *    - Update status to "building"
 *    - Compile TSX using esbuild with optimized settings
 *    - Upload JS to R2
 *    - Update job status to "success" or "error"
 *    - Record metrics
 */
export async function processPendingJobs() {
  console.log("Processing pending custom component jobs...");
  
  try {
    // Find pending jobs
    const pendingJobs = await db.query.customComponentJobs.findMany({
      where: eq(customComponentJobs.status, "pending"),
      limit: 10, // Get more jobs than we can process at once, to keep the queue filled
    });

    console.log(`Found ${pendingJobs.length} pending jobs`);
    
    // If no pending jobs, return early
    if (pendingJobs.length === 0) {
      return;
    }

    // Queue jobs for processing, respecting concurrency limits
    for (const job of pendingJobs) {
      // Add job to the build queue
      const buildPromise = queueBuild(job.id);
      buildQueue.push({ jobId: job.id, promise: buildPromise });
    }

    // Wait for all jobs to complete with timeout protection
    await Promise.all(
      buildQueue.map(item => 
        // Wrap each promise with a timeout to avoid hanging
        Promise.race([
          item.promise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Build timeout for job ${item.jobId}`)), 300000)
          )
        ])
      )
    );
    
    // Clear the queue
    buildQueue.length = 0;
    
  } catch (error) {
    // Improve error logging
    if (error instanceof Error) {
      console.error(`Error processing jobs: ${error.message}`, error.stack);
      // Record the error for metrics
      void recordMetric("worker_error", 1, { 
        errorType: error.constructor.name,
        message: error.message.substring(0, 100) // Truncate long error messages
      });
    } else {
      console.error("Unknown error processing jobs:", error);
    }
    
    // Try to clear the queue even on error
    try {
      buildQueue.length = 0;
    } catch (e) {
      // Do nothing if this also fails
    }
  }
}

/**
 * Queue a build job for processing, respecting concurrency limits
 */
async function queueBuild(jobId: string): Promise<void> {
  // Wait until we have capacity to process this job
  while (activeBuilds >= MAX_CONCURRENT_BUILDS) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Increment active builds counter
  activeBuilds++;
  
  try {
    // Process the job
    await processJob(jobId);
  } finally {
    // Decrement active builds counter
    activeBuilds--;
  }
}

/**
 * Process a single custom component job
 */
async function processJob(jobId: string): Promise<void> {
  console.log(`Processing job ${jobId}...`);
  
  try {
    await measureDuration("component_build", async () => {
      // Get the job details
      const job = await db.query.customComponentJobs.findFirst({
        where: eq(customComponentJobs.id, jobId),
      });
      
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }
      
      // Update status to building
      await db.update(customComponentJobs)
        .set({
          status: "building",
          updatedAt: new Date(),
        })
        .where(eq(customComponentJobs.id, jobId));

      // Check if tsxCode is available (it could be null after schema change)
      if (!job.tsxCode) {
        throw new Error("TSX code is missing for this job");
      }
      
      // Sanitize TSX code (remove unsafe imports, etc.)
      const sanitizedTsx = sanitizeTsx(job.tsxCode);
      
      // Wrap TSX with globalThis.React and Remotion references
      const wrappedTsx = wrapTsxWithGlobals(sanitizedTsx);
      
      console.log("Compiling TSX code with esbuild...");
      
      // Compile with esbuild - optimized settings
      const result = await esbuild.build({
        stdin: {
          contents: wrappedTsx,
          loader: "tsx",
          resolveDir: "",
        },
        bundle: true,
        format: "esm", // Use ESM format
        target: ["es2020"],
        platform: "browser",
        external: ["react", "remotion", "@remotion/transitions", "@remotion/media-utils"], // Keep dependencies external
        write: false,
        minify: true,
      });

      // Make sure output files exist and get the first one
      if (!result.outputFiles || result.outputFiles.length === 0) {
        throw new Error("No output files generated by esbuild");
      }
      // TypeScript needs explicit reassurance that outputFiles exists and has elements
      const outputFiles = result.outputFiles;
      
      // Additional check to ensure first element exists before accessing its properties
      if (!outputFiles[0]) {
        throw new Error("First output file missing from esbuild result");
      }
      
      const jsCode = outputFiles[0].text;
      
      console.log("Uploading to R2...");

      // Upload to R2
      const key = `custom-components/${jobId}.js`;
      await s3.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: key,
          Body: jsCode,
          ContentType: "application/javascript",
        })
      );

      // Update job with success
      const outputUrl = `${R2_PUBLIC_URL}/${key}`;
      await db.update(customComponentJobs)
        .set({
          status: "success",
          outputUrl,
          updatedAt: new Date(),
        })
        .where(eq(customComponentJobs.id, jobId));
        
      console.log(`Job ${jobId} completed successfully, available at ${outputUrl}`);
    }, { jobId });

  } catch (error) {
    console.error(`Error processing job ${jobId}:`, error);
    
    // Update job with error
    await db.update(customComponentJobs)
      .set({
        status: "error",
        errorMessage: error instanceof Error ? error.message : String(error),
        retryCount: ((await db.query.customComponentJobs.findFirst({
          where: eq(customComponentJobs.id, jobId),
          columns: { retryCount: true }
        }))?.retryCount ?? 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(customComponentJobs.id, jobId));
      
    // Record error metric
    await recordMetric("component_build_error", 1, { 
      jobId, 
      errorType: error instanceof Error ? error.constructor.name : "Unknown" 
    });
  }
}

/**
 * Sanitize TSX code by removing unsafe imports and handling React/Remotion imports
 * 
 * 1. Removes all unsafe imports (non-React, non-Remotion)
 * 2. Removes all React and Remotion imports (since we're adding globals)
 * 3. Preserves the component code itself
 */
function sanitizeTsx(tsxCode: string): string {
  // Split by lines
  const lines = tsxCode.split('\n');
  
  // Filter out all import statements - we'll handle React and Remotion via globals
  const codeWithoutImports = lines.filter(line => {
    const trimmedLine = line.trim();
    // Skip any import statements 
    return !trimmedLine.startsWith('import ');
  });
  
  return codeWithoutImports.join('\n');
}

/**
 * Wrap TSX code with global React and Remotion references
 * and register the component for use with the useRemoteComponent hook.
 * 
 * The application expects the component to be assigned to window.__REMOTION_COMPONENT.
 */
function wrapTsxWithGlobals(tsxCode: string): string {
  // Try to extract the component name from the TSX code
  const componentNameMatch = tsxCode.match(/function\s+([A-Za-z0-9_]+)\s*\(/);  
  const componentName = componentNameMatch ? componentNameMatch[1] : 'CustomComponent';
  
  return `
// Access React from global scope
const React = window.React || globalThis.React;

// Access Remotion APIs safely without destructuring
const AbsoluteFill = window.Remotion?.AbsoluteFill;
const useCurrentFrame = window.Remotion?.useCurrentFrame;
const useVideoConfig = window.Remotion?.useVideoConfig;
const spring = window.Remotion?.spring;
const interpolate = window.Remotion?.interpolate;
const Sequence = window.Remotion?.Sequence;
const Audio = window.Remotion?.Audio;
const Img = window.Remotion?.Img;
const staticFile = window.Remotion?.staticFile;
const Series = window.Remotion?.Series;
const interpolateColors = window.Remotion?.interpolateColors;

// Original component code
${tsxCode}

// Register the component for the useRemoteComponent hook
// This is the key integration point with the application
if (typeof ${componentName} !== 'undefined') {
  // This is the expected format by the useRemoteComponent hook
  window.__REMOTION_COMPONENT = ${componentName};
  console.log('Component registered as window.__REMOTION_COMPONENT');
} else {
  console.error('Could not find component to register:', '${componentName}');
}

// Also export as default for module systems (not used in browser context)
export default ${componentName};
`;
}
