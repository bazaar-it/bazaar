// src/scripts/run-task-processor.ts

import process from 'node:process';
import { TaskProcessor } from '../server/services/a2a/taskProcessor.service';
import { a2aLogger } from '../lib/logger';

// Configure env first (similar to what Next.js would do)
import '../env.js';

console.log('Starting standalone TaskProcessor...');

// Initialize the TaskProcessor
const processor = TaskProcessor.getInstance();
console.log('TaskProcessor instance created.');

// Start polling for tasks
processor.initializePolling(true);
console.log('TaskProcessor polling initialized.');

// Handle graceful shutdown
async function shutdown(signal: string) {
  console.log(`\n${signal} received, shutting down TaskProcessor...`);
  
  try {
    await processor.shutdown();
    console.log('TaskProcessor shutdown complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error during TaskProcessor shutdown:', error);
    process.exit(1);
  }
}

// Set up signal handlers
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Log every 30 seconds to show the processor is still running
setInterval(() => {
  processor.emitHealthCheck();
  console.log(`TaskProcessor running... ${new Date().toISOString()}`);
}, 30000);

// Keep the process alive
console.log('TaskProcessor running independently. Press Ctrl+C to stop.');
process.stdin.resume(); 