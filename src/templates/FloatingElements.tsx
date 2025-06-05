// src/templates/FloatingElements.tsx
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from 'remotion';

export default function FloatingElements() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Floating elements data
  const elements = [
    { id: 1, type: "card", x: 20, y: 15, delay: 0, icon: "💳", text: "Payment" },
    { id: 2, type: "notification", x: 75, y: 25, delay: fps * 0.5, icon: "🔔", text: "3 new messages" },
    { id: 3, type: "chart", x: 10, y: 70, delay: fps * 1, icon: "📊", text: "Analytics" },
    { id: 4, type: "profile", x: 80, y: 75, delay: fps * 1.5, icon: "👤", text: "Profile" },
    { id: 5, type: "settings", x: 50, y: 10, delay: fps * 2, icon: "⚙️", text: "Settings" }
  ];
  
  // Background grid animation
  const gridOffset = interpolate(frame, [0, fps * 10], [0, 50], {
    extrapolateRight: "wrap"
  });

  return (
    <AbsoluteFill 
      style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        overflow: "hidden",
        position: "relative"
      }}
    >
      {/* Animated grid background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
          transform: `translate(${gridOffset}px, ${gridOffset}px)`,
        }}
      />
      
      {/* Floating elements */}
      {elements.map(element => {
        // Individual floating animation
        const floatY = Math.sin((frame + element.id * 30) / 60) * 15;
        const floatX = Math.cos((frame + element.id * 20) / 80) * 10;
        
        // Entry animation
        const entryProgress = interpolate(
          frame,
          [element.delay, element.delay + fps * 1],
          [0, 1],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp"
          }
        );
        
        const scale = interpolate(entryProgress, [0, 1], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp"
        });
        
        const opacity = interpolate(entryProgress, [0, 0.3, 1], [0, 0.8, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp"
        });
        
        // Hover effect simulation
        const hoverScale = interpolate(
          Math.sin((frame + element.id * 100) / 120),
          [-1, 1],
          [1, 1.05]
        );

        return (
          <div
            key={element.id}
            style={{
              position: "absolute",
              left: `${element.x + floatX}%`,
              top: `${element.y + floatY}%`,
              transform: `translate(-50%, -50%) scale(${scale * hoverScale})`,
              opacity,
              transition: "all 0.3s ease"
            }}
          >
            {/* UI Card */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.95)",
                borderRadius: "12px",
                padding: "16px 20px",
                boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                minWidth: "140px",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.2)"
              }}
            >
              <span style={{ fontSize: "24px" }}>{element.icon}</span>
              <span 
                style={{ 
                  fontSize: "14px", 
                  fontWeight: "600", 
                  color: "#333",
                  whiteSpace: "nowrap"
                }}
              >
                {element.text}
              </span>
            </div>
          </div>
        );
      })}
      
      {/* Center content */}
      <div 
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
          color: "#ffffff"
        }}
      >
        <h1 
          style={{
            fontSize: "48px",
            fontWeight: "900",
            margin: "0 0 16px 0",
            opacity: interpolate(frame, [fps * 2.5, fps * 3.5], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp"
            }),
            textShadow: "0 4px 20px rgba(0,0,0,0.3)"
          }}
        >
          Modern UI
        </h1>
        
        <p 
          style={{
            fontSize: "20px",
            margin: "0",
            opacity: interpolate(frame, [fps * 3, fps * 4], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp"
            }),
            textShadow: "0 2px 10px rgba(0,0,0,0.3)"
          }}
        >
          Floating Elements in Motion
        </p>
      </div>
      
      {/* Decorative particles */}
      {Array.from({ length: 8 }, (_, i) => {
        const particleX = (i % 4) * 25 + 10;
        const particleY = Math.floor(i / 4) * 50 + 20;
        const particleDelay = i * fps * 0.2;
        
        const particleOpacity = interpolate(
          (frame + particleDelay) % (fps * 4),
          [0, fps * 2, fps * 4],
          [0, 0.6, 0],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp"
          }
        );
        
        return (
          <div
            key={`particle-${i}`}
            style={{
              position: "absolute",
              left: `${particleX}%`,
              top: `${particleY}%`,
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: "#ffffff",
              opacity: particleOpacity,
              transform: `translateY(${Math.sin((frame + i * 30) / 40) * 20}px)`,
              boxShadow: "0 0 10px #ffffff"
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
} 