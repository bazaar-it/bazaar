// src/templates/GrowthGraph.tsx
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  spring,
  useVideoConfig,
} from 'remotion';

export default function GrowthGraph() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cameraProgress = spring({
    frame: frame - 30,
    fps,
    config: {
      damping: 100,
      stiffness: 200,
      mass: 0.5,
    },
  });

  const bars = [
    { label: "Q1", value: 85, color: "#ff6b6b" },
    { label: "Q2", value: 120, color: "#4ecdc4" },
    { label: "Q3", value: 95, color: "#45b7d1" },
    { label: "Q4", value: 140, color: "#96ceb4" },
  ];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#1a1a2e",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Arial, sans-serif",
        color: "#fff",
        padding: "10vh 0",
      }}
    >
      <div
        style={{
          height: "80vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <h1
          style={{
            fontSize: 84,
            fontWeight: "bold",
            marginBottom: 60,
            opacity: interpolate(frame, [0, 30], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            textAlign: "center",
            lineHeight: 1.1,
          }}
        >
          Growth Analytics
        </h1>

        <div
          style={{
            display: "flex",
            alignItems: "end",
            gap: 32,
            height: 450,
            transform: `scale(${cameraProgress})`,
          }}
        >
          {bars.map((bar, index) => {
            const barHeight = interpolate(
              frame,
              [60 + index * 15, 90 + index * 15],
              [0, (bar.value / 140) * 400],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }
            );

            const valueOpacity = interpolate(
              frame,
              [90 + index * 15, 120 + index * 15],
              [0, 1],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }
            );

            return (
              <div
                key={index}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: "bold",
                    opacity: valueOpacity,
                  }}
                >
                  {bar.value}%
                </div>
                <div
                  style={{
                    width: 80,
                    height: barHeight,
                    backgroundColor: bar.color,
                    borderRadius: "6px 6px 0 0",
                    boxShadow: `0 0 30px ${bar.color}50`,
                  }}
                />
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: "500",
                    opacity: interpolate(frame, [30, 60], [0, 1], {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    }),
                  }}
                >
                  {bar.label}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            marginTop: 60,
            fontSize: 36,
            fontWeight: "500",
            opacity: interpolate(frame, [150, 180], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            textAlign: "center",
          }}
        >
          🚀 Record Breaking Performance
        </div>
      </div>
    </AbsoluteFill>
  );
}

// Template configuration - exported so registry can use it
export const templateConfig = {
  id: 'growth-graph',
  name: 'Growth Graph',
  duration: 240, // 8 seconds
  previewFrame: 30,
  getCode: () => `const {
AbsoluteFill,
interpolate,
useCurrentFrame,
spring,
useVideoConfig,
} = window.Remotion;

export default function GrowthGraph() {
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

const cameraProgress = spring({
  frame: frame - 30,
  fps,
  config: {
    damping: 100,
    stiffness: 200,
    mass: 0.5,
  },
});

const bars = [
  { label: "Q1", value: 85, color: "#ff6b6b" },
  { label: "Q2", value: 120, color: "#4ecdc4" },
  { label: "Q3", value: 95, color: "#45b7d1" },
  { label: "Q4", value: 140, color: "#96ceb4" },
];

return (
  <AbsoluteFill
    style={{
      backgroundColor: "#1a1a2e",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "Arial, sans-serif",
      color: "#fff",
      padding: "10vh 0",
    }}
  >
    <div
      style={{
        height: "80vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
      }}
    >
      <h1
        style={{
          fontSize: 84,
          fontWeight: "bold",
          marginBottom: 60,
          opacity: interpolate(frame, [0, 30], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          textAlign: "center",
          lineHeight: 1.1,
        }}
      >
        Growth Analytics
      </h1>

      <div
        style={{
          display: "flex",
          alignItems: "end",
          gap: 32,
          height: 450,
          transform: \`scale(\${cameraProgress})\`,
        }}
      >
        {bars.map((bar, index) => {
          const barHeight = interpolate(
            frame,
            [60 + index * 15, 90 + index * 15],
            [0, (bar.value / 140) * 400],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }
          );

          const valueOpacity = interpolate(
            frame,
            [90 + index * 15, 120 + index * 15],
            [0, 1],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }
          );

          return (
            <div
              key={index}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div
                style={{
                  fontSize: 28,
                  fontWeight: "bold",
                  opacity: valueOpacity,
                }}
              >
                {bar.value}%
              </div>
              <div
                style={{
                  width: 80,
                  height: barHeight,
                  backgroundColor: bar.color,
                  borderRadius: "6px 6px 0 0",
                  boxShadow: \`0 0 30px \${bar.color}50\`,
                }}
              />
              <div
                style={{
                  fontSize: 24,
                  fontWeight: "500",
                  opacity: interpolate(frame, [30, 60], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }),
                }}
              >
                {bar.label}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 60,
          fontSize: 36,
          fontWeight: "500",
          opacity: interpolate(frame, [150, 180], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          textAlign: "center",
        }}
      >
        🚀 Record Breaking Performance
      </div>
    </div>
  </AbsoluteFill>
);
}`
}; 