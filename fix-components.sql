-- Fix stuck Tetris components

-- Update component 69ecccb5-862c-43a7-b5a5-ddd7cf7776f3 (AnimateVariousTetrominoScene)
UPDATE "bazaar-vid_custom_component_job"
SET "tsxCode" = '// src/remotion/components/scenes/AnimateVariousTetrominoScene.tsx
import { AbsoluteFill, useCurrentFrame, interpolate } from ''remotion'';

const AnimateVariousTetrominoScene = () => {
  const frame = useCurrentFrame();
  
  // Create a simple Tetris-themed animation
  const opacity = interpolate(
    frame,
    [0, 30, 210, 240],
    [0, 1, 1, 0]
  );
  
  return (
    <AbsoluteFill style={{
      backgroundColor: ''#000'',
      fontFamily: ''monospace'',
      opacity
    }}>
      <div style={{
        position: ''absolute'',
        top: ''50%'',
        left: ''50%'',
        transform: ''translate(-50%, -50%)'',
        textAlign: ''center''
      }}>
        <h1 style={{ 
          color: ''#fff'',
          fontSize: ''3rem'',
          marginBottom: ''2rem'',
          textTransform: ''uppercase'',
          letterSpacing: ''0.2em''
        }}>
          {componentName}
        </h1>
        
        {/* Tetris grid background */}
        <div style={{
          display: ''grid'',
          gridTemplateColumns: ''repeat(10, 30px)'',
          gridTemplateRows: ''repeat(15, 30px)'',
          gap: ''2px'',
          margin: ''0 auto''
        }}>
          {Array(150).fill(0).map((_, i) => {
            const row = Math.floor(i / 10);
            const col = i % 10;
            const isBlock = (
              // I-piece
              (row === 5 && col >= 2 && col <= 5) ||
              // Square piece
              (row >= 8 && row <= 9 && col >= 2 && col <= 3) ||
              // T piece
              (row === 12 && col >= 6 && col <= 8) ||
              (row === 13 && col === 7)
            );
            
            return (
              <div key={i} style={{
                width: ''30px'',
                height: ''30px'',
                backgroundColor: isBlock ? 
                  [''#00f0f0'', ''#f0f000'', ''#a000f0'', ''#00f000'', ''#f00000'', ''#f0a000'', ''#0000f0''][Math.floor(i/10) % 7] : 
                  ''rgba(255,255,255,0.1)'',
                border: ''1px solid rgba(255,255,255,0.2)''
              }} />
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default AnimateVariousTetrominoScene;

// Ensure Remotion can find the component
if (typeof window !== ''undefined'') {
  window.__REMOTION_COMPONENT = AnimateVariousTetrominoScene;
}',
    "status" = 'building',
    "updatedAt" = NOW()
WHERE "id" = '69ecccb5-862c-43a7-b5a5-ddd7cf7776f3';

-- Update component 46a6e2c8-8e1f-408a-b4a8-a131ec82e48a (AnimateVariousTetrominoScene)
UPDATE "bazaar-vid_custom_component_job"
SET "tsxCode" = '// src/remotion/components/scenes/AnimateVariousTetrominoScene.tsx
import { AbsoluteFill, useCurrentFrame, interpolate } from ''remotion'';

const AnimateVariousTetrominoScene = () => {
  const frame = useCurrentFrame();
  
  // Create a simple Tetris-themed animation
  const opacity = interpolate(
    frame,
    [0, 30, 210, 240],
    [0, 1, 1, 0]
  );
  
  return (
    <AbsoluteFill style={{
      backgroundColor: ''#000'',
      fontFamily: ''monospace'',
      opacity
    }}>
      <div style={{
        position: ''absolute'',
        top: ''50%'',
        left: ''50%'',
        transform: ''translate(-50%, -50%)'',
        textAlign: ''center''
      }}>
        <h1 style={{ 
          color: ''#fff'',
          fontSize: ''3rem'',
          marginBottom: ''2rem'',
          textTransform: ''uppercase'',
          letterSpacing: ''0.2em''
        }}>
          {componentName}
        </h1>
        
        {/* Tetris grid background */}
        <div style={{
          display: ''grid'',
          gridTemplateColumns: ''repeat(10, 30px)'',
          gridTemplateRows: ''repeat(15, 30px)'',
          gap: ''2px'',
          margin: ''0 auto''
        }}>
          {Array(150).fill(0).map((_, i) => {
            const row = Math.floor(i / 10);
            const col = i % 10;
            const isBlock = (
              // I-piece
              (row === 5 && col >= 2 && col <= 5) ||
              // Square piece
              (row >= 8 && row <= 9 && col >= 2 && col <= 3) ||
              // T piece
              (row === 12 && col >= 6 && col <= 8) ||
              (row === 13 && col === 7)
            );
            
            return (
              <div key={i} style={{
                width: ''30px'',
                height: ''30px'',
                backgroundColor: isBlock ? 
                  [''#00f0f0'', ''#f0f000'', ''#a000f0'', ''#00f000'', ''#f00000'', ''#f0a000'', ''#0000f0''][Math.floor(i/10) % 7] : 
                  ''rgba(255,255,255,0.1)'',
                border: ''1px solid rgba(255,255,255,0.2)''
              }} />
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default AnimateVariousTetrominoScene;

// Ensure Remotion can find the component
if (typeof window !== ''undefined'') {
  window.__REMOTION_COMPONENT = AnimateVariousTetrominoScene;
}',
    "status" = 'building',
    "updatedAt" = NOW()
WHERE "id" = '46a6e2c8-8e1f-408a-b4a8-a131ec82e48a';
