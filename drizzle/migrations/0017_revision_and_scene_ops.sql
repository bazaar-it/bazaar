-- Add revision column to projects (if not exists)
ALTER TABLE "bazaar-vid_project"
  ADD COLUMN IF NOT EXISTS "revision" bigint DEFAULT 0 NOT NULL;

-- Create scene_operation table for idempotency and auditing
CREATE TABLE IF NOT EXISTS "bazaar-vid_scene_operation" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "idempotency_key" varchar(255) NOT NULL,
  "operation_type" varchar(50) NOT NULL,
  "payload" jsonb,
  "result" jsonb,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Foreign key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scene_operation_project_fk'
  ) THEN
    ALTER TABLE "bazaar-vid_scene_operation"
      ADD CONSTRAINT "scene_operation_project_fk"
      FOREIGN KEY ("project_id") REFERENCES "bazaar-vid_project"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

-- Unique idempotency per project
CREATE UNIQUE INDEX IF NOT EXISTS "scene_operation_unique_idx"
  ON "bazaar-vid_scene_operation" ("project_id", "idempotency_key");

CREATE INDEX IF NOT EXISTS "scene_operation_project_idx"
  ON "bazaar-vid_scene_operation" ("project_id");
