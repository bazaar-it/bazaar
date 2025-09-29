-- Add admin-only multi-scene template support
ALTER TABLE "bazaar-vid_templates"
  ADD COLUMN IF NOT EXISTS "admin_only" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "scene_count" integer DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS "total_duration" integer;

-- Backfill total_duration with existing duration for legacy templates
UPDATE "bazaar-vid_templates"
SET "total_duration" = "duration"
WHERE "total_duration" IS NULL;

-- Create template scenes table
CREATE TABLE IF NOT EXISTS "bazaar-vid_template_scene" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "template_id" uuid NOT NULL REFERENCES "bazaar-vid_templates"("id") ON DELETE CASCADE,
  "name" varchar(255) NOT NULL,
  "description" text,
  "order" integer NOT NULL,
  "duration" integer NOT NULL,
  "tsx_code" text NOT NULL,
  "js_code" text,
  "js_compiled_at" timestamp with time zone,
  "compilation_error" text,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS "template_scene_template_idx" ON "bazaar-vid_template_scene" ("template_id");
CREATE INDEX IF NOT EXISTS "template_scene_order_idx" ON "bazaar-vid_template_scene" ("template_id", "order");

CREATE INDEX IF NOT EXISTS "templates_admin_only_idx" ON "bazaar-vid_templates" ("admin_only");
