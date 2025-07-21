import React from "react";
import { Composition, AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

// Ultra-simple test scene that should work in Lambda
const SimpleTestScene: React.FC<{ text: string; color: string }> = ({ text, color }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1]);
  const scale = interpolate(frame, [0, 30], [0.5, 1]);
  
  return (
    <AbsoluteFill
      style={{
        backgroundColor: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: `scale(${scale})`,
        opacity,
      }}
    >
      <div style={{
        fontSize: '120px',
        fontWeight: 'bold',
        color: 'white',
        textShadow: '0 0 20px rgba(0,0,0,0.5)',
        textAlign: 'center',
      }}>
        {text}
      </div>
    </AbsoluteFill>
  );
};

// Hardcoded test composition
export const SimpleLambdaComposition: React.FC = () => {
  return (
    <Composition
      id="SimpleLambdaTest"
      component={SimpleTestScene}
      durationInFrames={150}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        text: "LAMBDA WORKS!",
        color: "#ff0000"
      }}
    />
  );
};