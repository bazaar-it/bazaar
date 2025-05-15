// src/scripts/fix-component-specific.js
const { db } = require('../dist/server/db');
const { customComponentJobs } = require('../dist/server/db/schema');
const { eq } = require('drizzle-orm');

async function fixSpecificComponent() {
  // Component ID from your test
  const componentId = '2489eaf2-68e0-49e6-a583-960ee995aed7';
  
  try {
    console.log(`Fixing component ${componentId}...`);
    
    // Replace the component TSX code with a guaranteed working version
    const workingCode = `// src/remotion/components/scenes/BouncingBall_v2.tsx
// Fixed version by Cascade

import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

/**
 * BouncingBall_v2 - Fixed component that will render properly
 */
const BouncingBall_v2 = ({ data }) => {
  const frame = useCurrentFrame();
  
  // Get color from data or use default
  const color = typeof data?.color === 'string' ? data.color : '#00ff00';
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
};

export default BouncingBall_v2;
window.__REMOTION_COMPONENT = BouncingBall_v2;
`;

    // Replace in database and rebuild
    await db.update(customComponentJobs)
      .set({
        tsxCode: workingCode,
        status: 'pending', // Reset to pending so it gets rebuilt
        updatedAt: new Date()
      })
      .where(eq(customComponentJobs.id, componentId));
      
    console.log('Component code updated successfully. Component will be rebuilt automatically.');
    
  } catch (error) {
    console.error('Error fixing component:', error);
  } finally {
    process.exit(0);
  }
}

// Run the fix function
fixSpecificComponent();
