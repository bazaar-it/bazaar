# Feature Analysis: Fix Double Refresh on Scene Updates

**Feature ID**: 032  
**Priority**: MEDIUM  
**Complexity**: MEDIUM (1 day)  
**Created**: January 2, 2025

## Problem Statement

When users add templates or edit scenes, the preview panel refreshes twice, causing a jarring visual experience. This double refresh impacts performance and creates confusion as users see their content flash/reload unnecessarily.

## Current Behavior

### The Double Refresh Flow:
1. **User Action**: Adds template or edits scene
2. **First Refresh**: 
   - Component calls `addScene()` in videoState
   - State updates optimistically
   - Preview panel detects change and recompiles
3. **Second Refresh**:
   - `onSceneGenerated` callback fires
   - Fetches ALL scenes from database
   - Calls `updateAndRefresh()` with fetched data
   - Preview panel detects change and recompiles AGAIN

### Evidence in Code:

**TemplatesPanelG.tsx (lines 183-196)**:
```typescript
// Direct state update (causes first refresh)
addScene(projectId, result.scene);

// Callback that triggers second refresh
if (onSceneGenerated && result.scene?.id) {
  await onSceneGenerated(result.scene.id);
}
```

**WorkspaceContentAreaG.tsx (lines 519-562)**:
```typescript
const handleSceneGenerated = useCallback(async (sceneId: string) => {
  // Fetches from database (even though scene is already in state)
  const scenesResult = await getProjectScenesQuery.refetch();
  
  // Replaces entire state (causes second refresh)
  const updatedProps = convertDbScenesToInputProps(scenesResult.data);
  updateAndRefresh(projectId, () => updatedProps);
}, [...]);
```

## Root Cause Analysis

The issue stems from a disconnect between optimistic updates and database synchronization:

1. **Optimistic Updates**: Provide instant feedback by updating local state
2. **Database Sync**: Ensures data consistency by fetching latest from server
3. **Problem**: Both trigger preview refreshes, but the second is redundant when we just added the scene

## Proposed Solutions

### Option A: Remove Optimistic Updates
- Only update state after database fetch
- **Pros**: Single source of truth, no double refresh
- **Cons**: Slower perceived performance, loading states needed

### Option B: Smart Database Sync (Recommended)
- Check if scene already exists in state before fetching
- **Pros**: Fast optimistic updates, no redundant fetches
- **Cons**: Need to handle edge cases

### Option C: Debounce Mechanism
- Prevent rapid successive refreshes
- **Pros**: Works for all update sources
- **Cons**: Adds complexity, might delay legitimate updates

## Implementation Plan (Option B)

### Phase 1: Update handleSceneGenerated
```typescript
const handleSceneGenerated = useCallback(async (sceneId: string) => {
  console.log('[WorkspaceContentAreaG] Scene generated:', sceneId);
  
  // Check if scene already exists in local state
  const currentProps = getCurrentProps();
  const existingScene = currentProps?.scenes?.find(s => s.id === sceneId);
  
  if (existingScene) {
    console.log('[WorkspaceContentAreaG] Scene already in state, skipping DB fetch');
    // Just select the scene, don't refetch
    setSelectedSceneId(sceneId);
    return;
  }
  
  // Only fetch if scene is genuinely missing (edge case)
  console.log('[WorkspaceContentAreaG] Scene not in state, fetching from DB');
  try {
    const scenesResult = await getProjectScenesQuery.refetch();
    // ... rest of existing logic
  } catch (error) {
    console.error('[WorkspaceContentAreaG] Failed to fetch scenes:', error);
  }
}, [projectId, getCurrentProps, setSelectedSceneId]);
```

### Phase 2: Add Scene Validation
```typescript
// In videoState.ts - enhance addScene to return success status
addScene: (projectId: string, scene: any) => {
  const state = get();
  const project = state.projects[projectId];
  
  // Check for duplicate
  const exists = project?.props.scenes.some(s => s.id === scene.id);
  if (exists) {
    console.warn('[VideoState] Scene already exists:', scene.id);
    return { success: false, reason: 'duplicate' };
  }
  
  // Add scene
  set((state) => {
    // ... existing logic
  });
  
  return { success: true };
}
```

### Phase 3: Update Template/Edit Flows
```typescript
// In TemplatesPanelG - check add result
const addResult = addScene(projectId, result.scene);

if (addResult.success && onSceneGenerated && result.scene?.id) {
  // Only call if we need DB sync for other reasons
  await onSceneGenerated(result.scene.id);
} else if (!addResult.success) {
  console.log('[TemplatesPanelG] Scene add skipped:', addResult.reason);
}
```

## Edge Cases & Considerations

### 1. Concurrent Updates
- Multiple users editing same project
- Solution: Implement optimistic locking or conflict resolution

### 2. SSE Updates
- Real-time updates from server
- Solution: Check timestamp/version before applying

### 3. Failed Optimistic Updates
- Network errors after optimistic add
- Solution: Rollback mechanism with error handling

### 4. Stale State Detection
- Local state diverged from server
- Solution: Periodic sync with conflict detection

## Testing Strategy

### Manual Testing:
1. Add template → Verify single refresh
2. Edit scene → Verify single refresh
3. Rapid template adds → Verify no race conditions
4. Network throttling → Verify error handling

### Automated Testing:
```typescript
describe('Scene Update Refresh', () => {
  it('should refresh preview only once on template add', async () => {
    const refreshSpy = jest.spyOn(PreviewPanelG, 'compileMultiSceneComposition');
    
    // Add template
    await addTemplate(mockTemplate);
    
    // Wait for all effects
    await waitFor(() => {
      expect(refreshSpy).toHaveBeenCalledTimes(1);
    });
  });
});
```

## Success Metrics

1. **Performance**: 50% reduction in preview compilation time
2. **UX**: Zero visual flicker on scene updates
3. **Consistency**: State synchronized across all panels
4. **Reliability**: No race conditions in 1000 rapid updates

## Migration Steps

1. **Phase 1**: Implement smart sync in handleSceneGenerated
2. **Phase 2**: Monitor logs for edge cases
3. **Phase 3**: Add validation to addScene
4. **Phase 4**: Update all scene modification flows

## Rollback Plan

If issues arise:
1. Remove state existence check
2. Revert to always fetching from DB
3. Document specific failure scenarios

## Future Enhancements

1. **Optimistic Locking**: Version numbers on scenes
2. **Differential Updates**: Only fetch changed scenes
3. **WebSocket Sync**: Real-time collaboration
4. **State Reconciliation**: Automatic conflict resolution

## References

- Current implementation: `/src/app/projects/[id]/generate/workspace/`
- State management: `/src/stores/videoState.ts`
- Related issue: Sprint 45 SSE duplicate messages fix