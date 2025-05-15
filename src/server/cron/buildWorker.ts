// src/server/cron/buildWorker.ts
import { processPendingJobs } from '../workers/buildCustomComponent';
import { db } from '~/server/db';
import { customComponentJobs } from '~/server/db/schema';
import { eq, or } from 'drizzle-orm';
import logger from '~/lib/logger';

const POLL_INTERVAL_MS = 10000; // Check every 10 seconds (increased from 5s)
const ERROR_BACKOFF_MS = 30000; // If we hit errors, back off for 30 seconds

// Track errors to implement exponential backoff
let consecutiveErrors = 0;
let lastErrorTime = 0;
let isPollingPaused = false;

// Track worker state
let intervalId: NodeJS.Timeout | null = null;
let isWorkerRunning = false;

/**
 * Start the build worker polling process
 * This runs continuously in the background, processing pending component jobs
 * with smart error handling and backoff
 */
export function startBuildWorker() {
  // Prevent multiple instances of the worker
  if (isWorkerRunning && intervalId) {
    logger.info('⚠️ Build worker already running, skipping duplicate initialization');
    return () => stopBuildWorker();
  }
  
  logger.info('🛠️ Starting custom component build worker...');
  isWorkerRunning = true;
  
  // Check if we have any pending jobs before starting the polling
  void checkForPendingJobs();
  
  // Start polling with better control and error handling
  intervalId = setInterval(async () => {
    // Skip this cycle if polling is paused due to errors
    if (isPollingPaused) {
      const now = Date.now();
      // Resume after backoff period
      if (now - lastErrorTime > ERROR_BACKOFF_MS) {
        logger.info('Resuming custom component job polling after error backoff');
        isPollingPaused = false;
      } else {
        return; // Skip this cycle
      }
    }
    
    try {
      // Check if there are any pending jobs before processing
      const pendingJobCount = await checkForPendingJobs();
  
      // If we got a successful response (even with 0 jobs), reset error counter
      consecutiveErrors = 0;
    } catch (error) {
      // Increment error counter and implement backoff
      consecutiveErrors++;
      lastErrorTime = Date.now();
      
      // If we hit too many errors, pause polling temporarily
      if (consecutiveErrors >= 3) {
        logger.info(`Pausing custom component job polling for ${ERROR_BACKOFF_MS/1000} seconds due to errors`);
        isPollingPaused = true;
      }
      
      logger.error('Error checking for pending jobs:', { error });
    }
  }, POLL_INTERVAL_MS);
  
  // Return a cleanup function to stop polling if needed
  return () => stopBuildWorker();
}

/**
 * Stop the build worker
 */
function stopBuildWorker() {
  if (intervalId) {
    logger.info('Stopping custom component build worker...');
    clearInterval(intervalId);
    intervalId = null;
    isWorkerRunning = false;
  }
}

/**
 * Check if there are any pending jobs and process them if found
 * @returns Number of pending jobs found
 */
async function checkForPendingJobs(): Promise<number> {
  logger.info("Build worker checking for jobs...");
  
  try {
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
      logger.info(`Found ${jobsToBuild.length} job(s) ready for build (status 'building' or 'manual_build_retry')`);
      await processPendingJobs();
      return jobsToBuild.length;
    }
    
    logger.debug("No jobs found with status 'building' or 'manual_build_retry'");
    return 0;
  } catch (error) {
    // Re-throw to let caller handle
    throw error;
  }
}
