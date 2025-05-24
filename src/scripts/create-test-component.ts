// @ts-nocheck
// src/scripts/create-test-component.ts

/**
 * Creates a test component in the database with correct syntax that should render properly
 * 
 * Usage:
 * npx tsx src/scripts/create-test-component.ts <project-id>
 */

import { db } from '~/server/db';
import { customComponentJobs } from '~/server/db/schema';

// Get project ID from command line args
const projectId = process.argv[2];

if (!projectId) {
  console.error('Please provide a project ID');
  console.error('Usage: npx tsx src/scripts/create-test-component.ts <project-id>');
  process.exit(1);
}

// A simple test component that should definitely work with Remotion
const WORKING_TEST_COMPONENT = `
// Guaranteed working component for Remotion
const React = window.React;
const { AbsoluteFill, useCurrentFrame, interpolate } = window.Remotion;

const BouncingBall = ({ 
  color = '#0066cc', 
  size = 100,
  message = 'Bazaar Test'
}) => {
  const frame = useCurrentFrame();
  
  // Create a bouncing animation using interpolate
  const y = interpolate(
    frame % 60,
    [0, 30, 60],
    [0, 200, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  // Create a simple fade-in animation
  const opacity = interpolate(
    frame,
    [0, 15],
    [0, 1],
    {
      extrapolateRight: 'clamp'
    }
  );
  
  return (
    <AbsoluteFill style={{ 
      backgroundColor: 'transparent',
      opacity 
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
      }}>
        <div style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          transform: \`translateY(\${y}px)\`,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <span style={{ 
            color: 'white', 
            fontWeight: 'bold',
            fontSize: size / 8
          }}>
            {message}
          </span>
        </div>
        
        <div style={{
          marginTop: 40,
          padding: '10px 20px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          borderRadius: 4,
          fontFamily: 'Arial, sans-serif',
          transform: \`translateY(\${y/2}px)\`,
        }}>
          This component works correctly!
        </div>
      </div>
    </AbsoluteFill>
  );
};

// IMPORTANT: This assignment is required for Remotion to find the component
window.__REMOTION_COMPONENT = BouncingBall;
`;

async function createTestComponent() {
  try {
    console.log(`Creating test component for project: ${projectId}`);
    
    // Insert the component into the database
    const [newComponent] = await db.insert(customComponentJobs)
      .values({
        projectId: projectId,
        effect: 'Guaranteed Working Component',
        tsxCode: WORKING_TEST_COMPONENT,
        status: 'pending', // Start as pending to trigger build
        metadata: JSON.stringify({
          description: 'A test component that should definitely work with Remotion',
          properties: {
            color: '#0066cc',
            size: 100, 
            message: 'Bazaar Test'
          }
        })
      })
      .returning();
    
    if (!newComponent) {
      console.error('Failed to create test component');
      process.exit(1);
    }
    
    console.log('✅ Test component created successfully!');
    console.log(`Component ID: ${newComponent.id}`);
    console.log(`Status: ${newComponent.status}`);
    console.log('\nThe component will be built automatically by the worker process.');
    console.log('You should see it available in the Custom Components panel shortly.');
    console.log('It will be marked as "Ready" and you should be able to add it to your video.');
    
  } catch (error) {
    console.error('Error creating test component:', error);
    process.exit(1);
  }
}

createTestComponent(); 