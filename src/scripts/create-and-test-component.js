// src/scripts/create-and-test-component.js
import * as pg from 'pg';
import * as dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import * as path from 'path';
import * as fs from 'fs';

// Set this to true to enable debug logging
const DEBUG = false;

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Get the project ID from command arguments
const PROJECT_ID = process.argv[2];
if (!PROJECT_ID) {
  console.error("ERROR: Please provide a project ID as the first argument");
  console.error("Usage: node src/scripts/create-and-test-component.js <project_id>");
  process.exit(1);
}

// Database connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("ERROR: DATABASE_URL not found in .env.local");
  process.exit(1);
}

// Create different test component formats to see which ones work
const TEST_COMPONENTS = [
  {
    name: 'BouncingBall_v1',
    effect: 'Test 1: Standard Format with React.FC and explicit TypeScript',
    code: `
// src/remotion/components/scenes/BouncingBall_v1.tsx
// Test Component 1: Standard Format with React.FC and explicit TypeScript

import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

// TypeScript interfaces for props
interface BouncingBall_v1Props {
  data: Record<string, unknown>;
}

/**
 * BouncingBall_v1 - Custom Remotion component
 */
export const BouncingBall_v1: React.FC<BouncingBall_v1Props> = ({ data }) => {
  // These hooks are imported above - DO NOT DECLARE THEM AGAIN
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();
  
  // Get color from data or use default
  const color = typeof data.color === 'string' ? data.color : '#ff0000';
  const size = typeof data.size === 'number' ? data.size : 200;
  
  // Simple bounce animation
  const bounceProgress = interpolate(
    frame % 60,
    [0, 30, 60],
    [0, 1, 0],
    {
      extrapolateRight: 'clamp',
      extrapolateLeft: 'clamp',
    }
  );
  
  const translateY = interpolate(
    bounceProgress,
    [0, 1],
    [0, -100]
  );
  
  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      <div style={{ 
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
      }}>
        <div
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            backgroundColor: color,
            transform: \`translateY(\${translateY}px)\`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

export default BouncingBall_v1;
`
  },
  {
    name: 'BouncingBall_v2',
    effect: 'Test 2: Simplified Format with default export only',
    code: `
// src/remotion/components/scenes/BouncingBall_v2.tsx
// Test Component 2: Simplified Format with default export only

import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

/**
 * BouncingBall_v2 - Custom Remotion component with simplified export
 */
const BouncingBall_v2 = ({ data }) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();
  
  // Get color from data or use default
  const color = typeof data.color === 'string' ? data.color : '#00ff00';
  const size = typeof data.size === 'number' ? data.size : 200;
  
  // Simple bounce animation
  const bounceProgress = interpolate(
    frame % 60,
    [0, 30, 60],
    [0, 1, 0],
    {
      extrapolateRight: 'clamp',
      extrapolateLeft: 'clamp',
    }
  );
  
  const translateY = interpolate(
    bounceProgress,
    [0, 1],
    [0, -100]
  );
  
  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      <div style={{ 
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
      }}>
        <div
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            backgroundColor: color,
            transform: \`translateY(\${translateY}px)\`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

export default BouncingBall_v2;
`
  },
  {
    name: 'BouncingBall_v3',
    effect: 'Test 3: Function Component Style with Props Destructuring',
    code: `
// src/remotion/components/scenes/BouncingBall_v3.tsx
// Test Component 3: Function Component Style with Props Destructuring

import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

// Component using function declaration style
export function BouncingBall_v3(props) {
  // Destructure props inline
  const { data } = props;
  
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();
  
  // Get color from data or use default
  const color = typeof data?.color === 'string' ? data.color : '#0000ff';
  const size = typeof data?.size === 'number' ? data.size : 200;
  
  // Simple bounce animation
  const bounceProgress = interpolate(
    frame % 60,
    [0, 30, 60],
    [0, 1, 0],
    {
      extrapolateRight: 'clamp',
      extrapolateLeft: 'clamp',
    }
  );
  
  const translateY = interpolate(
    bounceProgress,
    [0, 1],
    [0, -100]
  );
  
  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      <div style={{ 
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
      }}>
        <div
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            backgroundColor: color,
            transform: \`translateY(\${translateY}px)\`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
}

export default BouncingBall_v3;
`
  }
];

async function run() {
  const client = new pg.Client({ connectionString });
  
  try {
    await client.connect();
    console.log("Connected to database");
    
    // Verify project ID is valid
    const projectResult = await client.query(
      'SELECT id, title FROM "bazaar-vid_project" WHERE id = $1',
      [PROJECT_ID]
    );
    
    if (projectResult.rows.length === 0) {
      console.error(`Project with ID ${PROJECT_ID} not found`);
      return;
    }
    
    console.log(`Found project: ${projectResult.rows[0].title}`);
    
    // Insert test components
    for (const component of TEST_COMPONENTS) {
      // Create unique IDs
      const componentId = randomUUID();
      const briefId = randomUUID();
      const sceneId = randomUUID(); // Generate a proper UUID for the scene ID
      
      if (DEBUG) console.log(`Creating component with ID ${componentId} and design brief ${briefId}`);
      
      // Step 1: Create the Component Job first
      await client.query(
        `INSERT INTO "bazaar-vid_custom_component_job" 
        (id, "projectId", effect, "tsxCode", status, "createdAt", "updatedAt", "retryCount", "metadata") 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          componentId, 
          PROJECT_ID, 
          component.effect, 
          component.code, 
          'ready', // Set as ready so it can be added immediately
          new Date(), 
          new Date(), 
          0,
          JSON.stringify({
            animationDesignBriefId: briefId, // Reference to the design brief we'll create next
            properties: {
              color: component.name.includes('_v1') ? '#ff0000' : 
                    component.name.includes('_v2') ? '#00ff00' : '#0000ff',
              size: 200
            },
            description: `Test component: ${component.effect}`
          })
        ]
      );

      if (DEBUG) console.log(`Created component job with ID: ${componentId}`);
      
      // Step 2: Then create an Animation Design Brief record with reference to the component job
      await client.query(
        `INSERT INTO "bazaar-vid_animation_design_brief" 
        (id, "projectId", "sceneId", status, "designBrief", "llmModel", "createdAt", "componentJobId") 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          briefId,                // Unique ID for the design brief 
          PROJECT_ID,             // Project ID
          sceneId,                // Using a proper UUID for sceneId
          'complete',             // Status (complete so it's ready to use)
          JSON.stringify({        // Design brief content
            sceneId: sceneId,     // Using the same proper UUID in the content
            colorPalette: {
              primary: component.name.includes('_v1') ? '#ff0000' : 
                      component.name.includes('_v2') ? '#00ff00' : '#0000ff',
              background: '#333333'
            },
            elements: [
              {
                elementId: randomUUID(), // Generate a unique ID for the element
                elementType: 'shape',
                initialLayout: {
                  width: 200,
                  height: 200
                }
              }
            ]
          }),
          'gpt-4',              // LLM model used
          new Date(),           // Created date
          componentId           // Reference to the component job we created first
        ]
      );
      
      console.log(`Created test component "${component.name}" with ID: ${componentId}`);
    }
    
    console.log("\nTEST INSTRUCTIONS:");
    console.log("1. Go to your project editor");
    console.log("2. Look for component(s) starting with 'Test'");
    console.log("3. Try clicking the 'Add' button on each to see if they can be added to your scene");
    console.log("4. Components that can be added successfully confirm our fix is working!");
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.end();
  }
}

run();
