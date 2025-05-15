// src/scripts/component-verify/canary-component.js
// Canary component for testing the Remotion component pipeline - JS Version (No JSX)

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

// Define props interface
/** 
 * @typedef {Object} CanaryProps
 * @property {string} [id] - Optional component ID for display
 * @property {string} [title] - Optional title to display
 * @property {string} [textColor] - Optional text color
 * @property {string} [backgroundColor] - Optional background color
 */

// Pure JavaScript version of the component using React.createElement
/**
 * @param {CanaryProps} props 
 */
const Canary = (props) => {
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
  
  // Helper to create a color box with transform
  const createColorBox = () => {
    return React.createElement('div', {
      style: {
        opacity,
        transform: `rotate(${rotation}deg) scale(${scale})`,
        padding: '2rem',
        borderRadius: '1rem',
        backgroundColor: props.backgroundColor || 'rgba(255, 128, 0, 0.8)',
        color: props.textColor || 'white',
        textAlign: 'center',
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
        transition: 'all 0.3s ease',
      }
    }, [
      // Title
      React.createElement('h1', {
        key: 'title',
        style: {
          fontSize: '2.5rem',
          margin: '0 0 1rem 0',
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
        }
      }, props.title || '🧪 Canary Test Component'),
      
      // Frame counter
      React.createElement('div', {
        key: 'frame',
        style: {
          fontSize: '1.25rem',
          marginBottom: '1rem'
        }
      }, `Frame: ${frame} of ${durationInFrames}`),
      
      // Component ID
      React.createElement('div', {
        key: 'component-id',
        style: {
          fontSize: '1rem',
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          padding: '0.5rem',
          borderRadius: '0.5rem',
          marginBottom: '1rem'
        }
      }, `Component ID: ${props.id || 'unknown'}`),
      
      // Stats display
      React.createElement('div', {
        key: 'stats',
        style: {
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.5rem',
          fontSize: '0.9rem',
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          padding: '0.5rem',
          borderRadius: '0.5rem',
        }
      }, [
        React.createElement('div', { key: 'width' }, `Width: ${width}px`),
        React.createElement('div', { key: 'height' }, `Height: ${height}px`),
        React.createElement('div', { key: 'fps' }, `FPS: ${fps}`),
        React.createElement('div', { key: 'duration' }, `Duration: ${durationInFrames} frames`)
      ])
    ]);
  };
  
  // Create timestamp badge
  const createTimestampBadge = () => {
    return React.createElement('div', {
      style: {
        position: 'absolute',
        bottom: '1rem',
        right: '1rem',
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: '0.8rem',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: '0.25rem 0.5rem',
        borderRadius: '0.25rem',
      }
    }, `Test: ${new Date().toISOString()}`);
  };
  
  // Return main component
  return React.createElement(AbsoluteFill, {
    style: {
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: 'system-ui, sans-serif',
    }
  }, [
    createColorBox(),
    createTimestampBadge()
  ]);
};

// CRITICAL: Register component for Remotion - DO NOT REMOVE
window.__REMOTION_COMPONENT = Canary;

// Also export as default for module usage
// Note: In browser context, this is unused - window.__REMOTION_COMPONENT is what matters
function exportDefault() {
  return Canary;
}

// Use non-JSX export syntax that can be parsed by Function()
var _default = Canary;
Object.defineProperty(exportDefault, "__esModule", { value: true });
Object.defineProperty(exportDefault, "default", { enumerable: true, value: _default }); 