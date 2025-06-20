# Option 1: Quick Fix Implementation

## Overview
Minimal changes to fix the state loss issue immediately. Estimated time: 1 hour.

## Changes Required

### 1. Fix WorkspaceContentAreaG.tsx
Remove the defensive check that prevents updates:

```typescript
// In WorkspaceContentAreaG.tsx, around line 515-545
useEffect(() => {
  // DELETE THESE LINES:
  // const existingProps = getCurrentProps();
  // if (existingProps && existingProps.scenes && existingProps.scenes.length > 0) {
  //   return;
  // }
  
  // Only check if we've already initialized THIS EXACT projectId
  if (initializationAttemptedRef.current.has(projectId)) {
    return;
  }
  
  initializationAttemptedRef.current.add(projectId);
  
  // ALWAYS update with server data
  if (initialProps) {
    console.log('[WorkspaceContentAreaG] Updating with server data');
    updateAndRefresh(projectId, () => initialProps);
  }
}, [projectId, initialProps, updateAndRefresh]);
```

### 2. Make setProject Smarter in videoState.ts
Add a force flag to ensure server data takes precedence:

```typescript
// In videoState.ts, modify setProject:
setProject: (projectId, initialProps, options = {}) => 
  set((state) => {
    const isProjectSwitch = state.currentProjectId && state.currentProjectId !== projectId;
    
    // If not forcing and we have more scenes locally, keep them
    if (!options.force && state.projects[projectId]) {
      const localScenes = state.projects[projectId].props?.scenes || [];
      const newScenes = initialProps?.scenes || [];
      
      // Only skip update if local has real scenes (not just welcome)
      const hasRealLocalScenes = localScenes.some(s => 
        s.type !== 'welcome' && !s.data?.isWelcomeScene
      );
      
      if (hasRealLocalScenes && newScenes.length === 0) {
        console.log('[VideoState] Keeping local scenes, skipping update');
        return state;
      }
    }
    
    return {
      currentProjectId: projectId,
      projects: {
        ...state.projects,
        [projectId]: {
          props: initialProps,
          chatHistory: isProjectSwitch ? [] : (state.projects[projectId]?.chatHistory || []),
          // ... rest of state
        }
      }
    };
  }),
```

### 3. Force Update in GenerateWorkspaceRoot
Pass force flag when setting project:

```typescript
// In GenerateWorkspaceRoot.tsx
useEffect(() => {
  // Force update with server data
  setProject(projectId, initialProps, { force: true });
}, [projectId, initialProps, setProject]);
```

## Testing

1. Create a project and generate scenes
2. Navigate away to another tab
3. Return to the project
4. Should see generated scenes, not welcome screen

## Rollback Plan

If issues occur, revert these 3 files:
- WorkspaceContentAreaG.tsx
- videoState.ts  
- GenerateWorkspaceRoot.tsx

## Benefits

- Minimal code changes
- Low risk
- Fixes immediate issue
- Maintains current architecture

## Limitations

- Doesn't add persistence
- Still has multiple initialization points
- Temporary fix until proper refactor