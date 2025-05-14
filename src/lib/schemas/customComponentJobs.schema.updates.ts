//src/lib/schemas/customComponentJobs.schema.updates.ts

import { z } from 'zod';

/**
 * Enhanced component status schema to support fixable components
 */
export const componentStatusSchema = z.enum([
  'pending',
  'generating',
  'failed', 
  'fixable',  // New status for components that failed but can be fixed
  'fixing',   // New status for when component is being fixed
  'complete'
]);

/**
 * Update the database schema:
 * ALTER TABLE "custom_component_jobs"
 * ADD COLUMN "originalTsxCode" TEXT,
 * ADD COLUMN "lastFixAttempt" TIMESTAMP,
 * ADD COLUMN "fixIssues" TEXT;
 */

// Schema update instructions
export const schemaUpdateInstructions = `
-- Add new columns to support component fixing
ALTER TABLE "custom_component_jobs"
ADD COLUMN IF NOT EXISTS "originalTsxCode" TEXT,
ADD COLUMN IF NOT EXISTS "lastFixAttempt" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "fixIssues" TEXT;

-- Add index on status for efficient querying
CREATE INDEX IF NOT EXISTS custom_component_jobs_status_idx ON "custom_component_jobs" (status);
`;
