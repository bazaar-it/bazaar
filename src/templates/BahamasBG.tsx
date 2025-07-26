import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from 'remotion';

export default function BahamasBG() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animate the gradient properties over time
  // Cycle duration: 8 seconds (240 frames at 30fps)
  const cycleDuration = fps * 8;
  
  // Animate hue 1: 178° → 185° (light cyan variations)
  const hue1 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [178, 185, 178],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  // Animate hue 2: 192° → 188° (blue-cyan variations)
  const hue2 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [192, 188, 192],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  // Animate saturation: 70% → 80% → 70% for light cyan, 94% → 88% → 94% for blue-cyan
  const saturation1 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [70, 80, 70],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  const saturation2 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [94, 88, 94],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  // Animate lightness: 85% → 80% → 85% for light cyan, 51% → 55% → 51% for blue-cyan
  const lightness1 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [85, 80, 85],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  const lightness2 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [51, 55, 51],
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
  id: 'bahamas-bg',
  name: 'Bahamas BG',
  duration: 240, // 8 seconds
  previewFrame: 120,
  getCode: () => `const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;

export default function BahamasBG() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animate the gradient properties over time
  // Cycle duration: 8 seconds (240 frames at 30fps)
  const cycleDuration = fps * 8;
  
  // Animate hue 1: 178° → 185° (light cyan variations)
  const hue1 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [178, 185, 178],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  // Animate hue 2: 192° → 188° (blue-cyan variations)
  const hue2 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [192, 188, 192],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  // Animate saturation: 70% → 80% → 70% for light cyan, 94% → 88% → 94% for blue-cyan
  const saturation1 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [70, 80, 70],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  const saturation2 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [94, 88, 94],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  // Animate lightness: 85% → 80% → 85% for light cyan, 51% → 55% → 51% for blue-cyan
  const lightness1 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [85, 80, 85],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  const lightness2 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [51, 55, 51],
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