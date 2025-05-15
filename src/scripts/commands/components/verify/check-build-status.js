// src/scripts/check-build-status.js
/**
 * Check the build status of a component and why it might be stuck
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

async function checkBuildStatus(componentId) {
  try {
    console.log(`Checking build status for component: ${componentId}`);
    
    // Get component details
    const component = await query(
      `SELECT id, effect, status, "errorMessage", "tsxCode", "updatedAt"
       FROM "bazaar-vid_custom_component_job"
       WHERE id = $1`,
      [componentId]
    );
    
    if (component.length === 0) {
      console.log(`No component with ID ${componentId} found`);
      return;
    }
    
    console.log(`\nComponent: ${component[0].effect} (${component[0].id})`);
    console.log(`Status: ${component[0].status}`);
    console.log(`Last updated: ${new Date(component[0].updatedAt).toLocaleString()}`);
    
    if (component[0].errorMessage) {
      console.log(`Error message: ${component[0].errorMessage}`);
    }
    
    // Check if the build worker is processing components
    const pendingComponents = await query(
      `SELECT count(*) as count
       FROM "bazaar-vid_custom_component_job"
       WHERE status = 'building'`
    );
    
    console.log(`\nTotal components in 'building' status: ${pendingComponents[0].count}`);
    
    // Check recent job logs
    console.log('\nRecent job logs (if available):');
    const jobLogs = await query(
      `SELECT "createdAt", message, "jobId"
       FROM "bazaar-vid_job_log"
       WHERE "jobId" = $1
       ORDER BY "createdAt" DESC
       LIMIT 10`,
      [componentId]
    );
    
    if (jobLogs.length === 0) {
      console.log('No logs found for this job');
    } else {
      jobLogs.forEach(log => {
        console.log(`[${new Date(log.createdAt).toLocaleString()}] ${log.message}`);
      });
    }
    
    // Check if the component code has window.__REMOTION_COMPONENT
    if (component[0].tsxCode) {
      const hasRemotionAssignment = component[0].tsxCode.includes('window.__REMOTION_COMPONENT');
      console.log(`\nCode includes window.__REMOTION_COMPONENT: ${hasRemotionAssignment ? 'Yes' : 'No'}`);
      
      // Check for potential build issues in the code
      const potentialIssues = [];
      
      if (!hasRemotionAssignment) {
        potentialIssues.push('Missing window.__REMOTION_COMPONENT assignment');
      }
      
      if (component[0].tsxCode.includes('use client')) {
        potentialIssues.push('Contains "use client" directive which is not needed for Remotion components');
      }
      
      if (component[0].tsxCode.match(/import\s*{\s*([^}]+)\s*}\s*from\s*['"]([^'"]+)['"]/)) {
        potentialIssues.push('Contains destructured imports which may need conversion to named imports');
      }
      
      if (potentialIssues.length > 0) {
        console.log('\nPotential code issues:');
        potentialIssues.forEach(issue => console.log(`- ${issue}`));
      } else {
        console.log('\nNo obvious code issues detected');
      }
    }
    
    // Suggest a fix strategy
    console.log('\n--- Suggested action ---');
    if (component[0].status === 'building' && new Date() - new Date(component[0].updatedAt) > 5 * 60 * 1000) {
      console.log('Component appears to be stuck in building status for more than 5 minutes.');
      console.log('Recommended action: Reset status to "failed" and try fixing again:');
      console.log(`node src/scripts/reset-building-component.js ${componentId}`);
    } else if (component[0].status === 'building') {
      console.log('Component is still in building status but was updated recently.');
      console.log('Recommended action: Wait a few more minutes for the build to complete.');
    } else {
      console.log(`Component is in ${component[0].status} status.`);
      console.log('Recommended action: Check logs and error messages for more details.');
    }
    
  } catch (error) {
    console.error('Error checking build status:', error);
  } finally {
    await pool.end();
  }
}

// Component ID from command line
const componentId = process.argv[2] || '8d478778-d937-4677-af65-f613da8aee6b';
checkBuildStatus(componentId).catch(console.error);
