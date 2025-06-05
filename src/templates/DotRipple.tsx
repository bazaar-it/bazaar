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

  const rippleFrequency = 0.15; // Controls wave frequency
  const rippleSpeed = 4;        // Higher = faster ripple spread

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

          const phase = (frame - distance / rippleSpeed) * rippleFrequency;
          const alpha = 0.5 + 0.5 * Math.sin(phase);

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