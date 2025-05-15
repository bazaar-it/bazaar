// src/server/init.ts
import { startBuildWorker } from './cron/buildWorker';
import { startCodeGenWorker, stopCodeGenWorker } from './cron/codeGenWorker';

// Track initialization state globally
let isInitialized = false;

// Store cleanup functions for multiple workers
const workerCleanupFunctions: (() => void)[] = [];

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
  const buildWorkerStopper = startBuildWorker();
  if (buildWorkerStopper) {
    workerCleanupFunctions.push(buildWorkerStopper);
  }

  // Start component code generation worker
  const codeGenWorkerStopper = startCodeGenWorker();
  if (codeGenWorkerStopper) {
    workerCleanupFunctions.push(codeGenWorkerStopper);
  }

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
  // Call all registered cleanup functions
  for (const cleanupFn of workerCleanupFunctions) {
    try {
      cleanupFn();
    } catch (e) {
      console.error('Error during worker cleanup:', e);
    }
  }
  workerCleanupFunctions.length = 0; // Clear the array
  isInitialized = false;
}

// Export the cleanup function for manual use if needed
export { cleanupServer };

// REMOVED: Do not initialize on import anymore
// initializeServer();
