// Evaluation Output
// Prompt: Context-Aware Scene Edit
// Model Pack: optimal-pack
// Generated: 2025-06-10T13:43:23.021Z
// Latency: 66793ms
// Cost: $0.0035
// Input: make the background more corporate and professional

const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;

export default function Scene1_12345() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const fadeIn = interpolate(frame, [0, fps * 1], [0, 1], { 
    extrapolateLeft: "clamp", 
    extrapolateRight: "clamp" 
  });

  // Subtle animated background pattern (diagonal lines)
  const bgPatternOpacity = interpolate(frame, [0, fps * 1], [0, 0.08], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });

  return (
    <AbsoluteFill style={{
      background: "linear-gradient(120deg, #f5f7fa 0%, #c3cfe2 100%)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      fontFamily: "'Segoe UI', 'Inter', Arial, sans-serif",
      opacity: fadeIn,
      position: "relative"
    }}>
      {/* Animated subtle diagonal line pattern overlay */}
      <div style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        backgroundImage:
          "repeating-linear-gradient(135deg, rgba(80,100,130,0.07) 0px, rgba(80,100,130,0.07) 2px, transparent 4px, transparent 24px)",
        opacity: bgPatternOpacity,
        zIndex: 0
      }} />
      <div style={{
        position: "relative",
        zIndex: 1,
        textAlign: "center",
        color: "#1a2233",
        padding: "2.5rem 3rem",
        background: "rgba(255,255,255,0.82)",
        borderRadius: "1.2rem",
        boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.11), 0 1.5px 8px 0 rgba(60,80,120,0.07)",
        border: "1px solid rgba(180,200,230,0.16)"
      }}>
        <h1 style={{
          fontSize: "2.6rem",
          fontWeight: 700,
          margin: "0 0 1.1rem 0",
          letterSpacing: "-0.02em",
          textShadow: "0 1px 3px rgba(180,200,230,0.18)"
        }}>
          Welcome to Bazaar
        </h1>
        <p style={{
          fontSize: "1.18rem",
          opacity: 0.82,
          margin: 0,
          fontWeight: 500,
          letterSpacing: "0.01em"
        }}>
          Create amazing motion graphics
        </p>
      </div>
    </AbsoluteFill>
  );
}
