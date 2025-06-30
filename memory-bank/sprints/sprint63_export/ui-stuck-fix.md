# Export UI Stuck Issue - Fixed

## Problem
The export functionality was working on the backend (Lambda render completed successfully), but the UI remained stuck showing "50%" progress and never updated to show completion or trigger the download.

## Root Causes

### 1. Immediate Completion Not Handled
When Lambda renders complete very quickly (as in this case, ~20 seconds), the render completes before the first progress check. The initial state was set to `status: 'rendering'` even though we already had the `outputUrl`, causing the UI to think it was still rendering.

### 2. Incorrect File Path in Progress Check
The `getLambdaRenderProgress` function was trying to extract the project ID from the render ID by splitting on '-', but:
- Render ID format: `o33p3z8rqa` (no hyphens)
- Actual S3 file: `renders/o33p3z8rqa/6bca9d13-4fac-4da3-a76f-99ad8c83baf6.mp4`
- This mismatch meant progress checks always failed to find the completed file

## Solutions Applied

### 1. Set Status to Completed When Output URL is Available
```typescript
// In render.ts startRender mutation
if (result.outputUrl) {
  renderState.set(result.renderId, {
    ...renderState.get(result.renderId)!,
    status: 'completed',  // Added this
    progress: 100,        // Added this
    outputUrl: result.outputUrl,
  });
}
```

### 2. Pass Project ID to Progress Check Function
```typescript
// In render.ts getRenderStatus
const progress = await getLambdaRenderProgress(
  input.renderId, 
  job.bucketName, 
  job.projectId  // Added this parameter
);

// In lambda-cli.service.ts
export async function getLambdaRenderProgress(
  renderId: string, 
  bucketName: string, 
  projectId: string  // Added parameter
) {
  const outputName = `${projectId}.mp4`;  // Use actual project ID
  const s3Key = `renders/${renderId}/${outputName}`;
  // ...
}
```

## Result
- UI now properly shows completion status
- Auto-download triggers correctly
- Progress tracking works for both immediate and gradual completions