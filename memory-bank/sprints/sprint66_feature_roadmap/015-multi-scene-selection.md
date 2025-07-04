# Feature 015: Multi-Scene Selection

**Status**: Not Started  
**Priority**: Medium  
**Complexity**: Medium (2 days)  
**Sprint**: 66 - Feature Roadmap

## Overview

Enable users to select multiple scenes simultaneously for batch operations, improving workflow efficiency when managing projects with many scenes.

## Problem Statement

**Current Limitations**:
- Users can only operate on one scene at a time
- Bulk operations require repetitive actions
- No way to quickly reorganize multiple scenes
- Time-consuming to apply the same change to multiple scenes

**User Pain Points**:
- "I need to delete 5 scenes but have to click delete 5 times"
- "Reordering multiple scenes is tedious"
- "Can't quickly clean up a project with many scenes"

## Requirements

### Functional Requirements
1. **Selection UI**:
   - Checkbox on each scene card
   - "Select All" / "Select None" controls
   - Visual indication of selected scenes
   - Selection count display

2. **Batch Operations**:
   - Batch delete with confirmation
   - Batch reorder (move selected scenes together)
   - Batch duplicate
   - Clear selection after operation

3. **Keyboard Shortcuts**:
   - Ctrl/Cmd + Click for multi-select
   - Shift + Click for range select
   - Ctrl/Cmd + A for select all
   - Escape to clear selection

### Non-Functional Requirements
- Selection state persists during scene regeneration
- Performance: Handle 100+ scene selection smoothly
- Accessibility: Keyboard navigation support
- Clear visual feedback for all operations

## Technical Design

### State Management
```typescript
// Update VideoState store
interface VideoState {
  // Existing state...
  selectedScenes: {
    [projectId: string]: Set<string>; // Scene IDs
  };
  
  // New actions
  toggleSceneSelection: (projectId: string, sceneId: string) => void;
  selectAllScenes: (projectId: string) => void;
  clearSceneSelection: (projectId: string) => void;
  selectSceneRange: (projectId: string, fromId: string, toId: string) => void;
}
```

### Component Updates
```typescript
// SceneCard component updates
interface SceneCardProps {
  // Existing props...
  isSelected: boolean;
  onSelectionToggle: (sceneId: string) => void;
  isSelectionMode: boolean;
}

// New BatchOperationBar component
interface BatchOperationBarProps {
  selectedCount: number;
  onBatchDelete: () => void;
  onBatchDuplicate: () => void;
  onClearSelection: () => void;
}
```

### API Updates
```typescript
// New batch operations in scene router
batchDeleteScenes: protectedProcedure
  .input(z.object({
    projectId: z.string(),
    sceneIds: z.array(z.string())
  }))
  .mutation(async ({ input, ctx }) => {
    // Delete multiple scenes in transaction
  }),

batchDuplicateScenes: protectedProcedure
  .input(z.object({
    projectId: z.string(),
    sceneIds: z.array(z.string())
  }))
  .mutation(async ({ input, ctx }) => {
    // Duplicate scenes with new IDs
  })
```

## Implementation Plan

### Phase 1: Selection UI (Day 1)
1. Add selection state to VideoState
2. Update SceneCard with checkbox UI
3. Implement click handlers (single, ctrl, shift)
4. Add selection visual indicators
5. Create selection toolbar component

### Phase 2: Batch Operations (Day 2)
1. Implement batch delete with confirmation
2. Add batch duplicate functionality
3. Create batch reorder UI
4. Add keyboard shortcuts
5. Test with large scene counts

## UI/UX Considerations

### Visual Design
- Checkbox in top-left corner of scene card
- Selected scenes have blue border
- Floating batch operation bar when scenes selected
- Clear count indicator: "3 scenes selected"

### Interaction Patterns
- Single click selects/deselects
- Clicking outside scenes clears selection
- Batch operations require confirmation
- Success toast after batch operations

## Testing Strategy

### Unit Tests
- Selection state management
- Batch operation logic
- Range selection algorithm

### Integration Tests
- Multi-select with keyboard modifiers
- Batch operations with API
- Selection persistence during updates

### Manual Testing
- Performance with 100+ scenes
- Keyboard navigation
- Touch device support
- Edge cases (empty selection, all selected)

## Success Metrics

### Quantitative
- 50% reduction in time for bulk operations
- <100ms selection response time
- Zero data loss in batch operations

### Qualitative
- Users report improved workflow efficiency
- Positive feedback on batch operations
- Intuitive selection patterns

## Migration & Rollback

### Migration
- No data migration needed
- Feature flag: `enableMultiSelect`
- Gradual rollout to power users first

### Rollback Plan
- Feature flag can disable entirely
- Selection state is ephemeral (no persistence)
- No database changes required

## Dependencies

### Internal
- VideoState store
- Scene router API
- SceneCard component

### External
- None

## Risks & Mitigations

### Risk 1: Performance with Large Selection
**Mitigation**: Use Set for O(1) selection checks, virtualize scene list

### Risk 2: Accidental Batch Delete
**Mitigation**: Prominent confirmation dialog, undo functionality consideration

### Risk 3: Complex Selection State
**Mitigation**: Clear selection on navigation, simple state model

## Future Enhancements

1. **Smart Selection**:
   - Select by type (text scenes, image scenes)
   - Select by duration
   - Select by creation date

2. **Advanced Batch Operations**:
   - Batch style updates
   - Batch duration changes
   - Batch export selected scenes

3. **Selection Presets**:
   - Save selection groups
   - Named selections
   - Quick selection recall

## References

- Similar feature in video editing software
- Figma/design tool multi-select patterns
- File manager selection behaviors