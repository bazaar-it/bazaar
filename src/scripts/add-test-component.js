// src/scripts/add-test-component.js
import { db } from '../server/db';
import { customComponentJobs } from '../server/db/schema';
import { randomUUID } from 'crypto';

/**
 * Component test script
 * This script creates a test component using our new template format
 * and inserts it directly into the database for testing
 */

// Define the project ID to attach the component to
// Use your own project ID - you can get this from the URL when editing a project
const TARGET_PROJECT_ID = process.argv[2]; // Pass project ID as first argument
const COMPONENT_NAME = process.argv[3] || 'TestBounceEffect';

if (!TARGET_PROJECT_ID) {
  console.error('\n❌ ERROR: Please provide a project ID as the first argument');
  console.log('Example: node src/scripts/add-test-component.js 123e4567-e89b-12d3-a456-426614174000\n');
  process.exit(1);
}

console.log(`Creating test component "${COMPONENT_NAME}" for project ${TARGET_PROJECT_ID}...`);

// Create a test component with our new template format
const testComponent = `
// src/remotion/components/scenes/${COMPONENT_NAME}.tsx
// Component generated with Bazaar template for testing

import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

// TypeScript interfaces for props
interface ${COMPONENT_NAME}Props {
  data: Record<string, unknown>;
}

/**
 * ${COMPONENT_NAME} - Custom Remotion component for testing
 */
export const ${COMPONENT_NAME}: React.FC<${COMPONENT_NAME}Props> = ({ data }) => {
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

export default ${COMPONENT_NAME};
`;

// Insert the test component into the database
async function insertTestComponent() {
  try {
    // First check if the project exists
    const project = await db.query.projects.findFirst({
      where: function(fields, operators) {
        return operators.eq(fields.id, TARGET_PROJECT_ID);
      }
    });

    if (!project) {
      console.error(`\n❌ ERROR: Project with ID ${TARGET_PROJECT_ID} not found`);
      process.exit(1);
    }

    // Create the component
    const componentId = randomUUID();
    await db.insert(customComponentJobs).values({
      id: componentId,
      projectId: TARGET_PROJECT_ID,
      effect: `${COMPONENT_NAME} - Test Component`,
      tsxCode: testComponent,
      status: 'ready', // Set as ready so we can test adding it right away
      createdAt: new Date(),
      updatedAt: new Date(),
      retryCount: 0
    });

    console.log(`\n✅ SUCCESS! Test component created with ID: ${componentId}`);
    console.log('\nInstructions:');
    console.log('1. Go to your project editor');
    console.log('2. Look for the component named "TestBounceEffect - Test Component"');
    console.log('3. Try clicking the "Add" button to add it to your scene');
    console.log('\nIf you can add it to your scene successfully, our fix worked!\n');

  } catch (error) {
    console.error('Error creating test component:', error);
  }
}

insertTestComponent();
