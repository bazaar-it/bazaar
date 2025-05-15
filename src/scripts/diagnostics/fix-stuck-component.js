// src/scripts/diagnostics/fix-stuck-component.js
/**
 * Fixes the stuck APerfectlyRoundScene component by updating its status
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: resolve(__dirname, '../../../.env.local') });

// Get database connection string from .env.local
const connectionString = process.env.DATABASE_URL;

async function fixStuckComponent() {
  console.log('\n🛠️ STUCK COMPONENT FIXER\n');
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL not found in .env.local file');
    return;
  }

  const client = new pg.Client({ connectionString });
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    // Find the stuck component
    console.log('🔍 Looking for stuck component APerfectlyRoundScene...');
    const result = await client.query(`
      SELECT * FROM "bazaar-vid_custom_component_job" 
      WHERE effect = 'APerfectlyRoundScene'
      ORDER BY "createdAt" DESC 
      LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      console.log('❓ Component APerfectlyRoundScene not found');
      return;
    }
    
    const component = result.rows[0];
    console.log(`✅ Found component: ${component.id} (Status: ${component.status})`);
    
    // Update status to 'failed' so it shows the Fix button
    console.log('🔄 Updating component status from "pending" to "failed"...');
    const updateResult = await client.query(`
      UPDATE "bazaar-vid_custom_component_job"
      SET status = 'failed',
          "errorMessage" = 'Generated component has syntax errors: Cannot use import statement outside a module',
          "updatedAt" = NOW()
      WHERE id = $1
      RETURNING id, status
    `, [component.id]);
    
    console.log(`✅ Status updated successfully: ${updateResult.rows[0].status}`);
    console.log('🎯 The component should now show the Fix button in the UI.\n');
    
  } catch (error) {
    console.error('❌ Error fixing component:', error);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

// Run the script
console.log('🔧 Starting stuck component fix...');
fixStuckComponent()
  .catch(console.error)
  .finally(() => {
    console.log('\n🏁 Component fix complete!\n');
    setTimeout(() => process.exit(0), 500);
  });
