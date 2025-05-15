// src/remotion/components/scenes/OnceARowScene.tsx
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

const OnceARowScene = () => {
  const frame = useCurrentFrame();
  
  const opacity = interpolate(
    frame,
    [0, 30, 50, 60],
    [0, 1, 1, 0]
  );
  
  // Row clear flash effect
  const flash = interpolate(
    frame % 15,
    [0, 7, 15],
    [0, 1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
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
        <h2 style={{
          color: '#fff',
          textAlign: 'center',
          marginBottom: '20px'
        }}>
          ROW CLEAR!
        </h2>
        
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
            const isRowBeingCleared = row === 10;
            
            return (
              <div key={i} style={{
                width: '30px',
                height: '30px',
                backgroundColor: isRowBeingCleared 
                  ? 'rgba(255, 255, 255, ' + flash + ')'
                  : (row > 10) ? '#00f0f0' : 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)'
              }} />
            );
          })}
        </div>
        
        <div style={{
          color: '#fff',
          textAlign: 'center',
          marginTop: '20px',
          fontSize: '24px',
          fontWeight: 'bold'
        }}>
          +100 POINTS
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default OnceARowScene;

// Ensure Remotion can find the component
if (typeof window !== 'undefined') {
  window.__REMOTION_COMPONENT = OnceARowScene;
}