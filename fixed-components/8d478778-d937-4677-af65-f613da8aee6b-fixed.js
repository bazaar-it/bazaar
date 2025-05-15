// FALLBACK COMPONENT - Generated after error: Component generation failed and needs to be regenerated via Fix button
import AbsoluteFill from "remotion";
import useCurrentFrame from "remotion";;
import React from 'react';

/**
 * BackgroundFadesFromScene - Fallback version
 * This component was created as a fallback after the original generation failed.
 * Error: Component generation failed and needs to be regenerated via Fix button
 */
const BackgroundFadesFromScene = () => {
  const frame = useCurrentFrame();
  
  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#111',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'white',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: '80%' }}>
        <h1 style={{ color: '#ff4040' }}>Component Generation Error</h1>
        <p style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
          There was an error generating this component:
        </p>
        <pre style={{ 
          background: 'rgba(255,255,255,0.1)', 
          padding: '1rem', 
          borderRadius: '0.5rem',
          maxWidth: '100%',
          overflowX: 'auto',
          textAlign: 'left'
        }}>
          {errorMessage}
        </pre>
        <p style={{ marginTop: '2rem', opacity: 0.7 + (Math.sin(frame / 10) * 0.3) }}>
          Please try regenerating this component.
        </p>
      </div>
    </AbsoluteFill>
  );
};

// Make sure to properly export the component
export default BackgroundFadesFromScene;
window.__REMOTION_COMPONENT = BackgroundFadesFromScene;
