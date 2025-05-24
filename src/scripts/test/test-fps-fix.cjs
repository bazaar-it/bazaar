// @ts-nocheck
// src/scripts/test/test-fps-fix.cjs
const { preprocessTsx } = require('../server/utils/tsxPreprocessor');

// Sample code with duplicate fps declarations
const sampleCode = `
import React from 'react';
import { useVideoConfig, AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

export default function AGreenAndScene() {
  const { width, height, fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();
  
  // Later in the code, another declaration:
  const fps = 30; // This is the problem - duplicate declaration!

  // Calculate the position based on the current frame
  const x = interpolate(frame, [0, durationInFrames], [0, width]);
  
  return (
    <AbsoluteFill style={{ backgroundColor: '#111' }}>
      <div
        style={{
          position: 'absolute',
          width: 100,
          height: 100,
          backgroundColor: 'green',
          borderRadius: '50%',
          left: x,
          top: height / 2 - 50,
        }}
      />
    </AbsoluteFill>
  );
}
`;

// Test our fix
const result = preprocessTsx(sampleCode, 'AGreenAndScene');

console.log('Fixed?', result.fixed);
console.log('Issues:', result.issues);
console.log('\nFixed Code:');
console.log(result.code);
