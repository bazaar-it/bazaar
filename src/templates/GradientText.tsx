// src/templates/GradientText.tsx
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export default function GradientText() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const loopDuration = fps * 8;
  const hueBase = (frame % loopDuration) * (360 / loopDuration);
  const getHue = (offset: number) => `hsl(${(hueBase + offset) % 360}, 100%, 60%)`;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#ffffff",
        justifyContent: "center",
        alignItems: "center",
        display: "flex",
      }}
    >
      <svg width="1000" height="150" viewBox="0 0 1000 150">
        <defs>
          <linearGradient id="text-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={getHue(0)} />
            <stop offset="20%" stopColor={getHue(60)} />
            <stop offset="40%" stopColor={getHue(120)} />
            <stop offset="60%" stopColor={getHue(180)} />
            <stop offset="80%" stopColor={getHue(240)} />
            <stop offset="100%" stopColor={getHue(300)} />
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
          Design
        </text>

        <text
          x="370"
          y="100"
          fill="url(#text-gradient)"
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

// Template configuration - exported so registry can use it
export const templateConfig = {
  id: 'gradient-text',
  name: 'Gradient Text',
  duration: 240, // 8 seconds
  previewFrame: 30,
  getCode: () => `const {
AbsoluteFill,
useCurrentFrame,
useVideoConfig,
} = window.Remotion;

export default function GradientText() {
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

const loopDuration = fps * 8;
const hueBase = (frame % loopDuration) * (360 / loopDuration);
const getHue = (offset) => \`hsl(\${(hueBase + offset) % 360}, 100%, 60%)\`;

return (
  <AbsoluteFill
    style={{
      backgroundColor: "#ffffff",
      justifyContent: "center",
      alignItems: "center",
      display: "flex",
    }}
  >
    <svg width="1000" height="150" viewBox="0 0 1000 150">
      <defs>
        <linearGradient id="text-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={getHue(0)} />
          <stop offset="20%" stopColor={getHue(60)} />
          <stop offset="40%" stopColor={getHue(120)} />
          <stop offset="60%" stopColor={getHue(180)} />
          <stop offset="80%" stopColor={getHue(240)} />
          <stop offset="100%" stopColor={getHue(300)} />
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
        Design
      </text>

      <text
        x="370"
        y="100"
        fill="url(#text-gradient)"
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
}`
}; 