// src/scripts/add-simple-component.js

/**
 * SIMPLE COMPONENT ADDER
 * This script creates a simple TextScene clone that can be directly used in the editor
 * No external dependencies required
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the SimpleColoredShape component - a very basic shape component
const createSimpleColoredShape = () => {
  const filePath = path.join(__dirname, '../remotion/components/scenes/SimpleColoredShape.tsx');
  
  const componentCode = `//src/remotion/components/scenes/SimpleColoredShape.tsx
import React from 'react';
import { AbsoluteFill } from 'remotion';

// Simple shape component that can be added directly to videos
interface SimpleColoredShapeProps {
  data: Record<string, unknown>;
}

export const SimpleColoredShape: React.FC<SimpleColoredShapeProps> = ({ data }) => {
  // Parse data with safe type casting
  const color = typeof data.color === 'string' ? data.color : '#ff5757';
  const size = typeof data.size === 'number' ? data.size : 200;
  const shape = typeof data.shape === 'string' ? data.shape : 'circle';
  const backgroundColor = typeof data.backgroundColor === 'string' ? data.backgroundColor : '#1a1a1a';
  
  // Shape renderer based on selected shape
  const renderShape = () => {
    switch(shape) {
      case 'square':
        return (
          <div
            style={{
              width: size,
              height: size,
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
              borderLeft: \`\${size / 2}px solid transparent\`,
              borderRight: \`\${size / 2}px solid transparent\`,
              borderBottom: \`\${size}px solid \${color}\`,
            }}
          />
        );
        
      case 'circle':
      default:
        return (
          <div
            style={{
              width: size,
              height: size,
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
};`;

  // Write the file
  fs.writeFileSync(filePath, componentCode, 'utf-8');
  console.log(`✅ Created SimpleColoredShape component at ${filePath}`);
  return filePath;
};

// Update the scene registry to include our new component
const updateSceneRegistry = () => {
  const registryPath = path.join(__dirname, '../remotion/components/scenes/index.ts');
  
  let registryContent = fs.readFileSync(registryPath, 'utf-8');
  
  // Check if SimpleColoredShape is already imported
  if (!registryContent.includes('import { SimpleColoredShape }')) {
    // Add import statement after other imports
    registryContent = registryContent.replace(
      /(import.*?from.*?;\n(?!import))/s,
      '$1import { SimpleColoredShape } from \'./SimpleColoredShape\';\n'
    );
  }
  
  // Check if SimpleColoredShape is already in the registry
  if (!registryContent.includes('\'simple-colored-shape\'')) {
    // Add to scene registry
    registryContent = registryContent.replace(
      /(export const sceneRegistry: Record<SceneType, FC<SceneProps>> = {[\s\S]*?)(\n};)/,
      '$1  \'simple-colored-shape\': SimpleColoredShape as FC<SceneProps>,\n$2'
    );
  }
  
  // Check if SimpleColoredShape is already in exports
  if (!registryContent.includes('SimpleColoredShape,')) {
    // Add to exports
    registryContent = registryContent.replace(
      /(export {[\s\S]*?)(\n};)/,
      '$1  SimpleColoredShape,\n$2'
    );
  }
  
  fs.writeFileSync(registryPath, registryContent, 'utf-8');
  console.log(`✅ Updated scene registry at ${registryPath}`);
};

// Update constants to include the new scene type
const updateConstants = () => {
  const constantsPath = path.join(__dirname, '../types/remotion-constants.ts');
  
  let constantsContent = fs.readFileSync(constantsPath, 'utf-8');
  
  // Check if simple-colored-shape is already in SCENE_TYPES
  if (!constantsContent.includes('"simple-colored-shape"')) {
    // Add to SCENE_TYPES
    constantsContent = constantsContent.replace(
      /(SCENE_TYPES = \[[\s\S]*?)(](?: as const)?\s*;)/,
      '$1  "simple-colored-shape", \n$2'
    );
  }
  
  fs.writeFileSync(constantsPath, constantsContent, 'utf-8');
  console.log(`✅ Updated constants at ${constantsPath}`);
};

// Main function
const main = () => {
  console.log('🎨 CREATING SIMPLESHAPE COMPONENT');
  console.log('-------------------------------');
  
  try {
    // Create component file
    createSimpleColoredShape();
    
    // Update registry
    updateSceneRegistry();
    
    // Update constants
    updateConstants();
    
    console.log('\n🎉 SimpleColoredShape component is now available!');
    console.log('Restart your dev server and refresh your browser to use it.');
    console.log('You can add it to your video directly from the regular scene menu.');
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

// Run the main function
main();
