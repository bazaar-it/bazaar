-- Fix project_asset table schema mismatches

-- 1. Change project_id from uuid to text to match code expectations
ALTER TABLE "bazaar-vid_project_asset" 
ALTER COLUMN "project_id" TYPE text USING project_id::text;

-- 2. Rename created_at to added_at to match code
ALTER TABLE "bazaar-vid_project_asset"
RENAME COLUMN "created_at" TO "added_at";

-- 3. Add missing added_via column
ALTER TABLE "bazaar-vid_project_asset"
ADD COLUMN IF NOT EXISTS "added_via" text;

-- 4. Verify the changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bazaar-vid_project_asset'
ORDER BY ordinal_position;