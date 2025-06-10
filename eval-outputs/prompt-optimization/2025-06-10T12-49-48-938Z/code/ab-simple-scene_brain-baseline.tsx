// Prompt Optimization Output
// Prompt: Simple Scene Creation
// Variation: Current Brain Prompt
// Service: brain
// Generated: 2025-06-10T12:50:49.540Z
// Latency: 59660ms
// Cost: $0.0034

const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;

export default function Scene1_2d403e23() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Welcome text fade-in: starts at frame 0, duration 60 frames
  const welcomeOpacity = interpolate(
    frame,
    [0, 60],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp"
    }
  );

  // Subtext fade-in: starts at frame 30, duration 60 frames
  const subtextOpacity = interpolate(
    frame,
    [30, 90],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp"
    }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#ffffff",
        justifyContent: "center",
        alignItems: "center",
        display: "flex",
        flexDirection: "column"
      }}
    >
      <div
        style={{
          opacity: welcomeOpacity,
          color: "#333333",
          fontSize: "4.5rem",
          fontWeight: "700",
          fontFamily: "Arial, sans-serif",
          marginBottom: "1.5rem",
          textAlign: "center",
          lineHeight: "1.1",
          letterSpacing: "0.01em",
          transform: "translate(-50%, -50%) scale(1)",
          position: "absolute",
          left: "50%",
          top: "40%"
        }}
      >
        Welcome!
      </div>
      <div
        style={{
          opacity: subtextOpacity,
          color: "#555555",
          fontSize: "2.25rem",
          fontWeight: "400",
          fontFamily: "Arial, sans-serif",
          textAlign: "center",
          lineHeight: "1.3",
          letterSpacing: "0.01em",
          transform: "translate(-50%, -50%) scale(1)",
          position: "absolute",
          left: "50%",
          top: "55%"
        }}
      >
        We're glad to have you here.
      </div>
    </AbsoluteFill>
  );
}