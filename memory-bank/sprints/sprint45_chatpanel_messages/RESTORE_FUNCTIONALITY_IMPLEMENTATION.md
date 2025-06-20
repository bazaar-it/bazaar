# Restore Functionality Implementation Plan

## Key Requirements
1. **No modal popups or toast notifications** - Keep it inline and clean
2. **Two-click confirmation** - First click shows "Are you sure?", second click executes
3. **Auto-reset** - If user doesn't confirm within 3 seconds, reset to normal state
4. **Fix restore chain** - Make restored versions restorable too

## Current Issues to Fix

### 1. Revert Operations Not Linkable
When reverting, the system creates a message but doesn't link it to the iteration:

```typescript
// CURRENT (BROKEN):
// In revertToIteration mutation
await db.insert(sceneIterations).values({
  // ... other fields
  messageId: null,  // ❌ This breaks the chain!
});
```

### 2. Why Buttons Take Time to Appear
The delay happens because:
```typescript
// In ChatMessage component
const { data: iterations, isLoading } = api.generation.getMessageIterations.useQuery(
  { messageId: message.id },
  { enabled: !message.isUser && !!message.id }
);
```
Each message makes a separate query to check for iterations. With many messages, this creates multiple API calls.

## Implementation Plan for "Restore" Functionality

### Step 1: Fix Revert Operation Linking

```typescript
// In generation.universal.ts - revertToIteration mutation
// Create the revert message FIRST
const revertMessage = await messageService.createMessage({
  projectId,
  content: `Restored scene to version from: "${iteration.userPrompt}"`,
  role: 'assistant',
  kind: 'message',
});

// Then create iteration linked to the message
await db.insert(sceneIterations).values({
  sceneId: iteration.sceneId,
  projectId,
  operationType: 'edit',
  userPrompt: `Restored to: "${iteration.userPrompt}"`,
  codeBefore: currentScene.tsxCode,
  codeAfter: iteration.codeAfter || iteration.codeBefore,
  messageId: revertMessage.id,  // ✅ Now linked!
  generationTimeMs: 0,
});
```

### Step 2: Optimize Button Display

Option A: Batch Loading (Recommended)
```typescript
// In ChatPanelG, load all iterations at once
const messageIds = messages
  .filter(m => !m.isUser && m.id)
  .map(m => m.id!);

const { data: allIterations } = api.generation.getBatchMessageIterations.useQuery(
  { messageIds },
  { enabled: messageIds.length > 0 }
);

// Pass iteration data to each ChatMessage
<ChatMessage 
  message={message}
  hasIterations={allIterations?.[message.id]?.length > 0}
/>
```

Option B: Include in Message Data
```typescript
// When fetching messages, include iteration count
const messagesWithIterations = await db.query.messages.findMany({
  where: eq(messages.projectId, projectId),
  with: {
    iterations: {
      columns: { id: true }, // Just need count
    }
  }
});
```

### Step 3: Better UI/UX for Restore (Inline Confirmation)

```typescript
// In ChatMessage component - inline confirmation pattern
export function ChatMessage({ message, iterations, onRestore }) {
  const [confirmMode, setConfirmMode] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const handleRestoreClick = () => {
    if (!confirmMode) {
      // First click - enter confirm mode
      setConfirmMode(true);
      
      // Auto-reset after 3 seconds if no second click
      timeoutRef.current = setTimeout(() => {
        setConfirmMode(false);
      }, 3000);
    } else {
      // Second click - execute restore
      clearTimeout(timeoutRef.current);
      setConfirmMode(false);
      onRestore(message.id);
    }
  };
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);
  
  return (
    <button
      onClick={handleRestoreClick}
      className={`restore-button ${confirmMode ? 'confirm-mode' : ''}`}
    >
      {confirmMode ? (
        <>
          <AlertCircle className="h-3 w-3" />
          <span>Are you sure?</span>
        </>
      ) : (
        <>
          <RotateCcw className="h-3 w-3" />
          <span>Restore</span>
        </>
      )}
    </button>
  );
}

// CSS for visual feedback
.restore-button.confirm-mode {
  background-color: rgb(239 68 68); /* red-500 */
  color: white;
}
```

### Step 4: Create Version History Modal

```typescript
// New component: VersionHistoryModal.tsx
export function VersionHistoryModal({ sceneId, projectId, onRestore }) {
  const { data: allIterations } = api.generation.getSceneIterations.useQuery({
    sceneId
  });
  
  return (
    <Timeline>
      {allIterations?.map((iter, index) => (
        <TimelineItem key={iter.id}>
          <div className="flex justify-between">
            <div>
              <h4>{iter.userPrompt}</h4>
              <p className="text-sm text-gray-500">
                {iter.operationType} • {formatDate(iter.createdAt)}
              </p>
            </div>
            <Button 
              onClick={() => onRestore(iter.id)}
              disabled={index === 0} // Current version
            >
              Restore to this version
            </Button>
          </div>
        </TimelineItem>
      ))}
    </Timeline>
  );
}
```

## Complete Implementation Checklist

### Backend Changes:
1. ✅ Fix `revertToIteration` to link iterations to messages
2. ✅ Add batch query for message iterations
3. ✅ Include iteration data in message queries
4. ✅ Remove confirmation modal/toast

### Frontend Changes:
1. ✅ Rename "Revert" to "Restore" throughout
2. ✅ Implement inline confirmation (click twice pattern)
3. ✅ Optimize iteration checking (batch or include)
4. ✅ Add loading states for buttons
5. ✅ Create version history view
6. ✅ Auto-reset confirmation after 3 seconds

### Database Changes:
1. ✅ Ensure all operations create iterations
2. ✅ Add index on (messageId) for faster queries

## Why This Works Better

1. **Every operation is restorable** - Including previous restores
2. **Faster button display** - Batch loading or included data
3. **Clearer terminology** - "Restore" instead of "Revert"
4. **Version history** - See all versions, not just inline
5. **Better UX** - Loading states, tooltips, clear actions

## Time Estimate

- Backend fixes: 2-3 hours
- Frontend optimization: 2-3 hours  
- Version history UI: 3-4 hours
- Testing: 2 hours

Total: 9-12 hours for complete implementation