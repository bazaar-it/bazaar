// src/server/cron/buildWorker.ts
import { processPendingJobs } from '../workers/buildCustomComponent';

const POLL_INTERVAL_MS = 5000; // Check every 5 seconds

/**
 * Start the build worker polling process
 * This runs continuously in the background, processing any pending component jobs
 */
export function startBuildWorker() {
  console.log('🛠️ Starting custom component build worker...');
  
  // Process jobs immediately on startup
  void processPendingJobs();
  
  // Then process periodically
  const intervalId = setInterval(() => {
    void processPendingJobs();
  }, POLL_INTERVAL_MS);
  
  // Return a cleanup function to stop polling if needed
  return () => {
    console.log('Stopping custom component build worker...');
    clearInterval(intervalId);
  };
}
