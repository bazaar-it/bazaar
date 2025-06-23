# Welcome Scene Re-initialization Fix

## The Problem
When users switched browser tabs and returned, the welcome scene would reappear, overwriting their actual video content. This happened even after they had created real scenes.

## Root Causes
1. **Double Initialization**: Both `GenerateWorkspaceRoot` and `WorkspaceContentAreaG` were initializing the video state
2. **Force Override**: Using `force: true` bypassed the store's protection against overwriting real scenes
3. **Stale Data**: `initialProps` from the server always contained the initial state (including welcome scene)
4. **Component Remounting**: Tab switching caused React to remount components, triggering re-initialization

## The Fix

### 1. Smart Initialization in GenerateWorkspaceRoot
```typescript
// OLD: Always force initialize
setProject(projectId, initialProps, { force: true });

// NEW: Only initialize if not already loaded
const currentProps = useVideoState.getState().getCurrentProps();
const isProjectLoaded = currentProps && useVideoState.getState().projects[projectId];

if (!isProjectLoaded || (!currentProps?.scenes?.length && initialProps?.scenes?.length)) {
  setProject(projectId, initialProps, { force: true });
}
```

### 2. Removed Redundant Initialization
Completely removed the initialization logic from `WorkspaceContentAreaG` since `GenerateWorkspaceRoot` already handles it.

## Benefits
1. **No More Welcome Scene Bug**: Real scenes won't be overwritten when switching tabs
2. **Better Performance**: Avoids unnecessary state updates
3. **Cleaner Architecture**: Single initialization point instead of multiple
4. **Preserves User Work**: Video state persists correctly across tab switches

## How It Works Now
1. **First Load**: Project initializes with server data (welcome scene for new projects)
2. **User Creates Scenes**: Real scenes replace the welcome scene
3. **Tab Switch**: Components remount but skip re-initialization
4. **Return to Tab**: User sees their actual scenes, not the welcome scene

## Testing
1. Create a new project (should show welcome scene)
2. Add a real scene
3. Switch to another browser tab
4. Wait a few minutes
5. Switch back - should still show the real scene, not welcome scene