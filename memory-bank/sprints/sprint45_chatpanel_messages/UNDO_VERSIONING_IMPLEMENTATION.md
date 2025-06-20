# Undo/Versioning Feature Implementation

## Overview
Implement the ability to revert to previous versions of scenes by clicking on assistant messages in the chat panel. Since we already store scene iterations with full code history, this should be straightforward to implement.

## Current Architecture Analysis

### What We Already Have
1. **Scene Iterations Table** (`sceneIterations`):
   - Table exists with perfect schema for versioning
   - Has `codeBefore` and `codeAfter` for each operation
   - Tracks `operationType`: create, edit, delete
   - Links to `sceneId` and `projectId`
   - Has timestamps for each iteration
   - **⚠️ NOT YET IMPLEMENTED**: We're not actually creating iterations yet!

2. **Messages Table**:
   - Stores all chat messages (user and assistant)
   - Has timestamps and sequence order
   - Currently no direct link to scene iterations

3. **VideoState Store**:
   - Manages current scene state
   - Has methods to update/delete/add scenes
   - Triggers automatic UI updates

### What Needs Implementation
1. **Start Creating Scene Iterations**:
   - Currently, the `sceneIterations` table exists but is not being populated
   - Need to add iteration tracking to `generation.universal.ts`
   - Track every create/edit/delete operation

## Implementation Approach

### Phase 0: Start Tracking Scene Iterations (PREREQUISITE)

Need to modify `generation.universal.ts` to create iterations:

```typescript
// After scene creation/update in executeToolFromDecision
const iteration = await db.insert(sceneIterations).values({
  sceneId: scene.id,
  projectId,
  operationType: decision.toolName === 'addScene' ? 'create' : 
                 decision.toolName === 'editScene' ? 'edit' : 'delete',
  editComplexity: decision.toolContext?.editComplexity,
  userPrompt: decision.toolContext.userPrompt,
  brainReasoning: decision.reasoning,
  toolReasoning: toolResult.reasoning,
  codeBefore: existingScene?.tsxCode || null,
  codeAfter: scene.tsxCode,
  messageId: input.assistantMessageId, // Link to message
  generationTimeMs: Date.now() - startTime,
  modelUsed: 'gpt-4o-mini',
  sessionId: ctx.session.user.id,
});
```

### Phase 1: Link Messages to Scene Iterations

#### Option A: Add messageId to sceneIterations (Recommended)
```sql
ALTER TABLE scene_iteration ADD COLUMN message_id UUID REFERENCES message(id);
```

**Pros:**
- Direct link between message and scene state
- Easy to query: "What scene version was created by this message?"
- No changes to message table

**Cons:**
- Need migration for existing data

#### Option B: Add sceneIterationIds to messages
```sql
ALTER TABLE message ADD COLUMN scene_iteration_ids JSONB; -- Array of iteration IDs
```

**Pros:**
- One message can reference multiple scene changes
- No changes to scene_iteration table

**Cons:**
- More complex queries
- JSONB array searching is slower

### Phase 2: Create Revert API

```typescript
// src/server/api/routers/generation.universal.ts
revertToIteration: protectedProcedure
  .input(z.object({
    projectId: z.string(),
    iterationId: z.string(),
    messageId: z.string(), // For UI feedback
  }))
  .mutation(async ({ input, ctx }) => {
    // 1. Get the iteration
    const iteration = await db.query.sceneIterations.findFirst({
      where: eq(sceneIterations.id, input.iterationId),
    });
    
    // 2. Get the scene
    const scene = await db.query.scenes.findFirst({
      where: eq(scenes.id, iteration.sceneId),
    });
    
    // 3. Update scene with codeAfter from iteration
    await db.update(scenes)
      .set({
        tsxCode: iteration.codeAfter,
        updatedAt: new Date(),
      })
      .where(eq(scenes.id, iteration.sceneId));
    
    // 4. Create a new iteration to track the revert
    await db.insert(sceneIterations).values({
      sceneId: iteration.sceneId,
      projectId: input.projectId,
      operationType: 'revert',
      userPrompt: `Reverted to version from: ${iteration.userPrompt}`,
      codeBefore: scene.tsxCode,
      codeAfter: iteration.codeAfter,
    });
    
    // 5. Return updated scene
    return { success: true, scene: updatedScene };
  })
```

### Phase 3: UI Implementation

#### 1. Add Revert Button to ChatMessage Component
```typescript
// src/components/chat/ChatMessage.tsx
interface ChatMessageProps {
  message: Message;
  onRevert?: (messageId: string) => void;
  canRevert?: boolean;
}

// In render:
{!message.isUser && canRevert && (
  <Button
    variant="ghost"
    size="sm"
    onClick={() => onRevert?.(message.id)}
    className="opacity-0 group-hover:opacity-100"
  >
    <Undo2 className="h-3 w-3 mr-1" />
    Revert to this
  </Button>
)}
```

#### 2. Update ChatPanelG to Handle Reverts
```typescript
// src/app/projects/[id]/generate/workspace/panels/ChatPanelG.tsx
const handleRevert = async (messageId: string) => {
  // 1. Find all iterations linked to this message
  const iterations = await api.generation.getMessageIterations.query({ 
    messageId 
  });
  
  // 2. If multiple scenes were affected, show modal to select
  if (iterations.length > 1) {
    // Show selection modal
    setRevertModalData({ messageId, iterations });
  } else {
    // Direct revert
    await revertMutation.mutate({
      projectId,
      iterationId: iterations[0].id,
      messageId,
    });
  }
};
```

### Phase 4: Handle Edge Cases

#### 1. Deleted Scenes
- If reverting to a deleted scene, recreate it
- Maintain original scene ID for consistency

#### 2. Multiple Scene Operations
- If one message created/edited multiple scenes
- Show a modal to select which scenes to revert

#### 3. Cascade Effects
- If reverting scene A affects scene B's position
- Recalculate timeline positions

#### 4. Version Conflicts
- If Scene A was edited after the revert point
- Show warning: "This will overwrite newer changes"

## Implementation Steps

### Step 1: Database Migration (30 mins)
```sql
-- Add messageId to scene_iterations
ALTER TABLE scene_iteration 
ADD COLUMN message_id UUID REFERENCES message(id),
ADD INDEX idx_scene_iteration_message (message_id);

-- Backfill existing data by matching timestamps
UPDATE scene_iteration si
SET message_id = (
  SELECT m.id 
  FROM message m 
  WHERE m.project_id = si.project_id 
  AND m.role = 'assistant'
  AND m.created_at >= si.created_at - INTERVAL '30 seconds'
  AND m.created_at <= si.created_at + INTERVAL '30 seconds'
  ORDER BY ABS(EXTRACT(EPOCH FROM (m.created_at - si.created_at)))
  LIMIT 1
);
```

### Step 2: API Implementation (1 hour)
- Create `revertToIteration` mutation
- Create `getMessageIterations` query
- Update scene creation to link messageId

### Step 3: UI Components (1.5 hours)
- Add revert button to ChatMessage
- Create RevertModal component
- Update ChatPanelG with revert logic
- Add loading/success states

### Step 4: Testing (1 hour)
- Test single scene revert
- Test multi-scene revert
- Test deleted scene restoration
- Test timeline recalculation

## Future Enhancements

### 1. Visual Timeline
Show a visual timeline of all versions with:
- Thumbnails of each version
- Ability to compare versions side-by-side
- Branching for different edit paths

### 2. Selective Revert
- Revert only specific properties (e.g., just colors)
- Cherry-pick changes from different versions
- Merge changes from multiple versions

### 3. Version Naming
- Allow users to name important versions
- Auto-name based on significant changes
- Tag versions as "approved" or "draft"

### 4. Collaboration Features
- See who made each change
- Leave comments on versions
- Approve/reject changes in team mode

## Benefits

1. **User Confidence**: Users can experiment freely knowing they can undo
2. **Error Recovery**: Easy to recover from bad AI edits
3. **Version Comparison**: See how the video evolved over time
4. **Learning Tool**: Understand what each prompt changed

## Estimated Implementation Time

- **Phase 0 (Start Tracking)**: 1-2 hours
  - Modify generation.universal.ts: 1 hour
  - Test iteration creation: 30 mins
  - Add messageId to schema: 30 mins

- **Phase 1 (MVP)**: 4-5 hours
  - Database changes: 30 mins
  - API implementation: 1.5 hours
  - UI implementation: 2 hours
  - Testing: 1 hour

- **Phase 2 (Enhanced)**: Additional 3-4 hours
  - Visual timeline: 2 hours
  - Selective revert: 1.5 hours

Total: 8-11 hours for full implementation