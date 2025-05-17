//memory-bank/a2a/database-schema.md

# A2A System Database Schema

This document details the database schema extensions required for implementing the Agent-to-Agent (A2A) system in Bazaar-Vid, aligned with Google's A2A protocol.

## Overview

The A2A system requires one new table in the database to track agent messages and their status. It also enhances the existing `customComponentJobs` table with additional fields to support the A2A protocol's standardized task states and artifact storage.

## New Table: `agent_messages`

This table stores all messages exchanged between agents, providing a complete audit trail of the component generation process.

```typescript
// src/server/db/schema.ts (addition)
export const agentMessages = pgTable('agent_messages', {
  id: text('id').primaryKey(),
  sender: text('sender').notNull(),
  recipient: text('recipient').notNull(),
  type: text('type').notNull(),
  payload: jsonb('payload').notNull(), // Contains Message parts, etc.
  correlationId: text('correlation_id'),
  status: text('status').default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  processedAt: timestamp('processed_at'),
});
```

### Table Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | `text` | Primary key, unique identifier for the message |
| `sender` | `text` | Name of the sending agent |
| `recipient` | `text` | Name of the recipient agent |
| `type` | `text` | Message type (e.g., 'BUILD_COMPONENT_REQUEST') |
| `payload` | `jsonb` | JSON payload containing message data, structured according to A2A Message type |
| `correlationId` | `text` | Optional ID linking related messages |
| `status` | `text` | Message status ('pending', 'processed', 'failed') |
| `createdAt` | `timestamp` | When the message was created |
| `processedAt` | `timestamp` | When the message was processed |

### Indexes

```typescript
export const agentMessagesIndexes = {
  byComponentJob: index('idx_agent_messages_component_job')
    .on(agentMessages)
    .expression(sql`((payload->>'componentJobId'))`),
  byCorrelationId: index('idx_agent_messages_correlation_id')
    .on(agentMessages)
    .column('correlation_id'),
  byType: index('idx_agent_messages_type')
    .on(agentMessages)
    .column('type'),
};
```

## Enhancements to `customComponentJobs` Table

The existing table needs modifications to support A2A protocol task states and artifact storage.

### A2A Task States

Following the A2A protocol, the `status` field in the `customComponentJobs` table supports these standard values:

| Status | Description |
|--------|-------------|
| `submitted` | Task received, not yet started (previously "pending") |
| `working` | Task is actively being processed (combines "generating", "building", "fixing") |
| `input-required` | Task requires user input to proceed (for interactive fixes) |
| `completed` | Task finished successfully (previously "complete" or "success") |
| `canceled` | Task was canceled by the user |
| `failed` | Task failed due to errors (combines "failed", "fix_failed", "r2_failed") |
| `unknown` | Task state cannot be determined |

### Additional Fields for A2A Compliance

```typescript
// Enhancements to customComponentJobs table
export const customComponentJobs = createTable(
  "custom_component_job",
  (d) => ({
    // Existing fields
    id: d.uuid().primaryKey().defaultRandom(),
    projectId: d.uuid().notNull().references(() => projects.id, { onDelete: "cascade" }),
    effect: d.text().notNull(),
    componentCode: d.text(), // Generated TSX code
    
    // Standard A2A task state (replaces simple status)
    status: d.varchar({ length: 50 }).default("submitted").notNull(),
    
    // A2A task state details
    taskState: d.jsonb('task_state'), // Stores current TaskStatus object with state, message, timestamp
    
    // A2A structured outputs
    artifacts: d.jsonb('artifacts'), // Stores output artifacts (compiled component, etc.)
    history: d.jsonb('history'),     // Stores message history if requested
    
    // Existing fields
    outputUrl: d.text(), // URL to the compiled JS (available in artifacts too)
    errorMessage: d.text(), // Error message (available in taskState too)
    
    // Additional tracking fields
    syntaxValidation: d.jsonb('syntax_validation'),
    r2Verified: d.boolean('r2_verified').default(false),
    attempts: d.integer('attempts').default(0),
    metadata: d.jsonb('metadata'),
    
    // Timestamps
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .$onUpdate(() => new Date()),
  }),
  (t) => [
    index("custom_component_job_project_idx").on(t.projectId),
    index("custom_component_job_status_idx").on(t.status),
  ],
);
```

## Migration Script

Create a migration to add the necessary table and fields:

```typescript
// src/server/db/migrations/YYYYMMDDHHMMSS_add_a2a_protocol_schema.ts
import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp, jsonb, boolean, integer } from 'drizzle-orm/pg-core';

export async function up(db) {
  // Create agent_messages table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS agent_messages (
      id TEXT PRIMARY KEY,
      sender TEXT NOT NULL,
      recipient TEXT NOT NULL,
      type TEXT NOT NULL,
      payload JSONB NOT NULL,
      correlation_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      processed_at TIMESTAMP
    );

    CREATE INDEX idx_agent_messages_component_job ON agent_messages USING GIN ((payload->>'componentJobId'));
    CREATE INDEX idx_agent_messages_correlation_id ON agent_messages (correlation_id);
    CREATE INDEX idx_agent_messages_type ON agent_messages (type);
  `);
  
  // Add A2A fields to customComponentJobs
  await db.execute(sql`
    -- Convert existing statuses to A2A protocol states
    UPDATE "bazaar-vid_custom_component_job"
    SET status = CASE
      WHEN status = 'pending' THEN 'submitted'
      WHEN status IN ('generating', 'building', 'fixing') THEN 'working'
      WHEN status = 'fixable' THEN 'input-required'
      WHEN status IN ('success', 'complete') THEN 'completed'
      WHEN status IN ('failed', 'fix_failed', 'r2_failed') THEN 'failed'
      ELSE 'unknown'
    END;
    
    -- Add A2A-specific fields
    ALTER TABLE "bazaar-vid_custom_component_job" 
    ADD COLUMN IF NOT EXISTS task_state JSONB,
    ADD COLUMN IF NOT EXISTS artifacts JSONB,
    ADD COLUMN IF NOT EXISTS history JSONB,
    ADD COLUMN IF NOT EXISTS syntax_validation JSONB,
    ADD COLUMN IF NOT EXISTS r2_verified BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS metadata JSONB;
  `);
}

export async function down(db) {
  await db.execute(sql`DROP TABLE IF EXISTS agent_messages;`);
  
  // Revert A2A changes to customComponentJobs
  await db.execute(sql`
    -- Convert back to original status values 
    UPDATE "bazaar-vid_custom_component_job"
    SET status = CASE
      WHEN status = 'submitted' THEN 'pending'
      WHEN status = 'working' THEN 'building'
      WHEN status = 'input-required' THEN 'fixable'
      WHEN status = 'completed' THEN 'complete'
      WHEN status = 'failed' THEN 'failed'
      ELSE 'pending'
    END;
    
    ALTER TABLE "bazaar-vid_custom_component_job" 
    DROP COLUMN IF EXISTS task_state,
    DROP COLUMN IF EXISTS artifacts,
    DROP COLUMN IF EXISTS history,
    DROP COLUMN IF EXISTS syntax_validation,
    DROP COLUMN IF EXISTS r2_verified,
    DROP COLUMN IF EXISTS attempts,
    DROP COLUMN IF EXISTS metadata;
  `);
}
```

### Handling Conflicts with Existing Columns

In some scenarios, particularly when evolving schemas that DrizzleKit didn't initially create or manage perfectly, running `drizzle-kit push` or `drizzle-kit migrate` might propose dropping existing columns that are still in use. This can happen if the local Drizzle schema definition diverges from the actual database structure in a way that Drizzle interprets as needing to remove columns to match the local definition.

**Problem Example:**
If `drizzle-kit push` attempts to:
- ADD new A2A-related columns (e.g., `task_id`, `internal_status`).
- DELETE existing, necessary columns (e.g., `originalTsxCode`, `lastFixAttempt`, `fixIssues`).

**Safe Resolution Strategy: Direct SQL Execution Script**

To avoid accidental data loss in such situations, a safer approach is to bypass Drizzle's automatic push/migration for the conflicting changes and apply the necessary additions (like new columns) directly via a SQL script.

We encountered this exact issue and resolved it using a Node.js script (e.g., `src/scripts/add-a2a-columns.js`) that:
1. Connects directly to the database (e.g., Neon).
2. Executes `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...` statements for each required new column.
3. This ensures that new columns are added without affecting existing ones.

**Example Script Snippet (`src/scripts/add-a2a-columns.js`):**
```javascript
// Simplified example
import postgres from 'postgres';

async function addColumns() {
  const sql = postgres(process.env.DATABASE_URL); // Ensure DATABASE_URL is set

  try {
    await sql`ALTER TABLE "bazaar-vid_custom_component_job" ADD COLUMN IF NOT EXISTS "task_id" TEXT;`;
    await sql`ALTER TABLE "bazaar-vid_custom_component_job" ADD COLUMN IF NOT EXISTS "internal_status" VARCHAR(50);`;
    // ... add other A2A columns similarly ...
    console.log("Successfully added A2A columns to the table!");
  } catch (error) {
    console.error("Error adding columns:", error);
  } finally {
    await sql.end();
  }
}

addColumns();
```

After running such a script, the database schema will be updated with the new columns. It's then crucial to ensure your local Drizzle schema definition (`src/server/db/schema.ts`) accurately reflects the *complete* state of the table in the database, including both the old and newly added columns, to prevent Drizzle from trying to remove columns in subsequent operations.

## A2A Protocol-Specific Queries

### Get Task with History and Artifacts

```typescript
export async function getTaskWithDetails(componentJobId: string, historyLength = 0) {
  const component = await db.query.customComponentJobs.findFirst({
    where: eq(customComponentJobs.id, componentJobId)
  });
  
  if (!component) {
    throw new Error("Task not found");
  }
  
  // A2A-compliant task response
  return {
    id: component.id,
    sessionId: null, // Optional in A2A
    status: {
      state: component.status,
      message: component.taskState?.message || null,
      timestamp: component.updatedAt?.toISOString() || component.createdAt.toISOString()
    },
    artifacts: component.artifacts || [],
    history: historyLength > 0 ? (component.history || []).slice(-historyLength) : null,
    metadata: component.metadata || null
  };
}
```

### Get Message History for a Component

```typescript
import { eq, desc } from 'drizzle-orm';
import { agentMessages } from '~/server/db/schema';

export async function getMessageHistoryForComponent(componentJobId: string) {
  return db.select()
    .from(agentMessages)
    .where(sql`${agentMessages.payload}->>'componentJobId' = ${componentJobId}`)
    .orderBy(desc(agentMessages.createdAt));
}
```

### Update Task Status with A2A State

```typescript
export async function updateTaskStatus(
  componentJobId: string, 
  state: "submitted" | "working" | "input-required" | "completed" | "canceled" | "failed" | "unknown",
  message?: { role: string; parts: any[] } // A2A Message format
) {
  const taskStatus = {
    state,
    message: message || null,
    timestamp: new Date().toISOString()
  };
  
  return db.update(customComponentJobs)
    .set({ 
      status: state,
      taskState: taskStatus,
      updatedAt: new Date()
    })
    .where(eq(customComponentJobs.id, componentJobId));
}
```

### Add Artifact to Task

```typescript
export async function addTaskArtifact(
  componentJobId: string,
  artifact: {
    name?: string | null;
    description?: string | null;
    parts: any[]; // A2A Part[] format
    index: number;
  }
) {
  const component = await db.query.customComponentJobs.findFirst({
    where: eq(customComponentJobs.id, componentJobId)
  });
  
  if (!component) {
    throw new Error("Task not found");
  }
  
  const artifacts = component.artifacts ? [...component.artifacts, artifact] : [artifact];
  
  return db.update(customComponentJobs)
    .set({ 
      artifacts,
      updatedAt: new Date()
    })
    .where(eq(customComponentJobs.id, componentJobId));
}
```

## Relationship Diagram

```
┌─────────────────────┐          ┌─────────────────────┐
│ customComponentJobs │          │   agent_messages    │
├─────────────────────┤          ├─────────────────────┤
│ id                  │◄─────────┤ payload.componentJobId
│ projectId           │          │ id                  │
│ effect              │          │ sender              │
│ status (A2A state)  │          │ recipient           │
│ componentCode       │          │ type                │
│ taskState           │          │ payload             │
│ artifacts           │          │ correlationId       │
│ history             │          │ status              │
│ outputUrl           │          │ createdAt           │
│ errorMessage        │          │ processedAt         │
│ syntaxValidation    │          │                     │
│ r2Verified          │          │                     │
│ attempts            │          │                     │
│ metadata            │          │                     │
└─────────────────────┘          └─────────────────────┘
```

This schema provides a solid foundation for implementing the Agent-to-Agent system with Google A2A protocol compatibility while maintaining compatibility with the existing Bazaar-Vid database structure.
