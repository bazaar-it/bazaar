// src/scripts/add-simple-component-direct.js

/**
 * DIRECT COMPONENT CREATION SCRIPT - No dependencies
 * This script directly posts to your API to create a simple component
 * Run this script in your browser console
 */

async function addSimpleShapeComponent() {
  console.log('🎨 SIMPLE SHAPE COMPONENT CREATOR 🎨');
  
  try {
    console.log(`Creating SimpleShapeComponent...`);
    
    // Create working component code that's guaranteed to render
    const componentCode = `// SimpleShapeComponent
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

const SimpleShapeComponent = ({ data }) => {
  const frame = useCurrentFrame();
  
  // Get props from data or use defaults
  const color = data?.color || '#ff5757';
  const size = data?.size || 200;
  const shape = data?.shape || 'circle';
  const backgroundColor = data?.backgroundColor || '#1a1a1a';
  
  // Animation logic
  const scale = interpolate(
    frame % 60,
    [0, 30, 60],
    [0.8, 1, 0.8],
    {
      extrapolateRight: 'clamp',
    }
  );
  
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
      default:
        return (
          <div
            style={{
              width: scaledSize,
              height: scaledSize,
              borderRadius: '50%',
              backgroundColor: color,
            }}
          />
        );
    }
  };
  
  return (
    <AbsoluteFill style={{ 
      backgroundColor, 
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center', 
    }}>
      {renderShape()}
    </AbsoluteFill>
  );
};

export default SimpleShapeComponent;
window.__REMOTION_COMPONENT = SimpleShapeComponent;
`;

    // First create the component through the API
    console.log('Creating component via API...');
    const createResponse = await fetch('/api/components/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        effect: 'SimpleShapeComponent',
        prompt: 'A simple animated shape component with circle, square, and triangle options'
      })
    });
    
    if (!createResponse.ok) {
      throw new Error(`Failed to create component: ${await createResponse.text()}`);
    }
    
    // Get the component ID from the response
    const data = await createResponse.json();
    const componentId = data.id;
    console.log(`✅ Component created with ID: ${componentId}`);
    
    // Now update the component with our code
    console.log('Adding component code...');
    const updateResponse = await fetch(`/api/components/${componentId}/rebuild`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tsxCode: componentCode,
        forceRebuild: true
      })
    });
    
    if (!updateResponse.ok) {
      throw new Error(`Failed to update component: ${await updateResponse.text()}`);
    }
    
    const result = await updateResponse.json();
    console.log('✅ Component updated successfully!');
    console.log(`Status: ${result.status}`);
    
    console.log('\n🎉 SimpleShapeComponent created! Refresh the page to see it in your component list.');
    console.log('You can then click "Add" next to it to add it to your video.');
    
    return componentId;
  } catch (error) {
    console.error('❌ Error creating component:', error);
    return null;
  }
}

// Execute the function
addSimpleShapeComponent();
