import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from 'remotion';

export default function SpaceGreyBG() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animate the gradient properties over time
  // Cycle duration: 8 seconds (240 frames at 30fps)
  const cycleDuration = fps * 8;
  
  // Animate hue 1: 0° → 10° (black variations)
  const hue1 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [0, 10, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  // Animate hue 2: 0° → 15° (grey variations)
  const hue2 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [0, 15, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  // Animate saturation: 0% → 5% → 0% for black, 0% → 8% → 0% for grey
  const saturation1 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [0, 5, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  const saturation2 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [0, 8, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  // Animate lightness: 0% → 5% → 0% for black, 26% → 30% → 26% for grey
  const lightness1 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [0, 5, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  const lightness2 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [26, 30, 26],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  // Animate angle: ±25° around 135° (110° → 160°)
  const angle = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [110, 160, 110],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );

  const gradientStyle = `linear-gradient(${angle}deg, hsl(${hue1}, ${saturation1}%, ${lightness1}%), hsl(${hue2}, ${saturation2}%, ${lightness2}%))`;

  return (
    <AbsoluteFill
      style={{
        background: gradientStyle,
      }}
    />
  );
}

// Template configuration - exported so registry can use it
export const templateConfig = {
  id: 'space-grey-bg',
  name: 'Space Grey BG',
  duration: 240, // 8 seconds
  previewFrame: 120,
  getCode: () => `const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;

export default function SpaceGreyBG() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animate the gradient properties over time
  // Cycle duration: 8 seconds (240 frames at 30fps)
  const cycleDuration = fps * 8;
  
  // Animate hue 1: 0° → 10° (black variations)
  const hue1 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [0, 10, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  // Animate hue 2: 0° → 15° (grey variations)
  const hue2 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [0, 15, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  // Animate saturation: 0% → 5% → 0% for black, 0% → 8% → 0% for grey
  const saturation1 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [0, 5, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  const saturation2 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [0, 8, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  // Animate lightness: 0% → 5% → 0% for black, 26% → 30% → 26% for grey
  const lightness1 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [0, 5, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  const lightness2 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [26, 30, 26],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  // Animate angle: ±25° around 135° (110° → 160°)
  const angle = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [110, 160, 110],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );

  const gradientStyle = \`linear-gradient(\${angle}deg, hsl(\${hue1}, \${saturation1}%, \${lightness1}%), hsl(\${hue2}, \${saturation2}%, \${lightness2}%))\`;

  return (
    <AbsoluteFill
      style={{
        background: gradientStyle,
      }}
    />
  );
}`
}; 