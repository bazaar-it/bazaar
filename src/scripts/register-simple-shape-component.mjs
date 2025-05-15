// src/scripts/register-simple-shape-component.mjs

/**
 * COMPONENT REGISTRATION SCRIPT
 * This script directly adds the SimpleShapeScene component to the database
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config();

// Get Supabase credentials from environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Our SimpleShapeScene component code
const simpleShapeCode = `// SimpleShapeScene - Animated shape component
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

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

// Critical: Make component available to Remotion
export default SimpleShapeScene;
window.__REMOTION_COMPONENT = SimpleShapeScene;`;

// Register the SimpleShapeScene component directly
async function registerSimpleShapeComponent() {
  try {
    console.log('🎨 REGISTERING SIMPLESHAPESCENE COMPONENT');
    console.log('----------------------------------------');
    
    // Check if component already exists
    const { data: existingComponents, error: existingError } = await supabase
      .from('custom_component_jobs')
      .select('id, effect')
      .eq('effect', 'SimpleShapeScene');
    
    if (existingError) {
      console.error('Error checking for existing component:', existingError.message);
      return null;
    }
    
    if (existingComponents && existingComponents.length > 0) {
      console.log(`SimpleShapeScene already exists with ID: ${existingComponents[0].id}`);
      console.log('Updating the existing component...');
      
      // Update existing component
      const { error: updateError } = await supabase
        .from('custom_component_jobs')
        .update({
          tsx_code: simpleShapeCode,
          prompt: 'A simple animated shape component with circle, square, and triangle options',
          status: 'completed',
          error_message: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingComponents[0].id);
      
      if (updateError) {
        console.error('Failed to update existing component:', updateError.message);
        return null;
      }
      
      console.log('✅ Successfully updated SimpleShapeScene component');
      return existingComponents[0].id;
    }
    
    // Component doesn't exist, create a new one
    console.log('Creating new SimpleShapeScene component...');
    const componentId = uuidv4();
    
    const { error: insertError } = await supabase
      .from('custom_component_jobs')
      .insert({
        id: componentId,
        effect: 'SimpleShapeScene',
        prompt: 'A simple animated shape component with circle, square, and triangle options',
        tsx_code: simpleShapeCode,
        status: 'completed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (insertError) {
      console.error('Failed to create component:', insertError.message);
      return null;
    }
    
    console.log(`✅ Successfully created SimpleShapeScene component with ID: ${componentId}`);
    return componentId;
  } catch (error) {
    console.error('Error registering component:', error);
    return null;
  }
}

// Run the registration function
registerSimpleShapeComponent()
  .then((id) => {
    if (id) {
      console.log('\n🎉 COMPONENT REGISTRATION SUCCESSFUL 🎉');
      console.log('Refresh your browser to see the SimpleShapeScene component in the Custom Components panel');
      console.log('You can add it to your video by clicking the "Add" button next to it');
    } else {
      console.log('\n❌ Component registration failed');
    }
    
    // Disconnect from Supabase
    supabase.removeAllChannels();
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
  });
