# Sprint 103: Hidden Pitfalls & UI Considerations

## Hidden Pitfalls We Must Consider

### 1. Scene ID/Order Invalidation
**Problem**: When you delete scene 2, scene 3 becomes the new scene 2
- Brain says "delete scene 3 and 4"
- After deleting scene 3, scene 4 is now scene 3
- Second delete fails or deletes wrong scene!

**Solution**: Use scene IDs, not positions, in workflow:
```typescript
// BAD: Position-based
{ "workflow": [
  { "toolName": "deleteScene", "targetScenePosition": 3 },
  { "toolName": "deleteScene", "targetScenePosition": 4 }
]}

// GOOD: ID-based
{ "workflow": [
  { "toolName": "deleteScene", "targetSceneId": "scene-abc-123" },
  { "toolName": "deleteScene", "targetSceneId": "scene-def-456" }
]}
```

### 2. Context Staleness
**Problem**: After first operation, context is outdated
- Edit scene 1 to be blue
- Edit scene 2 to match scene 1 (but it still sees old scene 1!)

**Solution**: Refresh context between operations OR pass immutable references

### 3. State Management Race Conditions
**Problem**: Zustand updates + SSE updates + database writes
- Multiple rapid state updates could collide
- User might see flickering or wrong states

**Solution**: 
- Queue state updates
- Use optimistic updates with rollback
- Single source of truth (database)

### 4. LLM Rate Limits & Costs
**Problem**: Multi-tool could hit limits faster
- 3 edits = 3 Claude calls = 165 seconds (55s each)
- 3x the API calls = 3x the cost

**Solution**:
- Check if operation needs LLM (delete doesn't!)
- Batch similar operations
- Use cache aggressively

### 5. Timeout Issues
**Problem**: Long workflows could timeout
- SSE connection timeout (~30s)
- Vercel function timeout (10s-300s depending on plan)
- User patience timeout (>30s feels broken)

**Solution**: 
- Send heartbeat events
- Show progress for each step
- Allow cancellation

### 6. Error Recovery
**Problem**: What if step 3 of 5 fails?
- Do we rollback all?
- Do we keep partial success?
- How do we communicate this?

**Solution**: Partial success with clear messaging

### 7. Database Transaction Boundaries
**Problem**: Operations aren't atomic
- Delete scene 1 ✓
- Delete scene 2 ✗ (fails)
- Now we have inconsistent state

**Solution**: Each operation is independent (no transactions needed for delete)

## UI Considerations

### Current Flow (Single Tool)
```
User types → Loading spinner → Scene appears
```

### Multi-Tool Flow Options

#### Option A: Silent Sequential (No UI Changes)
```
User: "delete scenes 3 and 4"
[Both scenes disappear after 6 seconds]
```
**Pros**: Simple, no UI work
**Cons**: User waits with no feedback

#### Option B: Progressive Updates (Recommended)
```
User: "delete scenes 3 and 4"
Assistant: "Deleting 2 scenes..."
[Scene 3 disappears] → "Deleted Scene 3 (1/2)"
[Scene 4 disappears] → "Deleted Scene 4 (2/2)"
Assistant: "✓ Deleted 2 scenes"
```

**Implementation via SSE**:
```typescript
// Send progress events
await writer.write(encoder.encode(formatSSE({
  type: 'workflow_progress',
  current: 1,
  total: 2,
  message: 'Deleting Scene 3...'
})));

// After each operation
await writer.write(encoder.encode(formatSSE({
  type: 'scene_deleted',
  sceneId: 'scene-3',
  progress: { current: 1, total: 2 }
})));
```

### UI Components That Need Updates

1. **ChatPanelG** - Show workflow progress
```tsx
{message.workflowProgress && (
  <div className="text-sm text-muted-foreground">
    Step {message.workflowProgress.current} of {message.workflowProgress.total}
  </div>
)}
```

2. **TimelinePanel** - Update after each operation
- Already listens to videoState
- Will auto-update when scenes change

3. **PreviewPanel** - Refresh after each scene change
- Already reactive to videoState

### Cancellation UI
```tsx
{isWorkflowRunning && (
  <Button onClick={cancelWorkflow} variant="destructive" size="sm">
    Cancel remaining operations
  </Button>
)}
```

## Recommendations

### Must Have (Day 1)
1. Use scene IDs not positions
2. Show basic progress: "Operation 1 of 3"
3. Handle partial failure gracefully

### Nice to Have (Later)
1. Cancellation support
2. Rollback on failure
3. Batch optimization for similar ops
4. Context refresh between operations

### Skip For Now
1. Complex transaction management
2. Parallel execution (too risky)
3. Sophisticated progress bars

## The Simplest Approach That Works

```typescript
// Backend: Execute sequentially, send progress
for (let i = 0; i < workflow.length; i++) {
  // Send progress
  await sendSSE({ 
    type: 'workflow_progress', 
    message: `Step ${i+1} of ${workflow.length}` 
  });
  
  // Execute operation
  const result = await executeOperation(workflow[i]);
  
  // Send result immediately (UI updates automatically)
  await sendSSE({ type: 'operation_complete', result });
}
```

This gives users feedback without complex UI changes.