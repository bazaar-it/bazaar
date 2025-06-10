// Evaluation Output
// Prompt: Ambiguous Request Clarification
// Model Pack: optimal-pack
// Generated: 2025-06-10T13:46:16.195Z
// Latency: 104011ms
// Cost: $0.0049
// Input: make it better

const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } = window.Remotion;

export default function Scene1_12345() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Fade-in for the whole scene
  const fadeIn = interpolate(frame, [0, fps * 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });

  // Spring pop for the headline
  const headlineScale = spring({
    frame: frame - Math.floor(fps * 0.3),
    fps,
    from: 0.7,
    to: 1,
    config: { damping: 10, mass: 0.8 }
  });

  // Subheadline slide up
  const subTextY = interpolate(
    frame,
    [fps * 0.5, fps * 1.2],
    [40, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const subTextOpacity = interpolate(
    frame,
    [fps * 0.7, fps * 1.2],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Animated gradient background
  const bgAngle = interpolate(frame, [0, fps * 2], [135, 165], {
    extrapolateLeft: "clamp",
    extrapolateRight: "extend"
  });
  const bg = `linear-gradient(${bgAngle}deg, #43e97b 0%, #38f9d7 50%, #667eea 100%)`;

  return (
    <AbsoluteFill
      style={{
        background: bg,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "'Poppins', 'Inter', sans-serif",
        opacity: fadeIn,
        transition: "background 1s"
      }}
    >
      <div
        style={{
          textAlign: "center",
          color: "#fff",
          padding: "2.5rem 2rem 2rem 2rem",
          background: "rgba(20, 20, 40, 0.16)",
          borderRadius: "2rem",
          boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.25)",
          border: "1.5px solid rgba(255,255,255,0.18)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          maxWidth: 520,
        }}
      >
        <h1
          style={{
            fontSize: "3.6rem",
            fontWeight: 800,
            margin: "0 0 1.1rem 0",
            letterSpacing: "-0.03em",
            textShadow: "0 6px 32px rgba(80,180,255,0.20), 0 2px 12px rgba(0,0,0,0.15)",
            background: "linear-gradient(90deg, #fff 60%, #c0f6ff 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            transform: `scale(${headlineScale})`,
            transition: "transform 0.4s cubic-bezier(.77,0,.18,1)",
            filter: "drop-shadow(0 2px 8px #2ee59d88)",
          }}
        >
          Welcome to Bazaar
        </h1>
        <p
          style={{
            fontSize: "1.35rem",
            fontWeight: 500,
            color: "#eafffa",
            opacity: subTextOpacity,
            margin: 0,
            letterSpacing: "0.01em",
            transform: `translateY(${subTextY}px)`,
            transition: "opacity 0.4s, transform 0.4s",
            textShadow: "0 1px 8px #1f5e5e44"
          }}
        >
          Create amazing motion graphics
        </p>
      </div>
    </AbsoluteFill>
  );
}
