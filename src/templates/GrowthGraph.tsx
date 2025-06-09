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
        fontFamily: "Inter, sans-serif",
        color: "#fff",
        padding: "6vh 0 8vh 0",
      }}
    >
      <div style={{ height: "20vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <h1
          style={{
            fontSize: 84,
            fontWeight: "bold",
            margin: 0,
            opacity: interpolate(frame, [0, 30], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            textAlign: "center",
            lineHeight: 1.1,
            fontFamily: "Inter, sans-serif",
          }}
        >
          Growth Analytics
        </h1>
      </div>

      <div 
        style={{ 
          height: "45vh",
          display: "flex", 
          alignItems: "flex-end",
          justifyContent: "center",
          width: "100%",
          marginBottom: "2vh",
          marginTop: "2vh",
          position: "relative",
        }}
      >
        {/* Scaling container for bars and percentages only */}
        <div
          style={{
            display: "flex",
            alignItems: "end",
            gap: 32,
            height: "100%",
            transform: `scale(${cameraProgress})`,
            transformOrigin: "bottom center",
          }}
        >
          {bars.map((bar, index) => {
            const barHeight = interpolate(
              frame,
              [60 + index * 15, 90 + index * 15],
              [0, (bar.value / 140) * 280],
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
                    fontFamily: "Inter, sans-serif",
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
              </div>
            );
          })}
        </div>
        
        {/* Fixed X-axis labels positioned below the bars */}
        <div
          style={{
            position: "absolute",
            bottom: -80,
            display: "flex",
            alignItems: "center",
            gap: 32,
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          {bars.map((bar, index) => (
            <div
              key={index}
              style={{
                width: 80,
                display: "flex",
                justifyContent: "center",
                fontSize: 24,
                fontWeight: "500",
                opacity: interpolate(frame, [30, 60], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
                fontFamily: "Inter, sans-serif",
              }}
            >
              {bar.label}
            </div>
          ))}
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
      fontFamily: "Inter, sans-serif",
      color: "#fff",
      padding: "6vh 0 8vh 0",
    }}
  >
    <div style={{ height: "20vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <h1
        style={{
          fontSize: 84,
          fontWeight: "bold",
          margin: 0,
          opacity: interpolate(frame, [0, 30], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          textAlign: "center",
          lineHeight: 1.1,
          fontFamily: "Inter, sans-serif",
        }}
      >
        Growth Analytics
      </h1>
    </div>

    <div 
      style={{ 
        height: "45vh",
        display: "flex", 
        alignItems: "flex-end",
        justifyContent: "center",
        width: "100%",
        marginBottom: "2vh",
        marginTop: "2vh",
        position: "relative",
      }}
    >
      {/* Scaling container for bars and percentages only */}
      <div
        style={{
          display: "flex",
          alignItems: "end",
          gap: 32,
          height: "100%",
          transform: \`scale(\${cameraProgress})\`,
          transformOrigin: "bottom center",
        }}
      >
        {bars.map((bar, index) => {
          const barHeight = interpolate(
            frame,
            [60 + index * 15, 90 + index * 15],
            [0, (bar.value / 140) * 280],
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
                  fontFamily: "Inter, sans-serif",
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
            </div>
          );
        })}
      </div>
      
      {/* Fixed X-axis labels positioned below the bars */}
      <div
        style={{
          position: "absolute",
          bottom: -80,
          display: "flex",
          alignItems: "center",
          gap: 32,
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        {bars.map((bar, index) => (
          <div
            key={index}
            style={{
              width: 80,
              display: "flex",
              justifyContent: "center",
              fontSize: 24,
              fontWeight: "500",
              opacity: interpolate(frame, [30, 60], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              fontFamily: "Inter, sans-serif",
            }}
          >
            {bar.label}
          </div>
        ))}
      </div>
    </div>
  </AbsoluteFill>
);
}`
};