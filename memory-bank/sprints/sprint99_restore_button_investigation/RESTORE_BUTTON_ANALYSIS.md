# Restore Button Disappearing - Deep Investigation

## Problem Statement
The restore button in chat messages sometimes disappears and doesn't reappear even after hard refresh. This investigation documents all potential causes with evidence.

## Investigation Date: 2025-08-28

## Key Finding
The primary issue was a **60-second cache** on the iterations query, but there are multiple additional issues that can cause the button to remain hidden.

---

## Issue #1: Primary Cache Problem (PARTIALLY FIXED)

### Evidence
**Location**: `/src/app/projects/[id]/generate/workspace/panels/ChatPanelG.tsx:153`

```typescript
const { data: messageIterations } = api.generation.getBatchMessageIterations.useQuery(
  { messageIds },
  { 
    enabled: messageIds.length > 0,
    staleTime: 60000, // Cache for 1 minute
  }
);
```

### Impact
- Iterations created in database but UI uses stale cached data
- Button disappears for up to 60 seconds after operations
- **STATUS**: ✅ FIXED - Set `staleTime: 0` and added invalidation calls

### Database Evidence
```sql
SELECT 
  COUNT(*) as total_iterations,
  COUNT(message_id) as with_message_id,
  COUNT(*) - COUNT(message_id) as without_message_id
FROM "bazaar-vid_scene_iteration"

Result: 591 total, 574 with message_id, 17 without (97% linked)
```

---

## Issue #2: Secondary Cache in ChatMessage Component (NOT FIXED)

### Evidence
**Location**: `/src/components/chat/ChatMessage.tsx:129-134`

```typescript
const { data: iterations, isLoading: isChecking } = api.generation.getMessageIterations.useQuery(
  { messageId: message.id! },
  { 
    enabled: hasIterationsProp === undefined && !message.isUser && !!message.id && !!projectId,
    staleTime: 60000, // Cache for 1 minute
  }
);
```

### Impact
- Individual message components have their own 60-second cache
- Even if parent component has fresh data, child component may use stale cache
- **STATUS**: ✅ FIXED - Set `staleTime: 0` and disabled polling

### Why This Matters
When `hasIterationsProp` is undefined (backward compatibility mode), the component makes its own query with a separate 60-second cache. This can override the fresh data from the parent.

---

## Issue #3: Iterations Without Message IDs

### Evidence
**Location**: Multiple locations create iterations without linking to messages

1. **Manual Code Edits** - `/src/server/api/routers/scenes.ts:128-139`
```typescript
await ctx.db.insert(sceneIterations).values({
  sceneId: input.sceneId,
  projectId: input.projectId,
  operationType: 'edit',
  editComplexity: 'manual',
  userPrompt: 'Manual code edit via Code Editor',
  codeBefore: codeBefore,
  codeAfter: input.code,
  generationTimeMs: 0,
  modelUsed: null,
  temperature: null,
  userEditedAgain: false,
  messageId: message?.id, // Often undefined for manual edits
});
```

2. **Duration Changes** - `/src/server/api/routers/scenes.ts:207-218`
```typescript
await ctx.db.insert(sceneIterations).values({
  sceneId: input.sceneId,
  projectId: input.projectId,
  operationType: 'edit',
  editComplexity: 'duration',
  userPrompt: `Duration changed from ${existingScene.duration} to ${input.duration} frames`,
  codeBefore: existingScene.tsxCode,
  codeAfter: existingScene.tsxCode, // Code doesn't change
  generationTimeMs: 0,
  modelUsed: null,
  temperature: null,
  userEditedAgain: false,
  messageId: message?.id, // Often undefined
});
```

### Impact
- 17 iterations in database have no message_id (3% of total)
- These iterations can never show a restore button
- **STATUS**: ⚠️ DESIGN LIMITATION - Manual edits don't go through chat flow

---

## Issue #4: Message ID Filtering

### Evidence
**Location**: `/src/app/projects/[id]/generate/workspace/panels/ChatPanelG.tsx:145-147`

```typescript
const messageIds = componentMessages
  .filter(m => !m.isUser && m.id && 
    !m.id.startsWith('_') && 
    !m.id.startsWith('temp-') && 
    !m.id.startsWith('optimistic-') && 
    !m.id.startsWith('system-') && 
    !m.id.startsWith('user-'))
  .map(m => m.id);
```

### Impact
- Messages with these ID prefixes are excluded from iteration queries
- Any iterations linked to these messages won't be found
- **STATUS**: ⚠️ BY DESIGN - These are temporary/system messages

### When This Happens
- During SSE streaming (optimistic updates)
- System-generated messages
- Temporary UI states

---

## Issue #5: Code Changes Detection Logic

### Evidence
**Location**: `/src/components/chat/ChatMessage.tsx:212-217`

```typescript
const hasCodeChanges = iterations?.some(iteration => 
  iteration.codeBefore !== iteration.codeAfter && 
  iteration.operationType !== 'delete'
) ?? false;

const hasIterations = hasIterationsProp ?? (hasCodeChanges || iterations?.some(i => i.operationType === 'delete'));
```

### Impact
- Button only shows if code actually changed
- Duration-only changes won't show button (codeBefore === codeAfter)
- **STATUS**: ⚠️ BY DESIGN - No code changes means nothing to restore

### Database Evidence
```sql
SELECT 
  m.id::text as message_id,
  COUNT(si.id) as iteration_count,
  BOOL_OR(si.code_before != si.code_after OR si.operation_type = 'delete') as has_code_changes
FROM "bazaar-vid_message" m
LEFT JOIN "bazaar-vid_scene_iteration" si ON si.message_id = m.id
WHERE m.role = 'assistant' 
GROUP BY m.id

-- Shows some iterations have no code changes (duration-only edits)
```

---

## Issue #6: SSE Flow Missing Assistant Message ID

### Evidence
**Location**: `/src/app/projects/[id]/generate/workspace/panels/ChatPanelG.tsx:1090`

```typescript
const result = await generateSceneMutation.mutateAsync({
  projectId,
  userMessage,
  userContext: { /* ... */ },
  // Don't pass assistantMessageId - let mutation create it
  metadata: { /* ... */ },
});
```

**And in**: `/src/hooks/use-sse-generation.ts:94`
```typescript
onMessageCreated?.(undefined, { // undefined assistantMessageId
  userMessage: data.userMessage,
  // ...
});
```

### Impact
- Assistant message created inside mutation, not linked upfront
- Brief window where iteration exists but message linkage is delayed
- **STATUS**: ⚠️ ARCHITECTURAL - Prevents duplicate "Generating..." messages

### Why This Design Exists
Historical issue with duplicate messages in database:
- "Generating..." placeholder messages were being saved
- Real assistant messages created afterward
- Led to duplicate messages in chat history

---

## Issue #7: Conditional Rendering Chain

### Evidence
**Location**: `/src/components/chat/ChatMessage.tsx:509-518`

```typescript
{!message.isUser && hasIterations && onRevert && message.id && !isErrorMessage && (
  <button
    onClick={handleRestoreClick}
    className="text-xs flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors"
    title="Restore to previous version"
  >
    <Undo2 className="h-3 w-3" />
    <span>Restore</span>
  </button>
)}
```

### All Conditions That Must Be True:
1. `!message.isUser` - Not a user message
2. `hasIterations` - Has iterations with code changes
3. `onRevert` - Callback function provided
4. `message.id` - Message has an ID
5. `!isErrorMessage` - Not an error message

### Impact
- Any single false condition hides the button
- Multiple points of failure in the chain
- **STATUS**: ✅ WORKING AS DESIGNED

---

## Summary of Issues

| Issue | Status | Severity | Impact |
|-------|--------|----------|---------|
| Primary cache (ChatPanelG) | ✅ FIXED | HIGH | 60s delay |
| Secondary cache (ChatMessage) | ✅ FIXED | HIGH | 60s delay |
| Missing message IDs | ⚠️ DESIGN LIMITATION | MEDIUM | 3% of iterations |
| Message ID filtering | ⚠️ BY DESIGN | LOW | Temporary messages only |
| Code changes detection | ⚠️ BY DESIGN | LOW | Duration-only edits |
| SSE flow architecture | ⚠️ ARCHITECTURAL | MEDIUM | Brief delay |
| Conditional rendering | ✅ WORKING | - | Expected behavior |

## Recommended Additional Fixes

1. **Immediate**: Fix the secondary cache in ChatMessage component
   ```typescript
   staleTime: 0, // Remove cache
   ```

2. **Short-term**: Add invalidation to all scene operations
   - Already partially done for some operations

3. **Long-term**: Consider architectural change to link iterations to operations rather than messages for non-chat operations

## Test Scenarios

To reproduce issues:
1. Create a scene via chat → wait 60s → check restore button
2. Manually edit code in Code Panel → check if restore appears
3. Change only duration in Timeline → check if restore appears (shouldn't)
4. Hard refresh after scene creation → check both caches

## Conclusion

The restore button disappearing is caused by **multiple overlapping issues**, primarily caching but also architectural decisions around message linkage and code change detection. The main cache has been fixed, but the secondary cache and other issues remain.