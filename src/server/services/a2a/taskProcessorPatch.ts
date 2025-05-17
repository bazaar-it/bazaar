//src/server/services/a2a/taskProcessorPatch.ts
/**
 * Patched version of TaskProcessor that works around dependency issues
 */

import process from 'node:process';
import { TaskProcessor } from './taskProcessor.service';
import logger, { a2aLogger, initializeA2AFileTransport } from '~/lib/logger';

// Use RFC6902 instead of fast-json-patch
import * as rfc6902 from 'rfc6902';
// Monkey patch it to avoid module resolution issues
(global as any).fastJsonPatch = {
  compare: (oldObj: any, newObj: any) => {
    return rfc6902.createPatch(oldObj, newObj);
  },
  applyPatch: (obj: any, patches: any) => {
    return { newDocument: rfc6902.applyPatch(obj, patches) };
  }
};

/**
 * Start the task processor with proper error handling
 */
async function main() {
  console.log('Starting patched TaskProcessor');

  try {
    // Initialize the A2A logger
    initializeA2AFileTransport();
    console.log('A2A logger initialized');

    // Get TaskProcessor instance and initialize polling
    const processor = TaskProcessor.getInstance();
    processor.initializePolling(true);
    
    console.log('TaskProcessor initialized and polling started');
    
    // Set up graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\nReceived SIGINT, shutting down TaskProcessor...');
      await processor.shutdown();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('\nReceived SIGTERM, shutting down TaskProcessor...');
      await processor.shutdown();
      process.exit(0);
    });
    
    // Log a health check periodically
    setInterval(() => {
      console.log('TaskProcessor health check: running');
    }, 60000);
    
    console.log('TaskProcessor startup complete, ready to process tasks');
  } catch (err) {
    console.error('Fatal error in TaskProcessor script:', err);
    process.exit(1);
  }
}

// Start the main function
main().catch(err => {
  console.error('Fatal error in TaskProcessor script:', err);
  process.exit(1);
});
