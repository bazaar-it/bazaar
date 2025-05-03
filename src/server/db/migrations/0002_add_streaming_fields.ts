// src/server/db/migrations/0002_add_streaming_fields.ts
import { sql } from "drizzle-orm";
import type { ColumnBuilder } from "drizzle-orm/column-builder";

/**
 * Migration for Bazaar-Vid Sprint 7 features:  
 * - Adds streaming support fields to messages
 * - Adds metadata and status message links to component jobs
 * - Creates new component_error and metrics tables
 */
export async function up(db: any) {
  // Add new fields to message table
  await db.execute(sql`
    ALTER TABLE "bazaar-vid_message"
    ADD COLUMN IF NOT EXISTS "kind" VARCHAR(50) NOT NULL DEFAULT 'message',
    ADD COLUMN IF NOT EXISTS "status" VARCHAR(50),
    ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  `);
  
  // Create index on message status
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "bazaar-vid_message_status_idx" ON "bazaar-vid_message" ("status")`);
  
  // Add new fields to custom_component_job table
  await db.execute(sql`
    ALTER TABLE "bazaar-vid_custom_component_job"
    ADD COLUMN IF NOT EXISTS "status_message_id" UUID REFERENCES "bazaar-vid_message"("id"),
    ADD COLUMN IF NOT EXISTS "metadata" JSONB
  `);
    
  // Make tsxCode nullable (requires dropping and recreating the column)
  await db.execute(sql`
    ALTER TABLE "bazaar-vid_custom_component_job" 
    ALTER COLUMN "tsx_code" DROP NOT NULL
  `);

  // Create component_error table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "bazaar-vid_component_error" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "job_id" UUID NOT NULL REFERENCES "bazaar-vid_custom_component_job"("id") ON DELETE CASCADE,
      "error_type" VARCHAR(100) NOT NULL,
      "details" TEXT NOT NULL,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create index on component_error job_id
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "bazaar-vid_component_error_job_idx" ON "bazaar-vid_component_error" ("job_id")`);

  // Create metrics table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "bazaar-vid_metric" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "name" VARCHAR(100) NOT NULL,
      "value" REAL NOT NULL,
      "tags" JSONB,
      "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Run the backfill
  await db.execute(sql`UPDATE "bazaar-vid_message" SET "kind" = 'message' WHERE "kind" IS NULL`);
}

export async function down(db: any) {
  // Drop new tables
  await db.execute(sql`DROP TABLE IF EXISTS "bazaar-vid_component_error"`);
  await db.execute(sql`DROP TABLE IF EXISTS "bazaar-vid_metric"`);

  // Remove new columns from custom_component_job
  await db.execute(sql`
    ALTER TABLE "bazaar-vid_custom_component_job"
    DROP COLUMN IF EXISTS "status_message_id",
    DROP COLUMN IF EXISTS "metadata"
  `);
  
  // Make tsxCode required again
  await db.execute(sql`
    ALTER TABLE "bazaar-vid_custom_component_job" 
    ALTER COLUMN "tsx_code" SET NOT NULL
  `);

  // Drop index on message status
  await db.execute(sql`DROP INDEX IF EXISTS "bazaar-vid_message_status_idx"`);

  // Remove new columns from message
  await db.execute(sql`
    ALTER TABLE "bazaar-vid_message"
    DROP COLUMN IF EXISTS "kind",
    DROP COLUMN IF EXISTS "status",
    DROP COLUMN IF EXISTS "updated_at"
  `);
}
