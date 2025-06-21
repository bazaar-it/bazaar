//src/scripts/migrate-component-recovery.ts

import { db } from "@bazaar/database";
import { sql } from 'drizzle-orm';
import logger from '~/lib/logger';

/**
 * This script applies only the specific schema changes needed for the Component Recovery System
 */
async function migrateComponentRecovery() {
  console.log('Applying Component Recovery System schema changes...');
  
  try {
    // Add new columns for component recovery system
    await db.execute(sql`
      -- Add columns to custom_component_jobs for component recovery system
      ALTER TABLE "bazaar-vid_custom_component_job"
      ADD COLUMN IF NOT EXISTS "original_tsx_code" TEXT,
      ADD COLUMN IF NOT EXISTS "last_fix_attempt" TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS "fix_issues" TEXT;
      
      -- Add index for status to efficiently query fixable components
      CREATE INDEX IF NOT EXISTS custom_component_jobs_status_idx 
      ON "bazaar-vid_custom_component_job" (status);
      
      -- Update documentation
      COMMENT ON COLUMN "bazaar-vid_custom_component_job"."original_tsx_code" 
      IS 'Original TSX code before any fixes are applied';
      
      COMMENT ON COLUMN "bazaar-vid_custom_component_job"."last_fix_attempt" 
      IS 'Timestamp of the most recent fix attempt';
      
      COMMENT ON COLUMN "bazaar-vid_custom_component_job"."fix_issues" 
      IS 'Issues identified and fixed by the preprocessor';
    `);
    
    console.log('✅ Component Recovery System schema changes applied successfully.');
    logger.info('Component Recovery System schema migration completed successfully');
    
  } catch (error) {
    console.error('❌ Error applying Component Recovery System schema changes:', error);
    logger.error('Failed to apply Component Recovery System schema changes', { error });
    process.exit(1);
  }
}

// Run the migration
migrateComponentRecovery().then(() => {
  console.log('Done!');
  process.exit(0);
}).catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
