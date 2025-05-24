// @ts-nocheck
// src/scripts/test/test-component-fix.ts
/*
 * This script tests our component syntax repair logic with a sample component 
 * containing common errors like duplicated fps variables
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name correctly in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamically import the repair function
import('../server/workers/repairComponentSyntax.js').then(({ repairComponentSyntax }) => {
  // Sample problematic component with duplicated fps variable
  const sampleBrokenComponent = `
  // src/remotion/components/scenes/AGreenAndScene.tsx
  import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence, Easing } from 'remotion';
  import React from 'react';
  
  export const AGreenAndScene = ({ brief }) => {
    const frame = useCurrentFrame();
    const { width, height, fps, durationInFrames } = useVideoConfig();
  
    // Extract key brief properties
    const { elements, colorPalette, overallStyle } = brief;
  
    // Define background color from brief
    const backgroundColor = colorPalette?.background || '#141414';
  
    // Ball animation
    const createBall = () => {
      // ERROR: Redeclaring fps variable
      const { fps } = useVideoConfig();
      
      // Calculate bounce animation
      const ballY = interpolate(
        frame,
        [0, fps/2, fps],
        [600, 300, 600],
        { extrapolateRight: 'clamp', easing: Easing.easeInOutQuad }
      );
  
      return (
        <div
          style={{
            position: 'absolute',
            left: interpolate(frame, [0, durationInFrames], [-200, 1920], { extrapolateRight: 'clamp' }),
            top: ballY,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 30% 30%, #7ED321, #F5A623)',
            boxShadow: '0 0 20px rgba(245, 166, 35, 0.7)',
            transform: 'rotate(' + frame + 'deg)',
          }}
        />
      );
    };
  
    return (
      <AbsoluteFill style={{ backgroundColor }}>
        {createBall()}
      </AbsoluteFill>
    );
  };
  
  export default AGreenAndScene;
  `;
  
  // Run the repair function
  console.log('Repairing component syntax...');
  const { code: fixedCode, fixes, fixedSyntaxErrors } = repairComponentSyntax(sampleBrokenComponent);
  
  // Output the results
  console.log('\nApplied fixes:');
  fixes.forEach(fix => console.log(`- ${fix}`));
  
  console.log(`\nFixed syntax errors: ${fixedSyntaxErrors}`);
  
  // Save the result to check
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputPath = path.join(outputDir, 'fixed-sample-component.tsx');
  fs.writeFileSync(outputPath, fixedCode);
  
  console.log(`\nFixed component saved to: ${outputPath}`);
  console.log('\nFixed component:');
  console.log('----------------------------------------');
  console.log(fixedCode);
  console.log('----------------------------------------');
}).catch(error => {
  console.error('Error running test:', error);
}); 