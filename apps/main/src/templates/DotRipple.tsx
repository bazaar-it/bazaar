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

// Template configuration - exported so registry can use it
export const templateConfig = {
  id: 'dot-ripple',
  name: 'Dot Ripple',
  duration: 180, // 6 seconds
  previewFrame: 30,
  getCode: () => `const { AbsoluteFill, useCurrentFrame, interpolate } = window.Remotion;

export default function DotRipple() {
const frame = useCurrentFrame();

const ripples = Array.from({ length: 3 }, (_, i) => {
  const delay = i * 20;
  const scale = interpolate(
    frame - delay,
    [0, 60],
    [0, 3],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp"
    }
  );
  const opacity = interpolate(
    frame - delay,
    [0, 30, 60],
    [0, 0.8, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp"
    }
  );

  return { scale, opacity };
});

return (
  <AbsoluteFill
    style={{
      backgroundColor: "#000",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    {ripples.map((ripple, i) => (
      <div
        key={i}
        style={{
          position: "absolute",
          width: "100px",
          height: "100px",
          borderRadius: "50%",
          border: "2px solid #00ff88",
          transform: \`scale(\${ripple.scale})\`,
          opacity: ripple.opacity,
        }}
      />
    ))}
    <div
      style={{
        width: "20px",
        height: "20px",
        borderRadius: "50%",
        backgroundColor: "#00ff88",
        boxShadow: "0 0 20px #00ff88",
      }}
    />
  </AbsoluteFill>
);
}`
}; 