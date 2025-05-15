// src/scripts/analyze-and-fix-components.js
/**
 * Analyzes and fixes components stuck with null tsxCode but that have
 * a prompt in their metadata.
 * 
 * Can optionally trigger regeneration of problematic components.
 * 
 * Usage:
 * - Analyze only: node src/scripts/analyze-and-fix-components.js analyze
 * - Fix specific component: node src/scripts/analyze-and-fix-components.js fix COMPONENT_ID
 * - Regenerate specific component: node src/scripts/analyze-and-fix-components.js regenerate COMPONENT_ID
 */

import pg from 'pg';
const { Pool } = pg;
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

/**
 * Analyze components with issues
 */
async function analyzeComponents() {
  try {
    console.log('Analyzing components with issues...\n');
    
    // Find components in error status with NULL tsxCode
    const errorComponents = await query(`
      SELECT 
        id, 
        effect, 
        status, 
        "errorMessage",
        metadata::text,
        "createdAt",
        "updatedAt"
      FROM "bazaar-vid_custom_component_job"
      WHERE status = 'error' AND "tsxCode" IS NULL
      ORDER BY "updatedAt" DESC
      LIMIT 20
    `);
    
    console.log(`Found ${errorComponents.length} components in error status with NULL tsxCode\n`);
    
    // Group by error message
    const errorGroups = {};
    for (const component of errorComponents) {
      const errorKey = component.errorMessage || 'Unknown error';
      if (!errorGroups[errorKey]) {
        errorGroups[errorKey] = [];
      }
      errorGroups[errorKey].push(component);
    }
    
    console.log('Error breakdown:');
    for (const [errorMsg, components] of Object.entries(errorGroups)) {
      console.log(`\n[${components.length} components] ${errorMsg}`);
      console.log('Examples:');
      for (let i = 0; i < Math.min(3, components.length); i++) {
        const comp = components[i];
        console.log(`  - ${comp.id.slice(0, 8)}... (${comp.effect})`);
      }
    }
    
    // Find components in pending status with NULL tsxCode
    const pendingComponents = await query(`
      SELECT 
        id, 
        effect, 
        status, 
        metadata::text,
        "createdAt",
        "updatedAt"
      FROM "bazaar-vid_custom_component_job"
      WHERE status = 'pending' AND "tsxCode" IS NULL
      ORDER BY "updatedAt" DESC
    `);
    
    console.log(`\nFound ${pendingComponents.length} components in pending status with NULL tsxCode`);
    if (pendingComponents.length > 0) {
      console.log('\nPending components:');
      for (const comp of pendingComponents.slice(0, 10)) {
        console.log(`  - ${comp.id} (${comp.effect}), created ${new Date(comp.createdAt).toLocaleString()}`);
      }
    }
    
    console.log('\nTo fix a specific component, run:');
    console.log('  node src/scripts/analyze-and-fix-components.js fix COMPONENT_ID');
    console.log('\nTo regenerate a component, run:');
    console.log('  node src/scripts/analyze-and-fix-components.js regenerate COMPONENT_ID');
    
  } catch (error) {
    console.error('Error analyzing components:', error);
  } finally {
    await pool.end();
  }
}

/**
 * Fix a specific component by marking it as failed and providing a clear error message
 */
async function fixComponent(componentId) {
  try {
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
    
    // Update the component status to 'failed' with descriptive error message
    const result = await query(
      `UPDATE "bazaar-vid_custom_component_job" 
       SET status = 'failed', 
           "errorMessage" = 'Component generation failed and needs to be regenerated via Fix button', 
           "updatedAt" = NOW()
       WHERE id = $1
       RETURNING id, effect, status, "errorMessage"`,
      [componentId]
    );
    
    console.log('\nComponent updated successfully:');
    console.table(result);
    console.log('\nIt should now show the Fix button in the UI.');
    
  } catch (error) {
    console.error('Error fixing component:', error);
  } finally {
    await pool.end();
  }
}

/**
 * Main function - determine which action to take
 */
async function main() {
  const action = process.argv[2];
  const componentId = process.argv[3];
  
  if (!action) {
    console.log('Please provide an action: analyze, fix, or regenerate');
    console.log('Usage:');
    console.log('  node analyze-and-fix-components.js analyze');
    console.log('  node analyze-and-fix-components.js fix COMPONENT_ID');
    console.log('  node analyze-and-fix-components.js regenerate COMPONENT_ID');
    process.exit(1);
  }
  
  if (action === 'analyze') {
    await analyzeComponents();
  } else if (action === 'fix' && componentId) {
    await fixComponent(componentId);
  } else if (action === 'regenerate' && componentId) {
    console.log('Regeneration not implemented yet - use the Fix button in the UI.');
    console.log('Or run:');
    console.log('  node src/scripts/fix-pending-component.js COMPONENT_ID');
  } else {
    console.log('Invalid action or missing component ID');
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
