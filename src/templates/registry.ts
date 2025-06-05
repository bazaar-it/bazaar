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
  previewFrame: number; // fps for preview
  component: React.ComponentType; // Real React component for Remotion Player
  getCode: () => string; // Code string for database storage
}

export const TEMPLATES: TemplateDefinition[] = [
  {
    id: 'hero',
    name: 'Hero Section',
    duration: 180, // 6 seconds
    previewFrame: 30,
    component: HeroTemplate,
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
  },
  {
    id: 'particles',
    name: 'Particle Explosion',
    duration: 240, // 8 seconds
    previewFrame: 30,
    component: ParticleExplosion,
    getCode: () => `// src/templates/ParticleExplosion.tsx
const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;

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
      {/* Particles */}
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
}`
  },
  {
    id: 'logo',
    name: 'Logo Reveal',
    duration: 120, // 4 seconds
    previewFrame: 30,
    component: LogoTemplate,
    getCode: () => `// src/templates/LogoTemplate.tsx
const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } = window.Remotion;

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
            left: \`\${20 + i * 15}%\`,
            top: \`\${30 + (i % 2) * 40}%\`,
            transform: \`translateY(\${Math.sin((frame + i * 10) / 30) * 20}px)\`,
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
          transform: \`scale(\${logoScale}) rotate(\${logoRotation}deg)\`,
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
            transform: \`rotate(-\${logoRotation}deg)\` // Counter-rotate the text
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
          transform: \`translateY(\${textY}px)\`,
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
    id: 'knowscode',
    name: 'Knows Code',
    duration: 180, // 6 seconds
    previewFrame: 30,
    component: KnowsCode,
    getCode: () => `// src/templates/KnowsCode.tsx
const { AbsoluteFill, interpolate, useCurrentFrame, spring } = window.Remotion;

export default function KnowsCode() {
  const frame = useCurrentFrame();

  const BRACE_START = 1;
  const TEXT_START = 5;

  const braceScale = spring({
    frame: frame - BRACE_START,
    fps: 30,
    config: {
      damping: 12,
    },
  });

  const GradientBrace = ({ isLeft, scale }) => {
    return (
      <div
        style={{
          fontSize: '120px',
          lineHeight: '120px',
          fontFamily: 'SF Pro Display, system-ui, sans-serif',
          background: 'linear-gradient(180deg, #FF8DC7 0%, #86A8E7 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          transform: \`scale(\${scale})\`,
        }}
      >
        {isLeft ? '{' : '}'}
      </div>
    );
  };

  const TypewriterText = ({ text, startFrame }) => {
    const charCount = Math.floor(
      interpolate(Math.max(0, frame - startFrame), [0, 30], [0, text.length], {
        extrapolateRight: 'clamp',
      })
    );

    const cursorVisible = Math.floor((frame - startFrame) / 15) % 2 === 0;

    return (
      <div
        style={{
          fontSize: '80px',
          lineHeight: '80px',
          fontFamily: 'SF Pro Display, system-ui, sans-serif',
          fontWeight: 'bold',
        }}
      >
        {text.slice(0, charCount)}
        <span
          style={{
            opacity: cursorVisible ? 1 : 0,
            borderRight: '3px solid black',
            marginLeft: '2px',
            height: '80px',
            display: 'inline-block',
          }}
        />
      </div>
    );
  };

  return (
    <AbsoluteFill
      style={{
        background: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <GradientBrace isLeft={true} scale={braceScale} />
        <TypewriterText text="Software is eating the world" startFrame={TEXT_START} />
        <GradientBrace isLeft={false} scale={braceScale} />
      </div>
    </AbsoluteFill>
  );
}`
  },
  {
    id: 'promptintro',
    name: 'Prompt Intro',
    duration: 180, // 6 seconds
    previewFrame: 30,
    component: PromptIntro,
    getCode: () => `// src/templates/PromptIntro.tsx
const {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  spring,
} = window.Remotion;

const InputBar = ({
  text,
  placeholder,
  showButton,
  scale,
  opacity,
}) => {
  const frame = useCurrentFrame();
  const cursorVisible = Math.floor(frame / 15) % 2 === 0;
  const buttonScale = spring({
    frame: frame - 45,
    fps: 30,
    config: {
      damping: 12,
      stiffness: 200,
    },
  });

  return (
    <div
      style={{
        position: "relative",
        width: "800px",
        height: "64px",
        background: "rgba(255, 255, 255, 0.1)",
        borderRadius: "9999px",
        display: "flex",
        alignItems: "center",
        padding: "0 32px",
        transform: \`scale(\${scale})\`,
        opacity,
        boxShadow: "0 0 0 1px rgba(255, 255, 255, 0.1)",
      }}
    >
      <div
        style={{
          flex: 1,
          fontSize: "24px",
          fontFamily: "Inter, system-ui, sans-serif",
          color: text ? "#FFFFFF" : "#AAAAAA",
        }}
      >
        {text || placeholder}
        {text && cursorVisible && (
          <span
            style={{
              borderRight: "2px solid #FFFFFF",
              marginLeft: "2px",
              height: "24px",
              display: "inline-block",
            }}
          />
        )}
      </div>
      {showButton && (
        <div
          style={{
            width: "40px",
            height: "40px",
            background: "rgba(255, 255, 255, 0.1)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: \`scale(\${buttonScale})\`,
            cursor: "pointer",
          }}
        >
          ✨
        </div>
      )}
    </div>
  );
};

const GlowEffect = ({
  intensity,
}) => {
  const frame = useCurrentFrame();
  const pulse = Math.sin(frame / 30) * 0.1 + 0.9;

  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        width: "900px",
        height: "200px",
        transform: \`translate(-50%, -50%) scale(\${pulse})\`,
        background: \`radial-gradient(
          ellipse at center,
          rgba(255, 140, 0, \${0.3 * intensity}) 0%,
          rgba(255, 105, 180, \${0.2 * intensity}) 50%,
          rgba(147, 112, 219, \${0.1 * intensity}) 100%
        )\`,
        filter: "blur(40px)",
        opacity: intensity,
      }}
    />
  );
};

export default function PromptIntro() {
  const frame = useCurrentFrame();
  const text = "Create incredible motion graphics for your app with Bazaar";
  const TYPING_START = 0;
  const TYPING_DURATION = 45;
  const BUTTON_SHOW = 45;
  const CLICK_START = 60;

  const charCount = Math.floor(
    interpolate(
      frame - TYPING_START,
      [0, TYPING_DURATION],
      [0, text.length],
      { extrapolateRight: "clamp" }
    )
  );

  const scale = spring({
    frame: frame - CLICK_START,
    fps: 30,
    config: {
      damping: 15,
      stiffness: 80,
    },
  });

  const finalScale = interpolate(scale, [0, 1], [1, 0.6]);

  const glowIntensity = interpolate(
    frame,
    [0, 5, CLICK_START, CLICK_START + 15],
    [0, 1, 1, 0],
    { extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        background: "#000000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <GlowEffect intensity={glowIntensity} />
      <InputBar
        text={text.slice(0, charCount)}
        placeholder="Ask Bazaar to create..."
        showButton={frame >= BUTTON_SHOW}
        scale={finalScale}
        opacity={interpolate(
          frame,
          [0, 5, CLICK_START + 15, CLICK_START + 30],
          [0, 1, 1, 0],
          { extrapolateRight: "clamp" }
        )}
      />
    </AbsoluteFill>
  );
}`
},
{
  id: 'typing',
  name: 'Terminal Typing',
  duration: 300, // 10 seconds
  previewFrame: 30,
  component: TypingTemplate,
  getCode: () => `// src/templates/TypingTemplate.tsx
const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;

export default function TypingTemplate() {
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

// Terminal text that types out
const fullText = "$ npm install @remotion/cli\\n$ npx remotion preview\\n✓ Server ready at http://localhost:3000";

// Calculate how much text to show based on frame
const charactersPerSecond = 8;
const totalCharacters = Math.floor((frame / fps) * charactersPerSecond);
const displayText = fullText.substring(0, totalCharacters);

// Cursor blink animation
const cursorOpacity = interpolate(frame % 30, [0, 15, 30], [1, 0, 1]);

// Terminal window fade in
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
  id: 'glitch',
  name: 'Glitch Text Effect',
  duration: 200, // ~6.7 seconds
  previewFrame: 30,
  component: GlitchText,
  getCode: () => `// src/templates/GlitchText.tsx
const {
AbsoluteFill,
useCurrentFrame,
useVideoConfig,
interpolate,
} = window.Remotion;

export default function GlitchText() {
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

const isGlitching = Math.sin(frame / 3) > 0.7 || Math.sin(frame / 7) > 0.8;
const glitchX = isGlitching ? (Math.random() - 0.5) * 10 : 0;
const glitchY = isGlitching ? (Math.random() - 0.5) * 5 : 0;
const redOffset = isGlitching ? (Math.random() - 0.5) * 6 : 0;
const blueOffset = isGlitching ? (Math.random() - 0.5) * 6 : 0;

const textOpacity = interpolate(frame, [0, fps * 1], [0, 1], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});

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
  id: 'pulsing',
  name: 'Pulsing Circles',
  duration: 240, // 8 seconds
  previewFrame: 30,
  component: PulsingCircles,
  getCode: () => `// src/templates/PulsingCircles.tsx
const { AbsoluteFill, useCurrentFrame, interpolate } = window.Remotion;

export default function PulsingCircles() {
const frame = useCurrentFrame();

const circles = Array.from({ length: 5 }, (_, i) => {
  const delay = i * 20;
  const scale = interpolate((frame - delay) % 120, [0, 60, 120], [0, 1.5, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  const opacity = interpolate((frame - delay) % 120, [0, 30, 90, 120], [0, 0.8, 0.2, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  
  return { scale, opacity, size: 100 + i * 50, color: \`hsl(\${i * 60}, 70%, 60%)\` };
});

return (
  <AbsoluteFill 
    style={{
      background: "radial-gradient(circle, #1a1a2e 0%, #16213e 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}
  >
    {circles.map((circle, i) => (
      <div
        key={i}
        style={{
          position: "absolute",
          width: \`\${circle.size}px\`,
          height: \`\${circle.size}px\`,
          borderRadius: "50%",
          border: \`3px solid \${circle.color}\`,
          transform: \`scale(\${circle.scale})\`,
          opacity: circle.opacity,
        }}
      />
    ))}
    <h1 style={{ fontSize: "48px", color: "#ffffff", fontWeight: "900", zIndex: 10 }}>
      PULSE
    </h1>
  </AbsoluteFill>
);
}`
},
{
  id: 'floating',
  name: 'Floating Elements',
  duration: 240, // 8 seconds
  previewFrame: 30,
  component: FloatingElements,
  getCode: () => `const {
AbsoluteFill,
useCurrentFrame,
useVideoConfig,
interpolate,
} = window.Remotion;

export default function FloatingElements() {
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

const elements = [
  { id: 1, type: "card", x: 20, y: 15, delay: 0, icon: "💳", text: "Payment" },
  { id: 2, type: "notification", x: 75, y: 25, delay: fps * 0.5, icon: "🔔", text: "3 new messages" },
  { id: 3, type: "chart", x: 10, y: 70, delay: fps * 1, icon: "📊", text: "Analytics" },
  { id: 4, type: "profile", x: 80, y: 75, delay: fps * 1.5, icon: "👤", text: "Profile" },
  { id: 5, type: "settings", x: 50, y: 10, delay: fps * 2, icon: "⚙️", text: "Settings" }
];

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
          key={\`particle-\${i}\`}
          style={{
            position: "absolute",
            left: \`\${particleX}%\`,
            top: \`\${particleY}%\`,
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            backgroundColor: "#ffffff",
            opacity: particleOpacity,
            transform: \`translateY(\${Math.sin((frame + i * 30) / 40) * 20}px)\`,
            boxShadow: "0 0 10px #ffffff"
          }}
        />
      );
    })}
  </AbsoluteFill>
);
}`
},
{
  id: 'github-signin',
  name: 'GitHub Sign In',
  duration: 120, // 4 seconds
  previewFrame: 30,
  component: GitHubSignIn,
  getCode: () => `const {
AbsoluteFill,
useCurrentFrame,
useVideoConfig,
spring,
interpolate,
} = window.Remotion;

export default function GithubSignIn() {
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

const fadeIn = spring({
  frame,
  fps,
  config: {
    damping: 20,
    stiffness: 80,
  },
});

const scaleIn = spring({
  frame: frame - 15,
  fps,
  config: {
    damping: 12,
    stiffness: 200,
  },
});

const pulse = Math.sin(frame / 30) * 0.1 + 0.9;

return (
  <AbsoluteFill
    style={{
      backgroundColor: "white",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        width: 600,
        height: 200,
        transform: \`translate(-50%, -50%) scale(\${pulse})\`,
        background: "radial-gradient(ellipse at center, rgba(0,0,0,0.05) 0%, transparent 70%)",
        filter: "blur(40px)",
        opacity: fadeIn,
      }}
    />

    <button
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        background: "black",
        color: "white",
        border: "none",
        borderRadius: "100px",
        padding: "24px 120px",
        fontSize: "32px",
        fontFamily: "Inter, -apple-system, system-ui, sans-serif",
        fontWeight: 500,
        cursor: "pointer",
        opacity: fadeIn,
        transform: \`scale(\${interpolate(scaleIn, [0, 1], [0.9, 1])})\`,
        boxShadow: \`0 24px 48px rgba(0, 0, 0, 0.15)\`,
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        width={32}
        height={32}
      >
        <path d="M12 .5C5.65.5.5 5.66.5 12.05c0 5.1 3.29 9.42 7.86 10.96.58.11.8-.25.8-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.72-1.54-2.55-.3-5.23-1.28-5.23-5.7 0-1.26.46-2.3 1.2-3.11-.12-.3-.52-1.52.11-3.16 0 0 .98-.31 3.2 1.19a11.14 11.14 0 0 1 5.82 0c2.2-1.5 3.18-1.19 3.18-1.19.64 1.64.24 2.86.12 3.16.75.81 1.2 1.85 1.2 3.11 0 4.43-2.69 5.39-5.25 5.68.42.36.77 1.08.77 2.17 0 1.56-.02 2.82-.02 3.2 0 .31.21.68.8.56A10.53 10.53 0 0 0 23.5 12.05C23.5 5.66 18.34.5 12 .5Z" />
      </svg>
      Sign in with GitHub
    </button>
  </AbsoluteFill>
);
}`
},
{
  id: 'gradient-text',
  name: 'Gradient Text',
  duration: 240, // 8 seconds
  previewFrame: 30,
  component: GradientText,
  getCode: () => `const {
AbsoluteFill,
useCurrentFrame,
useVideoConfig,
} = window.Remotion;

export default function GradientText() {
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

const loopDuration = fps * 8;
const hueBase = (frame % loopDuration) * (360 / loopDuration);
const getHue = (offset) => \`hsl(\${(hueBase + offset) % 360}, 100%, 60%)\`;

return (
  <AbsoluteFill
    style={{
      backgroundColor: "#ffffff",
      justifyContent: "center",
      alignItems: "center",
      display: "flex",
    }}
  >
    <svg width="1000" height="150" viewBox="0 0 1000 150">
      <defs>
        <linearGradient id="text-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={getHue(0)} />
          <stop offset="20%" stopColor={getHue(60)} />
          <stop offset="40%" stopColor={getHue(120)} />
          <stop offset="60%" stopColor={getHue(180)} />
          <stop offset="80%" stopColor={getHue(240)} />
          <stop offset="100%" stopColor={getHue(300)} />
        </linearGradient>
      </defs>

      <text
        x="100"
        y="100"
        fill="#000"
        fontFamily="Inter, sans-serif"
        fontWeight="700"
        fontSize="72"
      >
        Design
      </text>

      <text
        x="370"
        y="100"
        fill="url(#text-gradient)"
        fontFamily="Inter, sans-serif"
        fontWeight="700"
        fontSize="72"
      >
        without
      </text>

      <text
        x="655"
        y="100"
        fill="#000"
        fontFamily="Inter, sans-serif"
        fontWeight="700"
        fontSize="72"
      >
        Limits
      </text>
    </svg>
  </AbsoluteFill>
);
}`
},
{
  id: 'apple-signin',
  name: 'Apple Sign In',
  duration: 120, // 4 seconds
  previewFrame: 30,
  component: AppleSignIn,
  getCode: () => `const {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  spring,
  useVideoConfig,
} = window.Remotion;

export default function AppleSignIn() {
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

const fadeIn = spring({
  frame,
  fps,
  config: { damping: 20, stiffness: 80 },
});

const buttonScale = spring({
  frame: frame - 15,
  fps,
  config: { damping: 12, stiffness: 200 },
});

const hover = spring({
  frame: frame - 45,
  fps,
  config: { damping: 12, stiffness: 200 },
});

const shadowSize = interpolate(hover, [0, 1], [20, 30]);

const pulse = Math.sin(frame / 30) * 0.1 + 0.9;

return (
  <AbsoluteFill
    style={{
      backgroundColor: "white",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "Inter, -apple-system, system-ui, sans-serif",
    }}
  >
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        width: "600px",
        height: "200px",
        transform: \`translate(-50%, -50%) scale(\${pulse})\`,
        background:
          "radial-gradient(ellipse at center, rgba(255,255,255,0.15) 0%, transparent 70%)",
        filter: "blur(40px)",
        opacity: fadeIn,
      }}
    />

    <button
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        background: "black",
        color: "white",
        border: "none",
        borderRadius: "100px",
        padding: "24px 120px",
        fontSize: "32px",
        fontWeight: 500,
        cursor: "pointer",
        opacity: fadeIn,
        transform: \`scale(\${interpolate(buttonScale, [0, 1], [0.9, 1])})\`,
        boxShadow: \`0 \${shadowSize}px \${shadowSize * 2}px rgba(0, 0, 0, 0.1)\`,
        transition: "box-shadow 0.3s ease",
      }}
    >
      <svg viewBox="0 0 384 512" width="32" height="32" fill="currentColor">
        <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
      </svg>
      Sign in with Apple
    </button>
  </AbsoluteFill>
);
}`
},
{
  id: 'ai-coding',
  name: 'AI Coding',
  duration: 180, // 6 seconds
  previewFrame: 30,
  component: AICoding,
  getCode: () => `const {
AbsoluteFill,
useCurrentFrame,
interpolate,
} = window.Remotion;

export default function AICoding() {
const frame = useCurrentFrame();

const codeLines = [
  { text: "export const Animation: React.FC = () => {", indent: 0, delay: 0 },
  { text: "const frame = useCurrentFrame();", indent: 1, delay: 10 },
  { text: "return (", indent: 1, delay: 20 },
  { text: "<Series>", indent: 2, delay: 30 },
  { text: "<Series.Sequence durationInFrames={60}>", indent: 3, delay: 40 },
  { text: "<FadeIn>", indent: 4, delay: 50 },
  { text: "const progress = interpolate(", indent: 5, delay: 60 },
  { text: "frame,", indent: 6, delay: 70 },
  { text: "[0, 30],", indent: 6, delay: 80 },
  { text: "[0, 1],", indent: 6, delay: 90 },
  { text: ");", indent: 5, delay: 100 },
  { text: "</FadeIn>", indent: 4, delay: 110 },
  { text: "</Series.Sequence>", indent: 3, delay: 120 },
  { text: "</Series>", indent: 2, delay: 130 },
  { text: ");", indent: 1, delay: 140 },
  { text: "}", indent: 0, delay: 145 },
];

const containerOpacity = interpolate(
  frame,
  [0, 10],
  [0, 1],
  { extrapolateRight: "clamp" }
);

function CodeLine({ text, delay, indent }) {
  const charCount = Math.floor(
    interpolate(frame - delay, [0, 20], [0, text.length], {
      extrapolateRight: "clamp",
    })
  );

  const opacity = interpolate(frame - delay, [0, 5], [0, 1], {
    extrapolateRight: "clamp",
  });

  const colorizeToken = (token) => {
    if (token.match(/^(Sequence|Series|interpolate|useCurrentFrame|spring)$/)) {
      return "#FF92FF";
    } else if (token.match(/^[A-Z]\\w+/)) {
      return "#00FFFF";
    } else if (token.match(/^['""].*['""]$/)) {
      return "#50FA7B";
    } else if (token.match(/^[{}\\[\\](),;]$/)) {
      return "#F8F8F2";
    } else if (token.match(/^\\d+$/)) {
      return "#FF79C6";
    } else if (token.match(/^[\\w]+(?=\\()/)) {
      return "#00B4FF";
    } else if (token.match(/^\\.[\\w]+/)) {
      return "#BD93F9";
    }
    return "#F8F8F2";
  };

  return (
    <div
      style={{
        fontFamily: "SF Mono, monospace",
        fontSize: "24px",
        marginLeft: \`\${indent * 24}px\`,
        opacity,
        height: "36px",
        display: "flex",
        alignItems: "center",
        color: "#F8F8F2",
      }}
    >
      {text.slice(0, charCount).split(/([{}\\[\\](),;.]|\\s+)/).map((token, i) => {
        if (token.trim() === "") return token;
        const color = colorizeToken(token);
        return (
          <span key={i} style={{ color }}>
            {token}
          </span>
        );
      })}
      {frame >= delay && frame < delay + 20 && (
        <span
          style={{
            width: "2px",
            height: "24px",
            background: "#00FFFF",
            display: "inline-block",
            marginLeft: "2px",
            animation: "blink 1s infinite",
          }}
        />
      )}
    </div>
  );
}

return (
  <AbsoluteFill
    style={{
      background: "linear-gradient(135deg, #0D1117 0%, #161B22 100%)",
      padding: "40px",
      opacity: containerOpacity,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
    }}
  >
    <div
      style={{
        background: "#1C2128",
        borderRadius: "12px",
        padding: "32px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        border: "1px solid #30363D",
        maxWidth: "900px",
        margin: "0 auto",
      }}
    >
      <div
        style={{
          color: "#7C3AED",
          fontSize: "20px",
          fontFamily: "SF Mono, monospace",
          marginBottom: "24px",
          opacity: 0.8,
        }}
      >
        // AI-Generated Animation Code
      </div>

      {codeLines.map((line, i) => (
        <CodeLine key={i} {...line} />
      ))}
    </div>
  </AbsoluteFill>
);
}`
},
{
  id: 'growth-graph',
  name: 'Growth Graph',
  duration: 240, // 8 seconds
  previewFrame: 30,
  component: GrowthGraph,
  getCode: () => `const {
AbsoluteFill,
interpolate,
useCurrentFrame,
spring,
useVideoConfig,
} = window.Remotion;

export default function GrowthGraph() {
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

const cameraProgress = spring({
  frame: frame - 30,
  fps,
  config: {
    damping: 100,
    stiffness: 200,
    mass: 0.5,
  },
});

const bars = [
  { label: "Q1", value: 85, color: "#ff6b6b" },
  { label: "Q2", value: 120, color: "#4ecdc4" },
  { label: "Q3", value: 95, color: "#45b7d1" },
  { label: "Q4", value: 140, color: "#96ceb4" },
];

return (
  <AbsoluteFill
    style={{
      backgroundColor: "#1a1a2e",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "Arial, sans-serif",
      color: "#fff",
    }}
  >
    <h1
      style={{
        fontSize: 48,
        fontWeight: "bold",
        marginBottom: 40,
        opacity: interpolate(frame, [0, 30], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
      }}
    >
      Growth Analytics
    </h1>

    <div
      style={{
        display: "flex",
        alignItems: "end",
        gap: 20,
        height: 300,
        transform: \`scale(\${cameraProgress})\`,
      }}
    >
      {bars.map((bar, index) => {
        const barHeight = interpolate(
          frame,
          [60 + index * 15, 90 + index * 15],
          [0, (bar.value / 140) * 250],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }
        );

        const valueOpacity = interpolate(
          frame,
          [90 + index * 15, 120 + index * 15],
          [0, 1],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }
        );

        return (
          <div
            key={index}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: "bold",
                opacity: valueOpacity,
              }}
            >
              {bar.value}%
            </div>
            <div
              style={{
                width: 60,
                height: barHeight,
                backgroundColor: bar.color,
                borderRadius: "4px 4px 0 0",
                boxShadow: \`0 0 20px \${bar.color}50\`,
              }}
            />
            <div
              style={{
                fontSize: 16,
                fontWeight: "500",
                opacity: interpolate(frame, [30, 60], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
              }}
            >
              {bar.label}
            </div>
          </div>
        );
      })}
    </div>

    <div
      style={{
        marginTop: 40,
        fontSize: 24,
        fontWeight: "500",
        opacity: interpolate(frame, [150, 180], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
      }}
    >
      🚀 Record Breaking Performance
    </div>
      </AbsoluteFill>
  );
}`
},
{
  id: 'wave-animation',
  name: 'Wave Animation',
  duration: 300, // 10 seconds
  previewFrame: 30,
  component: WaveAnimation,
  getCode: () => `const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;

export default function WaveAnimation() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const waves = Array.from({ length: 4 }, (_, i) => {
    const waveSpeed = 0.02 + i * 0.01;
    const amplitude = 80 - i * 15;
    const frequency = 0.005 + i * 0.002;
    const verticalOffset = 50 + i * 20;
    
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
  id: 'fintech-ui',
  name: 'Fintech UI',
  duration: 240, // 8 seconds
  previewFrame: 30,
  component: FintechUI,
  getCode: () => `const {
AbsoluteFill,
interpolate,
useCurrentFrame,
spring,
} = window.Remotion;

const ChatMessage = ({ text, isUser, delay }) => {
const frame = useCurrentFrame();
const progress = spring({ frame: frame - delay, fps: 30, config: { damping: 12, stiffness: 200 } });

return (
  <div
    style={{
      display: "flex",
      justifyContent: isUser ? "flex-end" : "flex-start",
      opacity: progress,
      transform: \`translateY(\${interpolate(progress, [0, 1], [20, 0])}px)\`,
      marginBottom: 24,
    }}
  >
    <div
      style={{
        maxWidth: "80%",
        padding: "16px 20px",
        borderRadius: 20,
        background: isUser ? "#007AFF" : "#E9ECEF",
        color: isUser ? "white" : "#212529",
        fontFamily: "sans-serif",
        fontSize: 16,
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
        lineHeight: 1.5,
      }}
    >
      {text}
    </div>
  </div>
);
};

const InputBar = ({ opacity }) => {
const frame = useCurrentFrame();
const text = "These Bazaar animations are pretty sick, right?!";
const charCount = Math.floor(interpolate(frame, [0, 150], [0, text.length], { extrapolateRight: "clamp" }));
const cursorVisible = Math.floor(frame / 15) % 2 === 0;

return (
  <div
    style={{
      minHeight: 120,
      background: "white",
      borderRadius: 24,
      display: "flex",
      alignItems: "flex-start",
      padding: 20,
      opacity,
      transform: \`translateY(\${interpolate(opacity, [0, 1], [20, 0])}px)\`,
      boxShadow: "0 4px 24px rgba(0, 0, 0, 0.1)",
      border: "1px solid #E5E5E5",
    }}
  >
    <div
      style={{
        flex: 1,
        color: "#212529",
        fontFamily: "sans-serif",
        fontSize: 16,
        lineHeight: 1.5,
        minHeight: 80,
      }}
    >
      {text.slice(0, charCount)}
      {cursorVisible && <span style={{ borderRight: "2px solid #007AFF", marginLeft: 2, height: 20, display: "inline-block" }} />}
    </div>
  </div>
);
};

export default function FintechUI() {
const frame = useCurrentFrame();
const progress = spring({ frame, fps: 30, config: { damping: 20, stiffness: 80 } });
const messages = [
  { text: "I need help designing a landing page for my AI fintech startup.", isUser: true, delay: 0 },
  { text: "Sure! What's the core message you want to highlight?", isUser: false, delay: 15 },
  { text: "AI + Finance. We want it to feel smart but friendly.", isUser: true, delay: 30 },
  { text: "Here's a layout with bold headlines and a dashboard.", isUser: false, delay: 45 },
  { text: "This is 🔥🔥🔥", isUser: true, delay: 60 },
];

return (
  <AbsoluteFill style={{ background: "#F8F9FA" }}>
    <div style={{ display: "flex", height: "100%", padding: 32, gap: 32 }}>
      <div style={{ width: "30%", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, overflowY: "auto", paddingRight: 20 }}>
          {messages.map((msg, i) => <ChatMessage key={i} {...msg} />)}
        </div>
        <InputBar opacity={progress} />
      </div>
      <div style={{ width: "70%" }}>
        <div style={{ flex: 1, background: "linear-gradient(135deg, #1E1E2E 0%, #2D2D44 100%)", borderRadius: 16, opacity: progress, position: "relative", overflow: "hidden", padding: 24, color: "white", fontFamily: "sans-serif" }}>
          <h1 style={{ fontSize: 56, marginBottom: 16, textAlign: "center", fontWeight: 700 }}>AI Financial Insights</h1>
          <p style={{ fontSize: 22, marginBottom: 32, color: "#AAA", textAlign: "center" }}>Make smarter investments with predictive analytics.</p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <button style={{ background: "#3F64F3", color: "white", border: "none", borderRadius: 12, padding: "16px 36px", fontSize: 20, fontWeight: "bold", cursor: "pointer" }}>Let's Go 🚀</button>
          </div>
        </div>
      </div>
    </div>
  </AbsoluteFill>
);
}`
},
{
  id: 'blue-gradient-text',
  name: 'Blue Gradient Text',
  duration: 180, // 6 seconds
  previewFrame: 30,
  component: BlueGradientText,
  getCode: () => `const {
AbsoluteFill,
useCurrentFrame,
interpolate,
} = window.Remotion;

export default function BlueGradientText() {
const frame = useCurrentFrame();

const textOpacity = interpolate(frame, [0, 30], [0, 1], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
});

const shimmer = interpolate(frame, [0, 120], [0, 100], {
  extrapolateRight: "wrap",
});

return (
  <AbsoluteFill
    style={{
      backgroundColor: "#0f0f23",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <div
      style={{
        fontSize: "64px",
        fontWeight: "900",
        background: \`linear-gradient(90deg, #00d4ff, #ff00d4, #00d4ff)\`,
        backgroundSize: "200% 100%",
        backgroundPosition: \`\${shimmer}% 0\`,
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        opacity: textOpacity,
        letterSpacing: "2px",
        textShadow: "0 0 30px rgba(0, 212, 255, 0.5)",
      }}
    >
      FUTURE TECH
    </div>
  </AbsoluteFill>
);
}`
},
{
  id: 'dot-ripple',
  name: 'Dot Ripple',
  duration: 180, // 6 seconds
  previewFrame: 30,
  component: DotRipple,
  getCode: () => `const { AbsoluteFill, useCurrentFrame, interpolate } = window.Remotion;

export default function DotRipple() {
const frame = useCurrentFrame();

const ripples = Array.from({ length: 3 }, (_, i) => {
  const delay = i * 20;
  const scale = interpolate(
    frame - delay,
    [0, 60],
    [0, 3],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp"
    }
  );
  const opacity = interpolate(
    frame - delay,
    [0, 30, 60],
    [0, 0.8, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp"
    }
  );

  return { scale, opacity };
});

return (
  <AbsoluteFill
    style={{
      backgroundColor: "#000",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    {ripples.map((ripple, i) => (
      <div
        key={i}
        style={{
          position: "absolute",
          width: "100px",
          height: "100px",
          borderRadius: "50%",
          border: "2px solid #00ff88",
          transform: \`scale(\${ripple.scale})\`,
          opacity: ripple.opacity,
        }}
      />
    ))}
    <div
      style={{
        width: "20px",
        height: "20px",
        borderRadius: "50%",
        backgroundColor: "#00ff88",
        boxShadow: "0 0 20px #00ff88",
      }}
    />
  </AbsoluteFill>
);
}`
},
{
  id: 'ai-dialogue',
  name: 'AI Dialogue',
  duration: 180, // 6 seconds
  previewFrame: 30,
  component: AIDialogue,
  getCode: () => `const { AbsoluteFill, useCurrentFrame, interpolate } = window.Remotion;
  const messages = [
    { text: "Hey, I want to generate a motion graphic video for my product.", isUser: true, delay: 0 },
    { text: "Awesome! What kind of visuals or layout are you thinking?", isUser: false, delay: 10 },
    { text: "Let's go for a product demo vibe. Bold headline, clean interface.", isUser: true, delay: 20 },
    { text: "Got it. Should I include animated metrics and a button CTA?", isUser: false, delay: 30 },
    { text: "Yes, with green numbers for growth and a glowing effect on CTA.", isUser: true, delay: 40 },
    { text: "Done. Preview now includes everything and looks polished.", isUser: false, delay: 50 },
    { text: "Perfect. This is exactly what I envisioned using Bazaar.", isUser: true, delay: 60 },
    { text: "Thanks, this is exactly what I needed! Let's export", isUser: false, delay: 70 },
  ];
  
  const ChatMessage = ({ text, isUser, delay }: { text: string; isUser: boolean; delay: number }) => {
    const frame = useCurrentFrame();
    const opacity = spring({
      frame: frame - delay,
      fps: 30,
      config: { damping: 12, stiffness: 200 },
    });
  
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          padding: '12px 24px',
          opacity,
        }}
      >
        <div
          style={{
            maxWidth: '520px',
            fontSize: 16,
            fontFamily: 'sans-serif',
            background: isUser ? '#007AFF' : '#F1F1F1',
            color: isUser ? 'white' : '#111',
            padding: '16px 20px',
            borderRadius: 24,
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          }}
        >
          {text}
        </div>
      </div>
    );
  };
  
  export default function AIDialogue() {
    const frame = useCurrentFrame();
  
    return (
      <AbsoluteFill
        style={{
          backgroundColor: '#F8F9FA',
          display: 'flex',
          flexDirection: 'column',
          padding: '48px 0 80px 0',
          justifyContent: 'flex-start',
        }}
      >
        {messages.map((msg, i) => (
          <ChatMessage key={i} {...msg} />
        ))}
      </AbsoluteFill>
  );
}`
},
]