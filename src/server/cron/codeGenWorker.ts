import { processComponentJob } from '../workers/generateComponentCode';
import { db } from '~/server/db';
import { customComponentJobs } from '~/server/db/schema';
import { eq } from 'drizzle-orm';
import logger from '~/lib/logger';
import os from 'os';
import type { ComponentJob } from '~/types/chat'; // Assuming ComponentJob is defined here or accessible

const POLL_INTERVAL_MS = 10000; // Check every 10 seconds
const ERROR_BACKOFF_MS = 30000; // If we hit errors, back off for 30 seconds
const MAX_CONCURRENT_CODE_GENERATIONS = Math.max(1, os.cpus().length - 2); // Leave one for build, one for system

let consecutiveErrors = 0;
let lastErrorTime = 0;
let isPollingPaused = false;
let intervalId: NodeJS.Timeout | null = null;
let isWorkerRunning = false;

const codeGenQueue: { jobId: string; promise: Promise<void> }[] = [];
let activeCodeGenerations = 0;

const codeGenWorkerLogger = logger.child({ worker: 'CodeGenWorker' });

export function startCodeGenWorker() {
  if (isWorkerRunning && intervalId) {
    codeGenWorkerLogger.info('⚠️ Code Generation Worker already running, skipping duplicate initialization');
    return () => stopCodeGenWorker();
  }
  
  codeGenWorkerLogger.info('🛠️ Starting Custom Component Code Generation Worker...');
  isWorkerRunning = true;
  
  void checkForQueuedJobs(); // Initial check
  
  intervalId = setInterval(async () => {
    if (isPollingPaused) {
      const now = Date.now();
      if (now - lastErrorTime > ERROR_BACKOFF_MS) {
        codeGenWorkerLogger.info('Resuming code generation job polling after error backoff');
        isPollingPaused = false;
      } else {
        return;
      }
    }
    
    try {
      await checkForQueuedJobs();
      consecutiveErrors = 0;
    } catch (error) {
      consecutiveErrors++;
      lastErrorTime = Date.now();
      if (consecutiveErrors >= 3) {
        codeGenWorkerLogger.info(`Pausing code generation job polling for ${ERROR_BACKOFF_MS/1000} seconds due to errors`);
        isPollingPaused = true;
      }
      codeGenWorkerLogger.error('Error in code generation worker loop:', { error });
    }
  }, POLL_INTERVAL_MS);

  return () => stopCodeGenWorker();
}

export function stopCodeGenWorker() {
  if (intervalId) {
    codeGenWorkerLogger.info('Stopping Custom Component Code Generation Worker...');
    clearInterval(intervalId);
    intervalId = null;
    isWorkerRunning = false;
  }
}

async function checkForQueuedJobs(): Promise<void> {
  codeGenWorkerLogger.info("Code Generation Worker checking for jobs with status 'queued_for_generation'...");
  
  try {
    const jobsToProcess = await db.query.customComponentJobs.findMany({
      where: eq(customComponentJobs.status, "queued_for_generation"),
      limit: MAX_CONCURRENT_CODE_GENERATIONS * 2, // Fetch a bit more to keep queue full
      columns: { // Select all necessary fields for processComponentJob
        id: true,
        effect: true, // This will be 'name' in processComponentJob
        metadata: true, // This contains the 'prompt' and 'variation' (brief)
        // Add other fields if processComponentJob needs them directly from job record
      }
    });

    if (jobsToProcess.length > 0) {
      codeGenWorkerLogger.info(`Found ${jobsToProcess.length} job(s) in 'queued_for_generation' state.`);
      for (const job of jobsToProcess) {
        // Ensure job is not already in the queue or being processed
        if (!codeGenQueue.find(q => q.jobId === job.id) && activeCodeGenerations < MAX_CONCURRENT_CODE_GENERATIONS) {
          // Construct the input for processComponentJob carefully
          // It primarily needs id, name, prompt, and variation (optional)
          const jobInputForProcess: ComponentJob = {
            id: job.id,
            name: job.effect || 'DefaultComponentName', // Fallback for name
            prompt: (job.metadata as any)?.prompt || 'Default prompt', 
            variation: (job.metadata as any)?.variation, // This could be the stringified brief
            // status: 'queued_for_generation', // REMOVED - processComponentJob handles internal status
            // projectId: (job.metadata as any)?.projectId || '', // REMOVED - processComponentJob uses ID to fetch if needed
          };

          const genPromise = queueCodeGeneration(jobInputForProcess);
          codeGenQueue.push({ jobId: job.id, promise: genPromise });
        }
      }
    } else {
      codeGenWorkerLogger.info("No jobs found with status 'queued_for_generation'.");
    }
  } catch (error) {
    codeGenWorkerLogger.error("Error checking for 'queued_for_generation' jobs:", { error });
    throw error; // Re-throw to be caught by the main loop's error handler
  }
}

async function queueCodeGeneration(jobInput: ComponentJob): Promise<void> {
  while (activeCodeGenerations >= MAX_CONCURRENT_CODE_GENERATIONS) {
    await new Promise(resolve => setTimeout(resolve, 200)); // Check more frequently
  }
  
  activeCodeGenerations++;
  
  try {
    await processJobForCodeGeneration(jobInput);
  } finally {
    activeCodeGenerations--;
    // Remove from queue after processing
    const index = codeGenQueue.findIndex(q => q.jobId === jobInput.id);
    if (index > -1) {
      codeGenQueue.splice(index, 1);
    }
  }
}

async function processJobForCodeGeneration(jobInput: ComponentJob): Promise<void> {
  codeGenWorkerLogger.info(`Starting code generation for job ${jobInput.id} (${jobInput.name})`);
  try {
    // processComponentJob will handle its own status updates (generating_code -> building/failed)
    await processComponentJob(jobInput);
    codeGenWorkerLogger.info(`Finished processing code generation for job ${jobInput.id}`);
  } catch (error) {
    codeGenWorkerLogger.error(`Error during processComponentJob for ${jobInput.id}:`, { error });
    // Ensure status is updated to 'failed' if processComponentJob fails catastrophically before setting status
    try {
      await db.update(customComponentJobs)
        .set({ status: 'failed', errorMessage: `CodeGenWorker: Unhandled error in processComponentJob: ${error instanceof Error ? error.message : String(error)}`, updatedAt: new Date() })
        .where(eq(customComponentJobs.id, jobInput.id));
    } catch (dbError) {
      codeGenWorkerLogger.error(`Failed to update job ${jobInput.id} to 'failed' after catastrophic processComponentJob error:`, { dbError });
    }
  }
}

// Optional: Log status of the worker for debugging
export function getCodeGenWorkerStatus() {
  return {
    isRunning: isWorkerRunning,
    isPollingPaused,
    activeGenerations: activeCodeGenerations,
    queueLength: codeGenQueue.length,
    consecutiveErrors,
    lastErrorTime
  };
} 