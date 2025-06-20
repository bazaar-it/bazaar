-- Phase 0: SQL Commands to Enable Scene Iteration Tracking
-- Run these in Neon SQL Editor one by one

-- 1. First, check if the column already exists (safety check)
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'scene_iteration' 
AND column_name = 'message_id';

-- 2. Add message_id column to scene_iteration table
-- This is NON-DESTRUCTIVE - only adds a new column
ALTER TABLE "scene_iteration" 
ADD COLUMN IF NOT EXISTS "message_id" UUID REFERENCES "message"("id") ON DELETE SET NULL;

-- 3. Create index for faster lookups
-- This is NON-DESTRUCTIVE - only adds an index
CREATE INDEX IF NOT EXISTS "scene_iteration_message_idx" 
ON "scene_iteration"("message_id");

-- 4. Verify the column was added successfully
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'scene_iteration'
ORDER BY ordinal_position;

-- 5. Check if we have any existing iterations (we expect 0)
SELECT COUNT(*) as iteration_count FROM "scene_iteration";

-- 6. Optional: See the full table structure
\d "scene_iteration"

-- NOTES:
-- - These commands are SAFE and NON-DESTRUCTIVE
-- - They only ADD a new column, no data is modified or deleted
-- - The foreign key uses ON DELETE SET NULL for safety
-- - All commands use IF NOT EXISTS to prevent errors if run multiple times