// src/templates/BlueGradientText.tsx
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export default function BlueGradientText() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const loopDuration = fps * 8;
  const hueShift = (frame % loopDuration) * (360 / loopDuration) * 1.5;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#ffffff",
        justifyContent: "center",
        alignItems: "center",
        display: "flex"
      }}
    >
      <svg width="1000" height="150" viewBox="0 0 1000 150">
        <defs>
          <linearGradient
            id="blue-gradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
            gradientTransform={`rotate(${360 - hueShift}, 0.5, 0.5)`}
          >
            <stop offset="0%" stopColor="hsl(200, 100%, 60%)" />
            <stop offset="20%" stopColor="hsl(210, 100%, 60%)" />
            <stop offset="40%" stopColor="hsl(220, 100%, 60%)" />
            <stop offset="60%" stopColor="hsl(230, 100%, 60%)" />
            <stop offset="80%" stopColor="hsl(240, 100%, 60%)" />
            <stop offset="100%" stopColor="hsl(200, 100%, 60%)" />
          </linearGradient>
        </defs>

        <text
          x="100"
          y="100"
          fill="#000"
          fontFamily="Inter, sans-serif"
          fontWeight="700"
          fontSize="72"
        >
          Create
        </text>

        <text
          x="370"
          y="100"
          fill="url(#blue-gradient)"
          fontFamily="Inter, sans-serif"
          fontWeight="700"
          fontSize="72"
        >
          without
        </text>

        <text
          x="655"
          y="100"
          fill="#000"
          fontFamily="Inter, sans-serif"
          fontWeight="700"
          fontSize="72"
        >
          Limits
        </text>
      </svg>
    </AbsoluteFill>
  );
} 