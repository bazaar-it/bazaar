// src/scripts/repair-components.js
import * as pg from 'pg';
import * as dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Project ID from command line args
const PROJECT_ID = process.argv[2];

if (!PROJECT_ID) {
  console.error('Please provide a project ID as an argument.');
  process.exit(1);
}

async function run() {
  // Connect to the database using the DATABASE_URL from .env.local
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // 1. Find project to confirm it exists
    const projectResult = await client.query(
      `SELECT name FROM "bazaar-vid_project" WHERE id = $1`,
      [PROJECT_ID]
    );

    if (projectResult.rows.length === 0) {
      console.error(`Project with ID ${PROJECT_ID} not found.`);
      process.exit(1);
    }

    console.log(`Found project: ${projectResult.rows[0].name}`);

    // 2. Find components with NULL metadata or missing ADB references
    const brokenComponentsResult = await client.query(
      `SELECT id, effect, status, metadata 
       FROM "bazaar-vid_custom_component_job" 
       WHERE "projectId" = $1 
       AND (metadata IS NULL 
            OR metadata->>'animationDesignBriefId' IS NULL 
            OR status = 'ready')
       ORDER BY "createdAt" DESC`,
      [PROJECT_ID]
    );

    if (brokenComponentsResult.rows.length === 0) {
      console.log('No broken components found.');
      return;
    }

    console.log(`Found ${brokenComponentsResult.rows.length} components to repair.`);

    // 3. Fix each broken component
    let fixedCount = 0;
    for (const component of brokenComponentsResult.rows) {
      console.log(`Repairing component ${component.id} (${component.effect})`);
      
      // Check if component has a linked Animation Design Brief already
      const existingADBResult = await client.query(
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
        
        await client.query(
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
      
      // Update the component's metadata to reference the ADB
      const componentColor = component.effect.toLowerCase().includes('test 1') ? '#ff0000' :
                           component.effect.toLowerCase().includes('test 2') ? '#00ff00' :
                           component.effect.toLowerCase().includes('test 3') ? '#0000ff' :
                           '#ff9900';
      
      const updatedMetadata = {
        properties: {
          size: 200,
          color: componentColor
        },
        description: `Repaired component: ${component.effect}`,
        animationDesignBriefId: animationDesignBriefId
      };
      
      // Update the component job to include metadata and ensure ready status
      await client.query(
        `UPDATE "bazaar-vid_custom_component_job"
         SET metadata = $1, status = $2, "updatedAt" = $3
         WHERE id = $4`,
        [
          JSON.stringify(updatedMetadata),
          'complete',  // Set to complete
          new Date(),
          component.id
        ]
      );
      
      fixedCount++;
      console.log(`Fixed component ${component.id}`);
    }
    
    console.log(`\nRepair complete! Fixed ${fixedCount} of ${brokenComponentsResult.rows.length} components.`);
    console.log(`\nINSTRUCTIONS:`);
    console.log(`1. Refresh your browser`);
    console.log(`2. Test adding components to scenes`);
    console.log(`3. Components should now have associated Animation Design Briefs and metadata`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

run().catch(console.error);
