# Message Sequencing Implementation Ticket

## Problem Statement
Messages can appear out of order after page refresh due to:
- Millisecond timestamp collisions
- Async race conditions between user and assistant messages
- Client vs server timestamp mismatches

## Solution: Add Explicit Sequencing

### 1. Database Schema Change
```sql
-- Add to messages table
ALTER TABLE messages ADD COLUMN sequence INTEGER NOT NULL DEFAULT 0;
ALTER TABLE messages ADD INDEX idx_project_sequence (projectId, sequence);
```

### 2. Implementation Steps

#### Step 1: Update Message Schema
```typescript
// src/server/db/schema.ts
export const messages = pgTable("messages", {
  // ... existing fields
  sequence: integer("sequence").notNull().default(0),
});
```

#### Step 2: Create Sequence Counter
```typescript
// src/server/services/data/messageSequence.service.ts
export class MessageSequenceService {
  private static sequenceMap = new Map<string, number>();

  static async getNextSequence(projectId: string): Promise<number> {
    // Option A: In-memory counter (fast but needs Redis for production)
    const current = this.sequenceMap.get(projectId) || 0;
    const next = current + 1;
    this.sequenceMap.set(projectId, next);
    return next;

    // Option B: Database counter (slower but consistent)
    // const result = await db.select({ max: sql`MAX(sequence)` })
    //   .from(messages)
    //   .where(eq(messages.projectId, projectId));
    // return (result[0]?.max || 0) + 1;
  }
}
```

#### Step 3: Update Message Creation (SSE)
```typescript
// src/app/api/generate-stream/route.ts
const sequence = await MessageSequenceService.getNextSequence(projectId);
const assistantMessage = await db.insert(messages).values({
  projectId,
  role: 'assistant',
  content: 'Generating code...',
  status: 'pending',
  sequence, // ADD THIS
  createdAt: new Date(),
}).returning();
```

#### Step 4: Update Message Creation (tRPC)
```typescript
// src/server/api/routers/generation.universal.ts
// When creating user message
const userSequence = await MessageSequenceService.getNextSequence(projectId);
const userMessage = await ctx.db.insert(messages).values({
  projectId: input.projectId,
  role: 'user',
  content: input.prompt,
  sequence: userSequence, // ADD THIS
});

// When updating assistant message
// No sequence change needed - just content update
```

#### Step 5: Update Message Queries
```typescript
// src/server/api/routers/project.ts
getMessages: protectedProcedure
  .input(z.object({ projectId: z.string() }))
  .query(async ({ ctx, input }) => {
    return await ctx.db
      .select()
      .from(messages)
      .where(eq(messages.projectId, input.projectId))
      .orderBy(asc(messages.sequence)); // CHANGE FROM createdAt
  }),
```

### 3. Migration for Existing Data
```typescript
// src/server/db/migrations/add-message-sequencing.ts
export async function up(db: Database) {
  // Add sequence based on existing createdAt order
  const projects = await db.select({ id: projects.id }).from(projects);
  
  for (const project of projects) {
    const messages = await db
      .select()
      .from(messages)
      .where(eq(messages.projectId, project.id))
      .orderBy(asc(messages.createdAt));
    
    for (let i = 0; i < messages.length; i++) {
      await db
        .update(messages)
        .set({ sequence: i + 1 })
        .where(eq(messages.id, messages[i].id));
    }
  }
}
```

### 4. Testing
1. Create rapid messages and verify order persists after refresh
2. Test concurrent message creation
3. Verify migration doesn't break existing conversations

### Complexity: LOW
- Simple integer field addition
- Straightforward counter logic
- No breaking changes to existing code
- Can be implemented incrementally

### Time Estimate: 2-3 hours
- 30 min: Schema and migration
- 1 hour: Update creation and query logic
- 30 min: Testing
- 30 min: Deploy and verify