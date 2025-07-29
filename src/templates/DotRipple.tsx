// src/templates/DotRipple.tsx
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export default function DotRipple() {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const dotSpacing = 14;
  const dotRadius = 1.5;
  const centerX = width / 2;
  const centerY = height / 2;

  const rows = Math.ceil(height / dotSpacing);
  const cols = Math.ceil(width / dotSpacing);

  const rippleFrequency = 0.08; // Lower for smoother waves
  const rippleSpeed = 6;        // Faster spread for smoother motion

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0f172a",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      <svg width="100%" height="100%">
        {Array.from({ length: rows * cols }).map((_, i) => {
          const x = (i % cols) * dotSpacing;
          const y = Math.floor(i / cols) * dotSpacing;

          const dx = x - centerX;
          const dy = y - centerY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Multiple wave layers for smoother animation
          const wave1 = Math.sin((frame - distance / rippleSpeed) * rippleFrequency);
          const wave2 = Math.sin((frame - distance / (rippleSpeed * 0.7)) * rippleFrequency * 1.3) * 0.3;
          const wave3 = Math.sin((frame - distance / (rippleSpeed * 1.5)) * rippleFrequency * 0.6) * 0.2;
          
          // Combine waves and smooth with easing
          const combinedWave = wave1 + wave2 + wave3;
          const normalizedWave = (combinedWave + 1.5) / 3; // Normalize to 0-1
          const alpha = Math.max(0.1, Math.min(0.9, normalizedWave)); // Clamp between 0.1-0.9

          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={dotRadius}
              fill="#6ee7b7"
              fillOpacity={alpha}
            />
          );
        })}
      </svg>

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0) 40%, rgba(0,0,0,0.9) 100%)",
        }}
      />
    </AbsoluteFill>
  );
}

// Template configuration - exported so registry can use it
export const templateConfig = {
  id: 'dot-ripple',
  name: 'Dot Ripple BG',
  duration: 180, // 6 seconds
  previewFrame: 30,
  getCode: () => `const { AbsoluteFill, useCurrentFrame, useVideoConfig } = window.Remotion;

export default function DotRipple() {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const dotSpacing = 14;
  const dotRadius = 1.5;
  const centerX = width / 2;
  const centerY = height / 2;

  const rows = Math.ceil(height / dotSpacing);
  const cols = Math.ceil(width / dotSpacing);

  const rippleFrequency = 0.08; // Lower for smoother waves
  const rippleSpeed = 6;        // Faster spread for smoother motion

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0f172a",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      <svg width="100%" height="100%">
        {Array.from({ length: rows * cols }).map((_, i) => {
          const x = (i % cols) * dotSpacing;
          const y = Math.floor(i / cols) * dotSpacing;

          const dx = x - centerX;
          const dy = y - centerY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Multiple wave layers for smoother animation
          const wave1 = Math.sin((frame - distance / rippleSpeed) * rippleFrequency);
          const wave2 = Math.sin((frame - distance / (rippleSpeed * 0.7)) * rippleFrequency * 1.3) * 0.3;
          const wave3 = Math.sin((frame - distance / (rippleSpeed * 1.5)) * rippleFrequency * 0.6) * 0.2;
          
          // Combine waves and smooth with easing
          const combinedWave = wave1 + wave2 + wave3;
          const normalizedWave = (combinedWave + 1.5) / 3; // Normalize to 0-1
          const alpha = Math.max(0.1, Math.min(0.9, normalizedWave)); // Clamp between 0.1-0.9

          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={dotRadius}
              fill="#6ee7b7"
              fillOpacity={alpha}
            />
          );
        })}
      </svg>

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0) 40%, rgba(0,0,0,0.9) 100%)",
        }}
      />
    </AbsoluteFill>
  );
}`
}; 