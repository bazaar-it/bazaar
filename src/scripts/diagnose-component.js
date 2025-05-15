// src/scripts/diagnose-component.js
import pg from 'pg';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Set up __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const { Pool } = pg;

// Component ID to check - from command line args or use a default
const componentId = process.argv[2] || 'ffb2ae8c-a5cc-4a5d-a96b-f728ed65c231';

async function run() {
  // Connect to the database using the DATABASE_URL from .env.local
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log(`Diagnosing component: ${componentId}`);
    
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
    
    console.log('COMPONENT DETAILS:');
    console.log('-----------------');
    console.log(`ID: ${component.id}`);
    console.log(`Effect: ${component.effect}`);
    console.log(`Status: ${component.status}`);
    console.log(`Project ID: ${component.projectId}`);
    console.log(`Metadata: ${JSON.stringify(component.metadata, null, 2)}`);
    console.log(`TSX Code snippet: ${component.tsxCode?.substring(0, 100)}...`);
    
    // Check if metadata exists and has animationDesignBriefId
    if (!component.metadata) {
      console.log('\n⚠️ ISSUE FOUND: Component has NULL metadata');
    } else if (!component.metadata.animationDesignBriefId) {
      console.log('\n⚠️ ISSUE FOUND: Component metadata is missing animationDesignBriefId');
    } else {
      const adbId = component.metadata.animationDesignBriefId;
      console.log(`\nAnimation Design Brief ID: ${adbId}`);
      
      // 2. Check if Animation Design Brief exists
      const adbResult = await pool.query(
        `SELECT id, "sceneId", status, "designBrief", "componentJobId" 
         FROM "bazaar-vid_animation_design_brief" 
         WHERE id = $1`,
        [adbId]
      );
      
      if (adbResult.rows.length === 0) {
        console.log(`\n⚠️ ISSUE FOUND: Animation Design Brief with ID ${adbId} not found in database`);
      } else {
        const adb = adbResult.rows[0];
        console.log('\nANIMATION DESIGN BRIEF DETAILS:');
        console.log('------------------------------');
        console.log(`ID: ${adb.id}`);
        console.log(`Scene ID: ${adb.sceneId}`);
        console.log(`Status: ${adb.status}`);
        console.log(`Component Job ID: ${adb.componentJobId}`);
        console.log(`Design Brief snippet: ${JSON.stringify(adb.designBrief).substring(0, 100)}...`);
        
        // Check if the ADB references back to this component
        if (adb.componentJobId !== component.id) {
          console.log(`\n⚠️ ISSUE FOUND: Animation Design Brief points to different component: ${adb.componentJobId}`);
        } else {
          console.log('\n✅ All checks passed! This component should work correctly.');
        }
      }
    }
    
    console.log('\nROOT CAUSE DIAGNOSIS:');
    console.log('---------------------');
    if (!component.metadata) {
      console.log('This component has NULL metadata. It should be rebuilt with proper metadata.');
    } else if (!component.metadata.animationDesignBriefId) {
      console.log('This component is missing the animationDesignBriefId in its metadata. It should be rebuilt.');
    } else if (component.status !== 'complete' && component.status !== 'ready') {
      console.log(`This component has status "${component.status}" which might prevent it from being used.`);
    } else {
      const adbId = component.metadata.animationDesignBriefId;
      const adbResult = await pool.query(
        `SELECT id FROM "bazaar-vid_animation_design_brief" WHERE id = $1`,
        [adbId]
      );
      
      if (adbResult.rows.length === 0) {
        console.log('The Animation Design Brief referenced in metadata does not exist in the database.');
      } else {
        console.log('This component appears to be correctly configured. The issue might be elsewhere.');
        console.log('Check the browser console for specific API errors when adding the component.');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

run().catch(console.error);
