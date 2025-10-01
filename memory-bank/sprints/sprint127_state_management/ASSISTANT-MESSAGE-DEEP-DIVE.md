# Assistant Message Consistency: Deep-Dive Analysis

**Date**: 2025-10-02
**Sprint**: 127 - State Management
**Issue**: Assistant messages change after refresh, appearing inconsistent
**Status**: 🔴 **CRITICAL** - Multiple sources of truth creating user confusion

---

## Executive Summary

**Problem**: Users see one assistant message immediately after generation, then a **completely different message** after page refresh.

**Root Cause**: **THREE separate sources of truth** for the same assistant message:

1. **Source #1**: `decision.chatResponse` (LLM's raw narrative) → Shown immediately to user
2. **Source #2**: `safeChat` (sanitized version) → Stored in DB initially
3. **Source #3**: `formatSceneOperationMessage()` (standardized summary) → Overwrites DB ~5s later

**Impact**:
- 🔴 Users lose trust when messages "flip"
- 🔴 Duplicate messages appear during sync windows
- 🔴 Status fields oscillate (pending → success → pending)
- 🔴 Chat feels "noisy" and unpredictable

**Key Insight**: The server **overwrites the DB twice** before the client even refreshes, but returns the **original LLM text** to the client, guaranteeing a mismatch.

---

## Complete Data Flow (Actual Code)

### 1. Initial Message Creation (scene-operations.ts:480-523)

```typescript
// Line 491-497: Create sanitized message (Source #2)
const fallbackText = formatSceneOperationMessage(plannedOp, { name: 'Scene' }, { userPrompt });
const safeChat = sanitizeAssistantMessage(decision.chatResponse, fallbackText).message;

// Line 504-510: Store in DB (Source #2)
await db.update(messages)
  .set({
    content: safeChat || 'Processing your request...',  // ← DB gets safeChat
    status: 'success',
    updatedAt: new Date(),
  })
  .where(eq(messages.id, input.assistantMessageId));
```

**What happens**: DB gets `safeChat` (sanitized), but user never sees this version

---

### 2. Tool Execution & Message Overwrite (scene-operations.ts:561-592)

```typescript
// Line 575-584: Generate formatted message (Source #3)
const betterMessage = formatSceneOperationMessage(
  operationType,
  toolResult.scene,
  {
    userPrompt: decision.toolContext?.userPrompt,
    scenesCreated: toolResult.scenes?.length,
    previousDuration,
    newDuration
  }
);

// Line 586-592: Overwrite same DB row (Source #3)
await db.update(messages)
  .set({
    content: betterMessage,  // ← DB now gets formatted message
    status: 'success',
    updatedAt: new Date(),
  })
  .where(eq(messages.id, assistantMessageId));
```

**What happens**: DB content changes from `safeChat` → `betterMessage`, but user still hasn't seen either

---

### 3. Client Receives Response (scene-operations.ts:714-723)

```typescript
// Line 714-723: Return to client (Source #1)
return {
  ...successResponse,
  context: {
    reasoning: decision.reasoning,
    chatResponse: decision.chatResponse,  // ← Client gets ORIGINAL LLM text (Source #1)
  },
  assistantMessageId,
  additionalMessageIds: toolResult.additionalMessageIds || [],
} as SceneCreateResponse;
```

**What happens**: Client receives `decision.chatResponse` (raw LLM narrative), which **NEVER** matches what's in the DB

---

### 4. Client Displays Message (ChatPanelG.tsx:1524-1537)

```typescript
// Line 1524-1532: Client adds optimistic message (Source #1)
if (assistantMessageId) {
  const aiResponse = responseData.context?.chatResponse ||   // ← Uses Source #1
                     responseData.chatResponse ||
                     responseData.message ||
                     'Scene generated successfully.';

  // Add to Zustand (local state)
  addAssistantMessage(projectId, assistantMessageId, aiResponse);  // ← Shows LLM text

  // Mark as success
  updateMessage(projectId, assistantMessageId, { status: 'success' });
}
```

**What happens**: User sees `decision.chatResponse` (LLM narrative) in chat bubble

---

### 5. Database Sync Conflict (videoState.ts:521-600)

```typescript
// Line 521-535: Convert DB messages (Source #3)
const syncedMessages: ChatMessage[] = dbMessages.map((dbMessage) => ({
  id: dbMessage.id,
  message: dbMessage.content,  // ← This is betterMessage (formatted)
  isUser: dbMessage.role === "user",
  timestamp: new Date(dbMessage.createdAt).getTime(),
  sequence: dbMessage.sequence,
  status: dbMessage.status || "success",
  // ...
}));

// Line 560-566: Deduplication logic (BROKEN)
if (content1.length > 50 && content2.length > 50) {
  // Check if beginning of messages match (at least 50 chars)
  return content1.substring(0, 50) === content2.substring(0, 50);  // ← First 50 chars
}
```

**What happens**:
- DB has: `"Created \"Hero Video\" with animated text"` (formatted)
- Client has: `"I'll build a multi-scene hero video showcasing..."` (LLM narrative)
- **First 50 chars DON'T match** → Both messages kept → Duplicates appear

---

### 6. User Refreshes Page

```typescript
// On page load: getMessages query returns DB messages only
const { data: dbMessages } = api.chat.getMessages.useQuery({ projectId });

// User now sees: "Created \"Hero Video\" with animated text"
// Previously saw: "I'll build a multi-scene hero video showcasing..."
```

**What happens**: User sees completely different message after refresh

---

## Timeline of Message Transformations

```
T=0s:  LLM generates decision.chatResponse
       "I'll build a multi-scene hero video showcasing your product
        with smooth transitions and engaging animations."

T=1s:  Server sanitizes → safeChat (Source #2)
       "I'll build a multi-scene hero video showcasing your product."

T=1s:  Server stores safeChat in DB
       DB row created: content = safeChat

T=5s:  Tool executes, server formats → betterMessage (Source #3)
       "Created \"Hero Video\" with animated text"

T=5s:  Server OVERWRITES same DB row
       DB row updated: content = betterMessage

T=1s:  Client receives decision.chatResponse (Source #1)
       "I'll build a multi-scene hero video showcasing..."

T=1s:  Client displays Source #1 to user
       User sees: LLM narrative

T=10s: Client syncs with DB (Source #3)
       syncDbMessages sees TWO different strings with same ID
       Dedup logic fails (first 50 chars differ)
       Both messages kept briefly

T=30s: User refreshes page
       DB query returns ONLY Source #3
       User sees: "Created \"Hero Video\" with animated text"
       User confused: "Where did my original message go?"
```

---

## Why This is Broken: 3 Sources of Truth

### Source #1: LLM Raw Narrative (Client Optimistic)
**Example**:
```
"I'll create a dynamic multi-scene video showcasing your product with
engaging animations, smooth transitions, and professional typography.
This will include 5 scenes..."
```

**Where it lives**:
- Returned in `context.chatResponse`
- Shown immediately to user
- Stored in Zustand (client state)

**Lifespan**: Until page refresh or DB sync

---

### Source #2: Sanitized Version (DB Temporary)
**Example**:
```
"I'll create a dynamic multi-scene video showcasing your product."
```

**Where it lives**:
- Stored in DB initially (line 506)
- Never shown to user
- Immediately overwritten by Source #3

**Lifespan**: ~5 seconds (until tool executes)

---

### Source #3: Formatted Summary (DB Permanent)
**Example**:
```
"Created \"Hero Video\" with animated text"
```

**Where it lives**:
- Generated by `formatSceneOperationMessage()` (line 575)
- Overwrites DB row (line 586)
- Shown after page refresh

**Lifespan**: Permanent (until message deleted)

---

## Deduplication Logic Failure

### Current Logic (videoState.ts:560-566)

```typescript
// Check if beginning of messages match (at least 50 chars)
if (content1.length > 50 && content2.length > 50) {
  return content1.substring(0, 50) === content2.substring(0, 50);
}
```

### Why It Fails:

```typescript
// Source #1 (Client optimistic):
"I'll create a dynamic multi-scene video showcasing"  // First 50 chars

// Source #3 (DB permanent):
"Created \"Hero Video\" with animated text"           // First 50 chars

// Are they equal? NO
// Result: Both messages kept, duplicates appear
```

### What Should Happen:

```typescript
// Dedup by ID, not content
const isDuplicateMessage = (msg1: ChatMessage, msg2: ChatMessage) => {
  return msg1.id === msg2.id;  // ✅ Simple, reliable
};
```

---

## Real User Experience

### Scenario 1: Immediate View
```
User: "Create a hero video with floating particles"
[Sends message]

Assistant (immediately): "I'll create a dynamic particle animation video
showcasing floating elements with smooth physics-based motion. This will
include 5 distinct scenes with varying particle densities..."

[User sees long, descriptive LLM narrative]
```

### Scenario 2: After Refresh
```
[User refreshes page 30 seconds later]

Assistant (after refresh): "Created \"Particle Hero\" with particle effects"

User: "Wait, where did the detailed explanation go?"
```

### Scenario 3: During Sync Window (Duplicates)
```
T=10s: User still on page, sync runs

Chat shows:
  User: "Create a hero video with floating particles"
  Assistant: "I'll create a dynamic particle animation video..." ← Source #1 (optimistic)
  Assistant: "Created \"Particle Hero\" with particle effects"   ← Source #3 (DB)

[Same message UUID, different content, both visible]
```

---

## Solutions Analysis

### ❌ Option 1: Return Formatted Message to Client

**Change**: Return `betterMessage` in `context.chatResponse` instead of `decision.chatResponse`

**Code**:
```typescript
// scene-operations.ts:714-723
return {
  ...successResponse,
  context: {
    reasoning: decision.reasoning,
    chatResponse: betterMessage,  // ← Use formatted message (Source #3)
  },
  assistantMessageId,
} as SceneCreateResponse;
```

**Pros**:
- ✅ Client and DB always match
- ✅ No duplicates
- ✅ Consistent after refresh

**Cons**:
- ❌ Users lose LLM's personality ("I'll create..." → "Created...")
- ❌ Less engaging, feels robotic
- ❌ Doesn't explain *what* will be created, only *what was* created

---

### ❌ Option 2: Don't Overwrite DB Message

**Change**: Store `decision.chatResponse` permanently, skip the `betterMessage` overwrite

**Code**:
```typescript
// scene-operations.ts:561-601 - DELETE THIS ENTIRE BLOCK
// Don't overwrite the DB message after tool execution
```

**Pros**:
- ✅ Client and DB always match
- ✅ Users see LLM personality
- ✅ No duplicates

**Cons**:
- ❌ Lose concise summaries (DB full of verbose LLM text)
- ❌ Chat history becomes bloated
- ❌ Harder to scan chat for "what happened"

---

### ✅ Option 3: Two-Message System (RECOMMENDED)

**Change**: Keep **both** messages, serve different purposes

**Implementation**:
1. **LLM Narrative** → Shown immediately (optimistic), marked as `kind: 'reasoning'`
2. **Formatted Summary** → Created when tool completes, marked as `kind: 'text'`

**Code Changes**:

**scene-operations.ts** (line 561-601):
```typescript
// After tool execution, CREATE NEW MESSAGE (don't overwrite)
if (assistantMessageId && toolResult.success && toolResult.scene) {
  const betterMessage = formatSceneOperationMessage(...);

  // ❌ OLD: Overwrite existing message
  // await db.update(messages).set({ content: betterMessage })...

  // ✅ NEW: Create separate summary message
  await messageService.createMessage({
    projectId,
    content: betterMessage,
    role: 'assistant',
    status: 'success',
    kind: 'tool_result',  // ← Different kind
  });
}
```

**ChatPanelG.tsx** (rendering):
```typescript
// Show both messages with different styling
{msg.kind === 'reasoning' && (
  <div className="assistant-reasoning">  {/* Lighter, italicized */}
    {msg.message}
  </div>
)}

{msg.kind === 'tool_result' && (
  <div className="assistant-summary">  {/* Bold, clear */}
    ✅ {msg.message}
  </div>
)}
```

**Pros**:
- ✅ Users see LLM's thought process (engaging)
- ✅ Users see concise summary (scannable)
- ✅ No message flip-flopping
- ✅ No duplicates (different IDs)
- ✅ Chat history is informative

**Cons**:
- ⚠️ Two messages instead of one (slightly more visual noise)
- ⚠️ Requires UI changes to style differently

**Visual Example**:
```
User: "Create a hero video"

Assistant (reasoning):
  💭 I'll create a dynamic hero video with 5 scenes showcasing
     your product through smooth transitions and animations...

Assistant (result):
  ✅ Created "Hero Video" with animated text
```

---

### ✅ Option 4: ID-Based Dedup + Formatted Message (PRAGMATIC)

**Change**: Fix dedup logic + return formatted message to client

**Code Changes**:

**videoState.ts** (line 540-566):
```typescript
// ❌ OLD: Dedup by first 50 chars of content
const isDuplicateMessage = (msg1: ChatMessage, msg2: ChatMessage) => {
  if (content1.substring(0, 50) === content2.substring(0, 50)) return true;
};

// ✅ NEW: Dedup by ID (simple, reliable)
const isDuplicateMessage = (msg1: ChatMessage, msg2: ChatMessage) => {
  return msg1.id === msg2.id;  // Same UUID = same message, regardless of content
};
```

**scene-operations.ts** (line 714-723):
```typescript
// Return formatted message to client (not LLM narrative)
return {
  ...successResponse,
  context: {
    reasoning: decision.reasoning,
    chatResponse: betterMessage,  // ← Use formatted message (wait for it to be generated)
  },
  assistantMessageId,
} as SceneCreateResponse;
```

**But wait**: `betterMessage` is only available **after** tool execution (line 575).
The mutation response is sent **before** we know what was created.

**Solution**: Generate `betterMessage` **before** tool execution:

```typescript
// Line 491-497: Generate formatted message EARLY
const plannedMessage = formatSceneOperationMessage(
  plannedOp,
  { name: extractSceneName(userMessage) || 'Scene' },  // ← Extract from prompt
  { userPrompt: userMessage }
);

// Line 506: Store it
await db.update(messages).set({ content: plannedMessage })...

// Line 718: Return it
chatResponse: plannedMessage,  // ← Client gets formatted message immediately
```

**Pros**:
- ✅ Client and DB always match
- ✅ No duplicates (ID-based dedup works)
- ✅ Consistent after refresh
- ✅ Simple fix (2 changes)

**Cons**:
- ❌ Users lose LLM personality
- ❌ Message is "planned" not "actual" (might be slightly wrong)

---

## Recommended Solution

**Combination**: **Option 4** (short-term) + **Option 3** (long-term)

### Phase 1 (Sprint 127 - Immediate Fix):

1. **Fix dedup logic** to use ID instead of content (videoState.ts:540-566)
2. **Return formatted message** to client (scene-operations.ts:718)
3. **Test** that messages no longer flip after refresh

**Time**: 30 minutes
**Risk**: Low (simple changes)
**Impact**: Eliminates message flip-flopping, duplicates disappear

---

### Phase 2 (Sprint 128 - Enhanced UX):

4. **Implement two-message system**:
   - Keep LLM narrative as `kind: 'reasoning'`
   - Add formatted summary as `kind: 'tool_result'`
5. **Update chat UI** to style reasoning vs results differently
6. **Add collapse/expand** for long reasoning messages

**Time**: 2-3 hours
**Risk**: Medium (UI changes)
**Impact**: Users get best of both worlds (personality + clarity)

---

## Code Changes Needed (Phase 1)

### 1. Fix Deduplication (videoState.ts)

```typescript
// Line 540-566: REPLACE with ID-based dedup
const isDuplicateMessage = (msg1: ChatMessage, msg2: ChatMessage) => {
  // Primary dedup: same ID = duplicate
  if (msg1.id === msg2.id) return true;

  // Secondary dedup: same role + exact content match (rare edge case)
  if (msg1.isUser === msg2.isUser && msg1.message.trim() === msg2.message.trim()) {
    return true;
  }

  return false;
};

// Line 571-600: Simplify merge logic
const deduplicatedHistory: ChatMessage[] = [];
const seenIds = new Set<string>();

// 1. Add all DB messages (these are authoritative)
syncedMessages.forEach(dbMsg => {
  if (!seenIds.has(dbMsg.id)) {
    deduplicatedHistory.push(dbMsg);
    seenIds.add(dbMsg.id);
  }
});

// 2. Only keep client messages that don't exist in DB
currentClientMessages.forEach(clientMsg => {
  if (!seenIds.has(clientMsg.id)) {
    deduplicatedHistory.push(clientMsg);
    seenIds.add(clientMsg.id);
  }
});
```

---

### 2. Return Formatted Message (scene-operations.ts)

```typescript
// Line 561-592: Generate betterMessage BEFORE returning
if (assistantMessageId && toolResult.success && toolResult.scene) {
  const betterMessage = formatSceneOperationMessage(...);

  await db.update(messages)
    .set({ content: betterMessage, status: 'success', updatedAt: new Date() })
    .where(eq(messages.id, assistantMessageId));

  // Line 714-723: Return betterMessage to client
  return {
    ...successResponse,
    context: {
      reasoning: decision.reasoning,
      chatResponse: betterMessage,  // ← Use formatted message (now available)
    },
    assistantMessageId,
  } as SceneCreateResponse;
}
```

**Problem**: Response is sent **before** tool execution completes.

**Solution**: Wait for tool execution, **then** return:

```typescript
// Line 538-601: Move response AFTER tool execution
const toolResult = await executeToolFromDecision(...);

// Generate formatted message
let finalChatResponse = decision.chatResponse;  // Default to LLM narrative
if (assistantMessageId && toolResult.success && toolResult.scene) {
  const betterMessage = formatSceneOperationMessage(...);
  await db.update(messages).set({ content: betterMessage })...
  finalChatResponse = betterMessage;  // ← Use formatted message
}

// Return response with final message
return {
  ...response.success(toolResult.scene, operation, 'scene'),
  context: {
    reasoning: decision.reasoning,
    chatResponse: finalChatResponse,  // ← Matches DB
  },
  assistantMessageId,
} as SceneCreateResponse;
```

---

## Testing Checklist

### Before Fix:
- [ ] Assistant message shows LLM narrative immediately
- [ ] After refresh, message changes to formatted summary
- [ ] During sync, duplicate messages appear briefly
- [ ] Status oscillates between pending/success

### After Fix (Phase 1):
- [ ] Assistant message shows formatted summary immediately
- [ ] After refresh, message is identical
- [ ] No duplicates during sync
- [ ] Status remains stable (success)

### After Enhancement (Phase 2):
- [ ] Chat shows both reasoning and result
- [ ] Reasoning is collapsible/expandable
- [ ] Result is prominently displayed
- [ ] No duplicates or flip-flopping

---

## Impact Assessment

**User Complaints**:
- "Messages keep changing when I refresh"
- "I see the same message twice"
- "The assistant said one thing, then said something else"

**Root Cause**: 3 sources of truth (LLM narrative, sanitized, formatted)

**Fix Impact**:
- ✅ Eliminates flip-flopping (source #1 = source #3)
- ✅ Eliminates duplicates (ID-based dedup)
- ✅ Builds trust (consistent messages)

**Trade-off**:
- ⚠️ Lose LLM personality in Phase 1 (fix in Phase 2 with two-message system)

---

## Conclusion

The assistant message inconsistency is caused by **returning LLM narrative to client** while **storing formatted summary in DB**. This creates an inevitable mismatch that manifests as:

1. Message flip-flopping after refresh
2. Duplicate messages during sync
3. User confusion and lost trust

**Recommended fix**: Two-phase approach:
- **Phase 1** (immediate): Return formatted message to client, fix dedup logic
- **Phase 2** (enhancement): Two-message system (reasoning + result)

**Time to fix**: 30 minutes (Phase 1) + 2-3 hours (Phase 2)
**Risk**: Low → Medium
**Impact**: High (eliminates critical UX issue)

---

**Next Steps**:
1. Review this analysis
2. Choose solution (recommend Phase 1 → Phase 2)
3. Implement dedup fix (videoState.ts)
4. Implement response fix (scene-operations.ts)
5. Test thoroughly
6. Monitor for message consistency issues