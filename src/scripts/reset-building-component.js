// src/scripts/reset-building-component.js
/**
 * Reset a component that's stuck in "building" status
 * This allows it to be fixed again via the UI
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

async function resetBuildingComponent(componentId) {
  try {
    console.log(`Looking for component with ID: ${componentId}...`);
    
    // Get component details
    const component = await query(
      `SELECT id, effect, status, "updatedAt"
       FROM "bazaar-vid_custom_component_job"
       WHERE id = $1`,
      [componentId]
    );
    
    if (component.length === 0) {
      console.log(`No component with ID ${componentId} found`);
      return;
    }
    
    console.log(`Found component: ${component[0].id} (${component[0].effect})`);
    console.log(`Current status: ${component[0].status}`);
    console.log(`Last updated: ${new Date(component[0].updatedAt).toLocaleString()}`);
    
    // Only reset if it's in building status
    if (component[0].status !== 'building') {
      console.log(`\nComponent is not in 'building' status, no need to reset`);
      return;
    }
    
    // Calculate how long it's been stuck
    const updatedAt = new Date(component[0].updatedAt);
    const now = new Date();
    const minutesStuck = Math.floor((now - updatedAt) / (1000 * 60));
    
    console.log(`Component has been in 'building' status for ${minutesStuck} minutes`);
    
    // Update the component status
    await query(
      `UPDATE "bazaar-vid_custom_component_job"
       SET status = 'failed',
           "errorMessage" = 'Component build timed out, please try fixing again',
           "updatedAt" = NOW()
       WHERE id = $1
       RETURNING id, effect, status`,
      [componentId]
    );
    
    console.log(`\n✅ Component reset from 'building' to 'failed' status`);
    console.log(`You can now try clicking the Fix button in the UI again`);
    
  } catch (error) {
    console.error('Error resetting component:', error);
  } finally {
    await pool.end();
  }
}

// Component ID from command line or use default
const componentId = process.argv[2] || '8d478778-d937-4677-af65-f613da8aee6b';
resetBuildingComponent(componentId).catch(console.error);
