// Evaluation Output
// Prompt: Add Button with Image Reference
// Model Pack: optimal-pack
// Generated: 2025-06-10T13:25:55.342Z
// Latency: 94706ms
// Cost: $0.0062
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
      background: "radial-gradient(ellipse at center, #18182a 0%, #07070d 100%)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      fontFamily: "Inter, sans-serif",
      opacity: fadeIn
    }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          position: "relative",
          padding: "0",
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #39c6f6 0%, #a259e6 60%, #ff4ecd 100%)",
            borderRadius: "32px 32px 32px 32px / 32px 32px 32px 32px",
            boxShadow: "0 0 32px 8px #a259e6, 0 0 64px 0 #39c6f6, 0 0 24px 0 #ff4ecd",
            padding: "2.8rem 3.5rem 2.8rem 2.8rem",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            minWidth: "410px",
            minHeight: "200px",
            position: "relative",
            zIndex: 1,
            border: "2px solid rgba(255,255,255,0.08)",
            transition: "box-shadow 0.3s",
            filter: "drop-shadow(0 0 24px #a259e6)",
          }}
        >
          <div style={{
            textAlign: "left",
            color: "white",
            padding: "0",
            userSelect: "none"
          }}>
            <h1 style={{
              fontSize: "3.2rem",
              fontWeight: "800",
              margin: "0 0 0.3em 0",
              letterSpacing: "0.02em",
              lineHeight: 1.05,
              textShadow: "0 2px 24px #18182a, 0 0 12px #fff6",
            }}>
              HIPAA
            </h1>
            <div style={{
              fontSize: "2.1rem",
              fontWeight: "700",
              margin: "0",
              letterSpacing: "0.01em",
              textShadow: "0 2px 16px #18182a, 0 0 8px #fff6",
            }}>
              COMPLIANT
            </div>
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            top: "50%",
            right: "-80px",
            transform: "translateY(-50%)",
            zIndex: 2,
            width: "120px",
            height: "120px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "none",
          }}
        >
          <div
            style={{
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              boxShadow:
                "0 0 32px 8px #a259e6, 0 0 64px 0 #39c6f6, 0 0 24px 0 #ff4ecd",
              background: "radial-gradient(circle at 60% 40%, #a259e6 60%, #39c6f6 100%)",
              border: "6px solid #fff2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              transition: "box-shadow 0.3s",
              filter: "drop-shadow(0 0 24px #a259e6)",
            }}
          >
            <svg width="54" height="54" viewBox="0 0 54 54">
              <polyline
                points="16,30 25,39 40,19"
                style={{
                  fill: "none",
                  stroke: "#fff",
                  strokeWidth: 6,
                  strokeLinecap: "round",
                  strokeLinejoin: "round",
                  filter: "drop-shadow(0 0 8px #fff6)"
                }}
              />
            </svg>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}