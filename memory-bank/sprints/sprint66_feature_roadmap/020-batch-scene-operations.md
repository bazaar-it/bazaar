# Feature 020: Batch Scene Operations

**Priority**: MEDIUM  
**Complexity**: MEDIUM  
**Effort**: 2-3 days  
**Dependencies**: VideoState store, MCP tools system

## Overview

Implement UI and backend support for performing operations on multiple scenes simultaneously. This feature addresses the limitation where users can only edit one scene at a time, significantly improving workflow efficiency for projects with many scenes.

## Problem Statement

### Current Issues
- Users must edit scenes one by one, which is time-consuming
- No way to apply consistent changes across multiple scenes
- Cannot delete multiple scenes at once
- Style updates require repetitive manual work
- No batch operations support in the current UI

### User Needs
- Select multiple scenes using checkboxes
- Apply edits to all selected scenes
- Delete multiple scenes with confirmation
- Update common properties (colors, fonts, timing) across scenes
- "Apply to all" option when making edits

## Technical Specification

### Frontend Changes

#### 1. Scene Selection UI
```typescript
// Update SceneCard component
interface SceneCardProps {
  scene: Scene;
  isSelected: boolean;
  onSelectionChange: (selected: boolean) => void;
  selectionMode: boolean;
}

// Add to scene card UI
<div className="scene-card">
  {selectionMode && (
    <Checkbox
      checked={isSelected}
      onCheckedChange={onSelectionChange}
      className="absolute top-2 left-2 z-10"
    />
  )}
  {/* Rest of scene card content */}
</div>
```

#### 2. Batch Operations Bar
```typescript
// New component for batch operations
const BatchOperationsBar = ({ selectedScenes, onOperation }) => {
  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white shadow-lg rounded-lg p-4">
      <span>{selectedScenes.length} scenes selected</span>
      <Button onClick={() => onOperation('edit')}>Edit All</Button>
      <Button onClick={() => onOperation('delete')} variant="destructive">
        Delete Selected
      </Button>
      <Button onClick={() => onOperation('duplicate')}>Duplicate</Button>
      <Button onClick={() => onOperation('clear')} variant="ghost">
        Clear Selection
      </Button>
    </div>
  );
};
```

#### 3. VideoState Updates
```typescript
// Add to VideoState store
interface VideoState {
  // Existing state...
  selectedScenes: Set<string>; // Scene IDs
  selectionMode: boolean;
  
  // New actions
  toggleSceneSelection: (projectId: string, sceneId: string) => void;
  selectAllScenes: (projectId: string) => void;
  clearSelection: () => void;
  toggleSelectionMode: () => void;
}
```

### Backend Changes

#### 1. New MCP Tools
```typescript
// tools/batch/batchEdit.ts
export const batchEditTool = {
  name: 'batchEdit',
  description: 'Apply edits to multiple scenes',
  parameters: {
    sceneIds: z.array(z.string()),
    edits: z.object({
      // Common editable properties
      backgroundColor: z.string().optional(),
      primaryColor: z.string().optional(),
      fontFamily: z.string().optional(),
      duration: z.number().optional(),
      // Add more as needed
    })
  },
  execute: async ({ sceneIds, edits }) => {
    // Apply edits to each scene
    const results = await Promise.all(
      sceneIds.map(id => applyEditsToScene(id, edits))
    );
    return { success: true, updatedScenes: results };
  }
};

// tools/batch/batchDelete.ts
export const batchDeleteTool = {
  name: 'batchDelete',
  description: 'Delete multiple scenes',
  parameters: {
    sceneIds: z.array(z.string()),
    confirm: z.boolean()
  },
  execute: async ({ sceneIds, confirm }) => {
    if (!confirm) {
      return { error: 'Deletion not confirmed' };
    }
    await deleteScenes(sceneIds);
    return { success: true, deletedCount: sceneIds.length };
  }
};
```

#### 2. API Endpoints
```typescript
// New tRPC procedures
batchUpdateScenes: protectedProcedure
  .input(z.object({
    projectId: z.string(),
    sceneIds: z.array(z.string()),
    updates: sceneUpdateSchema
  }))
  .mutation(async ({ ctx, input }) => {
    // Validate user owns project
    // Apply updates in transaction
    // Return updated scenes
  }),

batchDeleteScenes: protectedProcedure
  .input(z.object({
    projectId: z.string(),
    sceneIds: z.array(z.string())
  }))
  .mutation(async ({ ctx, input }) => {
    // Validate and delete in transaction
  })
```

### UI/UX Flow

1. **Enable Selection Mode**
   - User clicks "Select" button in scene panel header
   - Checkboxes appear on all scene cards
   - Batch operations bar slides up from bottom

2. **Select Scenes**
   - Click individual checkboxes
   - Shift-click for range selection
   - "Select All" button in operations bar

3. **Perform Operations**
   - **Edit All**: Opens modal with common properties
   - **Delete**: Shows confirmation dialog with count
   - **Duplicate**: Creates copies of all selected scenes

4. **Exit Selection Mode**
   - Click "Done" or press Escape
   - Automatic exit after operation completion

## Implementation Plan

### Phase 1: UI Foundation (Day 1)
1. Add selection state to VideoState
2. Create checkbox UI in SceneCard
3. Implement BatchOperationsBar component
4. Add selection mode toggle

### Phase 2: Backend Support (Day 2)
1. Create batch MCP tools
2. Add tRPC endpoints for batch operations
3. Implement transaction support for atomicity
4. Add proper error handling

### Phase 3: Integration & Polish (Day 3)
1. Connect UI to backend operations
2. Add confirmation dialogs
3. Implement keyboard shortcuts (Ctrl+A, Delete)
4. Add loading states and optimistic updates
5. Test edge cases and error scenarios

## Success Metrics

- **Performance**: Batch operations complete in < 2 seconds for 10 scenes
- **Reliability**: All operations are atomic (all succeed or all fail)
- **Usability**: 80% of users discover batch operations without help
- **Efficiency**: 5x faster than individual edits for 5+ scenes

## Edge Cases & Considerations

1. **Large Selections**
   - Limit selection to prevent performance issues
   - Show warning for operations on 20+ scenes
   - Implement pagination for very large projects

2. **Conflict Resolution**
   - Handle scenes with different base properties
   - Show which properties will be overwritten
   - Provide preview of changes

3. **Undo/Redo**
   - Batch operations should be single undo action
   - Store operation history for rollback

4. **Permission Checks**
   - Verify user owns all selected scenes
   - Handle mixed ownership gracefully

## Related Features

- Feature 21: Smart Pattern Recognition (for intelligent selection)
- Feature 15: Multi-Scene Selection (overlapping functionality)
- Feature 19: Multi-Step Tool Execution (for complex batch operations)

## Open Questions

1. Should we allow batch operations across different projects?
2. How to handle batch edits for scenes with vastly different structures?
3. Should batch operations be available in chat interface too?
4. What's the maximum number of scenes for batch operations?

## Future Enhancements

1. **Smart Selection**
   - Select by scene type (text, image, animation)
   - Select by content (all scenes with specific element)
   - Select by duration range

2. **Advanced Batch Edits**
   - Batch transitions between selected scenes
   - Batch timing adjustments (proportional scaling)
   - Batch style inheritance from template

3. **Batch Templates**
   - Save selection patterns as templates
   - Apply batch operation presets
   - Share batch workflows with team