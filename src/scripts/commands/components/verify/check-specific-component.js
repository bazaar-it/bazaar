// src/scripts/check-specific-component.js
import pg from 'pg';
import * as dotenv from 'dotenv';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

// Set up __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

// Component ID to check - from command line args or use a default
const componentId = process.argv[2];

if (!componentId) {
  console.error('Please provide a component ID as argument');
  process.exit(1);
}

async function run() {
  const { Pool } = pg;
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log(`Examining component: ${componentId}`);
    
    // 1. Get the component details
    const componentResult = await pool.query(
      `SELECT id, effect, status, metadata, "projectId", "tsxCode" 
       FROM "bazaar-vid_custom_component_job" 
       WHERE id = $1`,
      [componentId]
    );

    if (componentResult.rows.length === 0) {
      console.error(`Component with ID ${componentId} not found.`);
      return;
    }

    const component = componentResult.rows[0];
    
    console.log('\nCOMPONENT DETAILS:');
    console.log('-----------------');
    console.log(`ID: ${component.id}`);
    console.log(`Effect: ${component.effect}`);
    console.log(`Status: ${component.status}`);
    console.log(`Project ID: ${component.projectId}`);
    console.log(`Metadata: ${JSON.stringify(component.metadata, null, 2)}`);
    
    // Log TSX code snippet if available
    if (component.tsxCode) {
      console.log(`\nTSX Code snippet (first 200 chars):`);
      console.log(`${component.tsxCode.substring(0, 200)}...`);
    } else {
      console.log(`\nNo TSX code found!`);
    }

    // Check if metadata exists and has animationDesignBriefId
    if (!component.metadata) {
      console.log('\n⚠️ ISSUE FOUND: Component has NULL metadata');
      return;
    } 
    
    if (!component.metadata.animationDesignBriefId) {
      console.log('\n⚠️ ISSUE FOUND: Component metadata is missing animationDesignBriefId');
      return;
    }
    
    const adbId = component.metadata.animationDesignBriefId;
    console.log(`\nAnimation Design Brief ID: ${adbId}`);
    
    // 2. Check if Animation Design Brief exists
    const adbResult = await pool.query(
      `SELECT id, "sceneId", status, "designBrief", "componentJobId", "projectId"
       FROM "bazaar-vid_animation_design_brief" 
       WHERE id = $1`,
      [adbId]
    );
    
    if (adbResult.rows.length === 0) {
      console.log(`\n⚠️ ISSUE FOUND: Animation Design Brief with ID ${adbId} not found in database`);
      return;
    }
    
    const adb = adbResult.rows[0];
    console.log('\nANIMATION DESIGN BRIEF DETAILS:');
    console.log('------------------------------');
    console.log(`ID: ${adb.id}`);
    console.log(`Scene ID: ${adb.sceneId}`);
    console.log(`Status: ${adb.status}`);
    console.log(`Component Job ID: ${adb.componentJobId}`);
    console.log(`Project ID: ${adb.projectId}`);
    
    // Log design brief snippet if available
    if (adb.designBrief) {
      console.log(`\nDesign Brief snippet (first 200 chars):`);
      try {
        const briefStr = typeof adb.designBrief === 'string' 
          ? adb.designBrief 
          : JSON.stringify(adb.designBrief);
        console.log(`${briefStr.substring(0, 200)}...`);
      } catch (e) {
        console.log(`Error parsing design brief: ${e.message}`);
      }
    } else {
      console.log(`\nNo design brief found!`);
    }
    
    // Check if the ADB references back to this component
    if (adb.componentJobId !== component.id) {
      console.log(`\n⚠️ ISSUE FOUND: Animation Design Brief points to different component: ${adb.componentJobId || 'NULL'}`);
    }
    
    // Check if project IDs match
    if (adb.projectId !== component.projectId) {
      console.log(`\n⚠️ ISSUE FOUND: Project IDs don't match! Component: ${component.projectId}, ADB: ${adb.projectId}`);
    }
    
    console.log('\nAPI DEBUGGING INSTRUCTIONS:');
    console.log('-------------------------');
    console.log(`1. When adding this component, the following API calls should be made:`);
    console.log(`   - GET /api/components/${componentId}/metadata`);
    console.log(`   - GET /api/animation-design-briefs/${adbId}`);
    console.log(`2. Check browser console to see if these calls succeed or fail`);
    console.log(`3. Look for status codes and response data for both calls`);
    
    console.log('\nHOW TO USE THESE FINDINGS:');
    console.log('-------------------------');
    console.log('- If component status is not "complete" or "ready", that\'s likely the issue');
    console.log('- If metadata is missing animation design brief ID, that needs to be fixed');
    console.log('- If animation design brief exists but componentJobId doesn\'t match, that\'s a reference issue');
    console.log('- If project IDs don\'t match, that could cause permission/visibility issues');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

run().catch(console.error);
