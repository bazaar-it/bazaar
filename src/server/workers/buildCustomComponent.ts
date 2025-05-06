// src/server/workers/buildCustomComponent.ts
import { db } from "~/server/db";
import { customComponentJobs } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import os from "os";
import { measureDuration, recordMetric } from "~/lib/metrics";

// Dynamically import esbuild to prevent bundling issues
let esbuild: typeof import('esbuild') | null = null;

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

    // Try to load esbuild if not loaded yet
    if (!esbuild) {
      try {
        esbuild = await import('esbuild');
        console.log("Successfully loaded esbuild module");
      } catch (err) {
        console.warn("Failed to load esbuild, will use fallback transformation:", err);
      }
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
      
      // Log component code length for debugging
      console.log(`Processing component code (${job.tsxCode.length} characters)`);
      
      // Sanitize TSX code (remove unsafe imports, etc.)
      const sanitizedTsx = sanitizeTsx(job.tsxCode);
      
      // Wrap TSX with globalThis.React and Remotion references
      const wrappedTsx = wrapTsxWithGlobals(sanitizedTsx);
      
      // Compile the code - use esbuild if available, otherwise fallback
      let jsCode: string;
      
      if (esbuild) {
        try {
          console.log("Compiling TSX code with esbuild...");
          jsCode = await compileWithEsbuild(wrappedTsx);
        } catch (esbuildError) {
          console.error("Error compiling with esbuild, using fallback:", esbuildError);
          jsCode = await compileWithFallback(wrappedTsx);
        }
      } else {
        console.log("Using fallback compiler (esbuild not available)");
        jsCode = await compileWithFallback(wrappedTsx);
      }
      
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
 * Compile TSX code using esbuild
 */
async function compileWithEsbuild(tsxCode: string): Promise<string> {
  if (!esbuild) {
    throw new Error("esbuild is not available");
  }
  
  // Compile with esbuild - optimized settings
  const result = await esbuild.build({
    stdin: {
      contents: tsxCode,
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
    // Avoid file system references that might cause issues
    outfile: 'out.js',
    absWorkingDir: os.tmpdir(),
  });

  // Make sure output files exist and get the first one
  if (!result.outputFiles || result.outputFiles.length === 0) {
    throw new Error("No output files generated by esbuild");
  }
  
  // TypeScript safety check
  const outputFile = result.outputFiles[0];
  if (!outputFile || !outputFile.text) {
    throw new Error("Invalid output file from esbuild");
  }
  
  return outputFile.text;
}

/**
 * Fallback compilation method that uses simple transforms
 * This is used when esbuild is not available or fails
 */
async function compileWithFallback(tsxCode: string): Promise<string> {
  console.log("Using simplified fallback compilation method");
  
  // Perform some basic transformations:
  // 1. Remove TypeScript types
  // 2. Convert JSX to React.createElement manually
  
  let code = tsxCode;
  
  // Replace TypeScript type annotations
  code = code.replace(/:\s*[A-Za-z0-9_<>\[\]|&,\s.]+(?=\s*[,=)])/g, '');
  code = code.replace(/<[A-Za-z0-9_]+>(?=\()/g, '');
  
  // Remove interface and type declarations
  code = code.replace(/interface\s+[^{]+{[^}]*}/g, '');
  code = code.replace(/type\s+[^=]+=\s*[^;]+;/g, '');
  
  // Add our wrapper
  code = `
// Fallback compiled version
${code}

// Export any component that exists in the code
if (typeof Component !== 'undefined') {
  window.__REMOTION_COMPONENT = Component;
} else if (typeof Default !== 'undefined') {
  window.__REMOTION_COMPONENT = Default;
} else if (typeof default_1 !== 'undefined') {
  window.__REMOTION_COMPONENT = default_1;
}
  `;
  
  return code;
}

/**
 * Sanitize TSX code by removing unsafe imports and handling React/Remotion imports
 * 
 * 1. Removes all unsafe imports (non-React, non-Remotion)
 * 2. Removes all React and Remotion imports (since we're adding globals)
 * 3. Preserves the component code itself
 */
function sanitizeTsx(tsxCode: string): string {
  // First, remove duplicate default exports
  const deduplicatedCode = removeDuplicateDefaultExports(tsxCode);
  
  // Check for and remove duplicate React declarations
  const reactDeclarationRegex = /const\s+React\s*=\s*(window\.React|require\(['"]react['"]\)|import\s+.*\s+from\s+['"]react['"])/g;
  const reactMatches = Array.from(deduplicatedCode.matchAll(reactDeclarationRegex));
  
  if (reactMatches.length > 0) {
    console.log(`Found ${reactMatches.length} React declarations, removing them to prevent duplicates:`);
    reactMatches.forEach((match, i) => {
      const lineNumber = deduplicatedCode.substring(0, match.index || 0).split('\n').length;
      console.log(`  [${i}] Line ~${lineNumber}: ${match[0]}`);
    });
  }
  
  // Remove React declarations
  let sanitizedCode = deduplicatedCode.replace(reactDeclarationRegex, '// React is provided globally');
  
  // Split by lines
  const lines = sanitizedCode.split('\n');
  
  // Filter out all import statements - we'll handle React and Remotion via globals
  const codeWithoutImports = lines.filter(line => {
    const trimmedLine = line.trim();
    // Skip any import statements 
    return !trimmedLine.startsWith('import ');
  });
  
  return codeWithoutImports.join('\n');
}

/**
 * Removes duplicate default exports from component code
 * This fixes issues with LLM-generated code sometimes having multiple default exports
 */
function removeDuplicateDefaultExports(code: string): string {
  // Find all export default statements - more comprehensive regex
  // This handles export default ComponentName; and export default ComponentName with newlines 
  // as well as export default function ComponentName() patterns
  const defaultExportRegex = /export\s+default\s+(function\s+)?([A-Za-z0-9_]+\s*(\(\))?\s*{|\s*[A-Za-z0-9_]+\s*;?)/g;
  const matches = Array.from(code.matchAll(defaultExportRegex));
  
  // If we have multiple default exports
  if (matches.length > 1) {
    console.log(`Found ${matches.length} default exports in component, keeping only the first one:`);
    
    // Log what was found for debugging
    matches.forEach((match, i) => {
      const lineNumber = code.substring(0, match.index).split('\n').length;
      console.log(`  [${i}] Line ~${lineNumber}: ${match[0]}`);
    });
    
    // Keep only the first export default statement
    const firstMatch = matches[0];
    // TypeScript safety check
    if (!firstMatch || !firstMatch.index) {
      console.warn("Warning: Expected to find matches but firstMatch is undefined or has no index");
      return code;
    }
    
    const otherMatches = matches.slice(1);
    
    // Replace other export default statements with comments
    let sanitizedCode = code;
    for (const match of otherMatches) {
      if (!match.index) continue; // TypeScript safety check
      
      const fullMatch = match[0]; // The full export default statement
      
      // Replace with comment to preserve semantics
      sanitizedCode = sanitizedCode.replace(
        fullMatch, 
        `// Removed duplicate export: ${fullMatch.replace(/\n/g, ' ')}`
      );
    }
    
    console.log(`Successfully sanitized duplicate exports, keeping first export default statement`);
    return sanitizedCode;
  }
  
  // If there's only one or zero export default, return the original code
  return code;
}

/**
 * Wrap TSX code with global React and Remotion references
 * and register the component for use with the useRemoteComponent hook.
 * 
 * The application expects the component to be assigned to window.__REMOTION_COMPONENT.
 */
function wrapTsxWithGlobals(tsxCode: string): string {
  // Remove any existing React declarations to prevent duplicates
  let cleanedCode = tsxCode.replace(/const\s+React\s*=\s*.*?;/g, '// React is provided globally');
  
  // Try to extract component names from the code with improved patterns
  
  // 1. Look for function declarations
  const funcComponents = cleanedCode.match(/function\s+([A-Za-z0-9_]+)\s*\(/g) || [];
  
  // 2. Look for const/let component declarations
  const constComponents = cleanedCode.match(/const\s+([A-Za-z0-9_]+)\s*=\s*(\(\s*\)\s*=>|\(\s*props\s*\)\s*=>|\(\s*\{\s*[^}]*\}\s*\)\s*=>)/g) || [];
  
  // 3. Look for default exports
  const defaultExport = cleanedCode.match(/export\s+default\s+([A-Za-z0-9_]+)\s*;?/);
  
  // Determine the best component name to use
  let componentName = 'CustomComponent';
  
  if (defaultExport && defaultExport[1]) {
    // Prioritize the default export component name
    componentName = defaultExport[1];
    console.log(`Found default export component: ${componentName}`);
  } else if (funcComponents.length > 0 && funcComponents[0]) {
    // Extract name from the first function component
    const match = funcComponents[0].match(/function\s+([A-Za-z0-9_]+)/);
    if (match && match[1]) {
      componentName = match[1];
      console.log(`Using function component: ${componentName}`);
    }
  } else if (constComponents.length > 0 && constComponents[0]) {
    // Extract name from const component declaration
    const match = constComponents[0].match(/const\s+([A-Za-z0-9_]+)/);
    if (match && match[1]) {
      componentName = match[1];
      console.log(`Using const component: ${componentName}`);
    }
  }
  
  // List of potential component names to try (with default as fallback)
  const componentNames = [
    componentName,
    // Common names used by LLMs
    'MyComponent',
    'AnimatedComponent',
    'FuturisticComponent', 
    'MainComponent',
    'Component',
    // Fallbacks
    'default_1',
    'CustomComponent'
  ];
  
  // Generate component registration with fallbacks
  const registrationCode = componentNames
    .map((name, i) => 
      i === 0 
        ? `if (typeof ${name} !== 'undefined') {
      window.__REMOTION_COMPONENT = ${name};
      console.log('Component registered as window.__REMOTION_COMPONENT: ${name}');
    }`
        : `else if (typeof ${name} !== 'undefined') {
      window.__REMOTION_COMPONENT = ${name};
      console.log('Fallback component registered: ${name}');
    }`
    )
    .join(' ');
  
  // Create wrapper that avoids duplicate React declarations
  return `
// Access React from global scope - DO NOT DECLARE React AGAIN INSIDE COMPONENT
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
const OffthreadVideo = window.Remotion?.OffthreadVideo;

// Original component code (with React global references)
${cleanedCode}

// Register the component for the useRemoteComponent hook
// This is the key integration point with the application
${registrationCode}
else {
  console.error('Could not find any component to register. Tried: ${componentNames.join(', ')}');
}
`;
}
