// src/scripts/create-simple-shape.js
// Direct component creation script to be run in browser console

(async function() {
  console.log('🚀 Creating SimpleShapeScene component...');
  
  try {
    // Step 1: Create the component record
    console.log('Step 1: Creating component record...');
    const createResponse = await fetch('/api/components/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        effect: 'SimpleShapeScene',
        prompt: 'A simple animated shape component that renders circles, squares, or triangles'
      })
    });
    
    if (!createResponse.ok) {
      throw new Error(`Failed to create component: ${await createResponse.text()}`);
    }
    
    const componentData = await createResponse.json();
    const componentId = componentData.id;
    console.log(`Component created with ID: ${componentId}`);
    
    // Step 2: Update with code
    console.log('Step 2: Adding component code...');
    const componentCode = `// src/remotion/components/scenes/SimpleShapeScene.tsx
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

/**
 * SimpleShapeScene - Renders animated shapes with customizable properties
 */
const SimpleShapeScene = ({ data }) => {
  const frame = useCurrentFrame();
  
  // Parse data with safe type casting
  const color = data?.color || '#ff5757';
  const size = data?.size || 200; 
  const shape = data?.shape || 'circle';
  const backgroundColor = data?.backgroundColor || '#1a1a1a';
  
  // Animation logic - simple pulsing effect
  const scale = interpolate(
    frame % 60,
    [0, 30, 60],
    [0.8, 1, 0.8],
    {
      extrapolateRight: 'clamp',
    }
  );
  
  // Render shape based on selected type
  const renderShape = () => {
    const scaledSize = size * scale;
    
    switch(shape) {
      case 'square':
        return (
          <div
            style={{
              width: scaledSize,
              height: scaledSize,
              backgroundColor: color,
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
            }}
          />
        );
    }
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
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

    // Update the component with our code
    const updateResponse = await fetch(`/api/components/${componentId}/rebuild`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tsxCode: componentCode,
        status: 'completed',
        forceRebuild: true
      })
    });
    
    if (!updateResponse.ok) {
      throw new Error(`Failed to update component: ${await updateResponse.text()}`);
    }
    
    console.log('✅ Component updated successfully!');
    console.log('🎉 SimpleShapeScene created and ready to use!');
    console.log('Please refresh the page to see the new component in your panel.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
})();
