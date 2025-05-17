import { processComponentJob } from '../workers/generateComponentCode';
import { db } from '~/server/db';
import { customComponentJobs } from '~/server/db/schema';
import { eq } from 'drizzle-orm';
import logger from '~/lib/logger';
import os from 'os';
import type { ComponentJob } from '~/types/chat'; // Assuming ComponentJob is defined here or accessible
import { env } from '~/env';

// --- Smarter Polling Configuration ---
const DEFAULT_POLL_INTERVAL_MS = env.WORKER_POLLING_INTERVAL || 30000; // Check every 30 seconds by default or from env
const MAX_POLL_INTERVAL_MS = 5 * 60 * 1000; // Max 5 minutes backoff
const ERROR_BACKOFF_MS = 30000; // If we hit errors, back off for 30 seconds
const MAX_CONCURRENT_CODE_GENERATIONS = Math.max(1, os.cpus().length - 2); // Leave one for build, one for system

let pollIntervalMs = DEFAULT_POLL_INTERVAL_MS; // Base interval, can be overridden by env at start
let currentPollIntervalMs = DEFAULT_POLL_INTERVAL_MS; // Active interval, changes with backoff
let noJobCycles = 0; // Counter for consecutive polls finding no jobs

let consecutiveErrors = 0;
let lastErrorTime = 0;
let isPollingPaused = false;
let intervalId: NodeJS.Timeout | null = null;
let isWorkerRunning = false;

const codeGenQueue: { jobId: string; promise: Promise<void> }[] = [];
let activeCodeGenerations = 0;

const codeGenWorkerLogger = logger.child({ worker: 'CodeGenWorker' });

export function startCodeGenWorker() {
  if (env.DISABLE_BACKGROUND_WORKERS) {
    codeGenWorkerLogger.info('🚫 Code Generation Worker is disabled via DISABLE_BACKGROUND_WORKERS environment variable.');
    return () => {}; // Return a no-op function
  }

  if (isWorkerRunning && intervalId) {
    codeGenWorkerLogger.info('⚠️ Code Generation Worker already running, skipping duplicate initialization');
    return () => stopCodeGenWorker();
  }

  pollIntervalMs = env.WORKER_POLLING_INTERVAL || DEFAULT_POLL_INTERVAL_MS;
  currentPollIntervalMs = pollIntervalMs;
  codeGenWorkerLogger.info(`🛠️ Initializing Custom Component Code Generation Worker... Base poll interval: ${pollIntervalMs / 1000}s`);

  isWorkerRunning = true;

  // Staggered start
  const initialDelay = Math.random() * 5000; // 0 to 5 seconds
  codeGenWorkerLogger.info(`🕒 Staggering worker start by ${initialDelay.toFixed(0)}ms`);

  setTimeout(() => {
    codeGenWorkerLogger.info('🚀 Code Generation Worker started.');
    void checkForQueuedJobs(true); // Initial check, indicate it's the first run

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
        const jobsFound = await checkForQueuedJobs();
        consecutiveErrors = 0;

        if (jobsFound) {
          noJobCycles = 0;
          if (currentPollIntervalMs !== pollIntervalMs) {
            currentPollIntervalMs = pollIntervalMs;
            codeGenWorkerLogger.info(`💡 Jobs found. Resetting poll interval to ${currentPollIntervalMs / 1000}s.`);
          }
        } else {
          noJobCycles++;
          const nextInterval = Math.min(MAX_POLL_INTERVAL_MS, pollIntervalMs * Math.pow(2, noJobCycles));
          if (nextInterval !== currentPollIntervalMs) {
            currentPollIntervalMs = nextInterval;
            codeGenWorkerLogger.info(`💤 No new jobs found for ${noJobCycles} cycle(s). Backing off. Next poll in ${currentPollIntervalMs / 1000}s.`);
          }
        }
      } catch (error) {
        consecutiveErrors++;
        lastErrorTime = Date.now();
        if (consecutiveErrors >= 3) {
          codeGenWorkerLogger.info(`Pausing code generation job polling for ${ERROR_BACKOFF_MS / 1000} seconds due to errors`);
          isPollingPaused = true;
          currentPollIntervalMs = ERROR_BACKOFF_MS; // Use error backoff interval
        }
        codeGenWorkerLogger.error('Error in code generation worker loop:', { error });
      }
    }, currentPollIntervalMs); // Use dynamic interval
  }, initialDelay);

  return () => stopCodeGenWorker();
}

export function stopCodeGenWorker() {
  if (intervalId) {
    codeGenWorkerLogger.info('Stopping Custom Component Code Generation Worker...');
    clearInterval(intervalId);
    intervalId = null;
    isWorkerRunning = false;
    currentPollIntervalMs = pollIntervalMs; // Reset interval for next start
    noJobCycles = 0;
  }
}

async function checkForQueuedJobs(isInitialRun = false): Promise<boolean> {
  if (!isInitialRun) {
    codeGenWorkerLogger.info(`Polling for jobs. Current interval: ${currentPollIntervalMs / 1000}s.`);
  }

  let jobsProcessedThisCycle = false;
  try {
    codeGenWorkerLogger.info("Code Generation Worker checking for jobs with status 'queued_for_generation'...");

    const jobsToProcess = await db.query.customComponentJobs.findMany({
      where: eq(customComponentJobs.status, "queued_for_generation"),
      limit: MAX_CONCURRENT_CODE_GENERATIONS * 2, // Fetch a bit more to keep queue full
      columns: {
        id: true,
        effect: true, // This will be 'name' in processComponentJob
        metadata: true, // This contains the 'prompt' and 'variation' (brief)
      }
    });

    if (jobsToProcess.length > 0) {
      codeGenWorkerLogger.info(`Found ${jobsToProcess.length} job(s) in 'queued_for_generation' state.`);
      jobsProcessedThisCycle = true;
      for (const job of jobsToProcess) {
        if (!codeGenQueue.find(q => q.jobId === job.id) && activeCodeGenerations < MAX_CONCURRENT_CODE_GENERATIONS) {
          const jobInputForProcess: ComponentJob = {
            id: job.id,
            name: job.effect || 'DefaultComponentName', // Fallback for name
            prompt: (job.metadata as any)?.prompt || 'Default prompt',
            variation: (job.metadata as any)?.variation, // This could be the stringified brief
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
    throw error;
  }
  return jobsProcessedThisCycle;
}

async function queueCodeGeneration(jobInput: ComponentJob): Promise<void> {
  while (activeCodeGenerations >= MAX_CONCURRENT_CODE_GENERATIONS) {
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  activeCodeGenerations++;

  try {
    await processJobForCodeGeneration(jobInput);
  } finally {
    activeCodeGenerations--;
    const index = codeGenQueue.findIndex(q => q.jobId === jobInput.id);
    if (index > -1) {
      codeGenQueue.splice(index, 1);
    }
  }
}

async function processJobForCodeGeneration(jobInput: ComponentJob): Promise<void> {
  codeGenWorkerLogger.info(`Starting code generation for job ${jobInput.id} (${jobInput.name})`);
  try {
    await processComponentJob(jobInput);
    codeGenWorkerLogger.info(`Finished processing code generation for job ${jobInput.id}`);
  } catch (error) {
    codeGenWorkerLogger.error(`Error during processComponentJob for ${jobInput.id}:`, { error });
    try {
      await db.update(customComponentJobs)
        .set({ status: 'failed', errorMessage: `CodeGenWorker: Unhandled error in processComponentJob: ${error instanceof Error ? error.message : String(error)}`, updatedAt: new Date() })
        .where(eq(customComponentJobs.id, jobInput.id));
    } catch (dbError) {
      codeGenWorkerLogger.error(`Failed to update job ${jobInput.id} to 'failed' after catastrophic processComponentJob error:`, { dbError });
    }
  }
}

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