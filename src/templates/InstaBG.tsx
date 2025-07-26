import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from 'remotion';

export default function InstaBG() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animate the gradient properties over time
  // Cycle duration: 8 seconds (240 frames at 30fps)
  const cycleDuration = fps * 8;
  
  // Animate hue 1: 290° → 285° (purple variations)
  const hue1 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [290, 285, 290],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  // Animate hue 2: 350° → 345° (pink/red variations)
  const hue2 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [350, 345, 350],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  // Animate hue 3: 22° → 28° (orange variations)
  const hue3 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [22, 28, 22],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  // Animate saturation: 72% → 78% → 72% for purple, 75% → 80% → 75% for pink, 85% → 90% → 85% for orange
  const saturation1 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [72, 78, 72],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  const saturation2 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [75, 80, 75],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  const saturation3 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [85, 90, 85],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  // Animate lightness: 36% → 32% → 36% for purple, 59% → 55% → 59% for pink, 56% → 60% → 56% for orange
  const lightness1 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [36, 32, 36],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  const lightness2 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [59, 55, 59],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  const lightness3 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [56, 60, 56],
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

  const gradientStyle = `linear-gradient(${angle}deg, hsl(${hue1}, ${saturation1}%, ${lightness1}%), hsl(${hue2}, ${saturation2}%, ${lightness2}%), hsl(${hue3}, ${saturation3}%, ${lightness3}%))`;

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
  id: 'insta-bg',
  name: 'Insta BG',
  duration: 240, // 8 seconds
  previewFrame: 120,
  getCode: () => `const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;

export default function InstaBG() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animate the gradient properties over time
  // Cycle duration: 8 seconds (240 frames at 30fps)
  const cycleDuration = fps * 8;
  
  // Animate hue 1: 290° → 285° (purple variations)
  const hue1 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [290, 285, 290],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  // Animate hue 2: 350° → 345° (pink/red variations)
  const hue2 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [350, 345, 350],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  // Animate hue 3: 22° → 28° (orange variations)
  const hue3 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [22, 28, 22],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  // Animate saturation: 72% → 78% → 72% for purple, 75% → 80% → 75% for pink, 85% → 90% → 85% for orange
  const saturation1 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [72, 78, 72],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  const saturation2 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [75, 80, 75],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  const saturation3 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [85, 90, 85],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  // Animate lightness: 36% → 32% → 36% for purple, 59% → 55% → 59% for pink, 56% → 60% → 56% for orange
  const lightness1 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [36, 32, 36],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  const lightness2 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [59, 55, 59],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  const lightness3 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [56, 60, 56],
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

  const gradientStyle = \`linear-gradient(\${angle}deg, hsl(\${hue1}, \${saturation1}%, \${lightness1}%), hsl(\${hue2}, \${saturation2}%, \${lightness2}%), hsl(\${hue3}, \${saturation3}%, \${lightness3}%))\`;

  return (
    <AbsoluteFill
      style={{
        background: gradientStyle,
      }}
    />
  );
}`
}; 