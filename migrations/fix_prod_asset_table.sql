-- Fix production asset table to match dev schema and code expectations
-- Run this AFTER the migration_20250812_COMPLETE_dev_to_prod.sql

-- First, drop the incorrectly created table and recreate with correct schema
DROP TABLE IF EXISTS "bazaar-vid_project_asset" CASCADE;
DROP TABLE IF EXISTS "bazaar-vid_asset" CASCADE;

-- Step 1: Create asset table with CORRECT schema (matching dev)
CREATE TABLE "public"."bazaar-vid_asset" (
    "id" text PRIMARY KEY NOT NULL,
    "user_id" varchar(255) NOT NULL,
    "url" text NOT NULL,
    "original_name" text NOT NULL,
    "custom_name" text,
    "file_size" bigint,
    "mime_type" text,
    "type" text NOT NULL DEFAULT 'image',
    "hash" text,
    "width" integer,
    "height" integer,
    "duration" integer,
    "thumbnail_url" text,
    "usage_count" integer DEFAULT 0 NOT NULL,
    "last_used_at" timestamp with time zone,
    "tags" text[],
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "bazaar-vid_asset_user_id_bazaar-vid_user_id_fk"
        FOREIGN KEY ("user_id") REFERENCES "public"."bazaar-vid_user"("id") ON DELETE CASCADE
);

-- Step 2: Create project_asset relationship table
CREATE TABLE "public"."bazaar-vid_project_asset" (
    "id" text PRIMARY KEY NOT NULL,
    "project_id" uuid NOT NULL,
    "asset_id" text NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "bazaar-vid_project_asset_project_id_bazaar-vid_project_id_fk"
        FOREIGN KEY ("project_id") REFERENCES "public"."bazaar-vid_project"("id") ON DELETE CASCADE,
    CONSTRAINT "bazaar-vid_project_asset_asset_id_bazaar-vid_asset_id_fk"
        FOREIGN KEY ("asset_id") REFERENCES "public"."bazaar-vid_asset"("id") ON DELETE CASCADE
);

-- Step 3: Create all necessary indexes
CREATE INDEX "bazaar-vid_asset_user_id_idx" ON "public"."bazaar-vid_asset" ("user_id");
CREATE INDEX "bazaar-vid_asset_type_idx" ON "public"."bazaar-vid_asset" ("type");
CREATE INDEX "bazaar-vid_asset_custom_name_idx" ON "public"."bazaar-vid_asset" ("custom_name");
CREATE INDEX "bazaar-vid_asset_url_idx" ON "public"."bazaar-vid_asset" ("url");
CREATE INDEX "bazaar-vid_asset_deleted_at_idx" ON "public"."bazaar-vid_asset" ("deleted_at");
CREATE INDEX "bazaar-vid_project_asset_project_id_idx" ON "public"."bazaar-vid_project_asset" ("project_id");
CREATE INDEX "bazaar-vid_project_asset_asset_id_idx" ON "public"."bazaar-vid_project_asset" ("asset_id");
CREATE UNIQUE INDEX "bazaar-vid_project_asset_project_id_asset_id_idx" ON "public"."bazaar-vid_project_asset" ("project_id", "asset_id");

-- Step 4: Migrate assets from project_memory if they exist
INSERT INTO "public"."bazaar-vid_asset" (
    "id", "user_id", "url", "original_name", "file_size", "type", "hash", "created_at"
)
SELECT DISTINCT
    (memory_value::json->'asset'->>'id') as id,
    (memory_value::json->'metadata'->>'uploadedBy') as user_id,
    (memory_value::json->'asset'->>'url') as url,
    COALESCE((memory_value::json->'asset'->>'originalName'), 'unknown') as original_name,
    (memory_value::json->'asset'->>'fileSize')::bigint as file_size,
    COALESCE((memory_value::json->'asset'->>'type'), 'image') as type,
    (memory_value::json->'asset'->>'hash') as hash,
    COALESCE((memory_value::json->'asset'->>'uploadedAt')::timestamp with time zone, CURRENT_TIMESTAMP) as created_at
FROM "bazaar-vid_project_memory"
WHERE memory_type = 'uploaded_asset'
  AND (memory_value::json->'asset'->>'id') IS NOT NULL
  AND (memory_value::json->'metadata'->>'uploadedBy') IS NOT NULL
  AND (memory_value::json->'asset'->>'url') IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- Step 5: Create project relationships
INSERT INTO "public"."bazaar-vid_project_asset" (
    "id", "project_id", "asset_id", "created_at"
)
SELECT
    gen_random_uuid()::text as id,
    project_id,
    (memory_value::json->'asset'->>'id') as asset_id,
    created_at
FROM "bazaar-vid_project_memory"
WHERE memory_type = 'uploaded_asset'
  AND (memory_value::json->'asset'->>'id') IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM "bazaar-vid_asset" 
    WHERE id = (memory_value::json->'asset'->>'id')
  )
ON CONFLICT DO NOTHING;

-- Verify the fix
SELECT 'Asset table columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bazaar-vid_asset' 
ORDER BY ordinal_position;