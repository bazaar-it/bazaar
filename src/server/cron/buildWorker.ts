// src/server/cron/buildWorker.ts
import { processPendingJobs } from '../workers/buildCustomComponent';
import { db } from '~/server/db';
import { customComponentJobs } from '~/server/db/schema';
import { eq } from 'drizzle-orm';

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
    console.log('⚠️ Build worker already running, skipping duplicate initialization');
    return () => stopBuildWorker();
  }
  
  console.log('🛠️ Starting custom component build worker...');
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
        console.log('Resuming custom component job polling after error backoff');
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
        console.log(`Pausing custom component job polling for ${ERROR_BACKOFF_MS/1000} seconds due to errors`);
        isPollingPaused = true;
      }
      
      console.error('Error checking for pending jobs:', error);
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
    console.log('Stopping custom component build worker...');
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
  try {
    // Use count() correctly based on Drizzle ORM syntax
    const result = await db
      .select()
      .from(customComponentJobs)
      .where(eq(customComponentJobs.status, "pending"))
      .limit(1);
    
    // If we found at least one job, process all pending jobs
    if (result.length > 0) {
      console.log(`Found pending jobs, processing...`);
      await processPendingJobs();
      return result.length;
    }
    
    return 0;
  } catch (error) {
    // Re-throw to let caller handle
    throw error;
  }
}
