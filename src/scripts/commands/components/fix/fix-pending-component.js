// @ts-nocheck
// src/scripts/commands/components/fix/fix-pending-component.js
/**
 * Script to fix a component that's in "pending" state without code
 * Updates the status to "failed" with useful error message
 * so it shows up in the fixable components list
 */

import pg from 'pg';
const { Pool } = pg;

// Connection credentials
const DATABASE_URL = 'postgresql://bazaar-vid-db_owner:npg_MtB3K7XgkQqN@ep-still-salad-a4i8qp7g-pooler.us-east-1.aws.neon.tech/bazaar-vid-db?sslmode=require';

// Create connection pool
const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function query(sql, params = []) {
  try {
    const result = await pool.query(sql, params);
    return result.rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

async function fixPendingComponent() {
  try {
    // Get component ID from command line or use default
    const componentId = process.argv[2] || '8d478778-d937-4677-af65-f613da8aee6b';
    console.log(`Looking for component with ID: ${componentId}...`);
    
    // Find the component
    const component = await query(
      `SELECT * FROM "bazaar-vid_custom_component_job" WHERE id = $1`,
      [componentId]
    );
    
    if (component.length === 0) {
      console.log(`No component with ID ${componentId} found`);
      return;
    }
    
    console.log('Found component:', component[0].id);
    console.log('Current status:', component[0].status);
    
    // Check if component actually has code
    if (component[0].tsxCode) {
      console.log('This component already has code - no need to fix status.');
      return;
    }
    
    // Update the component status to 'failed' so it can be fixed
    const result = await query(
      `UPDATE "bazaar-vid_custom_component_job" 
       SET status = 'failed', 
           "errorMessage" = 'Generated component has syntax errors: Component generation failed and needs to be retried', 
           "updatedAt" = NOW()
       WHERE id = $1
       RETURNING id, effect, status, "errorMessage"`,
      [componentId]
    );
    
    console.log('\nComponent updated successfully:');
    console.table(result);
    console.log('\nIt should now show the Fix button in the UI.');
    
  } catch (error) {
    console.error('Error updating component:', error);
  } finally {
    await pool.end();
  }
}

// Run the function
fixPendingComponent().catch(console.error);
