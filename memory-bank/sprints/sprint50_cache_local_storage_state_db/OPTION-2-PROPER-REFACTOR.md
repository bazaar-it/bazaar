# Option 2: Proper Refactor Implementation Plan

## Overview
Clean up the initialization flow to create a single, clear path for state management. Estimated time: 1-2 days.

## Design Principles

1. **Single Initialization Point**: Only GenerateWorkspaceRoot manages state
2. **Database as Truth**: Always trust DB data over local state
3. **Smart Persistence**: Use sessionStorage to survive navigation
4. **Clear Ownership**: Each component has clear responsibilities

## Implementation Plan

### Phase 1: Remove Competing Initializations (2 hours)

#### 1.1 Clean Up WorkspaceContentAreaG.tsx

**Remove the entire initialization useEffect** (lines ~515-545):
```typescript
// DELETE THIS ENTIRE BLOCK:
// useEffect(() => {
//   const existingProps = getCurrentProps();
//   if (existingProps && existingProps.scenes && existingProps.scenes.length > 0) {
//     return;
//   }
//   
//   if (initializationAttemptedRef.current.has(projectId)) {
//     return;
//   }
//   
//   initializationAttemptedRef.current.add(projectId);
//   
//   if (initialProps) {
//     updateAndRefresh(projectId, () => initialProps);
//   }
// }, [projectId, initialProps, updateAndRefresh, getCurrentProps]);

// Also remove: initializationAttemptedRef
```

**Remove initialProps from component props**:
```typescript
interface WorkspaceContentAreaGProps {
  projectId: string;
  // Remove: initialProps: InputProps;
  onPanelDragStart?: (panelType: PanelTypeG) => void;
  projects?: any[];
  onProjectRename?: (newTitle: string) => void;
}
```

#### 1.2 Simplify GenerateWorkspaceRoot.tsx

Keep this as the ONLY initialization point:
```typescript
// This stays - it's our single initialization point
useEffect(() => {
  console.log('[GenerateWorkspaceRoot] Setting project state:', projectId);
  setProject(projectId, initialProps);
}, [projectId, initialProps, setProject]);
```

### Phase 2: Add Persistence to VideoState (3 hours)

#### 2.1 Update videoState.ts with Persistence

```typescript
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ... other imports

export const useVideoState = create<VideoState>()(
  persist(
    (set, get) => ({
      // ... existing state
      
      setProject: (projectId, initialProps) => 
        set((state) => {
          console.log('[VideoState] Setting project:', projectId);
          
          // Always update with provided props (trust the server)
          return {
            currentProjectId: projectId,
            projects: {
              ...state.projects,
              [projectId]: {
                props: initialProps,
                chatHistory: state.projects[projectId]?.chatHistory || [],
                dbMessagesLoaded: state.projects[projectId]?.dbMessagesLoaded ?? false,
                activeStreamingMessageId: null, // Reset on project load
              }
            },
            // Reset some global state
            selectedScenes: {
              ...state.selectedScenes,
              [projectId]: null
            }
          };
        }),
      
      // New method to clear project data
      clearProject: (projectId: string) =>
        set((state) => {
          const { [projectId]: removed, ...restProjects } = state.projects;
          const { [projectId]: removedChat, ...restChat } = state.chatHistory;
          const { [projectId]: removedScene, ...restScenes } = state.selectedScenes;
          
          return {
            projects: restProjects,
            chatHistory: restChat,
            selectedScenes: restScenes,
            // Clear current if it matches
            currentProjectId: state.currentProjectId === projectId ? null : state.currentProjectId
          };
        }),
        
      // ... rest of methods
    }),
    {
      name: 'video-state-storage',
      storage: createJSONStorage(() => sessionStorage), // Clears on browser close
      partialize: (state) => ({
        // Only persist essential data
        projects: state.projects,
        selectedScenes: state.selectedScenes,
        currentProjectId: state.currentProjectId,
        // Don't persist: chatHistory, refreshTokens, pendingDbSync
      }),
      version: 1, // Bump this to clear old data
    }
  )
);
```

### Phase 3: Handle Navigation Properly (2 hours)

#### 3.1 Update GenerateWorkspaceRoot to Clear on Unmount

```typescript
export default function GenerateWorkspaceRoot({ projectId, initialProps, initialProjects }: Props) {
  const { setProject, clearProject } = useVideoState();
  
  // Initialize on mount
  useEffect(() => {
    console.log('[GenerateWorkspaceRoot] Initializing project:', projectId);
    setProject(projectId, initialProps);
    
    // Cleanup on unmount (when navigating away)
    return () => {
      console.log('[GenerateWorkspaceRoot] Cleaning up project:', projectId);
      // Optional: Only clear if navigating to different project
      // clearProject(projectId);
    };
  }, [projectId, initialProps, setProject, clearProject]);
  
  // ... rest of component
}
```

#### 3.2 Add Synchronization Check

In GenerateWorkspaceRoot, add a check to sync with fresh data:
```typescript
// Add after setProject in the useEffect
useEffect(() => {
  setProject(projectId, initialProps);
  
  // Verify state matches server data
  const storedProps = getCurrentProps();
  if (storedProps) {
    const storedSceneCount = storedProps.scenes?.length || 0;
    const serverSceneCount = initialProps.scenes?.length || 0;
    
    if (storedSceneCount !== serverSceneCount) {
      console.warn('[GenerateWorkspaceRoot] State mismatch detected, forcing update');
      // Force update if mismatch
      updateAndRefresh(projectId, () => initialProps);
    }
  }
}, [projectId, initialProps, setProject, getCurrentProps, updateAndRefresh]);
```

### Phase 4: Update Child Components (2 hours)

#### 4.1 Update ChatPanelG

Remove any initialization logic, just use VideoState:
```typescript
export default function ChatPanelG({ projectId, selectedSceneId, onSceneGenerated }: ChatPanelGProps) {
  // Just use state, don't initialize
  const { getCurrentProps, getProjectChatHistory } = useVideoState();
  const currentProps = getCurrentProps();
  const messages = getProjectChatHistory(projectId);
  
  // ... rest of component
}
```

#### 4.2 Update PreviewPanelG

Remove the `initial` prop and use VideoState directly:
```typescript
interface PreviewPanelGProps {
  projectId: string;
  // Remove: initial?: InputProps;
}

export function PreviewPanelG({ projectId }: PreviewPanelGProps) {
  const { getCurrentProps } = useVideoState();
  const props = getCurrentProps();
  
  // ... use props instead of initial
}
```

### Phase 5: Testing & Validation (1 hour)

#### Test Scenarios:
1. **Fresh Load**: Open project → See correct content
2. **Navigation**: Generate scene → Navigate away → Return → See generated scene
3. **Multiple Tabs**: Open same project in two tabs → Changes sync
4. **Browser Refresh**: Refresh page → Returns to DB state
5. **Session End**: Close browser → Reopen → State cleared

#### Validation Checklist:
- [ ] No duplicate initialization
- [ ] State persists across navigation
- [ ] Server data always wins on page load
- [ ] No race conditions
- [ ] Clean component unmounting

## Benefits of This Approach

1. **Clear Ownership**: GenerateWorkspaceRoot owns initialization
2. **Predictable State**: Server data always wins on load
3. **Better UX**: State survives navigation
4. **Simpler Components**: Children just consume state
5. **Easier Debugging**: Single initialization path

## Migration Steps

1. **Create branch**: `fix/state-management-refactor`
2. **Implement Phase 1**: Remove competing initializations
3. **Test**: Verify nothing breaks
4. **Implement Phase 2**: Add persistence
5. **Test**: Verify persistence works
6. **Implement Phases 3-5**: Complete refactor
7. **Full QA**: Test all scenarios
8. **Deploy**: With feature flag if needed

## Rollback Plan

If issues occur:
1. Disable persistence: Remove `persist` wrapper
2. Re-add initialization to WorkspaceContentAreaG
3. Revert to previous behavior

## Future Improvements (Option 3)

This sets us up for the ideal system:
- Move to server-side state with real-time sync
- Use WebSockets for multi-tab sync
- Implement optimistic updates with rollback
- Add conflict resolution for collaborative editing