const { AbsoluteFill, Sequence, spring, interpolate, useCurrentFrame, useVideoConfig, Img, Video, Easing } = window.Remotion;

// Portrait format - 1080x1920
// Scene 1: 3 seconds (90 frames at 30fps)
export const durationInFrames = 90;

export default function Scene1_StillEditing() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  
  window.RemotionGoogleFonts.loadFont("Inter", { weights: ["400", "600", "700", "900"] });
  
  // Animation phases
  const phase1 = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const phase2 = interpolate(frame, [20, 40], [0, 1], { extrapolateRight: "clamp" });
  const phase3 = interpolate(frame, [40, 70], [0, 1], { extrapolateRight: "clamp" });
  const glitchPhase = interpolate(frame, [70, 90], [0, 1], { extrapolateRight: "clamp" });
  
  // Glitch effect for text
  const glitchIntensity = glitchPhase * Math.sin(frame * 0.8);
  const rgbShift = glitchPhase * 8;
  
  return (
    <AbsoluteFill style={{ background: "#0a0a0a" }}>
      
      {/* TOP SECTION - After Effects Chaos */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "45%",
        background: "linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%)",
        borderBottom: "2px solid #ff0066",
        overflow: "hidden",
        opacity: phase1
      }}>
        
        {/* Fake After Effects Timeline */}
        <div style={{
          position: "absolute",
          top: "10%",
          left: "5%",
          right: "5%",
          height: "25%",
          background: "#2a2a2a",
          borderRadius: "8px",
          border: "1px solid #444",
          padding: "10px",
          transform: `translateY(${interpolate(phase1, [0, 1], [50, 0])}px)`,
        }}>
          <div style={{ 
            color: "#888", 
            fontSize: "14px", 
            fontFamily: "Inter",
            marginBottom: "8px"
          }}>Timeline - 147 Layers</div>
          
          {/* Fake timeline bars */}
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{
                height: "8px",
                background: i === 2 ? "#ff4444" : "#4a4a4a",
                borderRadius: "2px",
                width: `${60 + Math.random() * 40}%`,
                opacity: phase1,
                animation: i === 2 ? "pulse 1s infinite" : "none"
              }} />
            ))}
          </div>
        </div>
        
        {/* Complexity indicators */}
        <div style={{
          position: "absolute",
          top: "40%",
          left: "5%",
          right: "5%",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "10px",
          opacity: phase2
        }}>
          <div style={{
            background: "#2a2a2a",
            padding: "15px",
            borderRadius: "8px",
            border: "1px solid #444",
            transform: `scale(${interpolate(phase2, [0, 1], [0.8, 1])})`
          }}>
            <div style={{ color: "#ff6666", fontSize: "24px", fontWeight: "bold" }}>47</div>
            <div style={{ color: "#888", fontSize: "12px" }}>Effects</div>
          </div>
          
          <div style={{
            background: "#2a2a2a",
            padding: "15px",
            borderRadius: "8px",
            border: "1px solid #444",
            transform: `scale(${interpolate(phase2, [0, 1], [0.8, 1])})`,
            transitionDelay: "0.1s"
          }}>
            <div style={{ color: "#ffaa66", fontSize: "24px", fontWeight: "bold" }}>2.3GB</div>
            <div style={{ color: "#888", fontSize: "12px" }}>RAM</div>
          </div>
          
          <div style={{
            background: "#2a2a2a",
            padding: "15px",
            borderRadius: "8px",
            border: "1px solid #444",
            transform: `scale(${interpolate(phase2, [0, 1], [0.8, 1])})`,
            transitionDelay: "0.2s"
          }}>
            <div style={{ color: "#66aaff", fontSize: "24px", fontWeight: "bold" }}>3h</div>
            <div style={{ color: "#888", fontSize: "12px" }}>Render</div>
          </div>
        </div>
        
        {/* Error popup */}
        <div style={{
          position: "absolute",
          bottom: "10%",
          left: "50%",
          transform: `translateX(-50%) scale(${interpolate(phase3, [0, 0.5, 1], [0, 1.1, 1])})`,
          background: "rgba(255, 0, 0, 0.2)",
          border: "2px solid #ff0000",
          borderRadius: "8px",
          padding: "15px 30px",
          opacity: phase3
        }}>
          <div style={{
            color: "#ff6666",
            fontSize: "16px",
            fontFamily: "Inter",
            fontWeight: "600",
            textAlign: "center"
          }}>⚠️ Out of Memory</div>
        </div>
      </div>
      
      {/* BOTTOM SECTION - Frustrated User */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        width: "100%",
        height: "45%",
        background: "linear-gradient(0deg, #1a1a2e 0%, #0f0f1f 100%)",
        borderTop: "2px solid #6600ff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: phase1
      }}>
        
        {/* Clock showing time wasted */}
        <div style={{
          fontSize: "72px",
          fontFamily: "Inter",
          fontWeight: "900",
          color: "#fff",
          marginBottom: "20px",
          transform: `scale(${interpolate(phase2, [0, 1], [0.5, 1])})`,
          opacity: phase2
        }}>
          3:47:22
        </div>
        
        <div style={{
          fontSize: "18px",
          color: "#888",
          fontFamily: "Inter",
          marginBottom: "30px",
          opacity: phase2
        }}>
          Time Spent Editing
        </div>
        
        {/* Frustration indicators */}
        <div style={{
          display: "flex",
          gap: "20px",
          opacity: phase3
        }}>
          {["😤", "💢", "😩"].map((emoji, i) => (
            <div key={i} style={{
              fontSize: "48px",
              transform: `translateY(${Math.sin(frame * 0.1 + i) * 10}px) scale(${interpolate(phase3, [0, 1], [0, 1])})`,
              animation: `bounce ${1 + i * 0.2}s infinite`
            }}>
              {emoji}
            </div>
          ))}
        </div>
        
        {/* Progress bars showing stuck tasks */}
        <div style={{
          position: "absolute",
          bottom: "10%",
          left: "10%",
          right: "10%",
          opacity: phase3
        }}>
          <div style={{ marginBottom: "10px" }}>
            <div style={{ color: "#666", fontSize: "12px", marginBottom: "4px" }}>Rendering... 23%</div>
            <div style={{ 
              height: "4px", 
              background: "#333", 
              borderRadius: "2px",
              overflow: "hidden"
            }}>
              <div style={{
                width: "23%",
                height: "100%",
                background: "linear-gradient(90deg, #ff0066, #6600ff)",
                animation: "pulse 2s infinite"
              }} />
            </div>
          </div>
        </div>
      </div>
      
      {/* CENTER TEXT - "Still editing?" with glitch */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 10
      }}>
        {/* Background blur circle */}
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "400px",
          height: "400px",
          background: "radial-gradient(circle, rgba(102, 0, 255, 0.3) 0%, transparent 70%)",
          filter: "blur(60px)",
          opacity: glitchPhase
        }} />
        
        {/* Main text with glitch effect */}
        <div style={{
          fontSize: "72px",
          fontFamily: "Inter",
          fontWeight: "900",
          color: "#fff",
          textAlign: "center",
          textTransform: "uppercase",
          letterSpacing: "-2px",
          position: "relative",
          opacity: interpolate(frame, [60, 70], [0, 1], { extrapolateRight: "clamp" })
        }}>
          {/* RGB glitch layers */}
          <div style={{
            position: "absolute",
            top: 0,
            left: `${rgbShift}px`,
            color: "#ff0066",
            opacity: 0.7,
            mixBlendMode: "screen"
          }}>Still</div>
          
          <div style={{
            position: "absolute",
            top: 0,
            left: `-${rgbShift}px`,
            color: "#00ffff",
            opacity: 0.7,
            mixBlendMode: "screen"
          }}>Still</div>
          
          <div>Still</div>
        </div>
        
        <div style={{
          fontSize: "72px",
          fontFamily: "Inter",
          fontWeight: "900",
          color: "#fff",
          textAlign: "center",
          textTransform: "uppercase",
          letterSpacing: "-2px",
          marginTop: "-10px",
          position: "relative",
          opacity: interpolate(frame, [65, 75], [0, 1], { extrapolateRight: "clamp" })
        }}>
          {/* RGB glitch layers */}
          <div style={{
            position: "absolute",
            top: 0,
            left: `-${rgbShift}px`,
            color: "#ff0066",
            opacity: 0.7,
            mixBlendMode: "screen"
          }}>Editing?</div>
          
          <div style={{
            position: "absolute",
            top: 0,
            left: `${rgbShift}px`,
            color: "#00ffff",
            opacity: 0.7,
            mixBlendMode: "screen"
          }}>Editing?</div>
          
          <div>Editing?</div>
        </div>
        
        {/* Glitch bars */}
        {glitchPhase > 0.5 && (
          <>
            <div style={{
              position: "absolute",
              top: "30%",
              left: "-50%",
              width: "200%",
              height: "2px",
              background: "#ff0066",
              opacity: Math.random() > 0.5 ? 1 : 0,
              transform: `translateX(${Math.random() * 20 - 10}px)`
            }} />
            
            <div style={{
              position: "absolute",
              top: "70%",
              left: "-50%",
              width: "200%",
              height: "3px",
              background: "#00ffff",
              opacity: Math.random() > 0.5 ? 1 : 0,
              transform: `translateX(${Math.random() * 20 - 10}px)`
            }} />
          </>
        )}
      </div>
      
      {/* Style tag for animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </AbsoluteFill>
  );
}