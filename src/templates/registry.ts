import HeroTemplate from './HeroTemplate';
import TypingTemplate from './TypingTemplate';
import LogoTemplate from './LogoTemplate';
import ParticleExplosion from './ParticleExplosion';
import GlitchText from './GlitchText';
import PulsingCircles from './PulsingCircles';
import FloatingElements from './FloatingElements';
import WaveAnimation from './WaveAnimation';
import AICoding from './AICoding';
import AIDialogue from './AIDialogue';
import AppleSignIn from './AppleSignIn';
import BlueGradientText from './BlueGradientText';
import BubbleZoom from './BubbleZoom';
import Code from './Code';
import DotRipple from './DotRipple';
import FintechUI from './FintechUI';
import FloatingParticles from './FloatingParticles';
import GitHubSignIn from './GitHubSignIn';
import GoogleSignIn from './GoogleSignIn';
import GradientText from './GradientText';
import GrowthGraph from './GrowthGraph';
import KnowsCode from './KnowsCode';
import PromptIntro from './PromptIntro';

export interface TemplateDefinition {
  id: string;
  name: string;
  duration: number; // in frames
  component: React.ComponentType; // Real React component for Remotion Player
  getCode: () => string; // Code string for database storage
}

export const TEMPLATES: TemplateDefinition[] = [
  {
    id: 'hero',
    name: 'Hero Section',
    duration: 180, // 6 seconds
    component: HeroTemplate,
    getCode: () => `import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

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
  },
  {
    id: 'typing',
    name: 'Terminal Typing',
    duration: 150, // 5 seconds
    component: TypingTemplate,
    getCode: () => `import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

export default function TypingTemplate() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const fullText = "$ npm install @remotion/cli\\n$ npx remotion preview\\n✓ Server ready at http://localhost:3000";
  const charactersPerSecond = 8;
  const totalCharacters = Math.floor((frame / fps) * charactersPerSecond);
  const displayText = fullText.substring(0, totalCharacters);
  
  const cursorOpacity = interpolate(frame % 30, [0, 15, 30], [1, 0, 1]);
  const windowOpacity = interpolate(frame, [0, fps * 0.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });

  return (
    <AbsoluteFill 
      style={{
        backgroundColor: "#1a1a1a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Monaco, 'Courier New', monospace"
      }}
    >
      <div 
        style={{
          backgroundColor: "#2d2d2d",
          borderRadius: "8px",
          padding: "20px",
          minWidth: "500px",
          minHeight: "200px",
          opacity: windowOpacity,
          boxShadow: "0 10px 50px rgba(0,0,0,0.5)"
        }}
      >
        <div style={{
          display: "flex",
          gap: "8px",
          marginBottom: "16px",
          paddingBottom: "8px",
          borderBottom: "1px solid #444"
        }}>
          <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#ff5f56" }}></div>
          <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#ffbd2e" }}></div>
          <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#27ca3f" }}></div>
        </div>
        
        <div style={{
          color: "#00ff00",
          fontSize: "16px",
          lineHeight: "24px",
          whiteSpace: "pre-wrap"
        }}>
          {displayText}
          <span style={{ opacity: cursorOpacity }}>|</span>
        </div>
      </div>
    </AbsoluteFill>
  );
}`
  },
  {
    id: 'logo',
    name: 'Logo Reveal',
    duration: 120, // 4 seconds
    component: LogoTemplate,
    getCode: () => `import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

export default function LogoTemplate() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const logoScale = spring({
    frame: frame - fps * 0.3,
    fps,
    config: {
      damping: 12,
      stiffness: 100,
      mass: 1,
    },
  });
  
  const logoRotation = interpolate(frame, [0, fps * 0.8], [0, 360], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  
  const textOpacity = interpolate(frame, [fps * 1, fps * 2], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  
  const textY = interpolate(frame, [fps * 1, fps * 2], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  
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
            left: \`\${20 + i * 15}%\`,
            top: \`\${30 + (i % 2) * 40}%\`,
            transform: \`translateY(\${Math.sin((frame + i * 10) / 30) * 20}px)\`,
          }}
        />
      ))}
      
      <div 
        style={{
          width: "120px",
          height: "120px",
          borderRadius: "50%",
          background: "linear-gradient(45deg, #00d4ff, #ff00d4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: \`scale(\${logoScale}) rotate(\${logoRotation}deg)\`,
          marginBottom: "30px",
          boxShadow: "0 0 50px rgba(0, 212, 255, 0.5)"
        }}
      >
        <span 
          style={{
            fontSize: "48px",
            fontWeight: "900",
            color: "#ffffff",
            transform: \`rotate(-\${logoRotation}deg)\`
          }}
        >
          B
        </span>
      </div>
      
      <h1 
        style={{
          fontSize: "36px",
          fontWeight: "700",
          color: "#ffffff",
          opacity: textOpacity,
          transform: \`translateY(\${textY}px)\`,
          margin: "0",
          letterSpacing: "2px"
        }}
      >
        BAZAAR
      </h1>
      
      <p 
        style={{
          fontSize: "16px",
          color: "#00d4ff",
          opacity: textOpacity,
          transform: \`translateY(\${textY}px)\`,
          margin: "8px 0 0 0",
          letterSpacing: "1px"
        }}
      >
        Motion Graphics Made Simple
      </p>
    </AbsoluteFill>
  );
}`
  },
  {
    id: 'particles',
    name: 'Particle Explosion',
    duration: 240, // 8 seconds
    component: ParticleExplosion,
    getCode: () => `const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;

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
    
    return { x, y, opacity, scale, id: i, color: \`hsl(\${(i * 12) % 360}, 80%, 60%)\` };
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
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        {particles.map(particle => (
          <div
            key={particle.id}
            style={{
              position: "absolute",
              left: \`calc(50% + \${particle.x}px)\`,
              top: \`calc(50% + \${particle.y}px)\`,
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: particle.color,
              opacity: particle.opacity,
              transform: \`scale(\${particle.scale})\`,
              boxShadow: \`0 0 20px \${particle.color}\`,
            }}
          />
        ))}
        
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
}`
  },
  {
    id: 'glitch',
    name: 'Glitch Text',
    duration: 180, // 6 seconds  
    component: GlitchText,
    getCode: () => `const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;

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
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: \`linear-gradient(0deg, transparent 50%, rgba(0, 255, 0, 0.03) 50%)\`,
          backgroundSize: "100% 4px",
          transform: \`translateY(\${scanlineY}%)\`,
        }}
      />
      
      <div style={{ position: "relative", opacity: textOpacity }}>
        <h1 
          style={{
            position: "absolute",
            fontSize: "64px",
            fontWeight: "900",
            color: "#ff0000",
            transform: \`translate(\${glitchX + redOffset}px, \${glitchY}px)\`,
            opacity: isGlitching ? 0.8 : 0,
            letterSpacing: "2px",
            textShadow: "2px 2px 0px #ff0000",
          }}
        >
          GLITCH.EXE
        </h1>
        
        <h1 
          style={{
            position: "absolute",
            fontSize: "64px",
            fontWeight: "900",
            color: "#0000ff",
            transform: \`translate(\${glitchX + blueOffset}px, \${glitchY}px)\`,
            opacity: isGlitching ? 0.8 : 0,
            letterSpacing: "2px",
            textShadow: "-2px -2px 0px #0000ff",
          }}
        >
          GLITCH.EXE
        </h1>
        
        <h1 
          style={{
            fontSize: "64px",
            fontWeight: "900",
            color: "#00ff00",
            transform: \`translate(\${glitchX}px, \${glitchY}px)\`,
            letterSpacing: "2px",
            textShadow: "0 0 20px #00ff00",
            filter: isGlitching ? "contrast(1.2) brightness(1.1)" : "none",
          }}
        >
          GLITCH.EXE
        </h1>
      </div>
      
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
      
      {isGlitching && Array.from({ length: 3 }, (_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: \`\${Math.random() * 80 + 10}%\`,
            height: \`\${Math.random() * 5 + 2}px\`,
            backgroundColor: Math.random() > 0.5 ? "#ff0000" : "#0000ff",
            opacity: 0.7,
            mixBlendMode: "screen",
          }}
        />
      ))}
    </AbsoluteFill>
  );
}`
  },
  {
    id: 'pulse',
    name: 'Pulsing Circles',
    duration: 300, // 10 seconds
    component: PulsingCircles,
    getCode: () => `const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;

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
      rotation: rotation + (i * 72),
      size: 100 + i * 30,
      color: \`hsl(\${(i * 60 + frame) % 360}, 70%, 60%)\`,
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
      {circles.map(circle => (
        <div
          key={circle.id}
          style={{
            position: "absolute",
            width: \`\${circle.size}px\`,
            height: \`\${circle.size}px\`,
            borderRadius: "50%",
            border: \`3px solid \${circle.color}\`,
            opacity: circle.opacity,
            transform: \`scale(\${circle.scale}) rotate(\${circle.rotation}deg)\`,
            boxShadow: \`0 0 30px \${circle.color}, inset 0 0 30px \${circle.color}\`,
            background: \`radial-gradient(circle, transparent 60%, \${circle.color}20)\`,
          }}
        />
      ))}
      
      <div
        style={{
          position: "absolute",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          border: "2px dashed #ffffff30",
          transform: \`rotate(\${interpolate(frame, [0, fps * 10], [0, 360], {
            extrapolateRight: "wrap"
          })}deg)\`,
        }}
      />
      
      <div 
        style={{
          position: "absolute",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transform: \`scale(\${textScale})\`,
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
              transform: \`
                translate(-50%, -50%) 
                rotate(\${angle}deg) 
                translateY(-\${distance}px)
                rotate(\${interpolate(frame, [0, fps * 6], [0, 720], {
                  extrapolateRight: "wrap"
                })}deg)
              \`,
              left: "50%",
              top: "50%",
              boxShadow: "0 0 15px #00ff88",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}`
  },
  {
    id: 'floating',
    name: 'Floating UI',
    duration: 240, // 8 seconds
    component: FloatingElements,
    getCode: () => `const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;

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
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: \`
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          \`,
          backgroundSize: "50px 50px",
          transform: \`translate(\${gridOffset}px, \${gridOffset}px)\`,
        }}
      />
      
      {elements.map(element => {
        const floatY = Math.sin((frame + element.id * 30) / 60) * 15;
        const floatX = Math.cos((frame + element.id * 20) / 80) * 10;
        
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
              left: \`\${element.x + floatX}%\`,
              top: \`\${element.y + floatY}%\`,
              transform: \`translate(-50%, -50%) scale(\${scale * hoverScale})\`,
              opacity,
              transition: "all 0.3s ease"
            }}
          >
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
    </AbsoluteFill>
  );
}`
  },
  {
    id: 'wave',
    name: 'Liquid Waves',
    duration: 360, // 12 seconds
    component: WaveAnimation,
    getCode: () => `const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;

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
      const xPos = (x / 100) * 1920;
      const yPos = verticalOffset + Math.sin((xPos * frequency) + (frame * waveSpeed)) * amplitude;
      return \`\${x === 0 ? 'M' : 'L'} \${xPos} \${yPos}\`;
    }).join(' ') + ' L 1920 1080 L 0 1080 Z';
    
    return {
      id: i,
      pathData,
      color: \`hsl(\${200 + i * 20}, 70%, \${60 - i * 10}%)\`,
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
              filter: \`blur(\${wave.id}px)\`,
            }}
          />
        ))}
      </svg>
      
      {bubbles.map(bubble => (
        <div
          key={bubble.id}
          style={{
            position: "absolute",
            left: \`\${bubble.x}px\`,
            top: \`\${bubble.y}px\`,
            width: \`\${bubble.size}px\`,
            height: \`\${bubble.size}px\`,
            borderRadius: "50%",
            background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8), rgba(255,255,255,0.2))",
            opacity: bubble.opacity,
            border: "1px solid rgba(255,255,255,0.3)",
            boxShadow: "inset 0 0 10px rgba(255,255,255,0.2)",
          }}
        />
      ))}
      
      <div 
        style={{
          position: "absolute",
          left: "50%",
          top: "30%",
          transform: \`translate(-50%, -50%) translateY(\${textY}px)\`,
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
    </AbsoluteFill>
  );
}`
  },
  {
    id: 'aicoding',
    name: 'AI Coding',
    duration: 180, // 6 seconds
    component: AICoding,
    getCode: () => `import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

export default function AICoding() {
  const frame = useCurrentFrame();

  // Your implementation
  
  return (
    <AbsoluteFill>
      {/* AI Coding animation content */}
    </AbsoluteFill>
  );
}`
  },
  {
    id: 'aidialogue',
    name: 'AI Dialogue',
    duration: 180, // 6 seconds
    component: AIDialogue,
    getCode: () => `import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

export default function AIDialogue() {
  const frame = useCurrentFrame();

  // Your implementation
  
  return (
    <AbsoluteFill>
      {/* AI Dialogue animation content */}
    </AbsoluteFill>
  );
}`
  },
  {
    id: 'applesignin',
    name: 'Apple Sign In',
    duration: 120, // 4 seconds
    component: AppleSignIn,
    getCode: () => `import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

export default function AppleSignIn() {
  const frame = useCurrentFrame();

  // Your implementation
  
  return (
    <AbsoluteFill>
      {/* Apple Sign In animation content */}
    </AbsoluteFill>
  );
}`
  },
  {
    id: 'bluegradienttext',
    name: 'Blue Gradient Text',
    duration: 240, // 8 seconds
    component: BlueGradientText,
    getCode: () => `import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';

export default function BlueGradientText() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const loopDuration = fps * 8;
  const hueShift = (frame % loopDuration) * (360 / loopDuration) * 1.5;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#ffffff",
        justifyContent: "center",
        alignItems: "center",
        display: "flex"
      }}
    >
      {/* Blue Gradient Text content */}
    </AbsoluteFill>
  );
}`
  },
  {
    id: 'bubblezoom',
    name: 'Bubble Zoom',
    duration: 180, // 6 seconds
    component: BubbleZoom,
    getCode: () => `import { AbsoluteFill, interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';

export default function BubbleZoom() {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Your implementation
  
  return (
    <AbsoluteFill>
      {/* Bubble Zoom animation content */}
    </AbsoluteFill>
  );
}`
  },
  {
    id: 'code',
    name: 'Code',
    duration: 180, // 6 seconds
    component: Code,
    getCode: () => `import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

export default function AICoding() {
  const frame = useCurrentFrame();

  // Your implementation
  
  return (
    <AbsoluteFill>
      {/* Code animation content */}
    </AbsoluteFill>
  );
}`
  },
  {
    id: 'dotripple',
    name: 'Dot Ripple',
    duration: 240, // 8 seconds
    component: DotRipple,
    getCode: () => `import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';

export default function DotRipple() {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Your implementation
  
  return (
    <AbsoluteFill>
      {/* Dot Ripple animation content */}
    </AbsoluteFill>
  );
}`
  },
  {
    id: 'fintechui',
    name: 'Fintech UI',
    duration: 300, // 10 seconds
    component: FintechUI,
    getCode: () => `import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, spring } from "remotion";

export default function FintechUI() {
  const frame = useCurrentFrame();

  // Your implementation
  
  return (
    <AbsoluteFill>
      {/* Fintech UI animation content */}
    </AbsoluteFill>
  );
}`
  },
  {
    id: 'floatingparticles',
    name: 'Floating Particles',
    duration: 240, // 8 seconds
    component: FloatingParticles,
    getCode: () => `import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

export default function FloatingParticles() {
  const frame = useCurrentFrame();

  // Your implementation
  
  return (
    <AbsoluteFill>
      {/* Floating Particles animation content */}
    </AbsoluteFill>
  );
}`
  },
  {
    id: 'githubsignin',
    name: 'GitHub Sign In',
    duration: 120, // 4 seconds
    component: GitHubSignIn,
    getCode: () => `import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

export default function GitHubSignIn() {
  const frame = useCurrentFrame();

  // Your implementation
  
  return (
    <AbsoluteFill>
      {/* GitHub Sign In animation content */}
    </AbsoluteFill>
  );
}`
  },
  {
    id: 'googlesignin',
    name: 'Google Sign In',
    duration: 120, // 4 seconds
    component: GoogleSignIn,
    getCode: () => `import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

export default function GoogleSignIn() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Your implementation
  
  return (
    <AbsoluteFill>
      {/* Google Sign In animation content */}
    </AbsoluteFill>
  );
}`
  },
  {
    id: 'gradienttext',
    name: 'Gradient Text',
    duration: 240, // 8 seconds
    component: GradientText,
    getCode: () => `import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';

export default function GradientText() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Your implementation
  
  return (
    <AbsoluteFill>
      {/* Gradient Text animation content */}
    </AbsoluteFill>
  );
}`
  },
  {
    id: 'growthgraph',
    name: 'Growth Graph',
    duration: 240, // 8 seconds
    component: GrowthGraph,
    getCode: () => `import { AbsoluteFill, interpolate, useCurrentFrame, spring, useVideoConfig } from "remotion";

export default function GrowthGraph() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Your implementation
  
  return (
    <AbsoluteFill>
      {/* Growth Graph animation content */}
    </AbsoluteFill>
  );
}`
  },
  {
    id: 'knowscode',
    name: 'Knows Code',
    duration: 180, // 6 seconds
    component: KnowsCode,
    getCode: () => `import { AbsoluteFill, interpolate, useCurrentFrame, spring } from 'remotion';

export default function KnowsCode() {
  const frame = useCurrentFrame();

  // Your implementation
  
  return (
    <AbsoluteFill>
      {/* Knows Code animation content */}
    </AbsoluteFill>
  );
}`
  },
  {
    id: 'promptintro',
    name: 'Prompt Intro',
    duration: 180, // 6 seconds
    component: PromptIntro,
    getCode: () => `import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

export default function PromptIntro() {
  const frame = useCurrentFrame();

  // Your implementation
  
  return (
    <AbsoluteFill>
      {/* Prompt Intro animation content */}
    </AbsoluteFill>
  );
}`
  }
]; 