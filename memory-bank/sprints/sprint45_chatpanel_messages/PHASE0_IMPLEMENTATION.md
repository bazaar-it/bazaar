# Phase 0 Implementation: Start Tracking Scene Iterations

## Step 1: Database Changes (Run in Neon SQL Editor)

```sql
-- Safe, non-destructive command to add messageId column
ALTER TABLE "scene_iteration" 
ADD COLUMN IF NOT EXISTS "message_id" UUID REFERENCES "message"("id") ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS "scene_iteration_message_idx" 
ON "scene_iteration"("message_id");
```

## Step 2: Update generation.universal.ts

After running the SQL, we need to modify the code to start creating iteration records.

### 2.1 Import sceneIterations table

```typescript
// At the top with other imports
import { scenes, projects, messages, sceneIterations } from "~/server/db/schema";
```

### 2.2 Add iteration tracking to executeToolFromDecision

Find the `executeToolFromDecision` function and add iteration tracking after each scene operation:

```typescript
// After line ~109 where addScene creates the scene
case 'addScene':
  // ... existing code that creates the scene ...
  
  // NEW: Create iteration record
  await db.insert(sceneIterations).values({
    sceneId: createdScene.id,
    projectId,
    operationType: 'create',
    userPrompt: decision.toolContext.userPrompt,
    brainReasoning: decision.reasoning,
    toolReasoning: result.reasoning || 'Scene created successfully',
    codeBefore: null, // No previous code for create
    codeAfter: createdScene.tsxCode,
    generationTimeMs: Date.now() - startTime,
    modelUsed: 'gpt-4o-mini',
    sessionId: userId,
    messageId: null, // Will be linked later
  });
  
  return { success: true, scene: createdScene };
```

### 2.3 Add messageId tracking in generateScene mutation

In the `generateScene` mutation (around line 284), we need to pass the assistantMessageId:

```typescript
// Around line 323 where executeToolFromDecision is called
const toolResult = await executeToolFromDecision(
  decision, 
  projectId, 
  userId, 
  storyboard,
  input.assistantMessageId // NEW: Pass the message ID
);
```

### 2.4 Update executeToolFromDecision signature

```typescript
async function executeToolFromDecision(
  decision: BrainDecision,
  projectId: string,
  userId: string,
  storyboard: any[],
  messageId?: string // NEW: Optional message ID parameter
): Promise<{ success: boolean; scene?: SceneEntity }> {
```

### 2.5 Complete implementation for all operations

```typescript
// For EDIT operations (around line ~154)
case 'editScene':
  // ... existing edit code ...
  
  // NEW: Create iteration record
  await db.insert(sceneIterations).values({
    sceneId: decision.toolContext.targetSceneId,
    projectId,
    operationType: 'edit',
    editComplexity: editResult.data.editComplexity || 'creative',
    userPrompt: decision.toolContext.userPrompt,
    brainReasoning: decision.reasoning,
    toolReasoning: editResult.reasoning || 'Scene edited successfully',
    codeBefore: sceneToEdit.tsxCode, // Store previous version
    codeAfter: editResult.data.tsxCode, // Store new version
    generationTimeMs: Date.now() - startTime,
    modelUsed: 'gpt-4o-mini',
    sessionId: userId,
    messageId: messageId || null,
  });
  
  return { success: true, scene: updatedScene };

// For DELETE operations (around line ~256)
case 'deleteScene':
  // ... existing delete code ...
  
  // NEW: Create iteration record for deletion
  await db.insert(sceneIterations).values({
    sceneId: decision.toolContext.targetSceneId,
    projectId,
    operationType: 'delete',
    userPrompt: decision.toolContext.userPrompt,
    brainReasoning: decision.reasoning,
    toolReasoning: 'Scene deleted',
    codeBefore: sceneToDelete.tsxCode, // Store what was deleted
    codeAfter: null, // No code after deletion
    generationTimeMs: Date.now() - startTime,
    modelUsed: 'gpt-4o-mini',
    sessionId: userId,
    messageId: messageId || null,
  });
  
  // ... continue with deletion ...
```

## Step 3: Test the Implementation

1. Create a new scene and check if iteration was created:
```sql
SELECT * FROM scene_iteration ORDER BY created_at DESC LIMIT 5;
```

2. Edit a scene and verify both versions are stored:
```sql
SELECT 
  id,
  operation_type,
  edit_complexity,
  user_prompt,
  LENGTH(code_before) as before_length,
  LENGTH(code_after) as after_length,
  message_id,
  created_at
FROM scene_iteration 
WHERE scene_id = 'YOUR_SCENE_ID'
ORDER BY created_at DESC;
```

## Step 4: Verify in Admin Panel

The admin panel already queries sceneIterations, so once we start creating records, you should see:
- Iteration counts in project details
- Edit history for each scene
- Performance metrics

## Important Notes

1. **Start Time Tracking**: Add `const startTime = Date.now();` at the beginning of executeToolFromDecision
2. **Error Handling**: Wrap iteration creation in try-catch to prevent failures from breaking scene operations
3. **Message Linking**: The messageId will be linked when we have the assistant message ID from the SSE flow

## Next Steps

Once Phase 0 is working and iterations are being tracked, we can:
1. Implement the revert functionality
2. Add UI buttons to messages
3. Create the revert API endpoint
4. Test the complete undo flow