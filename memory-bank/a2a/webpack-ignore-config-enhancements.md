# Webpack Ignore Configuration Enhancements and TaskProcessor Resilience

## Problem

We were experiencing frequent SIGTERM signals being sent to the TaskProcessor instances, causing them to shut down before they could complete their tasks. The issue was that Next.js Hot Module Replacement (HMR) was being triggered by file changes (especially log files), causing the server to restart every 5-6 seconds and killing all in-progress tasks.

Logs showed evidence of TaskProcessor instances being created and then immediately killed (approximately 0.5 seconds later). This pattern repeated constantly, preventing any meaningful task processing from occurring. Even when a TaskProcessor managed to start processing a task, it would be killed before completion.

## Solution: Enhanced Webpack Configuration

We significantly improved the webpack configuration in next.config.js to ignore more file types and patterns that trigger unnecessary HMR restarts:

1. **Consolidated String Patterns**: Created a comprehensive list of string patterns to ignore:
   ```javascript
   const ignoredPatterns = [
     // Directories to ignore
     '**/node_modules/**',
     '**/.next/**',
     '**/logs/**',
     '**/tmp/**',
     '**/a2a-logs/**',
     '**/.git/**',
     
     // File patterns to ignore
     '**/*.log',
     '**/*.log.*',
     '**/combined-*.log',
     '**/error-*.log',
     '**/a2a-*.log',
     '**/components-*.log',
     '**/.DS_Store'
   ];
   ```

2. **Webpack API Compliance**: Ensured our configuration uses only string patterns for `watchOptions.ignored` as required by the Webpack API (not RegExp objects)

3. **Improved HMR Configuration**:
   - Added a longer polling interval (`poll: 1000`) to reduce CPU usage
   - Added an aggregation timeout (`aggregateTimeout: 1000`) to prevent multiple restarts in rapid succession

## Solution: TaskProcessor Resilience

We also made the TaskProcessor more resilient to restarts:

1. **Instance Tracking**:
   - Added a unique instance ID to each TaskProcessor instance
   - Implemented a heartbeat mechanism to detect multiple instances running concurrently
   - Built coordination between instances to prevent duplication of effort

2. **Startup Delay**:
   - Added a startup delay (5 seconds) before polling begins to prevent immediate work after a restart
   - This gives the system time to stabilize before accessing the database

3. **Graceful Shutdown**:
   - Improved shutdown handling to ensure clean exit
   - Added delay before final process.exit() to allow logs to be written
   - Proper cleanup of timers and resources during shutdown

4. **Inter-instance Coordination**:
   - Added a global heartbeat object that tracks the most recently active instance
   - Instances back off polling if they detect another active instance
   - Prevents database contention from multiple simultaneous polling cycles

## Logger Enhancement

Added a missing `debug` method to the `a2aLogger` object to handle additional logging requirements:

```javascript
debug: (taskId: string | null, message: string, meta: Record<string, any> = {}) => {
  const taskInfo = taskId ? `[TASK:${taskId}] ` : '';
  logger.debug(`[A2A:DEBUG]${taskInfo}${message}`, { ...meta, a2a: true, taskId });
},
```

## Results

These changes should significantly reduce the frequency of TaskProcessor restarts due to HMR, allowing tasks to be processed to completion. The coordination between instances also ensures that even when multiple instances do get created, they won't conflict with each other and will naturally converge to a single active instance.

The delayed polling start and improved shutdown handling make the system more resilient to the transient restarts that might still occur.

## Next Steps

1. Monitor the system to confirm the reduced frequency of TaskProcessor restarts
2. Verify that tasks are successfully being processed to completion without interruption
3. Consider moving the A2A processing to a separate worker process entirely if the issue persists 