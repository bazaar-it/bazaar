// src/remotion/components/scenes/AnimateVariousTetrominoScene.tsx
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

const AnimateVariousTetrominoScene = () => {
  const frame = useCurrentFrame();
  
  const opacity = interpolate(
    frame,
    [0, 30, 210, 240],
    [0, 1, 1, 0]
  );
  
  return (
    <AbsoluteFill style={{
      backgroundColor: '#000',
      fontFamily: 'monospace',
      opacity
    }}>
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      }}>
        <h1 style={{
          color: '#fff',
          textAlign: 'center',
          marginBottom: '20px'
        }}>
          TETRIS
        </h1>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(10, 30px)',
          gridTemplateRows: 'repeat(15, 30px)',
          gap: '2px',
          margin: '0 auto'
        }}>
          {Array(150).fill(0).map((_, i) => {
            const row = Math.floor(i / 10);
            const col = i % 10;
            const isBlock = (row === 5 && col >= 2 && col <= 5) || (row >= 12 && col >= 3 && col <= 6);
            return (
              <div key={i} style={{
                width: '30px',
                height: '30px',
                backgroundColor: isBlock ? '#00f0f0' : 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)'
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
if (typeof window !== 'undefined') {
  window.__REMOTION_COMPONENT = AnimateVariousTetrominoScene;
}