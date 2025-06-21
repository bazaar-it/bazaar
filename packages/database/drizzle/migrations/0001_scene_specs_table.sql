-- Migration: Add scene_specs table for MCP architecture
-- Created: 2025-01-26

CREATE TABLE IF NOT EXISTS "scene_specs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "scene_id" varchar(255) NOT NULL, -- Scene identifier from SceneSpec
  "name" varchar(255), -- Human-readable scene name
  "spec" jsonb NOT NULL, -- Complete SceneSpec JSON
  "version" varchar(10) NOT NULL DEFAULT '1.0', -- Schema version
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid REFERENCES "users"("id"),
  
  -- Ensure unique scene_id per project
  UNIQUE(project_id, scene_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "scene_specs_project_id_idx" ON "scene_specs" ("project_id");
CREATE INDEX IF NOT EXISTS "scene_specs_created_at_idx" ON "scene_specs" ("created_at");
CREATE INDEX IF NOT EXISTS "scene_specs_scene_id_idx" ON "scene_specs" ("scene_id");

-- GIN index for JSONB queries (component library usage, etc.)
CREATE INDEX IF NOT EXISTS "scene_specs_spec_gin_idx" ON "scene_specs" USING GIN ("spec");

-- Specific indexes for common JSONB queries
CREATE INDEX IF NOT EXISTS "scene_specs_components_lib_idx" ON "scene_specs" USING GIN ((spec->'components'));
CREATE INDEX IF NOT EXISTS "scene_specs_duration_idx" ON "scene_specs" ((spec->>'duration'));

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_scene_specs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER scene_specs_updated_at_trigger
  BEFORE UPDATE ON scene_specs
  FOR EACH ROW
  EXECUTE FUNCTION update_scene_specs_updated_at(); 