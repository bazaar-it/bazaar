-- Fix project_asset table to work with media uploads

-- 1. Rename created_at to added_at to match code
ALTER TABLE "bazaar-vid_project_asset"
RENAME COLUMN "created_at" TO "added_at";

-- 2. Add missing added_via column 
ALTER TABLE "bazaar-vid_project_asset"
ADD COLUMN IF NOT EXISTS "added_via" text;

-- 3. Make sure id has a default (for auto-generation)
ALTER TABLE "bazaar-vid_project_asset"
ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- Verify the changes
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'bazaar-vid_project_asset'
ORDER BY ordinal_position;