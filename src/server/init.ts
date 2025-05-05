// src/server/init.ts
import { startBuildWorker } from './cron/buildWorker';

// Track initialization state
let isInitialized = false;
let workerCleanup: (() => void) | null = null;

/**
 * Initialize server-side background processes.
 * This is called from server components or API routes to ensure
 * background workers are running in development and production.
 * 
 * Uses a singleton pattern to prevent multiple initializations.
 */
export function initializeServer() {
  if (typeof window !== 'undefined' || isInitialized) {
    // Skip if client-side or already initialized
    return;
  }

  console.log('🚀 Initializing server background processes...');

  // Start component build worker
  workerCleanup = startBuildWorker();

  // Mark as initialized
  isInitialized = true;

  // Clean up on process exit
  process.on('beforeExit', () => {
    if (workerCleanup) {
      workerCleanup();
      workerCleanup = null;
      isInitialized = false;
    }
  });
}

// This ensures the initialization runs on import in a server context
initializeServer();
