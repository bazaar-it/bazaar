// src/templates/LogoTemplate.tsx
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

export default function LogoTemplate() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Logo scale animation with spring
  const logoScale = spring({
    frame: frame - fps * 0.3,
    fps,
    config: {
      damping: 12,
      stiffness: 100,
      mass: 1,
    },
  });
  
  // Logo rotation
  const logoRotation = interpolate(frame, [0, fps * 0.8], [0, 360], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  
  // Text reveal
  const textOpacity = interpolate(frame, [fps * 1, fps * 2], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  
  const textY = interpolate(frame, [fps * 1, fps * 2], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  
  // Particles animation
  const particleOpacity = interpolate(frame, [fps * 2.5, fps * 3.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });

  return (
    <AbsoluteFill 
      style={{
        backgroundColor: "#0f0f23",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Arial, sans-serif"
      }}
    >
      {/* Animated Particles Background */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: "4px",
            height: "4px",
            backgroundColor: "#00d4ff",
            borderRadius: "50%",
            opacity: particleOpacity,
            left: `${20 + i * 15}%`,
            top: `${30 + (i % 2) * 40}%`,
            transform: `translateY(${Math.sin((frame + i * 10) / 30) * 20}px)`,
          }}
        />
      ))}
      
      {/* Logo Circle */}
      <div 
        style={{
          width: "120px",
          height: "120px",
          borderRadius: "50%",
          background: "linear-gradient(45deg, #00d4ff, #ff00d4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${logoScale}) rotate(${logoRotation}deg)`,
          marginBottom: "30px",
          boxShadow: "0 0 50px rgba(0, 212, 255, 0.5)"
        }}
      >
        {/* Logo Letter */}
        <span 
          style={{
            fontSize: "48px",
            fontWeight: "900",
            color: "#ffffff",
            transform: `rotate(-${logoRotation}deg)` // Counter-rotate the text
          }}
        >
          B
        </span>
      </div>
      
      {/* Company Name */}
      <h1 
        style={{
          fontSize: "36px",
          fontWeight: "700",
          color: "#ffffff",
          opacity: textOpacity,
          transform: `translateY(${textY}px)`,
          margin: "0",
          letterSpacing: "2px"
        }}
      >
        BAZAAR
      </h1>
      
      {/* Tagline */}
      <p 
        style={{
          fontSize: "16px",
          color: "#00d4ff",
          opacity: textOpacity,
          transform: `translateY(${textY}px)`,
          margin: "8px 0 0 0",
          letterSpacing: "1px"
        }}
      >
        Motion Graphics Made Simple
      </p>
    </AbsoluteFill>
  );
} 