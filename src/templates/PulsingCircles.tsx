import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

export default function PulsingCircles() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Create multiple circles with different timings
  const circles = Array.from({ length: 5 }, (_, i) => {
    const baseDelay = i * fps * 0.3;
    const cycleLength = fps * 2;
    
    // Pulsing scale animation
    const scale = interpolate(
      (frame - baseDelay) % cycleLength,
      [0, cycleLength * 0.5, cycleLength],
      [0.3, 1.2, 0.3],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp"
      }
    );
    
    // Opacity pulsing
    const opacity = interpolate(
      (frame - baseDelay) % cycleLength,
      [0, cycleLength * 0.5, cycleLength],
      [0.8, 0.3, 0.8],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp"
      }
    );
    
    // Rotation
    const rotation = interpolate(frame, [0, fps * 8], [0, 360], {
      extrapolateRight: "wrap"
    });
    
    return {
      id: i,
      scale: frame > baseDelay ? scale : 0,
      opacity: frame > baseDelay ? opacity : 0,
      rotation: rotation + (i * 72), // Distribute evenly in circle
      size: 100 + i * 30,
      color: `hsl(${(i * 60 + frame) % 360}, 70%, 60%)`,
      delay: baseDelay
    };
  });
  
  // Center text animation
  const textScale = interpolate(frame, [fps * 1, fps * 2], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });

  return (
    <AbsoluteFill 
      style={{
        backgroundColor: "#0d1117",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden"
      }}
    >
      {/* Pulsing circles */}
      {circles.map(circle => (
        <div
          key={circle.id}
          style={{
            position: "absolute",
            width: `${circle.size}px`,
            height: `${circle.size}px`,
            borderRadius: "50%",
            border: `3px solid ${circle.color}`,
            opacity: circle.opacity,
            transform: `scale(${circle.scale}) rotate(${circle.rotation}deg)`,
            boxShadow: `0 0 30px ${circle.color}, inset 0 0 30px ${circle.color}`,
            background: `radial-gradient(circle, transparent 60%, ${circle.color}20)`,
          }}
        />
      ))}
      
      {/* Rotating outer ring */}
      <div
        style={{
          position: "absolute",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          border: "2px dashed #ffffff30",
          transform: `rotate(${interpolate(frame, [0, fps * 10], [0, 360], {
            extrapolateRight: "wrap"
          })}deg)`,
        }}
      />
      
      {/* Center content */}
      <div 
        style={{
          position: "absolute",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transform: `scale(${textScale})`,
        }}
      >
        <h1 
          style={{
            fontSize: "42px",
            fontWeight: "900",
            color: "#ffffff",
            margin: "0 0 10px 0",
            textAlign: "center",
            textShadow: "0 0 20px #ffffff50",
            letterSpacing: "3px"
          }}
        >
          PULSE
        </h1>
        
        <div 
          style={{
            fontSize: "16px",
            color: "#ffffff80",
            textAlign: "center",
            letterSpacing: "2px",
            fontFamily: "Monaco, 'Courier New', monospace"
          }}
        >
          SYNCHRONIZED MOTION
        </div>
      </div>
      
      {/* Corner decorations */}
      {[0, 1, 2, 3].map(corner => {
        const angle = corner * 90;
        const distance = interpolate(frame, [0, fps * 1], [50, 200], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp"
        });
        
        return (
          <div
            key={corner}
            style={{
              position: "absolute",
              width: "20px",
              height: "20px",
              backgroundColor: "#00ff88",
              transform: `
                translate(-50%, -50%) 
                rotate(${angle}deg) 
                translateY(-${distance}px)
                rotate(${interpolate(frame, [0, fps * 6], [0, 720], {
                  extrapolateRight: "wrap"
                })}deg)
              `,
              left: "50%",
              top: "50%",
              boxShadow: "0 0 15px #00ff88",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
} 