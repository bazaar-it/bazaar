// src/server/cron/buildWorker.ts
import { processPendingJobs } from '../workers/buildCustomComponent';
import { db } from '~/server/db';
import { customComponentJobs } from '~/server/db/schema';
import { eq, or } from 'drizzle-orm';
import logger from '~/lib/logger';
import { env } from '~/env';

// --- Smarter Polling Configuration ---
const DEFAULT_POLL_INTERVAL_MS = env.WORKER_POLLING_INTERVAL || 30000; // Default or from env
const MAX_POLL_INTERVAL_MS = 5 * 60 * 1000; // Max 5 minutes backoff
const ERROR_BACKOFF_MS = 30000; // If we hit errors, back off for 30 seconds

let pollIntervalMs = DEFAULT_POLL_INTERVAL_MS;
let currentPollIntervalMs = DEFAULT_POLL_INTERVAL_MS;
let noJobCycles = 0;

// Track errors to implement exponential backoff
let consecutiveErrors = 0;
let lastErrorTime = 0;
let isPollingPaused = false;

// Track worker state
let intervalId: NodeJS.Timeout | null = null;
let isWorkerRunning = false;

const buildWorkerLogger = logger.child({ worker: 'BuildWorker' });

/**
 * Start the build worker polling process
 * This runs continuously in the background, processing pending component jobs
 * with smart error handling and backoff
 */
export function startBuildWorker() {
  if (env.DISABLE_BACKGROUND_WORKERS) {
    buildWorkerLogger.info('🚫 Build Worker is disabled via DISABLE_BACKGROUND_WORKERS environment variable.');
    return () => {};
  }

  // Prevent multiple instances of the worker
  if (isWorkerRunning && intervalId) {
    buildWorkerLogger.info('⚠️ Build worker already running, skipping duplicate initialization');
    return () => stopBuildWorker();
  }
  
  pollIntervalMs = env.WORKER_POLLING_INTERVAL || DEFAULT_POLL_INTERVAL_MS;
  currentPollIntervalMs = pollIntervalMs;
  buildWorkerLogger.info(`🛠️ Initializing custom component build worker... Base poll interval: ${pollIntervalMs / 1000}s`);
  isWorkerRunning = true;

  // Staggered start
  const initialDelay = Math.random() * 5000; // 0 to 5 seconds
  buildWorkerLogger.info(`🕒 Staggering worker start by ${initialDelay.toFixed(0)}ms`);
  
  setTimeout(() => {
    buildWorkerLogger.info('🚀 Build Worker started.');
    void checkForPendingJobs(true); // Initial check, indicate it's the first run
  
    // Start polling with better control and error handling
    intervalId = setInterval(async () => {
      // Skip this cycle if polling is paused due to errors
      if (isPollingPaused) {
        const now = Date.now();
        // Resume after backoff period
        if (now - lastErrorTime > ERROR_BACKOFF_MS) {
          buildWorkerLogger.info('Resuming custom component job polling after error backoff');
          isPollingPaused = false;
        } else {
          return; // Skip this cycle
        }
      }
      
      try {
        const pendingJobCount = await checkForPendingJobs();
    
        consecutiveErrors = 0;

        if (pendingJobCount > 0) {
          noJobCycles = 0;
          if (currentPollIntervalMs !== pollIntervalMs) {
            currentPollIntervalMs = pollIntervalMs;
            buildWorkerLogger.info(`💡 Jobs found. Resetting poll interval to ${currentPollIntervalMs / 1000}s.`);
          }
        } else {
          noJobCycles++;
          const nextInterval = Math.min(MAX_POLL_INTERVAL_MS, pollIntervalMs * Math.pow(2, noJobCycles));
          if (nextInterval !== currentPollIntervalMs) {
            currentPollIntervalMs = nextInterval;
            buildWorkerLogger.info(`💤 No new jobs found for ${noJobCycles} cycle(s). Backing off. Next poll in ${currentPollIntervalMs / 1000}s.`);
          }
        }
      } catch (error) {
        consecutiveErrors++;
        lastErrorTime = Date.now();
        
        if (consecutiveErrors >= 3) {
          buildWorkerLogger.info(`Pausing custom component job polling for ${ERROR_BACKOFF_MS/1000} seconds due to errors`);
          isPollingPaused = true;
          currentPollIntervalMs = ERROR_BACKOFF_MS; // Use error backoff interval
        }
        
        buildWorkerLogger.error('Error checking for pending jobs:', { error });
      }
    }, currentPollIntervalMs); // Use dynamic interval
  }, initialDelay);
  
  // Return a cleanup function to stop polling if needed
  return () => stopBuildWorker();
}

/**
 * Stop the build worker
 */
function stopBuildWorker() {
  if (intervalId) {
    buildWorkerLogger.info('Stopping custom component build worker...');
    clearInterval(intervalId);
    intervalId = null;
    isWorkerRunning = false;
    currentPollIntervalMs = pollIntervalMs; // Reset for next start
    noJobCycles = 0;
  }
}

/**
 * Check if there are any pending jobs and process them if found
 * @returns Number of pending jobs found
 */
async function checkForPendingJobs(isInitialRun = false): Promise<number> {
  if (!isInitialRun) {
    buildWorkerLogger.info(`Polling for build jobs. Current interval: ${currentPollIntervalMs / 1000}s.`);
  }
  
  try {
    buildWorkerLogger.debug("Build worker checking for jobs with status 'building' or 'manual_build_retry'..."); // More specific log
    // Check if there are any jobs in 'building' or 'manual_build_retry' state
    const jobsToBuild = await db
      .select({ id: customComponentJobs.id })
      .from(customComponentJobs)
      .where(or(
        eq(customComponentJobs.status, "building"),
        eq(customComponentJobs.status, "manual_build_retry")
      ))
      .limit(1);
    
    // If we found at least one job, process all building jobs
    if (jobsToBuild.length > 0) {
      buildWorkerLogger.info(`Found ${jobsToBuild.length} job(s) ready for build (status 'building' or 'manual_build_retry')`);
      await processPendingJobs();
      return jobsToBuild.length;
    }
    
    buildWorkerLogger.debug("No jobs found with status 'building' or 'manual_build_retry'.");
    return 0;
  } catch (error) {
    // Re-throw to let caller handle
    throw error;
  }
}
