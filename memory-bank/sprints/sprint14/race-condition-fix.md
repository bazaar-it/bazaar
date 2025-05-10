# Race Condition in Custom Component Build Process

## Issue Description

The custom component build pipeline was encountering errors where jobs were getting stuck in a "building" status with the error message "TSX code is missing for this job", despite the code being properly generated and stored in the database.

### Symptoms:
- Custom component jobs were found in the database with status "building" and error message "TSX code is missing for this job"
- The TSX code field was populated correctly in the database
- Logs showed timestamp discrepancies:
  - Build worker attempted to fetch the job record and build the component too early
  - Component generator saved the TSX code after the build worker already tried to process it

### Root Cause Analysis:

The issue was a classic race condition:

1. Component generator creates a job with status "pending"
2. Cron job `processPendingJobs()` in `buildWorker.ts` finds all pending jobs
3. Before the component generator finishes and saves the TSX code, the build worker:
   - Updates the job status to "building"
   - Attempts to build the component 
   - Fails because TSX code is not yet available
   - Updates job status to "error" with message "TSX code is missing for this job"

For example, job `5a8942ea-16d0-4df6-9362-c6b313a26bdf` was fetched for building at 04:38:22 with `hasTsxCodeInFetchedRecord: false`, but the code was only saved at 04:39:03 (41 seconds later).

## Solution Implemented

The solution was to implement a direct trigger pattern instead of relying on the cron job:

1. In `generateComponentCode.ts`, after successfully saving the TSX code:
   - Update job status to "building"
   - Directly trigger the `buildCustomComponent` function by dynamically importing the module
   - Use a fire-and-forget pattern (no await) to avoid blocking the component generation process
   - Add proper error handling for the dynamic import and build process

2. Add comprehensive logging to track the execution flow and timestamps:
   - Add `hasTsxCodeInFetchedRecord` and `tsxCodeLength` logs to verify data state
   - Log critical steps in the process for debugging

3. Error handling improvements:
   - Added additional error context logging
   - Implemented better status updates to reflect actual errors

## Code Changes

The key code change was in `generateComponentCode.ts`:

```typescript
// After saving TSX code to database
await db.update(customComponentJobs)
  .set({
    tsxCode: result.code,
    status: 'building',
    updatedAt: new Date()
  })
  .where(eq(customComponentJobs.id, jobId));
  
componentLogger.info(jobId, "DB update for TSX code and 'building' status complete. Triggering build directly.");

// Directly trigger the build process
import('../workers/buildCustomComponent')
  .then(buildModule => {
    buildModule.buildCustomComponent(jobId)
      .then(() => {
        componentLogger.info(jobId, `Direct build completed successfully.`);
      })
      .catch(buildError => {
        componentLogger.error(jobId, `Error during build: ${buildError.message}`, { 
          stack: buildError.stack,
          type: "BUILD_ERROR"
        });
      });
  })
  .catch(importError => {
    componentLogger.error(jobId, `Failed to import build module: ${importError.message}`, {
      stack: importError.stack,
      type: "IMPORT_ERROR"
    });
    // Prevent stuck "building" jobs if import fails
    updateComponentStatus(jobId, 'error', db, undefined, `Failed to import build module: ${importError.message}`);
  });
```

## Lessons Learned

1. **Race conditions in asynchronous processing**: When designing multi-stage asynchronous workflows, be aware of race conditions between different processes.

2. **Direct triggering vs polling**: For dependent processes, directly triggering the next stage is more reliable than having a separate worker poll for status changes.

3. **Comprehensive logging**: Detailed logging with timestamps and context data is essential for diagnosing race conditions.

4. **Status management**: Be careful about updating statuses too early in multi-stage processes.

## Testing Approach

To verify the fix, we:

1. Monitored the logs for component generation and build processes
2. Confirmed the correct sequencing of events
3. Verified successful component generation and building
4. Checked the database to ensure no jobs were getting stuck in incorrect states

This approach ensures that the race condition is properly addressed and the custom component system works reliably. 