// @ts-nocheck
// src/scripts/commands/components/verify/check-component-fix.js
/**
 * Check if a component has code but is marked as failed
 * If so, we can try to fix it through the UI
 */

import pg from 'pg';
const { Pool } = pg;

// Connection credentials
const DATABASE_URL = 'postgresql://bazaar-vid-db_owner:npg_MtB3K7XgkQqN@ep-still-salad-a4i8qp7g-pooler.us-east-1.aws.neon.tech/bazaar-vid-db?sslmode=require';

// Create connection pool
const pool = new Pool({
  connectionString: DATABASE_URL,
});

/**
 * Execute a SQL query and return the results
 */
async function query(sql, params = []) {
  try {
    const result = await pool.query(sql, params);
    return result.rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

async function main() {
  try {
    // Get component ID from command line or use default
    const componentId = process.argv[2] || '8d478778-d937-4677-af65-f613da8aee6b';
    console.log(`Looking for component with ID: ${componentId}...`);
    
    // Check if component exists and has code
    const component = await query(
      `SELECT id, effect, status, "tsxCode" IS NOT NULL as "hasCode", "errorMessage"
       FROM "bazaar-vid_custom_component_job"
       WHERE id = $1`,
      [componentId]
    );
    
    if (component.length === 0) {
      console.log(`No component with ID ${componentId} found`);
      return;
    }
    
    console.log(`Component ${component[0].id} (${component[0].effect}):`);
    console.log(`Status: ${component[0].status}`);
    console.log(`Has Code: ${component[0].hasCode ? 'Yes' : 'No'}`);
    
    if (component[0].errorMessage) {
      console.log(`Error Message: ${component[0].errorMessage}`);
    }
    
    // Fix eligibility check
    if (component[0].status === 'failed' && component[0].hasCode) {
      console.log('\n✅ This component is eligible for fix through the UI!');
    } else if (!component[0].hasCode) {
      console.log('\n❌ This component has no code to fix!');
      
      // Suggest adding minimal code to make it fixable
      console.log('\nSuggested fix: Add minimal code to make it fixable through the UI');
      console.log('Run:');
      console.log(`node src/scripts/add-minimal-code.js ${componentId}`);
    } else {
      console.log(`\nThis component is in '${component[0].status}' status and ${component[0].hasCode ? 'has' : 'does not have'} code.`);
    }
    
  } catch (error) {
    console.error('Error checking component:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
main().catch(console.error);
