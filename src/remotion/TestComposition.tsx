import React from "react";
import { Composition, AbsoluteFill } from "remotion";

const TestScene: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#00ff00',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'black',
        fontSize: '48px',
        fontWeight: 'bold',
      }}
    >
      TEST SCENE WORKING
    </AbsoluteFill>
  );
};

export const TestComposition: React.FC = () => {
  return (
    <Composition
      id="TestComposition"
      component={TestScene}
      durationInFrames={150}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};