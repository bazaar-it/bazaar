# Preventing Next.js HMR Restarts from Killing TaskProcessor

## Problem Description

The development server was caught in an infinite restart loop due to Next.js Hot Module Replacement (HMR) being repeatedly triggered by file changes, especially log files. This caused:

1. SIGTERM signals being sent to the TaskProcessor instances every ~0.5 seconds
2. TaskProcessor instances being killed before they could complete their tasks
3. ScenePlannerAgent and other agents unable to process messages properly
4. Constant "TaskProcessor graceful shutdown complete after SIGTERM" messages in logs

The root cause was Winston logger creating log files in directories that Next.js watches for changes, triggering HMR, which then restarted the server.

## Solution: Comprehensive Approach

We implemented a multi-layered solution to this problem:

### 1. Enhanced TaskProcessor Resilience

We improved the TaskProcessor's shutdown handling to properly clean up resources:

```typescript
public async shutdown(): Promise<void> {
  // ... existing code
  
  // Clean up startup delay timer
  if (this.startupDelayTimer) {
    clearTimeout(this.startupDelayTimer);
    this.startupDelayTimer = null;
  }
  
  // ... existing code
  
  // Force release the global instance to prevent memory leaks
  if (globalThis.__TASK_PROCESSOR_INSTANCE__ === this) {
    a2aLogger.info(null, `TaskProcessor (${this.instanceId}) clearing global instance reference`);
    globalThis.__TASK_PROCESSOR_INSTANCE__ = undefined;
  }
  
  // ... rest of method
}
```

### 2. New Development Scripts

Added special development scripts to package.json:

```json
"scripts": {
  // ... existing scripts
  "dev:no-restart": "WATCHPACK_POLLING=true next dev",
  "dev:stable": "NEXT_MANUAL_SIG_HANDLE=true next dev",
  "dev:task-processor": "tsx src/scripts/run-task-processor.ts"
}
```

### 3. Standalone TaskProcessor Script

Created a standalone script to run the TaskProcessor independently from Next.js:

```typescript
// src/scripts/run-task-processor.ts
import process from 'node:process';
import { TaskProcessor } from '../server/services/a2a/taskProcessor.service';
import { a2aLogger } from '../lib/logger';

// Configure env first
import '../env.js';

console.log('Starting standalone TaskProcessor...');

// Initialize the TaskProcessor
const processor = TaskProcessor.getInstance();
processor.initializePolling(true);

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

// Keep process alive
console.log('TaskProcessor running independently. Press Ctrl+C to stop.');
process.stdin.resume();

// Log heartbeat every 30 seconds to show the processor is still running
setInterval(() => {
  processor.emitHealthCheck();
  console.log(`[${new Date().toISOString()}] TaskProcessor heartbeat - still running...`);
}, 30000);
```

### 4. Helper Shell Scripts

Created two shell scripts to simplify development:

**scripts/startup.sh**
```bash
#!/bin/bash
# Creates log directories outside project
mkdir -p /tmp/bazaar-logs
mkdir -p /tmp/a2a-logs
mkdir -p /tmp/error-logs
mkdir -p /tmp/combined-logs

echo "Created log directories outside project to prevent HMR triggers"

# Set environment variables for HMR stability
export NEXT_MANUAL_SIG_HANDLE=true
export LOG_DIR=/tmp/bazaar-logs
export A2A_LOG_DIR=/tmp/a2a-logs
export ERROR_LOG_DIR=/tmp/error-logs
export COMBINED_LOG_DIR=/tmp/combined-logs
export TASK_PROCESSOR_STARTUP_DELAY=10000
export TASK_PROCESSOR_HEARTBEAT_INTERVAL=5000

echo "Set environment variables for HMR stability"
echo "Starting Next.js with environment variables for HMR stability"

# Start Next.js dev server with environment variables for stability
export WATCHPACK_POLLING=true
export CHOKIDAR_USEPOLLING=true
export NODE_OPTIONS="--max-old-space-size=4096"

npm run dev:stable
```

**scripts/run-standalone-processor.sh**
```bash
#!/bin/bash

# Create log directories
mkdir -p /tmp/bazaar-logs
mkdir -p /tmp/a2a-logs
mkdir -p /tmp/error-logs
mkdir -p /tmp/combined-logs

echo "Created log directories outside project to prevent HMR triggers"

# Set environment variables
export LOG_DIR=/tmp/bazaar-logs
export A2A_LOG_DIR=/tmp/a2a-logs
export ERROR_LOG_DIR=/tmp/error-logs
export COMBINED_LOG_DIR=/tmp/combined-logs
export TASK_PROCESSOR_STARTUP_DELAY=10000
export TASK_PROCESSOR_HEARTBEAT_INTERVAL=5000

echo "Set environment variables for TaskProcessor"
echo "Starting standalone TaskProcessor..."

# Run the TaskProcessor script
npm run dev:task-processor
```

## Running The Solution

You can now run the application in one of two ways:

### Option 1: Using the environment variables for stability
```bash
./scripts/startup.sh
```

### Option 2: Running TaskProcessor separately
Terminal 1:
```bash
npm run dev:stable
```

Terminal 2:
```bash
./scripts/run-standalone-processor.sh
```

## Technical Explanation

1. **Log Directory Isolation**: By moving logs to `/tmp`, we prevent them from triggering HMR
2. **Environment Variables**: We use specific environment variables like `WATCHPACK_POLLING` and `NEXT_MANUAL_SIG_HANDLE` to modify Next.js behavior
3. **Manual Signal Handling**: `NEXT_MANUAL_SIG_HANDLE=true` lets us control how SIGTERM is handled
4. **Process Decoupling**: Running TaskProcessor in a separate process isolates it from Next.js HMR completely

## Testing Steps

1. Start the development server with `./scripts/startup.sh`
2. In a separate terminal, run `./scripts/run-standalone-processor.sh`
3. Check logs for absence of multiple SIGTERM messages
4. Test the A2A endpoint with a sample task
5. Monitor log file creation to ensure they're in `/tmp` and don't trigger HMR
6. Verify the TaskProcessor remains active for over 5 minutes

## Additional Considerations

- This solution maintains the logic in one codebase while allowing for stable operation
- The standalone process approach is preferred for production-like environments
- For CI/CD, prefer the `NEXT_MANUAL_SIG_HANDLE=true` approach
- Consider implementing this as a permanent architecture change in the future
