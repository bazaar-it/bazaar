import React from 'react';
import { Composition } from 'remotion';
import { TransitionShowcase } from '../components/transitions/TransitionShowcase';

export const TransitionTestComposition: React.FC = () => {
  return (
    <>
      <Composition
        id="TransitionShowcase"
        component={TransitionShowcase}
        durationInFrames={900} // 6 transitions × 150 frames each
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};