-- Fix for production database: Rename storage_url to url in assets table
-- This fixes the mismatch between the migration and the code

-- Rename storage_url to url
ALTER TABLE "bazaar-vid_asset" 
RENAME COLUMN "storage_url" TO "url";

-- Also need to add missing columns that are in the schema but not in the migration
ALTER TABLE "bazaar-vid_asset" 
ADD COLUMN IF NOT EXISTS "original_name" text,
ADD COLUMN IF NOT EXISTS "custom_name" text,
ADD COLUMN IF NOT EXISTS "type" text,
ADD COLUMN IF NOT EXISTS "mime_type" text,
ADD COLUMN IF NOT EXISTS "usage_count" integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS "last_used_at" timestamp with time zone,
ADD COLUMN IF NOT EXISTS "tags" text[],
ADD COLUMN IF NOT EXISTS "thumbnail_url" text;

-- Update NOT NULL constraints where needed
UPDATE "bazaar-vid_asset" SET "original_name" = "file_name" WHERE "original_name" IS NULL;
UPDATE "bazaar-vid_asset" SET "type" = 
  CASE 
    WHEN "file_type" LIKE '%image%' THEN 'image'
    WHEN "file_type" LIKE '%video%' THEN 'video'
    WHEN "file_type" LIKE '%audio%' THEN 'audio'
    ELSE 'image'
  END
WHERE "type" IS NULL;

-- Now add NOT NULL constraints
ALTER TABLE "bazaar-vid_asset"
ALTER COLUMN "original_name" SET NOT NULL,
ALTER COLUMN "type" SET NOT NULL,
ALTER COLUMN "usage_count" SET NOT NULL;

-- Drop the old columns that were renamed
ALTER TABLE "bazaar-vid_asset"
DROP COLUMN IF EXISTS "file_name",
DROP COLUMN IF EXISTS "file_type",
DROP COLUMN IF EXISTS "storage_key";

-- Add missing indexes
CREATE INDEX IF NOT EXISTS "bazaar-vid_asset_type_idx" ON "bazaar-vid_asset" ("type");
CREATE INDEX IF NOT EXISTS "bazaar-vid_asset_custom_name_idx" ON "bazaar-vid_asset" ("custom_name");
CREATE INDEX IF NOT EXISTS "bazaar-vid_asset_url_idx" ON "bazaar-vid_asset" ("url");

COMMENT ON COLUMN "bazaar-vid_asset"."url" IS 'The URL to access the asset (renamed from storage_url)';
COMMENT ON COLUMN "bazaar-vid_asset"."original_name" IS 'Original filename when uploaded (renamed from file_name)';
COMMENT ON COLUMN "bazaar-vid_asset"."type" IS 'Asset type: image, video, audio, or logo';