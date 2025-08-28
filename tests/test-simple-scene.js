// Test scene with minimal code
const testScene = {
  id: "test-scene-1",
  name: "Test Scene",
  duration: 150,
  jsCode: `
const Component = function TestScene() {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1]);
  
  return React.createElement(
    AbsoluteFill,
    {
      style: {
        backgroundColor: '#ff0000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '100px',
        color: 'white',
        fontWeight: 'bold'
      }
    },
    'LAMBDA WORKS!'
  );
};

return Component;
  `
};

console.log(JSON.stringify(testScene, null, 2));