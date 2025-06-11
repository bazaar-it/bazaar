// Evaluation Output
// Prompt: Context-Aware Scene Edit
// Model Pack: openai-pack
// Generated: 2025-06-10T13:44:31.134Z
// Latency: 67150ms
// Cost: $0.0045
// Input: make the background more corporate and professional

const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;

export default function Scene1_12345() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, fps * 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });

  // Subtle animated background gradient angle
  const animatedAngle = interpolate(frame, [0, fps * 2], [120, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${animatedAngle}deg, #e9ecef 0%, #f8fafc 70%, #dde1e7 100%)`,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "'Segoe UI', 'Inter', Arial, sans-serif",
        opacity: fadeIn,
        transition: "background 0.5s"
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.92)",
          boxShadow: "0 8px 32px 0 rgba(60,72,88,0.13)",
          borderRadius: "1.5rem",
          padding: "3rem 3.5rem 2.5rem 3.5rem",
          minWidth: 380,
          maxWidth: 520,
          textAlign: "center",
          border: "1px solid #e2e8f0"
        }}
      >
        <h1
          style={{
            fontSize: "2.5rem",
            fontWeight: 600,
            margin: "0 0 1.2rem 0",
            color: "#26334d",
            letterSpacing: "-0.5px",
            textShadow: "0 1px 2px rgba(180, 190, 200, 0.08)"
          }}
        >
          Welcome to Bazaar
        </h1>
        <div
          style={{
            height: 3,
            width: 48,
            background: "linear-gradient(90deg, #3b82f6 0%, #6366f1 100%)",
            borderRadius: 4,
            margin: "0 auto 1.2rem auto"
          }}
        />
        <p
          style={{
            fontSize: "1.15rem",
            opacity: 0.92,
            color: "#425066",
            margin: 0,
            fontWeight: 400,
            letterSpacing: "0.01em"
          }}
        >
          Create amazing motion graphics
        </p>
      </div>
    </AbsoluteFill>
  );
}
