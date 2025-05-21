//src/scripts/test-components/test-component.ts
import * as esbuild from 'esbuild';
import { externalGlobalPlugin } from 'esbuild-plugin-external-global';
import fs from 'fs/promises';
import path from 'path';
import * as url from 'url';
import { generateComponentCode } from '../../server/workers/generateComponentCode';
import { db } from '../../server/db';
import { customComponentJobs } from '../../server/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// Get the directory of the current module (ESM-compatible)
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

// Interface for the structure of a component definition in the input JSON file
interface ComponentDefinition {
  prompt: string;
  name?: string; // Optional name for the component
  animationBrief?: object; // Optional animation brief to guide generation
}

// Interface for the structure of the input JSON file
interface BatchProcessInput {
  components: ComponentDefinition[];
  projectId: string; // Project ID to associate components with
}

/**
 * Build and bundle a component using esbuild with external-global plugin
 * This aligns with the Sprint 26 architecture for avoiding React duplication
 */
async function buildWithEsbuild(
  tsxCode: string, 
  componentName: string = "CustomComponent"
): Promise<{ bundle: string; sourceMap: string; }> {
  // Write TSX to temp file for esbuild to process
  const tmpDir = path.join(__dirname, '../../../tmp');
  await fs.mkdir(tmpDir, { recursive: true });
  
  const tmpFilePath = path.join(tmpDir, `${componentName}_${Date.now()}.tsx`);
  await fs.writeFile(tmpFilePath, tsxCode, 'utf8');
  
  try {
    const result = await esbuild.build({
      entryPoints: [tmpFilePath],
      bundle: true,
      format: 'esm',
      platform: 'browser',
      sourcemap: 'external',
      write: false,
      minify: true,
      plugins: [
        externalGlobalPlugin({
          // Core React externals
          react: 'window.React',
          'react-dom': 'window.ReactDOM',
          'react/jsx-runtime': 'window.ReactJSX',
          
          // Remotion and all sub-paths
          remotion: 'window.Remotion',
          'remotion/*': 'window.Remotion',
        }),
      ],
      define: { 
        'process.env.NODE_ENV': '"production"'
      },
    });
    
    const bundleFile = result.outputFiles.find(f => f.path.endsWith('.js'));
    const mapFile = result.outputFiles.find(f => f.path.endsWith('.js.map'));
    
    if (!bundleFile || !mapFile) {
      throw new Error('Bundle or source map not generated');
    }
    
    return {
      bundle: bundleFile.text,
      sourceMap: mapFile.text
    };
  } finally {
    // Clean up temp file
    try {
      await fs.unlink(tmpFilePath);
    } catch (err) {
      console.warn(`Failed to clean up temp file: ${tmpFilePath}`);
    }
  }
}

/**
 * Upload component bundle to R2
 * Mock implementation - in production this should use the R2 client
 */
async function uploadToR2(
  bundle: string, 
  sourceMap: string, 
  jobId: string
): Promise<string> {
  // In a real implementation, this would upload to R2
  // For this script, we'll just write to the local filesystem
  const outputDir = path.join(__dirname, '../../../tmp/built-components');
  await fs.mkdir(outputDir, { recursive: true });
  
  const bundlePath = path.join(outputDir, `${jobId}.js`);
  const mapPath = path.join(outputDir, `${jobId}.js.map`);
  
  await fs.writeFile(bundlePath, bundle, 'utf8');
  await fs.writeFile(mapPath, sourceMap, 'utf8');
  
  // In production, this would return the R2 URL
  return `${process.env.R2_PUBLIC_URL || 'http://localhost:3000'}/custom-components/${jobId}.js`;
}

async function processBatch(inputFilePath: string) {
  console.log(`Reading component definitions from ${inputFilePath}...`);

  let inputData: BatchProcessInput;
  try {
    const fileContent = await fs.readFile(inputFilePath, 'utf-8');
    inputData = JSON.parse(fileContent);
    if (!inputData.components || !Array.isArray(inputData.components) || !inputData.projectId) {
      throw new Error("Invalid input file format. Expected { components: [], projectId: string }");
    }
  } catch (error) {
    console.error(`Error reading or parsing input file: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  console.log(`Found ${inputData.components.length} components to process for Project ID: ${inputData.projectId}`);

  const results = [];

  for (const componentDef of inputData.components) {
    console.log(`--- Processing component: "${componentDef.prompt.substring(0, 50)}..." ---`);

    let jobId: string | null = null;
    try {
      // 1. Create a component job in the database
      jobId = `comp_${nanoid()}`; // Generate a unique job ID
      console.log(`Creating database job with ID: ${jobId}`);

      await db.insert(customComponentJobs).values({
        id: jobId,
        projectId: inputData.projectId,
        effect: componentDef.name || componentDef.prompt.substring(0, 100), // Use name or truncated prompt
        status: 'queued', // Initial status
        createdAt: new Date(),
        metadata: {
          prompt: componentDef.prompt,
          name: componentDef.name,
          animationBrief: componentDef.animationBrief,
        },
      });

      console.log(`Job ${jobId} created in database.`);

      // 2. Trigger component code generation
      console.log(`Generating code for job ${jobId}...`);
      const generationResult = await generateComponentCode(jobId, componentDef.prompt, componentDef.animationBrief);

      if (!generationResult.valid) {
         console.error(`Code generation failed for job ${jobId}: ${generationResult.error}`);
         results.push({ jobId, prompt: componentDef.prompt, success: false, error: generationResult.error });
         continue; // Move to next component
      }

      console.log(`Code generation successful for job ${jobId}. TSX code generated (length: ${generationResult.code.length})`);

      // 3. Build the component using esbuild + external-global plugin (Sprint 26 approach)
      console.log(`Building component for job ${jobId} using esbuild...`);
      const componentName = componentDef.name || `Component_${jobId}`;
      const buildResult = await buildWithEsbuild(generationResult.code, componentName);
      
      // 4. Upload the built component to R2 (or file system in this mock)
      console.log(`Uploading built component for job ${jobId}...`);
      const outputUrl = await uploadToR2(buildResult.bundle, buildResult.sourceMap, jobId);

      // 5. Update job with output URL and success status
      await db.update(customComponentJobs)
        .set({
          tsxCode: generationResult.code,
          status: 'success',
          updatedAt: new Date(),
          outputUrl: outputUrl,
          originalTsxCode: generationResult.originalCode || null,
          fixIssues: generationResult.issues?.join(', ') || null,
          lastFixAttempt: generationResult.wasFixed ? new Date() : null,
        })
        .where(eq(customComponentJobs.id, jobId));

      console.log(`Component for job ${jobId} successfully built and uploaded to: ${outputUrl}`);

      results.push({
        jobId,
        prompt: componentDef.prompt,
        success: true,
        status: 'success',
        outputUrl: outputUrl,
        message: 'Component successfully generated, built, and uploaded.'
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error processing component job ${jobId}: ${errorMessage}`);
      results.push({ jobId, prompt: componentDef.prompt, success: false, error: errorMessage });

      // If job was created, update its status to failed
      if (jobId) {
        try {
          await db.update(customComponentJobs)
            .set({
              status: 'failed',
              errorMessage: errorMessage,
              updatedAt: new Date(),
            })
            .where(eq(customComponentJobs.id, jobId));
          console.log(`Updated job ${jobId} status to 'failed'`);
        } catch (dbError) {
          console.error(`Failed to update job ${jobId} status to 'failed': ${dbError instanceof Error ? dbError.message : String(dbError)}`);
        }
      }
    }
    console.log(`--- Finished processing component: "${componentDef.prompt.substring(0, 50)}..." ---\n`);
  }

  console.log("--- Batch Processing Complete ---");
  console.log("Summary of Results:");
  results.forEach(result => {
    if (result.success) {
      console.log(`- Job ${result.jobId}: SUCCESS - ${result.status}`);
      if (result.outputUrl) {
        console.log(`  Output URL: ${result.outputUrl}`);
      }
    } else {
      console.error(`- Job ${result.jobId}: FAILED - ${result.error}`);
    }
  });
  console.log("------------------------------");
  console.log("To use these components in the Remotion Player:");
  console.log("1. Ensure window.React and window.Remotion are exposed in your app");
  console.log("2. Use the Player's lazyComponent prop:");
  console.log("   const lazyComponent = () => import(/* webpackIgnore: true */ outputUrl);");
  console.log("   <Player lazyComponent={lazyComponent} ... />");
}

// Command line argument parsing
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node test-component.js <path_to_input_json>");
  process.exit(1);
}

const inputFilePath = args[0];

// Execute the batch process
processBatch(inputFilePath).catch(error => {
  console.error("An unhandled error occurred during batch processing:", error);
  process.exit(1);
});
