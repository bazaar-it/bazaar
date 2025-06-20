# SSE Lifecycle Fix - Persistent "Generating code..." Messages

## The Problem

### Current Broken Flow
```typescript
1. SSE creates message: "Generating code..." (status: 'pending')
2. SSE immediately sends 'complete' event → status: 'success' ❌
3. tRPC mutation runs, creates/updates with actual content
4. Result: Database has "Generating code..." with status: 'success'
5. On refresh: Users see successful "Generating code..." messages 🤦
```

### Root Cause
The SSE connection marks messages as 'success' before the actual operation completes. This violates the basic principle: **status should reflect reality**.

## The Solution: Proper Message Lifecycle

### Principle: Message Status Reflects Actual State
- `pending`: Operation in progress
- `success`: Operation completed successfully
- `error`: Operation failed

### Fixed Flow
```typescript
1. SSE creates placeholder: "Generating code..." (status: 'pending') ✓
2. SSE keeps connection open, no premature completion
3. tRPC mutation updates existing message with:
   - Actual content from brain/tool
   - Status: 'success' (only after completion)
4. SSE closes after tRPC confirms update
```

### Implementation

#### 1. Fix SSE Route - Remove Premature Completion
```typescript
// src/app/api/generate-stream/route.ts
export async function POST(request: Request) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Create pending message
        const message = await db.insert(messages).values({
          content: 'Generating code...',
          status: 'pending', // STAYS PENDING
          // ... other fields
        });
        
        // Send message created event
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: 'message', data: message })}\n\n`
        ));
        
        // DO NOT SEND COMPLETE EVENT HERE ❌
        // Let tRPC handle completion
        
      } catch (error) {
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: 'error', error })}\n\n`
        ));
      }
      
      // Keep connection open for updates
      // controller.close(); // REMOVE THIS
    },
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

#### 2. Update tRPC to Mark Completion
```typescript
// src/server/api/routers/generation.universal.ts
generateScene: protectedProcedure
  .mutation(async ({ input, ctx }) => {
    // ... brain processing ...
    
    // Update the existing message (not create new)
    if (input.assistantMessageId) {
      await ctx.db.update(messages)
        .set({
          content: decision.chatResponse,
          status: 'success', // NOW it's actually done
          updatedAt: new Date(),
        })
        .where(eq(messages.id, input.assistantMessageId));
    }
    
    return { success: true, /* ... */ };
  }),
```

#### 3. Client Handles Updates
```typescript
// ChatPanelG already watches for message updates
// No changes needed - Zustand subscription handles it
```

### Benefits
1. **No more persistent "Generating..."** - Only pending during actual generation
2. **Accurate status** - Success only after completion
3. **Single source of truth** - Database always reflects reality
4. **No duplicate messages** - Update existing instead of creating new

### Testing
1. Generate a scene
2. Check database during generation (status: 'pending')
3. Check after completion (status: 'success', proper content)
4. Refresh page - no "Generating code..." messages

### Complexity: LOW
- Remove 2 lines from SSE (premature completion)
- Ensure tRPC updates status correctly (already does)
- No new concepts or structures needed