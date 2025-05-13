// src/scripts/component-verify/canary-component.js
// Canary component for testing the Remotion component pipeline

// Using globals provided by Remotion environment
const React = window.React;
const { 
  AbsoluteFill, 
  useCurrentFrame, 
  useVideoConfig,
  Sequence,
  interpolate,
  Easing
} = window.Remotion || {};

const Canary1747145699007 = (props) => {
  // Access Remotion hooks
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();
  
  // Animate opacity based on frame
  const opacity = interpolate(
    frame,
    [0, 30, durationInFrames - 30, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Calculate animation values
  const rotation = interpolate(
    frame,
    [0, durationInFrames],
    [0, 360],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  const scale = interpolate(
    frame % 60,
    [0, 30, 60],
    [1, 1.2, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  return (
    <AbsoluteFill style={{ 
      backgroundColor: 'rgba(0, 0, 0, 0.85)', 
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{
        opacity,
        transform: `rotate(${rotation}deg) scale(${scale})`,
        padding: '2rem',
        borderRadius: '1rem',
        backgroundColor: 'rgba(255, 128, 0, 0.8)',
        color: 'white',
        textAlign: 'center',
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
        transition: 'all 0.3s ease',
      }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          margin: '0 0 1rem 0',
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
        }}>
          🧪 Canary Test Component
        </h1>
        
        <div style={{ 
          fontSize: '1.25rem', 
          marginBottom: '1rem' 
        }}>
          Frame: {frame} of {durationInFrames}
        </div>
        
        <div style={{ 
          fontSize: '1rem', 
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          padding: '0.5rem',
          borderRadius: '0.5rem',
          marginBottom: '1rem'
        }}>
          Component ID: {props.id || 'unknown'}
        </div>
        
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.5rem',
          fontSize: '0.9rem',
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          padding: '0.5rem',
          borderRadius: '0.5rem',
        }}>
          <div>Width: {width}px</div>
          <div>Height: {height}px</div>
          <div>FPS: {fps}</div>
          <div>Duration: {durationInFrames} frames</div>
        </div>
      </div>
      
      <div style={{
        position: 'absolute',
        bottom: '1rem',
        right: '1rem',
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: '0.8rem',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: '0.25rem 0.5rem',
        borderRadius: '0.25rem',
      }}>
        Test: {new Date().toISOString()}
      </div>
    </AbsoluteFill>
  );
};

// CRITICAL: Register component for Remotion - DO NOT REMOVE
window.__REMOTION_COMPONENT = Canary1747145699007;

// Also export as default for module usage
export default Canary1747145699007; 