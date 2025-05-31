import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

export default function ParticleExplosion() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Create particles array
  const particles = Array.from({ length: 30 }, (_, i) => {
    const angle = (i / 30) * Math.PI * 2;
    const baseRadius = 50 + (i % 3) * 30;
    
    // Explosion animation
    const radius = interpolate(frame, [0, fps * 2], [0, baseRadius * 4], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp"
    });
    
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    
    // Fade out particles
    const opacity = interpolate(frame, [fps * 1, fps * 3], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp"
    });
    
    // Scale animation
    const scale = interpolate(frame, [0, fps * 0.5, fps * 2], [0, 1, 0.3], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp"
    });
    
    return { x, y, opacity, scale, id: i, color: `hsl(${(i * 12) % 360}, 80%, 60%)` };
  });
  
  // Center explosion flash
  const flashOpacity = interpolate(frame, [0, fps * 0.2, fps * 0.6], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });

  return (
    <AbsoluteFill 
      style={{
        backgroundColor: "#0a0a0a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden"
      }}
    >
      {/* Particles */}
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        {particles.map(particle => (
          <div
            key={particle.id}
            style={{
              position: "absolute",
              left: `calc(50% + ${particle.x}px)`,
              top: `calc(50% + ${particle.y}px)`,
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: particle.color,
              opacity: particle.opacity,
              transform: `scale(${particle.scale})`,
              boxShadow: `0 0 20px ${particle.color}`,
            }}
          />
        ))}
        
        {/* Center flash */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: "100px",
            height: "100px",
            borderRadius: "50%",
            background: "radial-gradient(circle, #ffffff, transparent)",
            opacity: flashOpacity,
            transform: "translate(-50%, -50%)",
          }}
        />
      </div>
      
      {/* Title */}
      <h1 
        style={{
          position: "absolute",
          fontSize: "48px",
          fontWeight: "900",
          color: "#ffffff",
          textAlign: "center",
          opacity: interpolate(frame, [fps * 2, fps * 3], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp"
          }),
          textShadow: "0 0 30px #ffffff",
          letterSpacing: "4px"
        }}
      >
        BOOM
      </h1>
    </AbsoluteFill>
  );
} 