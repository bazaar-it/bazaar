// src/server/init.ts
import { startBuildWorker } from './cron/buildWorker';

// Track initialization state globally
let isInitialized = false;
let workerCleanup: (() => void) | null = null;

/**
 * Initialize server-side background processes.
 * This is called from the Next.js instrumentation hook to ensure
 * background workers are running only once in development and production.
 * 
 * Uses a singleton pattern to prevent multiple initializations.
 */
export function initializeServer() {
  if (typeof window !== 'undefined') {
    // Skip if client-side
    return;
  }

  if (isInitialized) {
    console.log('⏭️ Server already initialized, skipping duplicate initialization');
    return;
  }

  console.log('🚀 Initializing server background processes...');

  // Start component build worker
  workerCleanup = startBuildWorker();

  // Mark as initialized
  isInitialized = true;

  // Clean up on process exit
  process.on('beforeExit', cleanupServer);
  process.on('SIGINT', () => {
    cleanupServer();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    cleanupServer();
    process.exit(0);
  });
}

/**
 * Cleanup function for server shutdown
 */
function cleanupServer() {
  console.log('🧹 Cleaning up server resources...');
    if (workerCleanup) {
      workerCleanup();
      workerCleanup = null;
      isInitialized = false;
    }
}

// Export the cleanup function for manual use if needed
export { cleanupServer };

// REMOVED: Do not initialize on import anymore
// initializeServer();
