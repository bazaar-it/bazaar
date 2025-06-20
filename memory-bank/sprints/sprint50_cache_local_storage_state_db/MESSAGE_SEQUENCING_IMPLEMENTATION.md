# Message Sequencing Implementation Plan

## Step 1: Database Schema Update

### Update `src/server/db/schema.ts`

Add sequence field to messages table (around line 143):

```typescript
export const messages = createTable(
  "message",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    projectId: d
      .uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    content: d.text().notNull(),
    role: d.varchar({ length: 50 }).notNull(), // 'user' or 'assistant'
    kind: d.varchar({ length: 50 }).default("message").notNull(),
    status: d.varchar({ length: 50 }),
    imageUrls: d.jsonb("image_urls").$type<string[]>(),
    sequence: d.integer().notNull().default(0), // 🚨 NEW: Message sequence number
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .$onUpdate(() => new Date()),
    originalTsxCode: d.text(),
    lastFixAttempt: d.timestamp({ withTimezone: true }),
    fixIssues: d.text(),
  }),
  (t) => [
    index("message_project_idx").on(t.projectId),
    index("message_status_idx").on(t.status),
    index("message_project_sequence_idx").on(t.projectId, t.sequence), // 🚨 NEW: Composite index
  ],
);
```

## Step 2: Create Migration

Run after updating schema:
```bash
npm run db:generate
npm run db:migrate
```

## Step 3: Update Message Creation

### A. Update `src/server/api/routers/generation.universal.ts`

Around line 357, add sequence logic before creating messages:

```typescript
// 3. Get chat history AND next sequence number
const [recentMessages, lastMessage] = await Promise.all([
  db.query.messages.findMany({
    where: eq(messages.projectId, projectId),
    orderBy: [desc(messages.sequence), desc(messages.createdAt)], // Order by sequence first
    limit: 10,
  }),
  db.query.messages.findFirst({
    where: eq(messages.projectId, projectId),
    orderBy: [desc(messages.sequence)],
    columns: { sequence: true },
  })
]);

const nextSequence = (lastMessage?.sequence ?? 0) + 1;

const chatHistory = recentMessages.reverse().map(msg => ({
  role: msg.role,
  content: msg.content
}));

// 4. Store user message with sequence
await db.insert(messages).values({
  projectId,
  content: userMessage,
  role: "user",
  sequence: nextSequence,
  createdAt: new Date(),
  imageUrls: (userContext?.imageUrls as string[]) || [],
});
```

Around line 436, update the assistant message creation:

```typescript
// Fallback: create new message if no ID provided
const assistantSequence = nextSequence + 1; // User was nextSequence, assistant is +1
await db.insert(messages).values({
  projectId,
  content: decision.chatResponse,
  role: "assistant",
  sequence: assistantSequence,
  createdAt: new Date(),
});
```

### B. Update `src/app/api/generate-stream/route.ts`

Add sequence logic around line 40:

```typescript
// Get the next sequence number
const lastMessage = await db.query.messages.findFirst({
  where: eq(messages.projectId, projectId),
  orderBy: [desc(messages.sequence)],
  columns: { sequence: true },
});

// User message will be sequence + 1, assistant will be sequence + 2
const userSequence = (lastMessage?.sequence ?? 0) + 1;
const assistantSequence = userSequence + 1;

// Note: User message should already be created by the time SSE is called
// but if not, we'd create it here with userSequence

// 1. Create assistant message in DB with sequence
const assistantMessageId = randomUUID();
const assistantMessage = {
  id: assistantMessageId,
  projectId,
  content: "Generating code",
  role: 'assistant' as const,
  kind: 'message' as const,
  sequence: assistantSequence,
  createdAt: new Date(),
  createdBy: userId,
};

await db.insert(messages).values(assistantMessage);
```

## Step 4: Update Message Retrieval

### A. Update `src/server/api/routers/chat.ts`

Update the query around line 25:

```typescript
const messageHistory = await ctx.db.query.messages.findMany({
  where: eq(messages.projectId, input.projectId),
  orderBy: [asc(messages.sequence), asc(messages.createdAt)], // Order by sequence first
  limit: input.limit,
  columns: {
    id: true,
    projectId: true,
    content: true,
    role: true,
    kind: true,
    imageUrls: true,
    createdAt: true,
    sequence: true, // Include sequence in response
  },
});
// Remove the reverse() since we're using ASC order
return messageHistory;
```

### B. Update context builder in `src/brain/orchestrator_functions/contextBuilder.ts`

This file doesn't directly query messages, so no changes needed.

## Step 5: Update TypeScript Types

### Update generated types after migration:
```bash
npm run db:generate
```

This will automatically update `src/generated/entities.ts` with the new sequence field.

## Step 6: Data Migration for Existing Messages

Create a migration script `scripts/migrate-message-sequences.ts`:

```typescript
import { db } from "~/server/db";
import { messages } from "~/server/db/schema";
import { eq, asc } from "drizzle-orm";

async function migrateMessageSequences() {
  console.log("Starting message sequence migration...");
  
  // Get all unique project IDs
  const projects = await db
    .selectDistinct({ projectId: messages.projectId })
    .from(messages);
  
  for (const { projectId } of projects) {
    console.log(`Migrating project ${projectId}...`);
    
    // Get all messages for this project ordered by createdAt
    const projectMessages = await db.query.messages.findMany({
      where: eq(messages.projectId, projectId),
      orderBy: [asc(messages.createdAt)],
    });
    
    // Update each message with its sequence number
    for (let i = 0; i < projectMessages.length; i++) {
      await db
        .update(messages)
        .set({ sequence: i + 1 })
        .where(eq(messages.id, projectMessages[i].id));
    }
    
    console.log(`Updated ${projectMessages.length} messages for project ${projectId}`);
  }
  
  console.log("Migration complete!");
}

migrateMessageSequences().catch(console.error);
```

## Step 7: Testing

Create a test to verify message ordering:

```typescript
// In a test file or script
async function testMessageOrdering(projectId: string) {
  // Create multiple messages rapidly
  for (let i = 0; i < 5; i++) {
    await createUserMessage(projectId, `Test message ${i}`);
    await createAssistantMessage(projectId, `Response ${i}`);
  }
  
  // Fetch messages
  const messages = await db.query.messages.findMany({
    where: eq(messages.projectId, projectId),
    orderBy: [asc(messages.sequence)],
  });
  
  // Verify sequence is correct
  messages.forEach((msg, index) => {
    console.assert(msg.sequence === index + 1, `Message ${msg.id} has wrong sequence`);
  });
  
  console.log("Message ordering test passed!");
}
```

## Implementation Order

1. **First**: Update schema and run migration
2. **Second**: Run data migration script for existing messages
3. **Third**: Update message creation endpoints
4. **Fourth**: Update message retrieval endpoints
5. **Fifth**: Test thoroughly

## Rollback Plan

If issues arise:
1. Remove sequence from queries (revert to createdAt ordering)
2. Keep sequence column in database (no data loss)
3. Fix issues and re-implement

## Benefits

1. **Guaranteed Order**: Messages always appear in correct sequence
2. **No Race Conditions**: Sequence is explicit, not time-based
3. **Simple Implementation**: Just an incrementing number per project
4. **Backwards Compatible**: Old code still works with createdAt
5. **Performance**: Indexed for fast queries