-- HOTFIX: Fix column name mismatch in production asset table
-- The migration used wrong column names. This fixes them to match dev database and code.

-- 1. Rename storage_url to url (what the code expects)
ALTER TABLE "bazaar-vid_asset" 
RENAME COLUMN "storage_url" TO "url";

-- 2. Rename file_name to original_name (what the code expects)
ALTER TABLE "bazaar-vid_asset" 
RENAME COLUMN "file_name" TO "original_name";

-- 3. Rename file_type to type (what the code expects)  
ALTER TABLE "bazaar-vid_asset"
RENAME COLUMN "file_type" TO "type";

-- 4. Drop unused columns (not used in code)
ALTER TABLE "bazaar-vid_asset"
DROP COLUMN IF EXISTS "storage_key",
DROP COLUMN IF EXISTS "metadata";

-- 5. Add missing columns that exist in dev but not in the migration
ALTER TABLE "bazaar-vid_asset"
ADD COLUMN IF NOT EXISTS "custom_name" text,
ADD COLUMN IF NOT EXISTS "mime_type" text,
ADD COLUMN IF NOT EXISTS "hash" text,
ADD COLUMN IF NOT EXISTS "usage_count" integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS "last_used_at" timestamp with time zone,
ADD COLUMN IF NOT EXISTS "tags" text[];

-- 6. Fix file_size column type (should be bigint not integer)
ALTER TABLE "bazaar-vid_asset"
ALTER COLUMN "file_size" TYPE bigint;

-- 7. Fix duration column type (should be integer not real)
ALTER TABLE "bazaar-vid_asset"
ALTER COLUMN "duration" TYPE integer USING duration::integer;

-- 8. Add NOT NULL constraint to usage_count
UPDATE "bazaar-vid_asset" SET "usage_count" = 0 WHERE "usage_count" IS NULL;
ALTER TABLE "bazaar-vid_asset"
ALTER COLUMN "usage_count" SET NOT NULL;

-- 9. Add missing indexes
CREATE INDEX IF NOT EXISTS "bazaar-vid_asset_type_idx" ON "bazaar-vid_asset" ("type");
CREATE INDEX IF NOT EXISTS "bazaar-vid_asset_custom_name_idx" ON "bazaar-vid_asset" ("custom_name");
CREATE INDEX IF NOT EXISTS "bazaar-vid_asset_url_idx" ON "bazaar-vid_asset" ("url");

-- Verify the fix
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'bazaar-vid_asset'
ORDER BY ordinal_position;