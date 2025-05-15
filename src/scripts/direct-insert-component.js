// src/scripts/direct-insert-component.js

/**
 * This script creates a custom component directly in the database via API calls
 * No external dependencies needed - run directly in browser console
 */

const createSimpleShapeComponent = async () => {
  console.log('🎨 Creating Simple Shape Component via API...');
  
  // Component code
  const componentCode = `// SimpleShapeComponent - A basic shape renderer with customization
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

/**
 * Simple animated shape component
 * Supports circle, square, and triangle shapes with animation
 */
const SimpleShapeComponent = ({ data }) => {
  const frame = useCurrentFrame();
  
  // Get configuration from data or use defaults
  const color = typeof data?.color === 'string' ? data.color : '#ff5757';
  const size = typeof data?.size === 'number' ? data.size : 200;
  const shape = typeof data?.shape === 'string' ? data.shape : 'circle';
  const backgroundColor = typeof data?.backgroundColor === 'string' ? data.backgroundColor : '#1a1a1a';
  
  // Animation logic
  const scale = interpolate(
    frame % 60,
    [0, 30, 60],
    [0.8, 1, 0.8],
    {
      extrapolateRight: 'clamp',
    }
  );
  
  // Render different shapes based on configuration
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

// Make component available to Remotion
export default SimpleShapeComponent;
window.__REMOTION_COMPONENT = SimpleShapeComponent;`;

  try {
    // Step 1: Create component via tRPC endpoint
    const createMutation = await fetch('/api/trpc/customComponent.create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        json: {
          effect: 'SimpleShapeComponent',
          prompt: 'A simple shape component with circle, square, and triangle options'
        }
      })
    });
    
    if (!createMutation.ok) {
      throw new Error(`Failed to create component: ${await createMutation.text()}`);
    }
    
    const createResult = await createMutation.json();
    console.log('✅ Component created successfully');
    
    // Extract the component ID from the result (might need adjustment based on actual response structure)
    const componentId = createResult.result.data.json.id;
    console.log(`Component ID: ${componentId}`);
    
    // Step 2: Update with TSX code
    const updateMutation = await fetch(`/api/components/${componentId}/rebuild`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tsxCode: componentCode,
        status: 'completed',
        forceRebuild: true
      })
    });
    
    if (!updateMutation.ok) {
      throw new Error(`Failed to update component: ${await updateMutation.text()}`);
    }
    
    console.log('✅ Component updated with code');
    console.log('🎉 SimpleShapeComponent is now ready to use!');
    console.log('Refresh your browser to see it in the Custom Components panel');
    
    return true;
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    return false;
  }
};

// Execute the function
createSimpleShapeComponent();
