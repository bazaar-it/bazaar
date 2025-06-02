//src/templates/GrowthGraph.tsx
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  spring,
  useVideoConfig,
} from "remotion";

export default function GrowthGraph() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cameraProgress = spring({
    frame,
    fps,
    config: { damping: 30, stiffness: 60 },
  });

  const data = [
    {
      year: "2025",
      value: 10,
      gradient: ["#F56040", "#F77737"],
    },
    {
      year: "2026",
      value: 30,
      gradient: ["#833AB4", "#405DE6"],
    },
    {
      year: "2027",
      value: 85,
      gradient: ["#405DE6", "#00C4CC"],
    },
  ];

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)",
        transform: `scale(${interpolate(cameraProgress, [0, 1], [1.08, 1])})`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 60,
        paddingBottom: 40,
        justifyContent: "flex-start",
      }}
    >
      {/* Title Block */}
      <div
        style={{
          textAlign: "center",
          color: "white",
          fontFamily: "Inter, sans-serif",
          marginBottom: 60,
          transform: `scale(${spring({ frame, fps, config: { damping: 12, stiffness: 200 } })})`,
        }}
      >
        <h1 style={{ fontSize: 52, fontWeight: 700, margin: 0 }}>
          Bazaar Revenue Growth by Year
        </h1>
        <p style={{ fontSize: 22, opacity: 0.7, marginTop: 12 }}>
          Europe's Fastest Growing Startup
        </p>
      </div>

      {/* Bar Section */}
      {data.map((item, i) => {
        const progress = spring({
          frame: frame - i * 15,
          fps,
          config: { damping: 12, stiffness: 80 },
        });

        const valueSpring = spring({
          frame: frame - i * 15 - 10,
          fps,
          config: { damping: 12, stiffness: 100 },
        });

        const width = interpolate(progress, [0, 1], [0, (item.value / 100) * 800]);
        const shimmerX = interpolate(frame - i * 15, [0, 60], [-100, 100], {
          extrapolateRight: "clamp",
        });

        return (
          <div
            key={item.year}
            style={{
              marginBottom: 56,
              position: "relative",
              width: 800,
            }}
          >
            <div
              style={{
                color: "white",
                fontSize: 24,
                fontWeight: 700,
                fontFamily: "Inter, sans-serif",
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              {item.year}
            </div>

            <div
              style={{
                width: "100%",
                height: 48,
                background: "#333",
                borderRadius: 32,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width,
                  height: "100%",
                  background: `linear-gradient(90deg, ${item.gradient.join(", ")})`,
                  borderRadius: 32,
                  boxShadow: `0 0 20px ${item.gradient[1]}`,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: `${shimmerX}%`,
                    width: 150,
                    height: "100%",
                    background:
                      "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
                    transform: "skewX(-20deg)",
                  }}
                />
              </div>

              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: width,
                  transform: `translate(16px, -50%) scale(${valueSpring})`,
                  opacity: valueSpring,
                  background: "white",
                  color: "#1a1a1a",
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 700,
                  fontSize: 20,
                  padding: "8px 16px",
                  borderRadius: 16,
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
                  whiteSpace: "nowrap",
                }}
              >
                ${item.value}M
              </div>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
} 