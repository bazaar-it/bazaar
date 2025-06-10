// Evaluation Output
// Prompt: Animate Background Elements
// Model Pack: openai-pack
// Generated: 2025-06-10T13:23:57.830Z
// Latency: 114416ms
// Cost: $0.0033
// Input: animate the background circles to move inward in a spiral pattern

const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } = window.Remotion;

// Helper to generate spiral positions
function getSpiralPosition(centerX, centerY, radius, angleDeg) {
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleRad),
    y: centerY + radius * Math.sin(angleRad)
  };
}

const SPIRAL_CIRCLES = [
  { size: 320, color: 'rgba(255,255,255,0.09)', startAngle: 0, delay: 0 },
  { size: 220, color: 'rgba(255,255,255,0.12)', startAngle: 60, delay: 6 },
  { size: 140, color: 'rgba(255,255,255,0.13)', startAngle: 120, delay: 12 },
  { size: 90, color: 'rgba(255,255,255,0.18)', startAngle: 200, delay: 18 },
  { size: 60, color: 'rgba(255,255,255,0.22)', startAngle: 300, delay: 24 },
];

export default function Scene1_12345() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  
  const fadeIn = interpolate(frame, [0, fps * 1], [0, 1], { 
    extrapolateLeft: "clamp", 
    extrapolateRight: "clamp" 
  });

  // Spiral animation parameters
  const spiralDuration = fps * 1.3;
  const spiralTurns = 1.2;
  const spiralStartRadius = Math.max(width, height) * 0.6;
  const spiralEndRadius = 60;

  return (
    <AbsoluteFill style={{
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      fontFamily: "Inter, sans-serif",
      overflow: "hidden",
      opacity: fadeIn,
      position: 'relative',
    }}>
      {/* Spiral Circles */}
      {SPIRAL_CIRCLES.map((circle, i) => {
        // Each circle animates in slightly delayed
        const localFrame = Math.max(0, frame - circle.delay);
        const progress = interpolate(
          localFrame,
          [0, spiralDuration],
          [0, 1],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );
        // Spiral inward
        const angle = circle.startAngle + spiralTurns * 360 * progress;
        const radius = interpolate(progress, [0, 1], [spiralStartRadius, spiralEndRadius + i * 18]);
        const { x, y } = getSpiralPosition(width/2, height/2, radius, angle);
        // Fade in as they move
        const opacity = interpolate(progress, [0, 0.15, 1], [0, 0.8, 1]);
        // Slight blur for glow
        const blur = interpolate(progress, [0, 1], [16, 4]);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x - circle.size/2,
              top: y - circle.size/2,
              width: circle.size,
              height: circle.size,
              borderRadius: '50%',
              background: circle.color,
              boxShadow: `0 4px 40px 0 ${circle.color}`,
              filter: `blur(${blur}px)` ,
              opacity,
              transition: 'opacity 0.2s',
              pointerEvents: 'none',
            }}
          />
        );
      })}
      <div style={{
        textAlign: "center",
        color: "#fff",
        padding: "2.5rem 2rem 2rem 2rem",
        background: "rgba(38, 31, 73, 0.23)",
        borderRadius: "2rem",
        boxShadow: "0 6px 40px 0 rgba(80, 60, 180, 0.18)",
        backdropFilter: "blur(4px)",
        zIndex: 2,
        maxWidth: 520,
      }}>
        <h1 style={{
          fontSize: "3.3rem",
          fontWeight: 800,
          margin: "0 0 1.1rem 0",
          letterSpacing: "-0.03em",
          textShadow: "0 4px 24px rgba(0,0,0,0.25), 0 1px 0 #8e7eea",
          lineHeight: 1.09,
        }}>
          Welcome to <span style={{color:'#ffd700', textShadow:'0 2px 8px #fff8'}} >Bazaar</span>
        </h1>
        <p style={{
          fontSize: "1.25rem",
          opacity: 0.92,
          margin: 0,
          fontWeight: 500,
          letterSpacing: "0.01em",
          textShadow: "0 1px 8px rgba(80,60,180,0.13)"
        }}>
          Create amazing motion graphics
        </p>
      </div>
    </AbsoluteFill>
  );
}
