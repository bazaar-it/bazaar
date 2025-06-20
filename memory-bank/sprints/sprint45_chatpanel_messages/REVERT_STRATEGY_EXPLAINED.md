# Revert Strategy Explained

## Overview
The "Revert" feature allows users to restore scenes to previous versions. However, not all messages can be reverted because not all messages create scene changes.

## Why Some Messages Have Revert and Others Don't

### Messages WITH Revert Button
These are assistant messages that **actually changed a scene**:
- "Creating an engaging intro scene..." → Created a new scene (has iteration)
- "Enhancing the qualities..." → Edited existing scene (has iteration)
- "Adding pink details..." → Edited existing scene (has iteration)

### Messages WITHOUT Revert Button
These messages don't change scenes:
- User messages (prompts) → Only requests, no scene changes
- "Generating code" → Temporary UI feedback, not saved to DB
- "Reverted scene to version..." → System message, no new scene change
- Error messages → Failed operations, no scene changes
- Chat responses without scene operations → Just conversational

## Where This Decision is Made

### 1. During Scene Operations (generation.universal.ts)
```typescript
// When a scene is created/edited/deleted, an iteration is recorded:
if (messageId) {
  await db.insert(sceneIterations).values({
    sceneId: newScene.id,
    projectId,
    operationType: 'create', // or 'edit', 'delete'
    messageId,  // Links iteration to the assistant message
    codeBefore: oldCode,
    codeAfter: newCode,
    // ... other fields
  });
}
```

### 2. In ChatMessage Component
```typescript
// Check if message has iterations (scene changes)
const { data: iterations } = api.generation.getMessageIterations.useQuery(
  { messageId: message.id },
  { enabled: !message.isUser && !!message.id }
);

const hasIterations = (iterations?.length ?? 0) > 0;

// Only show revert button if iterations exist
{!message.isUser && hasIterations && onRevert && (
  <button onClick={() => onRevert(message.id)}>
    <Undo2 /> Revert
  </button>
)}
```

## What Happens During a Revert

### 1. User Clicks Revert
- Confirms the action (modal: "Revert to this version?")
- Fetches all iterations linked to that message

### 2. For Each Iteration
The system restores the scene to the state AFTER that message:
- **For CREATE operations**: Uses `codeAfter` (the created code)
- **For EDIT operations**: Uses `codeAfter` (the edited result)
- **For DELETE operations**: Restores using `codeBefore` (before deletion)

### 3. Creates New Iteration
A new iteration is recorded to track the revert:
```typescript
await db.insert(sceneIterations).values({
  operationType: 'edit',
  userPrompt: `Reverted to version from: "${originalPrompt}"`,
  codeBefore: currentCode,
  codeAfter: revertedCode,
  messageId: null,  // System operation, not linked to new message
});
```

### 4. Creates System Message
"Reverted scene to version from: 'make an engaging intro video...'"

## Why You Can't Revert Back and Forth Infinitely

### The Issue You Experienced:
1. Created scene → "Creating an engaging intro..." (has revert ✓)
2. Edited scene → "Enhancing the qualities..." (has revert ✓)
3. Reverted to #1 → System message (no revert ✗)
4. Can't revert back to #2

### Why This Happens:
- The revert operation creates a **system message** without a linked iteration
- System messages don't have scene iterations attached
- Without iterations, there's no "revert" button

### The Real Problem:
When reverting, the code creates a new iteration but doesn't link it to the system message:
```typescript
messageId: null,  // This is why revert messages can't be reverted!
```

## Better Approach: Version History

Instead of "Revert" (which implies undoing), a better approach would be:
1. **"Restore to this version"** - More accurate terminology
2. **Version Timeline** - Show all versions chronologically
3. **Allow Any Version** - Jump to any previous state
4. **Link All Changes** - Even reverts should be revertable

## Technical Improvements Needed

1. **Link Revert Iterations to Messages**
```typescript
// When creating revert message
const revertMessage = await messageService.createMessage({
  content: `Restored to version from: "${iteration.userPrompt}"`,
  role: 'assistant',
});

// Link iteration to the revert message
await db.insert(sceneIterations).values({
  // ... iteration data
  messageId: revertMessage.id,  // Now revert is revertable!
});
```

2. **Show Version History**
- Display all versions of a scene
- Allow jumping between any versions
- Show diffs between versions

3. **Better Terminology**
- "Restore" instead of "Revert"
- "Version" instead of "iteration"
- "History" instead of just inline buttons

## Summary

The current implementation only allows reverting to messages that created scene changes. The revert operation itself doesn't create a revertable state, which is why you can't go back and forth. This could be improved by:
1. Linking revert operations to their system messages
2. Implementing a proper version history UI
3. Using clearer terminology ("restore" vs "revert")
4. Allowing navigation between any historical versions