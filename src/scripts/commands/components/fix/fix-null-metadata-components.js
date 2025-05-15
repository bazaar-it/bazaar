// src/scripts/fix-null-metadata-components.js
import pg from 'pg';
import * as dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

// Set up __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

// Project ID from command line args
const PROJECT_ID = process.argv[2];
const DRY_RUN = process.argv.includes('--dry-run');

if (!PROJECT_ID) {
  console.error('Please provide a project ID as an argument. Optionally add --dry-run to preview changes without executing them.');
  process.exit(1);
}

async function run() {
  // Create a connection to the database
  const { Pool } = pg;
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connected to database');

    // 1. Find project to confirm it exists
    const projectResult = await pool.query(
      `SELECT * FROM "bazaar-vid_project" WHERE id = $1`,
      [PROJECT_ID]
    );

    if (projectResult.rows.length === 0) {
      console.error(`Project with ID ${PROJECT_ID} not found.`);
      process.exit(1);
    }

    const project = projectResult.rows[0];
    console.log(`Found project: ID ${project.id}`);

    // 2. Find components with NULL metadata only
    const brokenComponentsResult = await pool.query(
      `SELECT id, effect, status
       FROM "bazaar-vid_custom_component_job" 
       WHERE "projectId" = $1 
       AND metadata IS NULL
       ORDER BY "createdAt" DESC`,
      [PROJECT_ID]
    );

    if (brokenComponentsResult.rows.length === 0) {
      console.log('No components with NULL metadata found.');
      return;
    }

    console.log(`Found ${brokenComponentsResult.rows.length} components with NULL metadata:`);
    
    for (const component of brokenComponentsResult.rows) {
      console.log(`- ${component.id}: ${component.effect} (status: ${component.status})`);
    }
    
    if (DRY_RUN) {
      console.log('\nDRY RUN: No changes will be made.');
      return;
    }
    
    console.log('\nPreparing to fix components with NULL metadata...');
    
    // 3. Fix each component with NULL metadata
    let fixedCount = 0;
    for (const component of brokenComponentsResult.rows) {
      console.log(`\nRepairing component ${component.id} (${component.effect})...`);
      
      // Check if the component already has a linked Animation Design Brief
      const existingADBResult = await pool.query(
        `SELECT id FROM "bazaar-vid_animation_design_brief" WHERE "componentJobId" = $1`,
        [component.id]
      );
      
      let animationDesignBriefId;
      
      if (existingADBResult.rows.length > 0) {
        // Use existing ADB if available
        animationDesignBriefId = existingADBResult.rows[0].id;
        console.log(`Using existing Animation Design Brief: ${animationDesignBriefId}`);
      } else {
        // Create a new Animation Design Brief
        animationDesignBriefId = randomUUID();
        const sceneId = randomUUID();
        
        await pool.query(
          `INSERT INTO "bazaar-vid_animation_design_brief" 
           (id, "projectId", "sceneId", status, "designBrief", "llmModel", "createdAt", "componentJobId") 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            animationDesignBriefId,
            PROJECT_ID,
            sceneId,
            'complete',
            JSON.stringify({
              sceneId: sceneId,
              colorPalette: {
                primary: '#ff0000',
                background: '#333333'
              },
              elements: [
                {
                  elementId: randomUUID(),
                  elementType: 'shape',
                  initialLayout: {
                    width: 200,
                    height: 200
                  }
                }
              ]
            }),
            'gpt-4',
            new Date(),
            component.id
          ]
        );
        console.log(`Created new Animation Design Brief: ${animationDesignBriefId}`);
      }
      
      // Determine color based on component effect name
      const componentColor = component.effect.toLowerCase().includes('test 1') ? '#ff0000' :
                           component.effect.toLowerCase().includes('test 2') ? '#00ff00' :
                           component.effect.toLowerCase().includes('test 3') ? '#0000ff' :
                           '#ff9900';
      
      // Create appropriate metadata for the component
      const updatedMetadata = {
        properties: {
          size: 200,
          color: componentColor
        },
        description: `Fixed metadata for: ${component.effect}`,
        animationDesignBriefId: animationDesignBriefId
      };
      
      // Update only the metadata without changing status or other fields
      await pool.query(
        `UPDATE "bazaar-vid_custom_component_job"
         SET metadata = $1, "updatedAt" = $2
         WHERE id = $3`,
        [
          JSON.stringify(updatedMetadata),
          new Date(),
          component.id
        ]
      );
      
      fixedCount++;
      console.log(`Fixed metadata for component ${component.id}`);
    }
    
    console.log(`\nRepair complete! Fixed ${fixedCount} of ${brokenComponentsResult.rows.length} components.`);
    console.log(`\nINSTRUCTIONS:`);
    console.log(`1. Refresh your browser`);
    console.log(`2. Test adding components to scenes`);
    console.log(`3. Components should now have proper metadata and Animation Design Brief associations`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

run().catch(console.error);
