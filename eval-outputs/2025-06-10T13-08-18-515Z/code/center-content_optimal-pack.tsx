// Evaluation Output
// Prompt: Center Content
// Model Pack: optimal-pack
// Generated: 2025-06-10T13:19:28.038Z
// Latency: 50648ms
// Cost: $0.0024
// Input: make it centered

const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;

export default function Scene1_12345() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const fadeIn = interpolate(frame, [0, fps * 1], [0, 1], { 
    extrapolateLeft: "clamp", 
    extrapolateRight: "clamp" 
  });
  
  return (
    <AbsoluteFill style={{
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      fontFamily: "Inter, sans-serif",
      opacity: fadeIn
    }}>
      <div style={{
        textAlign: "center",
        color: "white",
        padding: "2rem",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center"
      }}>
        <h1 style={{
          fontSize: "3rem",
          fontWeight: "700",
          margin: "0 0 1rem 0",
          textShadow: "0 2px 10px rgba(0,0,0,0.3)"
        }}>
          Welcome to Bazaar
        </h1>
        <p style={{
          fontSize: "1.2rem",
          opacity: "0.9",
          margin: "0"
        }}>
          Create amazing motion graphics
        </p>
      </div>
    </AbsoluteFill>
  );
}
