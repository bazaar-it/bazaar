/**
 * Migration to add metadata column to components table
 * @module commands/db/migrate/20240516-add-component-metadata
 */

import { getDb } from '../../../lib/db/utils';
import { logger } from '../../../lib/logger';

/**
 * Run the migration
 * @returns {Promise<void>}
 */
export async function run() {
  const db = await getDb();
  
  try {
    logger.info('Starting migration: add component metadata');
    
    // Check if the column already exists
    const { rows } = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'custom_component_jobs' 
      AND column_name = 'metadata';
    `);
    
    if (rows.length > 0) {
      logger.info('Metadata column already exists, skipping migration');
      return;
    }
    
    // Add the metadata column
    await db.query(`
      ALTER TABLE custom_component_jobs 
      ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
    `);
    
    logger.success('Successfully added metadata column to components table');
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  }
}

// If this file is run directly, execute the migration
if (import.meta.url.endsWith(process.argv[1])) {
  run().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}
