# Undo/Versioning Feature Implementation

## Overview
Enable users to revert to any previous version by clicking on assistant messages in the chat panel.

## Great News: Infrastructure Already Exists! 🎉

### We Already Have:
- **`sceneIterations` table** tracking:
  - `codeBefore` and `codeAfter` for every change
  - `operationType` ('create', 'edit', 'delete')
  - `userPrompt` that triggered the change
  - Timestamps and IDs

### Missing Link:
- No connection between `messages` ↔ `sceneIterations`
- Messages don't know which scene changes they caused

## Implementation Plan

### Phase 1: Link Messages to Scene Iterations (1-2 hours)

#### 1.1 Database Migration
```sql
-- Add messageId to sceneIterations
ALTER TABLE scene_iteration 
ADD COLUMN message_id UUID REFERENCES message(id);

-- Index for fast lookups
CREATE INDEX idx_scene_iteration_message 
ON scene_iteration(message_id);
```

#### 1.2 Update Generation Flow
```typescript
// generation.universal.ts - When creating scene iteration
await ctx.db.insert(sceneIterations).values({
  sceneId: scene.id,
  projectId: input.projectId,
  messageId: input.assistantMessageId, // NEW: Link to message
  operationType: getOperationType(decision.toolName),
  codeBefore: oldCode,
  codeAfter: newCode,
  userPrompt: input.prompt,
});
```

### Phase 2: API for Version Retrieval (2-3 hours)

#### 2.1 Add tRPC Endpoint
```typescript
// src/server/api/routers/project.ts
getSceneStateAtMessage: protectedProcedure
  .input(z.object({
    projectId: z.string(),
    messageId: z.string(),
  }))
  .query(async ({ input, ctx }) => {
    // Get all iterations linked to this message
    const iterations = await ctx.db
      .select()
      .from(sceneIterations)
      .where(eq(sceneIterations.messageId, input.messageId));
    
    // Return the scene states after these iterations
    return iterations.map(iter => ({
      sceneId: iter.sceneId,
      code: iter.codeAfter,
      operation: iter.operationType,
    }));
  }),

revertToMessage: protectedProcedure
  .input(z.object({
    projectId: z.string(),
    messageId: z.string(),
  }))
  .mutation(async ({ input, ctx }) => {
    // 1. Get iterations for this message
    const iterations = await ctx.db
      .select()
      .from(sceneIterations)
      .where(eq(sceneIterations.messageId, input.messageId));
    
    // 2. Apply the codeAfter states to current scenes
    for (const iter of iterations) {
      await ctx.db
        .update(scenes)
        .set({ 
          tsxCode: iter.codeAfter,
          updatedAt: new Date(),
        })
        .where(eq(scenes.id, iter.sceneId));
    }
    
    // 3. Create a new message indicating revert
    await ctx.db.insert(messages).values({
      projectId: input.projectId,
      role: 'assistant',
      content: `Reverted to previous version`,
      status: 'success',
    });
    
    return { success: true };
  }),
```

### Phase 3: UI Implementation (2-3 hours)

#### 3.1 Update ChatMessage Component
```typescript
// src/components/chat/ChatMessage.tsx
interface ChatMessageProps {
  message: Message;
  onRevert?: (messageId: string) => void; // NEW
}

export function ChatMessage({ message, onRevert }: ChatMessageProps) {
  const [hasSceneChanges, setHasSceneChanges] = useState(false);
  
  // Check if this message has associated scene changes
  useEffect(() => {
    if (!message.isUser) {
      // Query to check if message has iterations
      checkMessageHasIterations(message.id).then(setHasSceneChanges);
    }
  }, [message.id]);
  
  return (
    <div className="message-container">
      {/* Existing message content */}
      
      {!message.isUser && hasSceneChanges && (
        <button
          onClick={() => onRevert?.(message.id)}
          className="text-xs text-blue-500 hover:text-blue-700 mt-2"
        >
          ↺ Revert to this version
        </button>
      )}
    </div>
  );
}
```

#### 3.2 Handle Revert in ChatPanelG
```typescript
// ChatPanelG.tsx
const handleRevert = async (messageId: string) => {
  const confirmed = confirm('Revert to this version? Current changes will be lost.');
  if (!confirmed) return;
  
  try {
    await revertToMessage.mutateAsync({
      projectId,
      messageId,
    });
    
    // Refresh the video state
    await updateAndRefresh();
    
    toast.success('Reverted successfully!');
  } catch (error) {
    toast.error('Failed to revert');
  }
};
```

### Phase 4: Visual Enhancements (Optional, 2-3 hours)

#### 4.1 Version Indicators
```typescript
// Show which messages made changes
<div className="message-metadata">
  {sceneChanges.length > 0 && (
    <span className="text-xs text-gray-500">
      Modified {sceneChanges.length} scene{sceneChanges.length > 1 ? 's' : ''}
    </span>
  )}
</div>
```

#### 4.2 Diff View Modal
```typescript
// Show before/after comparison
<DiffModal
  before={iteration.codeBefore}
  after={iteration.codeAfter}
  onConfirm={handleRevert}
/>
```

## MVP Implementation (3-4 hours total)

### Quick Start:
1. Add `messageId` column to `sceneIterations`
2. Update generation flow to save `messageId`
3. Add simple revert button to assistant messages
4. Implement basic revert functionality

### Future Enhancements:
- Visual timeline of versions
- Diff view before reverting
- Named versions/checkpoints
- Undo/redo stack
- Branch/merge capabilities

## Benefits
- **Zero additional storage** - Reuses existing `sceneIterations` data
- **Simple implementation** - Just linking existing data
- **Powerful UX** - Click any message to time travel
- **Safe** - Can preview changes before reverting

## Complexity: MEDIUM
- Database: Simple column addition
- Backend: Straightforward queries
- Frontend: New UI interactions
- Total: 6-8 hours for full implementation, 3-4 hours for MVP