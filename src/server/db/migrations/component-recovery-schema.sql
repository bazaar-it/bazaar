-- src/server/db/migrations/component-recovery-schema.sql
-- Migration for Component Recovery System

-- Add new columns to track component fix operations
ALTER TABLE "custom_component_jobs"
ADD COLUMN IF NOT EXISTS "original_tsx_code" TEXT,
ADD COLUMN IF NOT EXISTS "last_fix_attempt" TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS "fix_issues" TEXT;

-- Add index on status for efficient querying of fixable components
CREATE INDEX IF NOT EXISTS custom_component_jobs_status_idx ON "custom_component_jobs" (status);

-- Update existing failed components to fixable status if they have code
UPDATE "custom_component_jobs"
SET status = 'fixable'
WHERE status = 'failed' 
AND tsx_code IS NOT NULL;

COMMENT ON COLUMN "custom_component_jobs"."original_tsx_code" IS 'Original TSX code before any fixes are applied';
COMMENT ON COLUMN "custom_component_jobs"."last_fix_attempt" IS 'Timestamp of the most recent fix attempt';
COMMENT ON COLUMN "custom_component_jobs"."fix_issues" IS 'List of issues identified and fixed by the preprocessor'; 