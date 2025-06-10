// Evaluation Output
// Prompt: Animate Background Elements
// Model Pack: optimal-pack
// Generated: 2025-06-10T13:22:02.464Z
// Latency: 85468ms
// Cost: $0.0039
// Input: animate the background circles to move inward in a spiral pattern

const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } = window.Remotion;

// Spiral circle config
const CIRCLES = [
  { radius: 220, color: 'rgba(255,255,255,0.10)', size: 320 },
  { radius: 160, color: 'rgba(255,255,255,0.13)', size: 220 },
  { radius: 110, color: 'rgba(255,255,255,0.17)', size: 140 },
  { radius: 70,  color: 'rgba(255,255,255,0.22)', size: 80 },
  { radius: 40,  color: 'rgba(255,255,255,0.28)', size: 40 },
];

function getSpiralPosition(frame, fps, idx, total, baseRadius) {
  // Animate inward spiral: angle and radius shrink over time
  const t = Math.min(frame / (fps * 1.2), 1); // 1.2s for full spiral
  const angle = interpolate(t, [0, 1], [idx * (Math.PI * 2 / total), idx * (Math.PI * 2 / total) + Math.PI * 2]);
  const spiralRadius = interpolate(t, [0, 1], [baseRadius, 18]);
  return {
    x: Math.cos(angle) * spiralRadius,
    y: Math.sin(angle) * spiralRadius,
  };
}

export default function Scene1_12345() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, fps * 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });

  return (
    <AbsoluteFill style={{
      background: "linear-gradient(120deg, #232526 0%, #6a82fb 100%)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      opacity: fadeIn,
      overflow: "hidden",
      position: "relative"
    }}>
      {/* Animated spiral circles */}
      <div style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        left: 0,
        top: 0,
        pointerEvents: "none",
        zIndex: 1,
      }}>
        {CIRCLES.map((circle, i) => {
          const { x, y } = getSpiralPosition(frame, fps, i, CIRCLES.length, circle.radius);
          // Subtle scale pulse
          const pulse = 1 + 0.08 * Math.sin((frame + i * 10) / 18);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `calc(50% + ${x}px - ${circle.size / 2}px)`,
                top: `calc(50% + ${y}px - ${circle.size / 2}px)`,
                width: circle.size * pulse,
                height: circle.size * pulse,
                borderRadius: "50%",
                background: circle.color,
                boxShadow: `0 6px 32px 0 rgba(120,120,255,0.13)`,
                filter: "blur(1.5px)",
                transition: "box-shadow 0.3s",
                zIndex: 2 - i,
                border: i === 0 ? "2px solid rgba(255,255,255,0.08)" : "none",
              }}
            />
          );
        })}
      </div>
      {/* Content */}
      <div style={{
        textAlign: "center",
        color: "#fff",
        padding: "2.5rem 2rem",
        zIndex: 10,
        boxShadow: "0 6px 32px 0 rgba(0,0,0,0.13)",
        borderRadius: "1.5rem",
        background: "rgba(20,25,45,0.17)",
        backdropFilter: "blur(4px)",
      }}>
        <h1 style={{
          fontSize: "3.2rem",
          fontWeight: 800,
          margin: "0 0 1.2rem 0",
          textShadow: "0 4px 24px rgba(30,60,180,0.22), 0 2px 10px rgba(0,0,0,0.25)",
          letterSpacing: "-0.02em",
        }}>
          Welcome to <span style={{color: "#ffd86b", textShadow: "0 2px 12px #fff8"}}>Bazaar</span>
        </h1>
        <p style={{
          fontSize: "1.35rem",
          opacity: 0.93,
          margin: 0,
          fontWeight: 500,
          letterSpacing: "0.01em",
          textShadow: "0 1px 6px rgba(0,0,0,0.12)"
        }}>
          Create amazing motion graphics
        </p>
      </div>
    </AbsoluteFill>
  );
}
