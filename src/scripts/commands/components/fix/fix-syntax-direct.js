// src/scripts/fix-syntax-direct.js

/**
 * DIRECT FIX SCRIPT - No dependencies
 * This script directly posts to your API to fix the component
 */

async function fixBrokenComponents() {
  const componentsToFix = [
    '2489eaf2-68e0-49e6-a583-960ee995aed7'
  ];

  console.log('🛠️ DIRECT FIX SCRIPT 🛠️');
  console.log(`Will fix ${componentsToFix.length} components`);
  
  for (const id of componentsToFix) {
    try {
      console.log(`\nFixing component ${id}`);
      
      // Create working component code that's guaranteed to render
      const fixedCode = `// Fixed by direct script
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

const FixedComponent = ({ data }) => {
  const frame = useCurrentFrame();
  
  // Get props from data or use defaults
  const color = data?.color || '#00ff00';
  const size = data?.size || 200;
  
  // Animation logic
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

export default FixedComponent;
window.__REMOTION_COMPONENT = FixedComponent;
`;

      // Send API request to update the component
      const response = await fetch(`/api/components/${id}/rebuild`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tsxCode: fixedCode,
          forceRebuild: true
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Component fixed successfully!');
        console.log(`Status: ${result.status}`);
      } else {
        console.error('❌ Failed to fix component:', await response.text());
      }
    } catch (error) {
      console.error('Error fixing component:', error);
    }
  }
  
  console.log('\n🎉 All components processed. Refresh the page to see changes.');
  console.log('If the components still don\'t work, try rerunning this script with the browser console open.');
}

// Execute the fix
fixBrokenComponents();
