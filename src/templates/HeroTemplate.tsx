// src/templates/HeroTemplate.tsx
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

export default function HeroTemplate() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Title animation - smooth fade in
  const titleOpacity = interpolate(frame, [0, fps * 1], [0, 1], { 
    extrapolateLeft: "clamp", 
    extrapolateRight: "clamp" 
  });
  
  const titleY = interpolate(frame, [0, fps * 1], [30, 0], { 
    extrapolateLeft: "clamp", 
    extrapolateRight: "clamp" 
  });
  
  // Subtitle animation - delayed fade in
  const subtitleOpacity = interpolate(frame, [fps * 1.5, fps * 2.5], [0, 1], { 
    extrapolateLeft: "clamp", 
    extrapolateRight: "clamp" 
  });
  
  // CTA button animation - scale up
  const buttonScale = interpolate(frame, [fps * 3, fps * 4], [0, 1], { 
    extrapolateLeft: "clamp", 
    extrapolateRight: "clamp" 
  });

  return (
    <AbsoluteFill 
      style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Arial, sans-serif"
      }}
    >
      {/* Main Title */}
      <h1 
        style={{ 
          fontSize: "72px", 
          fontWeight: "700", 
          color: "#ffffff",
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          margin: "0 0 20px 0",
          textAlign: "center"
        }}
      >
        Launch Your Vision
      </h1>
      
      {/* Subtitle */}
      <p 
        style={{ 
          fontSize: "24px", 
          color: "#ffffff",
          opacity: subtitleOpacity,
          margin: "0 0 40px 0",
          textAlign: "center",
          maxWidth: "600px"
        }}
      >
        Create stunning motion graphics in seconds with AI-powered tools
      </p>
      
      {/* CTA Button */}
      <button 
        style={{ 
          fontSize: "20px", 
          fontWeight: "600",
          color: "#667eea",
          backgroundColor: "#ffffff",
          border: "none",
          borderRadius: "12px",
          padding: "16px 32px",
          transform: `scale(${buttonScale})`,
          boxShadow: "0 8px 32px rgba(0,0,0,0.1)"
        }}
      >
        Get Started
      </button>
    </AbsoluteFill>
  );
}

// Template configuration - exported so registry can use it
export const templateConfig = {
  id: 'hero',
  name: 'Hero Section',
  duration: 180, // 6 seconds
  previewFrame: 30,
  getCode: () => `// src/templates/HeroTemplate.tsx
const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;

export default function HeroTemplate() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Title animation - smooth fade in
  const titleOpacity = interpolate(frame, [0, fps * 1], [0, 1], { 
    extrapolateLeft: "clamp", 
    extrapolateRight: "clamp" 
  });
  
  const titleY = interpolate(frame, [0, fps * 1], [30, 0], { 
    extrapolateLeft: "clamp", 
    extrapolateRight: "clamp" 
  });
  
  // Subtitle animation - delayed fade in
  const subtitleOpacity = interpolate(frame, [fps * 1.5, fps * 2.5], [0, 1], { 
    extrapolateLeft: "clamp", 
    extrapolateRight: "clamp" 
  });
  
  // CTA button animation - scale up
  const buttonScale = interpolate(frame, [fps * 3, fps * 4], [0, 1], { 
    extrapolateLeft: "clamp", 
    extrapolateRight: "clamp" 
  });

  return (
    <AbsoluteFill 
      style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Arial, sans-serif"
      }}
    >
      {/* Main Title */}
      <h1 
        style={{ 
          fontSize: "72px", 
          fontWeight: "700", 
          color: "#ffffff",
          opacity: titleOpacity,
          transform: \`translateY(\${titleY}px)\`,
          margin: "0 0 20px 0",
          textAlign: "center"
        }}
      >
        Launch Your Vision
      </h1>
      
      {/* Subtitle */}
      <p 
        style={{ 
          fontSize: "24px", 
          color: "#ffffff",
          opacity: subtitleOpacity,
          margin: "0 0 40px 0",
          textAlign: "center",
          maxWidth: "600px"
        }}
      >
        Create stunning motion graphics in seconds with AI-powered tools
      </p>
      
      {/* CTA Button */}
      <button 
        style={{ 
          fontSize: "20px", 
          fontWeight: "600",
          color: "#667eea",
          backgroundColor: "#ffffff",
          border: "none",
          borderRadius: "12px",
          padding: "16px 32px",
          transform: \`scale(\${buttonScale})\`,
          boxShadow: "0 8px 32px rgba(0,0,0,0.1)"
        }}
      >
        Get Started
      </button>
    </AbsoluteFill>
  );
}`
}; 