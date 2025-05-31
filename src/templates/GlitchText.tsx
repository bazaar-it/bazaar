import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

export default function GlitchText() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Glitch timing
  const isGlitching = Math.sin(frame / 3) > 0.7 || Math.sin(frame / 7) > 0.8;
  
  // Random offset for glitch effect
  const glitchX = isGlitching ? (Math.random() - 0.5) * 10 : 0;
  const glitchY = isGlitching ? (Math.random() - 0.5) * 5 : 0;
  
  // Color separation effect
  const redOffset = isGlitching ? (Math.random() - 0.5) * 6 : 0;
  const blueOffset = isGlitching ? (Math.random() - 0.5) * 6 : 0;
  
  // Text reveal animation
  const textOpacity = interpolate(frame, [0, fps * 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  
  // Scanlines animation
  const scanlineY = interpolate(frame, [0, fps * 4], [0, 100], {
    extrapolateRight: "wrap"
  });

  return (
    <AbsoluteFill 
      style={{
        backgroundColor: "#000000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Monaco, 'Courier New', monospace",
        overflow: "hidden"
      }}
    >
      {/* Scanlines */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(0deg, transparent 50%, rgba(0, 255, 0, 0.03) 50%)`,
          backgroundSize: "100% 4px",
          transform: `translateY(${scanlineY}%)`,
        }}
      />
      
      {/* Main text with glitch effects */}
      <div style={{ position: "relative", opacity: textOpacity }}>
        {/* Red channel */}
        <h1 
          style={{
            position: "absolute",
            fontSize: "64px",
            fontWeight: "900",
            color: "#ff0000",
            transform: `translate(${glitchX + redOffset}px, ${glitchY}px)`,
            opacity: isGlitching ? 0.8 : 0,
            letterSpacing: "2px",
            textShadow: "2px 2px 0px #ff0000",
          }}
        >
          GLITCH.EXE
        </h1>
        
        {/* Blue channel */}
        <h1 
          style={{
            position: "absolute",
            fontSize: "64px",
            fontWeight: "900",
            color: "#0000ff",
            transform: `translate(${glitchX + blueOffset}px, ${glitchY}px)`,
            opacity: isGlitching ? 0.8 : 0,
            letterSpacing: "2px",
            textShadow: "-2px -2px 0px #0000ff",
          }}
        >
          GLITCH.EXE
        </h1>
        
        {/* Main text */}
        <h1 
          style={{
            fontSize: "64px",
            fontWeight: "900",
            color: "#00ff00",
            transform: `translate(${glitchX}px, ${glitchY}px)`,
            letterSpacing: "2px",
            textShadow: "0 0 20px #00ff00",
            filter: isGlitching ? "contrast(1.2) brightness(1.1)" : "none",
          }}
        >
          GLITCH.EXE
        </h1>
      </div>
      
      {/* Subtitle */}
      <p 
        style={{
          position: "absolute",
          bottom: "30%",
          fontSize: "18px",
          color: "#00ff00",
          opacity: interpolate(frame, [fps * 1.5, fps * 2.5], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp"
          }),
          letterSpacing: "4px",
          fontFamily: "Monaco, 'Courier New', monospace",
        }}
      >
        SYSTEM.OVERRIDE.ACTIVE
      </p>
      
      {/* Random glitch bars */}
      {isGlitching && Array.from({ length: 3 }, (_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: `${Math.random() * 80 + 10}%`,
            height: `${Math.random() * 5 + 2}px`,
            backgroundColor: Math.random() > 0.5 ? "#ff0000" : "#0000ff",
            opacity: 0.7,
            mixBlendMode: "screen",
          }}
        />
      ))}
    </AbsoluteFill>
  );
} 