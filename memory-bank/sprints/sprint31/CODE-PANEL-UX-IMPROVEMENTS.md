//memory-bank/sprints/sprint31/CODE-PANEL-UX-IMPROVEMENTS.md
# Code Panel UX Improvements - Sprint 31

## Current Issues

1. **No Scene Selection Within Code Panel**: Users cannot select which scene's code to view/edit directly from the code panel. They need to rely on external scene selection mechanisms.

2. **Code Changes Not Persistent**: When users edit code and click "Run", it compiles and updates the preview temporarily, but there's no way to save these changes permanently to the database.

3. **Unclear Save vs Run Distinction**: Users are confused about when their code changes are actually saved versus just previewed.

## Proposed Solutions

### 1. Add Scene Selection Dropdown to Code Panel Header
- Replace generic "Code Editor" header with scene name + dropdown
- Allow users to switch between scenes directly in the code panel
- Update parent state when scene selection changes

### 2. Add Persistent Save Button
- Add "Save" button next to existing "Run" button
- "Run" = Compile and update preview temporarily
- "Save" = Persist code changes to database
- Include validation before saving
- Provide user feedback on save success/failure

### 3. Enable Chat-Based Scene Selection
- Allow chat commands like "show me the code for scene 2" 
- Update CodePanel selection based on brain LLM targeting
- Integrate with existing scene selection state management

## Implementation Plan

### Phase 1: Basic CodePanel Enhancements 
- [x] Add scene dropdown to CodePanel header
- [x] Add Save button with database persistence
- [x] Create scenes.updateSceneCode API endpoint
- [x] Update WorkspaceContentAreaG to pass onSceneSelect prop
- [x] Fix cache invalidation issue with video state and React Query

### Phase 2: Chat Integration (Future)
- [ ] Extend Brain LLM to support scene selection commands
- [ ] Update frontend state based on chat-driven scene targeting
- [ ] Add UI feedback for current scene selection

### Phase 3: UX Polish (Future)
- [ ] Add loading states for save operations
- [ ] Improve error handling and validation
- [ ] Add keyboard shortcuts for save/run
- [ ] Consider auto-save functionality

## Technical Implementation Details

### Scene Selection Dropdown
```typescript
// Added to CodePanelG.tsx
const handleSceneSelect = (sceneId: string) => {
  if (onSceneSelect) {
    onSceneSelect(sceneId);
  }
};
```

### Save Functionality with Cache Invalidation
```typescript
// Fixed cache invalidation issue
const saveCodeMutation = api.scenes.updateSceneCode.useMutation({
  onSuccess: () => {
    // Update video state cache
    updateScene(projectId, selectedScene.id, {
      ...selectedScene,
      data: { ...selectedScene.data, code: localCode },
      tsxCode: localCode
    });
    
    // Invalidate React Query cache
    utils.project.invalidate();
  }
});
```

### Database Schema
Uses existing `scenes` table with `tsxCode` field for code persistence.

## Architecture Decisions

1. **Scene Selection Context**: Using WorkspaceContentAreaG state management with localStorage persistence
2. **Code Storage**: Direct update to scenes.tsxCode field in database
3. **Cache Management**: Dual invalidation of video state store + React Query cache
4. **Validation**: Client-side Sucrase compilation check before save/run
5. **Error Handling**: Toast notifications for user feedback

## Status: 

### Implemented Features:
- Scene selection dropdown in CodePanel header
- Persistent Save button with database updates  
- Cache invalidation fix for immediate UI updates
- Complete API backend for scene code updates
- Integration with existing workspace state management

### Bug Fixed:
**Cache Invalidation Issue**: Code changes now persist immediately without requiring page refresh. Fixed by updating both video state store and invalidating React Query cache after successful save operations.

The CodePanel now provides a complete scene editing experience with immediate persistence and proper cache management.

## Cache Invalidation Fix Details

The cache invalidation fix was implemented by updating the `saveCodeMutation` to invalidate both the video state store and the React Query cache after a successful save operation. This ensures that the UI is updated immediately after saving code changes.

```typescript
// Fixed cache invalidation issue
const saveCodeMutation = api.scenes.updateSceneCode.useMutation({
  onSuccess: () => {
    // Update video state cache
    updateScene(projectId, selectedScene.id, {
      ...selectedScene,
      data: { ...selectedScene.data, code: localCode },
      tsxCode: localCode
    });
    
    // Invalidate React Query cache
    utils.project.invalidate();
  }
});
```

This fix resolves the issue of code changes not being persisted immediately, requiring a page refresh to see the updated changes.
