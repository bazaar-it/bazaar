import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

export default function WaveAnimation() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Create wave layers with different speeds and amplitudes
  const waves = Array.from({ length: 4 }, (_, i) => {
    const waveSpeed = 0.02 + i * 0.01;
    const amplitude = 80 - i * 15;
    const frequency = 0.005 + i * 0.002;
    const verticalOffset = 50 + i * 20;
    
    // Generate wave path
    const pathData = Array.from({ length: 100 }, (_, x) => {
      const xPos = (x / 100) * 1920; // Full width
      const yPos = verticalOffset + Math.sin((xPos * frequency) + (frame * waveSpeed)) * amplitude;
      return `${x === 0 ? 'M' : 'L'} ${xPos} ${yPos}`;
    }).join(' ') + ' L 1920 1080 L 0 1080 Z';
    
    return {
      id: i,
      pathData,
      color: `hsl(${200 + i * 20}, 70%, ${60 - i * 10}%)`,
      opacity: 0.7 - i * 0.1,
    };
  });
  
  // Floating bubbles
  const bubbles = Array.from({ length: 12 }, (_, i) => {
    const baseY = 200 + (i % 4) * 200;
    const baseX = (i * 150) % 1920;
    const riseSpeed = 2 + (i % 3);
    
    const y = baseY - ((frame * riseSpeed) % 1200);
    const x = baseX + Math.sin((frame + i * 30) / 60) * 50;
    const size = 20 + (i % 3) * 10;
    
    const opacity = interpolate(y, [0, 600, 1200], [0, 0.8, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp"
    });
    
    return { id: i, x, y, size, opacity };
  });
  
  // Text reveal animation
  const textY = interpolate(frame, [fps * 1, fps * 2], [100, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  
  const textOpacity = interpolate(frame, [fps * 1, fps * 2], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });

  return (
    <AbsoluteFill 
      style={{
        background: "linear-gradient(180deg, #001e3c 0%, #003c7e 100%)",
        overflow: "hidden",
        position: "relative"
      }}
    >
      {/* Wave layers */}
      <svg
        width="1920"
        height="1080"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
        }}
      >
        {waves.map(wave => (
          <path
            key={wave.id}
            d={wave.pathData}
            fill={wave.color}
            opacity={wave.opacity}
            style={{
              filter: `blur(${wave.id}px)`,
            }}
          />
        ))}
      </svg>
      
      {/* Floating bubbles */}
      {bubbles.map(bubble => (
        <div
          key={bubble.id}
          style={{
            position: "absolute",
            left: `${bubble.x}px`,
            top: `${bubble.y}px`,
            width: `${bubble.size}px`,
            height: `${bubble.size}px`,
            borderRadius: "50%",
            background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8), rgba(255,255,255,0.2))",
            opacity: bubble.opacity,
            border: "1px solid rgba(255,255,255,0.3)",
            boxShadow: "inset 0 0 10px rgba(255,255,255,0.2)",
          }}
        />
      ))}
      
      {/* Main content */}
      <div 
        style={{
          position: "absolute",
          left: "50%",
          top: "30%",
          transform: `translate(-50%, -50%) translateY(${textY}px)`,
          textAlign: "center",
          color: "#ffffff",
          opacity: textOpacity,
        }}
      >
        <h1 
          style={{
            fontSize: "64px",
            fontWeight: "900",
            margin: "0 0 20px 0",
            textShadow: "0 4px 20px rgba(0,0,0,0.5)",
            letterSpacing: "2px",
            background: "linear-gradient(45deg, #ffffff, #87ceeb)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}
        >
          LIQUID
        </h1>
        
        <p 
          style={{
            fontSize: "24px",
            margin: "0",
            textShadow: "0 2px 10px rgba(0,0,0,0.5)",
            opacity: 0.9,
            letterSpacing: "1px"
          }}
        >
          Fluid Motion Graphics
        </p>
      </div>
      
      {/* Particle effects */}
      {Array.from({ length: 20 }, (_, i) => {
        const particleX = (i * 100) % 1920;
        const particleBaseY = 400 + (i % 3) * 200;
        
        const particleY = particleBaseY + Math.sin((frame + i * 20) / 40) * 30;
        const particleOpacity = interpolate(
          Math.sin((frame + i * 50) / 80),
          [-1, 1],
          [0.2, 0.8]
        );
        
        return (
          <div
            key={`particle-${i}`}
            style={{
              position: "absolute",
              left: `${particleX}px`,
              top: `${particleY}px`,
              width: "3px",
              height: "3px",
              borderRadius: "50%",
              backgroundColor: "#87ceeb",
              opacity: particleOpacity,
              boxShadow: "0 0 8px #87ceeb",
              transform: `scale(${interpolate(
                Math.sin((frame + i * 30) / 60),
                [-1, 1],
                [0.5, 1.5]
              )})`,
            }}
          />
        );
      })}
      
      {/* Surface reflection effect */}
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: 0,
          right: 0,
          height: "60%",
          background: "linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.1) 100%)",
          opacity: interpolate(
            Math.sin(frame / 60),
            [-1, 1],
            [0.3, 0.7]
          ),
          mixBlendMode: "overlay",
        }}
      />
    </AbsoluteFill>
  );
} 