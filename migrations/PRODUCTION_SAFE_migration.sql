-- PRODUCTION SAFE MIGRATION
-- Date: 2025-08-12
-- Purpose: Add isFavorite column to projects table
-- 
-- This is the MINIMAL migration needed for the favorites feature to work
-- Run this AFTER deploying the code changes to production

-- ============================================
-- CRITICAL: BACKUP DATABASE BEFORE RUNNING!
-- ============================================

-- Add isFavorite column to projects (this is what you need for favorites to work)
ALTER TABLE "bazaar-vid_project" 
ADD COLUMN IF NOT EXISTS "isFavorite" BOOLEAN NOT NULL DEFAULT false;

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Run this after the migration to verify:
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'bazaar-vid_project' AND column_name = 'isFavorite';

-- ============================================
-- ROLLBACK (if needed)
-- ============================================
-- To rollback this change:
-- ALTER TABLE "bazaar-vid_project" DROP COLUMN IF EXISTS "isFavorite";