//src/server/db/migrations/20250501_create_custom_component_jobs.ts
import { sql } from "drizzle-orm";
import { 
  pgTable,
  uuid, 
  varchar, 
  text,
  timestamp,
  integer
} from "drizzle-orm/pg-core";
import { createTable } from "../schema";

// Migration to create the custom_component_jobs table
export async function up(db: any) {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "bazaar-vid_custom_component_job" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "projectId" UUID NOT NULL REFERENCES "bazaar-vid_project"("id") ON DELETE CASCADE,
      "effect" TEXT NOT NULL,
      "tsxCode" TEXT NOT NULL,
      "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
      "outputUrl" TEXT,
      "errorMessage" TEXT,
      "retryCount" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS "custom_component_job_project_idx" ON "bazaar-vid_custom_component_job"("projectId");
    CREATE INDEX IF NOT EXISTS "custom_component_job_status_idx" ON "bazaar-vid_custom_component_job"("status");
  `);
}

// Migration to drop the custom_component_jobs table
export async function down(db: any) {
  await db.execute(sql`
    DROP TABLE IF EXISTS "bazaar-vid_custom_component_job";
  `);
}
