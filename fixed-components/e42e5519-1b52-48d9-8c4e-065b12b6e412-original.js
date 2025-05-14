import React, {useState} from 'react';
import {AbsoluteFill, useCurrentFrame, spring, interpolate} from 'remotion';

const MagicalTransformation: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const [clicked, setClicked] = useState(false);

  const scale = spring({
    fps,
    frame: clicked ? frame - 30 : frame,
    config: {
      damping: 100,
    },
  });

  const colorInterpolation = interpolate(frame, [30, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const pinkColor = 'rgba(255, 192, 203, ' + (1 - colorInterpolation) + ')';
  const orangeColor = 'rgba(255, 165, 0, ' + colorInterpolation + ')';

  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
      <div
        style={{
          width: 150,
          height: 150,
          backgroundColor: clicked ? orangeColor : pinkColor,
          transform: `scale(${clicked ? scale : 1})`,
          transition: 'background-color 0.5s ease',
          borderRadius: clicked ? '50%' : '0%',
        }}
        onClick={() => setClicked(true)}
      />
    </AbsoluteFill>
  );
};

export default MagicalTransformation;
