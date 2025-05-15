/**
 * Template for a minimal working Remotion custom component
 *
 * This file serves as a reference for creating custom components that will work correctly
 * with the Bazaar-vid Remotion player. Copy this template when creating new components.
 *
 * Usage:
 * 1. Copy this template
 * 2. Modify the component logic as needed
 * 3. Ensure you follow the structure exactly - no extra semicolons, proper JSX nesting
 *
 * Remotion expects certain global variables to be available. Our compilation process
 * handles most of these automatically, but your component structure must be correct.
 */

// This will be replaced by our preprocessor with a reference to window.React
const React = window.React;
// AbsoluteFill is a utility component that fills the entire frame
const { AbsoluteFill } = window.Remotion;

// Your component props - can be customized as needed
interface CircleProps {
  color?: string;
  size?: number;
  text?: string;
}

// The actual component definition
const CircleComponent = ({ 
  color = '#ff0000', 
  size = 200,
  text = 'Remotion Circle'
}: CircleProps) => {
  // You can use React hooks here
  React.useEffect(() => {
    console.log('CircleComponent mounted', { color, size, text });
    
    return () => {
      console.log('CircleComponent unmounted');
    };
  }, [color, size, text]);

  // Return your JSX - keep proper indentation and nesting
  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
      }}>
        <div style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          color: 'white',
          fontWeight: 'bold',
        }}>
          {text}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// IMPORTANT: This assignment is required for the component to be recognized
window.__REMOTION_COMPONENT = CircleComponent;

// Export the component (this is not actually used by Remotion but helps with TypeScript)
export default CircleComponent; 