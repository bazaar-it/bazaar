# Main Page Functionality Fix

## Current Status

After analyzing the codebase and logs, I've found the following issues with the main page functionality:

1. **Workers are Running but Idle**: Both the BuildWorker and CodeGenWorker are running correctly but they're not finding or processing any jobs. They've scaled back their polling frequency due to the backoff mechanism.

2. **Scene Analysis Error**: There's an error in the logs related to scene analysis with UUID `6b10a846-cc92-4a50-8d86-e6c6e6abefbc`. The analyzer successfully processes scene content but then encounters an error.

3. **Title Generation Works**: The title generation service is working correctly, successfully generating titles like "Falling Tetris Blocks" and "Seven-Second Tetris Drop".

4. **Chat to Project Connection**: The user message flow appears to be working through the initial phases, but may not be successfully generating components or scenes.

## Root Causes

1. **Error Handling**: The scene analyzer service has an error that's not being properly caught and processed, causing the pipeline to stop.

2. **Component Generation**: The component generation process may not be creating jobs that the workers can find, potentially due to misconfigured status values or database issues.

3. **Pipeline Continuity**: The pipeline from chat message to job creation may be broken at some point, likely after the scene analysis phase.

## Fix Implementation

### 1. Enhance Error Handling in Scene Analyzer

The scene analyzer needs to have robust error handling to prevent errors from breaking the entire pipeline. We need to:

- Add try/catch blocks around critical sections
- Log detailed error information
- Fall back to safe defaults when errors occur
- Ensure the pipeline continues even with partial failures

### 2. Fix Component Job Creation

Ensure component jobs are being properly created in the database with the correct status values:

- Verify that `customComponentJobs` records are created with `status: "queued_for_generation"` for the CodeGenWorker to pick up
- After generation, ensure status is updated to `"building"` for BuildWorker to pick up

### 3. Database Validation

Add database integrity checks to ensure:

- All required fields are populated
- Foreign key references are valid
- Status transitions are properly logged

### 4. Update tRPC Procedures

Ensure the tRPC procedures in the chat router properly handle errors and log detailed diagnostic information. The `processUserMessageInProject` function should be enhanced to provide better error tracking.

### 5. Improve Worker Diagnostics

Add more detailed logging to both workers to help diagnose:

- Why they're not finding jobs
- The exact queries they're using
- The state of the database at polling time

## Testing Plan

1. Test the chat interface by sending a message to create a new video
2. Monitor logs for errors and worker activity
3. Track the lifecycle of a message through:
   - Initial user message creation
   - Scene planning
   - Component generation job creation
   - Component building
   - Final scene assembly

## Implementation Priority

1. First, fix the error handling in scene analyzer
2. Next, ensure correct job creation and status updates
3. Then improve diagnostics and logging
4. Finally, add validation and integrity checks

This should restore the core functionality of the main page, allowing users to generate videos from text descriptions again. 