-- Custom migration to add A2A columns while preserving existing columns
ALTER TABLE "bazaar-vid_custom_component_job" ADD COLUMN IF NOT EXISTS "task_id" TEXT;
ALTER TABLE "bazaar-vid_custom_component_job" ADD COLUMN IF NOT EXISTS "internal_status" VARCHAR(50);
ALTER TABLE "bazaar-vid_custom_component_job" ADD COLUMN IF NOT EXISTS "requires_input" BOOLEAN DEFAULT FALSE;
ALTER TABLE "bazaar-vid_custom_component_job" ADD COLUMN IF NOT EXISTS "input_type" TEXT;
ALTER TABLE "bazaar-vid_custom_component_job" ADD COLUMN IF NOT EXISTS "task_state" JSONB;
ALTER TABLE "bazaar-vid_custom_component_job" ADD COLUMN IF NOT EXISTS "artifacts" JSONB;
ALTER TABLE "bazaar-vid_custom_component_job" ADD COLUMN IF NOT EXISTS "history" JSONB;
ALTER TABLE "bazaar-vid_custom_component_job" ADD COLUMN IF NOT EXISTS "sse_enabled" BOOLEAN DEFAULT FALSE;

-- Create index for task_id if it doesn't exist
CREATE INDEX IF NOT EXISTS "custom_component_job_task_id_idx" ON "bazaar-vid_custom_component_job" ("task_id");
