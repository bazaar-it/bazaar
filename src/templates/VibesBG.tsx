import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from 'remotion';

export default function VibesBG() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animate the gradient properties over time
  // Cycle duration: 20 seconds (600 frames at 30fps) - very slow for ambient effect
  const cycleDuration = fps * 20;
  
  // Color progression: #40e0d0 (turquoise) → #ff8c00 (orange) → #ff0080 (deep pink)
  // Converting to HSL: 174° → 33° → 330°
  
  // Animate hue 1: 174° → 33° → 330° → back to 174°
  const hue1 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 3, (cycleDuration * 2) / 3, cycleDuration],
    [174, 33, 330, 174],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  // Animate hue 2: Offset by ~20° for gradient variation
  const hue2 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 3, (cycleDuration * 2) / 3, cycleDuration],
    [194, 53, 350, 194],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  // Animate saturation: 70% → 100% for vibrant colors
  const saturation1 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [70, 100, 70],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  const saturation2 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [85, 90, 85],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  // Animate lightness: 50% → 60% for good vibrancy
  const lightness1 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [50, 60, 50],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  const lightness2 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [55, 50, 55],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  // Animate angle: ±25° around 45° (20° → 70°) for more dynamic movement
  const angle = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [20, 70, 20],
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
  id: 'vibes-bg-gradient',
  name: 'Rainbow BG',
  duration: 600, // 20 seconds for full cycle
  previewFrame: 150,
  getCode: () => `const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;

export default function VibesBG() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animate the gradient properties over time
  // Cycle duration: 20 seconds (600 frames at 30fps) - very slow for ambient effect
  const cycleDuration = fps * 20;
  
  // Color progression: #40e0d0 (turquoise) → #ff8c00 (orange) → #ff0080 (deep pink)
  // Converting to HSL: 174° → 33° → 330°
  
  // Animate hue 1: 174° → 33° → 330° → back to 174°
  const hue1 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 3, (cycleDuration * 2) / 3, cycleDuration],
    [174, 33, 330, 174],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  // Animate hue 2: Offset by ~20° for gradient variation
  const hue2 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 3, (cycleDuration * 2) / 3, cycleDuration],
    [194, 53, 350, 194],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  // Animate saturation: 70% → 100% for vibrant colors
  const saturation1 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [70, 100, 70],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  const saturation2 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [85, 90, 85],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  // Animate lightness: 50% → 60% for good vibrancy
  const lightness1 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [50, 60, 50],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  const lightness2 = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [55, 50, 55],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  // Animate angle: ±25° around 45° (20° → 70°) for more dynamic movement
  const angle = interpolate(
    frame % cycleDuration,
    [0, cycleDuration / 2, cycleDuration],
    [20, 70, 20],
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