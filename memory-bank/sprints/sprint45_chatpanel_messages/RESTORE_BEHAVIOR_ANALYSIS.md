# Restore Behavior Analysis

## Current System Behavior

### What Each Tool Operation Does

#### 1. **ADD (addScene)**
- Creates a new scene in the database
- Creates a `sceneIterations` record with:
  - `operationType: 'create'`
  - `codeBefore: null` (nothing existed before)
  - `codeAfter: [new scene code]`
  - `messageId: [assistant message id]`
- **Restorable**: YES ✅

#### 2. **EDIT (editScene)**
- Updates existing scene in database
- Creates a `sceneIterations` record with:
  - `operationType: 'edit'`
  - `codeBefore: [previous code]`
  - `codeAfter: [updated code]`
  - `messageId: [assistant message id]`
- **Restorable**: YES ✅

#### 3. **DELETE (deleteScene)**
- **PERMANENTLY DELETES** scene from database
- Creates a `sceneIterations` record with:
  - `operationType: 'delete'`
  - `codeBefore: [code before deletion]`
  - `codeAfter: null` (scene is gone)
  - `messageId: [assistant message id]`
- **Restorable**: YES ✅ (can restore deleted scenes!)

#### 4. **TRIM (trimScene)**
- Only updates the `duration` field of a scene
- Currently does NOT create iterations (found in code review)
- **Restorable**: NO ❌ (no iteration tracking)

## The Batch Loading Problem

### Current Issue (Slow)
```
Page loads → 10 messages displayed
↓
Each ChatMessage component independently queries:
- Message 1: "Do I have iterations?" → API call
- Message 2: "Do I have iterations?" → API call
- Message 3: "Do I have iterations?" → API call
... 10 separate API calls

Result: Restore buttons appear one by one, slowly
```

### Proposed Solution (Fast)
```
Page loads → 10 messages displayed
↓
ChatPanelG makes ONE batch query:
"Get iterations for messages [1,2,3,4,5,6,7,8,9,10]"
↓
Pass results to each ChatMessage:
- Message 1: hasIterations=true ✓
- Message 2: hasIterations=false ✗
- Message 3: hasIterations=true ✓

Result: All restore buttons appear instantly
```

### When New Messages Appear
```
User sends new message → Assistant responds
↓
New message added to list
↓
Batch query needs to re-run INCLUDING new message ID
↓
All messages (old + new) get their iteration status
```

## Why "Restore a Restore" Doesn't Make Sense (Currently)

### The Problem
```
1. User: "Create a blue button" 
   Assistant: "Created blue button" [Restore ✓]

2. User: "Make it red"
   Assistant: "Changed to red" [Restore ✓]

3. User clicks Restore on message #1
   Assistant: "Restored to blue button" [Restore ✗] ← No button!

4. User can't restore back to red version
```

### Why This Happens
The restore operation creates an iteration but with `messageId: null`:
```typescript
// In revertToIteration
await db.insert(sceneIterations).values({
  messageId: null,  // ← This is why no restore button!
});
```

### The Fix
Link restore operations to their messages:
```typescript
// Create restore message first
const restoreMessage = await messageService.createMessage({
  content: "Restored to version: blue button",
  role: "assistant",
});

// Link iteration to message
await db.insert(sceneIterations).values({
  messageId: restoreMessage.id,  // ← Now restorable!
});
```

## What Should Be Restorable?

### Clear Cases ✅
1. **Add operations** - "Created new scene"
2. **Edit operations** - "Updated scene"
3. **Delete operations** - "Deleted scene" (can restore it back!)
4. **Restore operations** - "Restored to version X" (after fix)

### Edge Cases ❓
1. **Trim operations** - Currently not tracked
2. **Failed operations** - No iteration created
3. **System messages** - No scene changes

## Implementation Priority

### Phase 1: Core Restore (High Priority)
1. Fix restore operations to be restorable
2. Implement batch loading for performance
3. Add inline confirmation UI

### Phase 2: Complete Coverage (Medium Priority)
1. Add iteration tracking for trim operations
2. Handle delete → restore workflow better
3. Add version history view

### Phase 3: Enhanced UX (Low Priority)
1. Show diff between versions
2. Multiple scene restore
3. Branching/forking versions

## Key Decisions Needed

1. **Should trim operations be restorable?**
   - Pro: Complete version history
   - Con: Adds complexity for minor changes

2. **How to handle deleted scenes?**
   - Current: Can restore deleted scenes
   - Alternative: Show as "deleted" in history

3. **Batch loading strategy?**
   - Option A: Load all on mount
   - Option B: Load visible messages only
   - Option C: Paginated loading

4. **Restore terminology?**
   - "Restore to this version"
   - "Apply this version"
   - "Jump to this state"