// src/scripts/task-processor-wrapper.js
import { config } from 'dotenv';
import { TaskProcessor } from '../server/services/a2a/taskProcessor.service.js';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '../../.env.local');

if (fs.existsSync(envPath)) {
  console.log(`Loading environment variables from ${envPath}`);
  config({ path: envPath });
} else {
  console.warn(`Warning: .env.local file not found at ${envPath}`);
}

// Set message bus architecture
process.env.USE_MESSAGE_BUS = 'true';

// Set log directories
process.env.LOG_DIR = process.env.LOG_DIR || '/tmp/bazaar-logs';
process.env.A2A_LOG_DIR = process.env.A2A_LOG_DIR || '/tmp/a2a-logs';
process.env.ERROR_LOG_DIR = process.env.ERROR_LOG_DIR || '/tmp/error-logs';
process.env.COMBINED_LOG_DIR = process.env.COMBINED_LOG_DIR || '/tmp/combined-logs';

// Set task processor configuration
process.env.TASK_PROCESSOR_STARTUP_DELAY = process.env.TASK_PROCESSOR_STARTUP_DELAY || '10000';
process.env.TASK_PROCESSOR_HEARTBEAT_INTERVAL = process.env.TASK_PROCESSOR_HEARTBEAT_INTERVAL || '5000';

console.log('Starting TaskProcessor with Message Bus:', process.env.USE_MESSAGE_BUS);

try {
  // Initialize the TaskProcessor
  const processor = TaskProcessor.getInstance();
  processor.initializePolling(true);
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Received SIGINT signal, shutting down TaskProcessor...');
    await processor.shutdown();
    process.exit(0);
  });
  
  // Log a health check periodically
  setInterval(() => {
    console.log('TaskProcessor health check');
    processor.emitHealthCheck();
  }, 30000);
  
  console.log('TaskProcessor running with Message Bus. Press Ctrl+C to exit.');
} catch (error) {
  console.error('Fatal error initializing TaskProcessor:', error);
  process.exit(1);
}
