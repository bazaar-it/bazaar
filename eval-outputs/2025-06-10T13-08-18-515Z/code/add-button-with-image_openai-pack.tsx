// Evaluation Output
// Prompt: Add Button with Image Reference
// Model Pack: openai-pack
// Generated: 2025-06-10T13:27:48.121Z
// Latency: 111869ms
// Cost: $0.0056
// Input: recreate this button with hover animations and glow effects

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
      background: "radial-gradient(ellipse at center, #181a23 0%, #000 100%)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      fontFamily: "Inter, sans-serif",
      opacity: fadeIn
    }}>
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          padding: "2.5rem 3.5rem 2.5rem 2.5rem",
          borderRadius: "32px",
          background: "linear-gradient(135deg, #36e4e4 0%, #a259e6 60%, #ff4ecd 100%)",
          boxShadow: "0 0 40px 8px #a259e6, 0 0 0 8px rgba(162,89,230,0.15)",
          minWidth: 420,
          minHeight: 200,
          filter: "drop-shadow(0 0 32px #a259e6)",
          transition: "box-shadow 0.3s, filter 0.3s",
          cursor: "pointer"
        }}
        onMouseEnter={e => {
          e.currentTarget.style.boxShadow = "0 0 64px 16px #ff4ecd, 0 0 0 12px rgba(54,228,228,0.12)";
          e.currentTarget.style.filter = "drop-shadow(0 0 48px #ff4ecd)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.boxShadow = "0 0 40px 8px #a259e6, 0 0 0 8px rgba(162,89,230,0.15)";
          e.currentTarget.style.filter = "drop-shadow(0 0 32px #a259e6)";
        }}
      >
        <div style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          zIndex: 2
        }}>
          <span style={{
            fontSize: "2.7rem",
            fontWeight: 800,
            letterSpacing: "0.02em",
            color: "#fff",
            textShadow: "0 2px 18px #000, 0 0 8px #36e4e4"
          }}>
            HIPAA
          </span>
          <span style={{
            fontSize: "2.2rem",
            fontWeight: 700,
            letterSpacing: "0.01em",
            color: "#fff",
            marginTop: "0.2em",
            textShadow: "0 2px 18px #000, 0 0 8px #a259e6"
          }}>
            COMPLIANT
          </span>
        </div>
        <div style={{
          position: "absolute",
          top: "-38px",
          right: "-54px",
          width: "120px",
          height: "120px",
          background: "radial-gradient(circle at 60% 40%, rgba(255,78,205,0.18) 60%, transparent 100%)",
          borderRadius: "50%",
          boxShadow: "0 0 32px 8px #ff4ecd",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 3,
          border: "6px solid #a259e6",
          transition: "box-shadow 0.3s"
        }}>
          <div style={{
            width: "60px",
            height: "60px",
            background: "radial-gradient(circle at 60% 40%, #181a23 70%, #a259e6 100%)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 24px #a259e6"
          }}>
            <svg width="38" height="38" viewBox="0 0 38 38">
              <polyline
                points="10,22 18,29 28,13"
                fill="none"
                stroke="#a259e6"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  filter: "drop-shadow(0 0 8px #a259e6)"
                }}
              />
            </svg>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}