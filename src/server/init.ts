// src/server/init.ts
import { startBuildWorker } from './cron/buildWorker';
import { startCodeGenWorker, stopCodeGenWorker } from './cron/codeGenWorker';
import { TaskProcessor } from '~/server/services/a2a/taskProcessor.service';
import { a2aLogger } from '~/lib/logger';
import { dataLifecycleService } from '~/lib/services/dataLifecycle.service';

// Create a global object for truly persisting state across HMR cycles
declare global {
  // eslint-disable-next-line no-var
  var __SERVER_INITIALIZED: boolean;
  // eslint-disable-next-line no-var
  var __SERVER_CLEANUP_FUNCTIONS: (() => void)[];
}

// Initialize global state if it doesn't exist
if (typeof global.__SERVER_INITIALIZED === 'undefined') {
  global.__SERVER_INITIALIZED = false;
}

// Initialize global cleanup functions array if it doesn't exist
if (!global.__SERVER_CLEANUP_FUNCTIONS) {
  global.__SERVER_CLEANUP_FUNCTIONS = [];
}

// Use global references for initialization state and cleanup functions
const isInitialized = global.__SERVER_INITIALIZED;
const workerCleanupFunctions = global.__SERVER_CLEANUP_FUNCTIONS;

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
  
  // Start A2A task processor
  const taskProcessor = TaskProcessor.getInstance();
  if (taskProcessor) {
    taskProcessor.startPolling();
    workerCleanupFunctions.push(() => taskProcessor.shutdown());
    a2aLogger.info("lifecycle", '🤖 Started A2A task processor service');
  } else {
    a2aLogger.warn('lifecycle', 'ℹ️ A2A task processor is not available or disabled');
  }

  // Start Data Lifecycle Management
  try {
    dataLifecycleService.startAutomatedCleanup({
      imageAnalysisRetentionDays: 30,
      conversationContextRetentionDays: 90,
      sceneIterationsRetentionDays: 60,
      projectMemoryRetentionDays: 180,
      enableAutoCleanup: process.env.NODE_ENV === 'production',
      cleanupIntervalHours: 24
    });
    workerCleanupFunctions.push(() => dataLifecycleService.stopAutomatedCleanup());
    console.log('🗂️ Data lifecycle management service started');
  } catch (error) {
    console.error('❌ Failed to start data lifecycle management:', error);
  }

  // Mark as initialized in the global state
  global.__SERVER_INITIALIZED = true;

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
  global.__SERVER_INITIALIZED = false;
}

// Export the cleanup function for manual use if needed
export { cleanupServer };

// REMOVED: Do not initialize on import anymore
// initializeServer();
