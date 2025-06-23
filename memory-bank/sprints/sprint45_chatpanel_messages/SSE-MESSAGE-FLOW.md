# SSE Message Flow - Proper Implementation

## The Correct Flow:

### 1. User Submits Message
```typescript
// User types message and hits enter
// ChatPanelG adds user message to VideoState
addUserMessage(projectId, message, imageUrls);
```

### 2. SSE Creates Assistant Message
```typescript
// SSE route creates REAL database message with "Generating code..."
const assistantMessage = await messageService.createMessage({
  projectId,
  content: "Generating code...",
  role: "assistant", 
  status: "pending"
});
// Sends message ID to client
```

### 3. Client Receives Message ID
```typescript
// use-sse-generation hook receives the message ID
// Calls onMessageCreated callback with the ID
// ChatPanelG stores this ID and triggers mutation
```

### 4. Generation Mutation Runs
```typescript
// generateScene mutation runs with assistantMessageId
// Brain orchestrator processes request
// Updates EXISTING message with real content
await db.update(messages).set({
  content: decision.chatResponse,
  updatedAt: new Date()
}).where(eq(messages.id, assistantMessageId));
```

### 5. Tool Execution
```typescript
// Tool executes (add/edit/delete/trim)
// Scene is created/updated in database
// Message status updated to 'success'
```

### 6. State Updates
```typescript
// VideoState is updated with new scenes
// Message content is updated in VideoState
// UI automatically re-renders
```

## Key Points:

1. **SSE creates REAL database message** - not temporary
2. **Message shows "Generating code..."** with pending status
3. **GeneratingMessage component** shows animated dots
4. **Mutation UPDATES existing message** - doesn't create new one
5. **State updates propagate** through VideoState subscriptions

## What Was Wrong:

- SSE was creating temporary messages (not in DB)
- Mutation was creating duplicate messages
- State wasn't updating properly
- GeneratingMessage animation wasn't showing

## Benefits:

- No duplicate messages
- Proper loading animation
- Database as single source of truth
- Clean state management
- Better user experience