import { sql } from "drizzle-orm";

/**
 * Migration to add A2A protocol support fields to the custom_component_job table
 * and create the agent_messages table for A2A message passing
 */
export async function up(db: any) {
  // Create agent_messages table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "bazaar-vid_agent_message" (
      id TEXT PRIMARY KEY,
      sender TEXT NOT NULL,
      recipient TEXT NOT NULL,
      type TEXT NOT NULL,
      payload JSONB NOT NULL,
      correlation_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      processed_at TIMESTAMP WITH TIME ZONE
    );

    CREATE INDEX IF NOT EXISTS "agent_message_correlation_id_idx" ON "bazaar-vid_agent_message" (correlation_id);
    CREATE INDEX IF NOT EXISTS "agent_message_type_idx" ON "bazaar-vid_agent_message" (type);
    CREATE INDEX IF NOT EXISTS "agent_message_sender_idx" ON "bazaar-vid_agent_message" (sender);
    CREATE INDEX IF NOT EXISTS "agent_message_recipient_idx" ON "bazaar-vid_agent_message" (recipient);
    CREATE INDEX IF NOT EXISTS "idx_agent_messages_task_id" ON "bazaar-vid_agent_message" ((payload->>'taskId'));
  `);

  // Add A2A fields to custom_component_job table
  await db.execute(sql`
    -- Add A2A fields to custom_component_job table
    ALTER TABLE "bazaar-vid_custom_component_job"
    ADD COLUMN IF NOT EXISTS "task_id" TEXT,
    ADD COLUMN IF NOT EXISTS "internal_status" VARCHAR(50),
    ADD COLUMN IF NOT EXISTS "requires_input" BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS "input_type" TEXT,
    ADD COLUMN IF NOT EXISTS "task_state" JSONB,
    ADD COLUMN IF NOT EXISTS "artifacts" JSONB,
    ADD COLUMN IF NOT EXISTS "history" JSONB,
    ADD COLUMN IF NOT EXISTS "sse_enabled" BOOLEAN DEFAULT false;
    
    -- Create index on task_id
    CREATE INDEX IF NOT EXISTS "custom_component_job_task_id_idx" ON "bazaar-vid_custom_component_job" (task_id);
  `);
}

export async function down(db: any) {
  // Drop columns from custom_component_job table
  await db.execute(sql`
    ALTER TABLE "bazaar-vid_custom_component_job"
    DROP COLUMN IF EXISTS "task_id",
    DROP COLUMN IF EXISTS "internal_status",
    DROP COLUMN IF EXISTS "requires_input",
    DROP COLUMN IF EXISTS "input_type",
    DROP COLUMN IF EXISTS "task_state",
    DROP COLUMN IF EXISTS "artifacts", 
    DROP COLUMN IF EXISTS "history",
    DROP COLUMN IF EXISTS "sse_enabled";
  `);
  
  // Drop agent_messages table
  await db.execute(sql`
    DROP TABLE IF EXISTS "bazaar-vid_agent_message";
  `);
} 