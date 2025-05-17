# Preventing Next.js HMR Restarts from Killing TaskProcessor

## Problem Description

The development server is caught in an infinite restart loop due to Next.js Hot Module Replacement (HMR) being repeatedly triggered by file changes, especially log files. This causes:

1. SIGTERM signals being sent to the TaskProcessor instances every ~0.5 seconds
2. TaskProcessor instances being killed before they can complete their tasks
3. ScenePlannerAgent and other agents unable to process messages properly
4. Constant "TaskProcessor graceful shutdown complete after SIGTERM" messages in logs

The root cause is Winston logger creating log files in directories that Next.js watches for changes, triggering HMR, which then restarts the server.

## Solution: Comprehensive Approach

We implemented a multi-layered solution to this problem:

### 1. Enhanced Next.js Configuration (next.config.js)

We improved webpack configuration to:
- Add comprehensive ignore patterns for log and A2A service directories
- Increase polling interval from 1000ms to 5000ms
- Increase aggregation timeout from 1000ms to 5000ms
- Disable file system symlink following

```javascript
// Added to next.config.js
const config = {
  // ... existing config
  
  webpack: (config, { isServer, dev }) => {
    // ... existing config
    
    if (dev) {
      const ignoredPatterns = [
        // ... existing patterns
        
        // A2A specific directories to prevent TaskProcessor restarts
        '**/src/server/services/a2a/**',
        '**/src/server/agents/**',
        '**/src/server/workers/**',
        
        // ... more patterns
      ];
      
      return {
        ...config,
        watchOptions: {
          ...(config.watchOptions || {}),
          ignored: ignoredPatterns,
          poll: 5000, // Check for changes every 5 seconds
          aggregateTimeout: 5000, // Wait 5 seconds after changes before restarting
          followSymlinks: false
        }
      };
    }
    
    // ... rest of config
  }
};
```

### 2. Enhanced TaskProcessor Resilience

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

### 3. New Development Scripts

Added special development scripts to package.json:

```json
"scripts": {
  // ... existing scripts
  "dev:no-restart": "WATCHPACK_POLLING=true CHOKIDAR_USEPOLLING=true next dev",
  "dev:stable": "NEXT_MANUAL_SIG_HANDLE=true next dev",
  "dev:task-processor": "tsx src/scripts/run-task-processor.ts"
}
```

### 4. Standalone TaskProcessor Implementation

Created a dynamic import-based approach to run the TaskProcessor independently from Next.js to avoid ESM import path issues:

```typescript
// Standalone Task Processor using dynamic imports
import process from 'node:process';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamically import the TaskProcessor
async function main() {
  // Import environment
  await importEnv();
  
  // Import the logger first to correctly set up log directories
  const { a2aLogger, initializeA2AFileTransport } = await import(path.join(scriptDir, 'lib/logger'));
  
  // Explicitly initialize A2A file transport
  initializeA2AFileTransport();
  
  // Then import the TaskProcessor service
  const { TaskProcessor } = await import(path.join(scriptDir, 'server/services/a2a/taskProcessor.service'));
  
  // Initialize and use the TaskProcessor...
}

// Start the main function
main().catch(err => {
  console.error('Fatal error in TaskProcessor script:', err);
  process.exit(1);
});
```

### 5. Helper Shell Scripts

Created three shell scripts to simplify development:

**scripts/startup.sh**
```bash
#!/bin/bash
# Creates log directories outside project
# Sets environment variables for stability
# Runs Next.js with polling-based stability
```

**scripts/run-standalone-processor.sh**
```bash
#!/bin/bash
# Creates log directories outside project
# Sets environment variables
# Runs standalone TaskProcessor
```

**scripts/start-complete.sh** (RECOMMENDED)
```bash
#!/bin/bash
# Creates log directories outside project
# Checks if tsx is installed and installs it if not
# Creates a temporary fixed TaskProcessor script
# Runs BOTH Next.js dev server AND standalone TaskProcessor in parallel
# Automatically terminates the TaskProcessor when Next.js is closed
```

### 6. Enhanced Logger Configuration

Updated the logger.ts file to properly use environment variables for log directories:

```typescript
// Server-side initialization with file transports
const logsDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs');
const errorLogsDir = process.env.ERROR_LOG_DIR || logsDir;
const combinedLogsDir = process.env.COMBINED_LOG_DIR || logsDir;
const componentsLogsDir = process.env.COMPONENTS_LOG_DIR || logsDir;

// Ensure logs directories exist
[logsDir, errorLogsDir, combinedLogsDir, componentsLogsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created log directory: ${dir}`);
  }
});
```

## Running The Solution

You can now run the application in one of three ways:

### Option 1: Using polling-based HMR stability
```bash
./scripts/startup.sh
```

### Option 2: Running TaskProcessor separately
Terminal 1:
```bash
npm run dev:no-restart
```

Terminal 2:
```bash
./scripts/run-standalone-processor.sh
```

### Option 3: All-in-one script (RECOMMENDED)
```bash
./scripts/start-complete.sh
```

## Technical Explanation

1. **Log Directory Isolation**: By moving logs to `/tmp`, we prevent them from triggering HMR
2. **Watchpack Polling**: Using `WATCHPACK_POLLING=true` improves stability without needing `--no-restart` (which isn't available in Next.js 15)
3. **A2A Service Exclusion**: We specifically tell webpack to ignore A2A service directories
4. **Manual Signal Handling**: `NEXT_MANUAL_SIG_HANDLE=true` lets us control how SIGTERM is handled
5. **Process Decoupling**: Running TaskProcessor in a separate process isolates it from Next.js HMR
6. **Dynamic Imports**: Using dynamic imports in the TaskProcessor script avoids ESM path resolution issues
7. **Complete Startup Script**: The new start-complete.sh script handles everything in one command
8. **Environment Variables**: Properly configuring the logger to use environment variables for log directories
9. **TSX Dependency Check**: The script now checks for and installs the `tsx` command if it's missing

## Issues Encountered and Solutions

1. **Next.js 15 compatibility**: 
   - The `--no-restart` flag is not available in Next.js 15
   - Solution: Use `WATCHPACK_POLLING=true` and `CHOKIDAR_USEPOLLING=true` environment variables instead

2. **Import path issues**:
   - The original TaskProcessor script had issues with `.ts` file extensions in import paths
   - Solution: Use dynamic imports without file extensions and create a fixed version of the script at runtime

3. **Logger configuration**:
   - Logger wasn't properly using environment variables for log directories
   - Solution: Updated logger.ts to properly use environment variables and create necessary directories
   
4. **Missing tsx command**:
   - The tsx command may not be installed globally on all systems
   - Solution: Added auto-detection and installation in the startup script

5. **Dual log output**:
   - Logs might still be written to both project directory and /tmp
   - Solution: The enhanced logger initialization explicitly confirms the log directories and separates different types of logs

## Troubleshooting

If logs are still appearing in the project's `/logs` directory:

1. Ensure the environment variables are correctly set:
   ```bash
   echo $LOG_DIR
   echo $A2A_LOG_DIR
   echo $ERROR_LOG_DIR
   echo $COMBINED_LOG_DIR
   ```

2. Check that the modified script is using the correct environment variables:
   ```bash
   tail -n 20 /tmp/run-task-processor-fixed.ts
   ```

3. Make sure you're using the latest version of the script with the proper ordering of imports:
   ```bash
   # It should import the environment first, then logger (with initialization), then TaskProcessor
   ```

4. If you're getting a "tsx: command not found" error, make sure it's installed:
   ```bash
   npm install -g tsx
   ```

## Testing Steps

1. Start the application with `./scripts/start-complete.sh`
2. Check logs for absence of multiple SIGTERM messages
3. Test the A2A endpoint with a sample task
4. Monitor log file creation to ensure they're in `/tmp` and don't trigger HMR
5. Verify the TaskProcessor remains active for over 5 minutes
6. Confirm logs are being written to the `/tmp` directories by checking:
   ```bash
   ls -la /tmp/bazaar-logs /tmp/a2a-logs /tmp/error-logs /tmp/combined-logs
   ```

## Additional Considerations

- This solution maintains the logic in one codebase while allowing for stable operation
- The standalone process approach is preferred for production-like environments
- For CI/CD, prefer the `NEXT_MANUAL_SIG_HANDLE=true` approach
- Consider implementing this as a permanent architecture change in the future