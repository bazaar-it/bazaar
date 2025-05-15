// src/scripts/register-simple-scene.js
/**
 * DIRECT REGISTER SCRIPT - No dependencies needed
 * This script directly registers the SimpleShapeScene as a custom component via API
 */

// Final fixed and working SimpleShapeScene code with proper exports
const simpleShapeCode = `// SimpleShapeScene - Animated shape component
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

// Component that renders an animated shape with customizable properties
const SimpleShapeScene = ({ data }) => {
  const frame = useCurrentFrame();
  
  // Parse data with safe type casting
  const shapeData = {
    color: typeof data?.color === 'string' ? data.color : '#ff5757',
    size: typeof data?.size === 'number' ? data.size : 200,
    shape: ['circle', 'square', 'triangle'].includes(data?.shape) ? data.shape : 'circle',
    backgroundColor: typeof data?.backgroundColor === 'string' ? data.backgroundColor : '#1a1a1a',
  };
  
  // Animation: shape grows and rotates slightly
  const scale = interpolate(
    frame,
    [0, 30, 60],
    [0.3, 1, 0.9],
    {
      extrapolateRight: 'clamp',
    }
  );
  
  const rotation = interpolate(
    frame,
    [0, 60],
    [0, 10],
    {
      extrapolateRight: 'clamp',
    }
  );
  
  // Shape renderer based on selected shape
  const renderShape = () => {
    const { shape, color, size } = shapeData;
    // Make sure size is defined
    const actualSize = size || 200;
    const scaledSize = actualSize * scale;
    
    switch(shape) {
      case 'square':
        return (
          <div
            style={{
              width: scaledSize,
              height: scaledSize,
              backgroundColor: color,
              transform: \`rotate(\${rotation}deg)\`,
            }}
          />
        );
        
      case 'triangle':
        return (
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: \`\${scaledSize / 2}px solid transparent\`,
              borderRight: \`\${scaledSize / 2}px solid transparent\`,
              borderBottom: \`\${scaledSize}px solid \${color}\`,
              transform: \`rotate(\${rotation}deg)\`,
            }}
          />
        );
        
      case 'circle':
      default:
        return (
          <div
            style={{
              width: scaledSize,
              height: scaledSize,
              backgroundColor: color,
              borderRadius: '50%',
              transform: \`rotate(\${rotation}deg)\`,
            }}
          />
        );
    }
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: shapeData.backgroundColor,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {renderShape()}
    </AbsoluteFill>
  );
};

export default SimpleShapeScene;
window.__REMOTION_COMPONENT = SimpleShapeScene;
`;

/**
 * Function to create a new component via direct API call
 */
async function registerSimpleShapeComponent() {
  console.log('🎨 SimpleShapeScene Registration Script');
  console.log('------------------------------------');
  
  try {
    // First create a new component via the API
    console.log('Creating component...');
    const createResponse = await fetch('/api/components/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        effect: 'SimpleShapeScene',
        prompt: 'A simple animated shape component with circle, square, and triangle options'
      })
    });
    
    if (!createResponse.ok) {
      throw new Error(`Failed to create component: ${await createResponse.text()}`);
    }
    
    const { id } = await createResponse.json();
    console.log(`✅ Component created with ID: ${id}`);
    
    // Now update the component with our TSX code
    console.log('Updating component with TSX code...');
    const updateResponse = await fetch(`/api/components/${id}/rebuild`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tsxCode: simpleShapeCode,
        forceRebuild: true,
        status: 'completed'
      })
    });
    
    if (!updateResponse.ok) {
      throw new Error(`Failed to update component: ${await updateResponse.text()}`);
    }
    
    const updateResult = await updateResponse.json();
    console.log('✅ Component updated successfully!');
    console.log(`Status: ${updateResult.status}`);
    
    console.log('\n🎉 SimpleShapeScene is now registered and ready to use!');
    console.log('Refresh your browser to see the component in the Custom Components panel.');
    console.log('You can add it to your video by clicking the "Add" button next to it.');
    
    return id;
  } catch (error) {
    console.error('❌ Error registering SimpleShapeScene:', error instanceof Error ? error.message : String(error));
  }
}

// Run the registration function
registerSimpleShapeComponent();
