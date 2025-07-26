import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from 'remotion';

export default function VibeyBG() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animate the gradient properties over time
  // Cycle duration: 8 seconds (240 frames at 30fps)
  const cycleDuration = fps * 8;
  
  // Animate hue 1: 299° → 295° (magenta variations)
  const hue1 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [299, 295, 299],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  // Animate hue 2: 187° → 193° (cyan variations)
  const hue2 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [187, 193, 187],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  // Animate saturation: 100% → 95% → 100% for magenta, 100% → 90% → 100% for cyan
  const saturation1 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [100, 95, 100],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  const saturation2 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [100, 90, 100],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  // Animate lightness: 49% → 52% → 49% for magenta, 61% → 58% → 61% for cyan
  const lightness1 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [49, 52, 49],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  const lightness2 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [61, 58, 61],
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
  id: 'vibey-bg',
  name: 'Vibey BG',
  duration: 240, // 8 seconds
  previewFrame: 120,
  getCode: () => `const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;

export default function VibeyBG() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animate the gradient properties over time
  // Cycle duration: 8 seconds (240 frames at 30fps)
  const cycleDuration = fps * 8;
  
  // Animate hue 1: 299° → 295° (magenta variations)
  const hue1 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [299, 295, 299],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  // Animate hue 2: 187° → 193° (cyan variations)
  const hue2 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [187, 193, 187],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  // Animate saturation: 100% → 95% → 100% for magenta, 100% → 90% → 100% for cyan
  const saturation1 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [100, 95, 100],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  const saturation2 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [100, 90, 100],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  // Animate lightness: 49% → 52% → 49% for magenta, 61% → 58% → 61% for cyan
  const lightness1 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [49, 52, 49],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  const lightness2 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [61, 58, 61],
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