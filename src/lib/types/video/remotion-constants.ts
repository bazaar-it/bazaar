// src/types/remotion-constants.ts
// Use a browser-compatible UUID generation approach instead of Node's crypto
import { v4 as uuidv4 } from 'uuid';
import { z } from "zod";
import type { InputProps } from "./input-props";

export const COMP_NAME = "MyComp";

export const CompositionProps = z.object({
  title: z.string(),
});

export const defaultMyCompProps: z.infer<typeof CompositionProps> = {
  title: "Bazaar-Vid",
};

export const DemoTimelineProps = z.object({
  title: z.string(),
  author: z.string(),
  imageUrl: z.string(),
});

export const defaultDemoProps: z.infer<typeof DemoTimelineProps> = {
  title: "Bazaar-Vid",
  author: "You",
  imageUrl: "/demo.jpg",
};

// Function to generate default project props with a welcome scene
export function createDefaultProjectProps(): InputProps {
  const welcomeSceneId = uuidv4();
  
  return {
    meta: { 
      duration: 300, // 10 seconds at 30fps - more snappy
      title: "New Project",
      backgroundColor: "#0f0f23"
    },
    scenes: [
      {
        id: welcomeSceneId,
        type: "welcome",
        start: 0,
        duration: 300, // 10 seconds at 30fps
        data: {
          name: "Welcome Scene",
          code: `//src/remotion/components/scenes/WelcomeScene.tsx
const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, random, spring, Sequence, Img } = window.Remotion;

export default function WelcomeScene({
  title = "Welcome to Bazaar",
  subtitle = "Transform Your Ideas Into Motion",
  backgroundColor = "#0f0f23",
  textColor = "#ffffff"
}) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  // Multi-stage animation sequences (10 seconds total)
  // Stage 1: Logo reveal (0-2s)
  // Stage 2: Main title and subtitle (1.5-3.5s)
  // Stage 3: Feature showcase (3.5-6s) - FAST!
  // Stage 4: Call to action (6-10s)

  // Global exit animation (last 1 second)
  const exitStart = durationInFrames - fps;
  const globalFadeOut = interpolate(
    frame,
    [exitStart, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const globalScaleOut = interpolate(
    frame,
    [exitStart, durationInFrames],
    [1, 0.95],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Responsive sizing based on canvas width
  const isMobile = width < 600;
  const isTablet = width < 900;

  // Logo reveal animation (0-2 seconds)
  const logoRevealStart = 0;
  const logoRevealEnd = fps * 2;
  const logoProgress = spring({
    frame: frame - logoRevealStart,
    fps,
    config: {
      damping: 100,
      stiffness: 200,
      mass: 0.5,
    },
  });

  // Main title animation (1.5-3.5 seconds)
  const titleStart = fps * 1.5;
  const titleEnd = fps * 3.5;
  const titleOpacity = interpolate(
    frame,
    [titleStart, titleStart + fps * 0.8],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  
  const titleScale = spring({
    frame: frame - titleStart,
    fps,
    config: { damping: 20, stiffness: 100 },
  });

  // Typewriter effect for title
  const titleText = title || "Welcome to Bazaar";
  const titleCharsToShow = Math.floor(
    interpolate(
      frame,
      [titleStart, titleStart + fps * 1.2], // 1.2 seconds to type
      [0, titleText.length],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    )
  );
  const displayedTitle = titleText.slice(0, titleCharsToShow);

  // Subtitle animation with elegant fade
  const subtitleStart = fps * 2;
  const subtitleOpacity = interpolate(
    frame,
    [subtitleStart, subtitleStart + fps * 0.5],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Feature cards animation (3.5-6 seconds) - MUCH FASTER!
  const featuresStart = fps * 3.5;
  const feature1Start = featuresStart;
  const feature2Start = featuresStart + fps * 0.2; // Only 0.2s delay
  const feature3Start = featuresStart + fps * 0.4; // Only 0.4s delay

  // Call to action animation (6-10 seconds)
  const ctaStart = fps * 6;
  const ctaScale = spring({
    frame: frame - ctaStart,
    fps,
    config: { damping: 15, stiffness: 150 },
  });

  // Typewriter effect for CTA
  const ctaText = "Type your first prompt to begin...";
  const ctaCharsToShow = Math.floor(
    interpolate(
      frame,
      [ctaStart + fps * 0.5, ctaStart + fps * 2], // 1.5 seconds to type
      [0, ctaText.length],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    )
  );
  const displayedCta = ctaText.slice(0, ctaCharsToShow);

  // Advanced background effects
  const bgGradientAngle = interpolate(
    frame,
    [0, durationInFrames],
    [0, 360],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const bgPulse = Math.sin(frame * 0.02) * 0.1 + 1;

  // Particle system with depth
  const particleCount = 60;
  const particles = [...Array(particleCount)].map((_, i) => {
    const layer = i < 20 ? 'back' : i < 40 ? 'mid' : 'front';
    const size = layer === 'back' ? 2 : layer === 'mid' ? 3 : 4;
    const speed = layer === 'back' ? 0.5 : layer === 'mid' ? 1 : 1.5;
    const opacity = layer === 'back' ? 0.3 : layer === 'mid' ? 0.5 : 0.7;
    
    const startX = random(\`particle-x-\${i}\`) * 100;
    const startY = random(\`particle-y-\${i}\`) * 120 - 10;
    const amplitude = random(\`particle-amp-\${i}\`) * 20 + 10;
    
    const x = startX + Math.sin(frame * 0.02 * speed + i) * amplitude;
    const y = ((startY + frame * speed * 0.3) % 120) - 10;
    
    return { x, y, size, opacity: opacity * interpolate(
      frame,
      [0, fps * 2],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    )};
  });

  // Feature card animation helper - FAST entrance
  const getFeatureAnimation = (startFrame) => {
    const progress = spring({
      frame: frame - startFrame,
      fps,
      config: { damping: 15, stiffness: 200 }, // Stiffer spring for snappier animation
    });
    const slideIn = interpolate(
      frame,
      [startFrame, startFrame + fps * 0.3], // Only 0.3 seconds to slide in
      [50, 0], // Reduced slide distance
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    return { progress, slideIn };
  };

  return (
    <AbsoluteFill
      style={{
        background: \`
          radial-gradient(circle at 50% 50%, rgba(168, 85, 247, 0.1) 0%, transparent 50%),
          linear-gradient(\${bgGradientAngle}deg, #0f0f23, #1a0f2e, #0f0f23)
        \`,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        position: "relative",
        overflow: "hidden",
        opacity: globalFadeOut,
        transform: \`scale(\${globalScaleOut})\`,
        transformOrigin: "center center",
      }}
    >
      {/* Animated particle system with depth layers */}
      <div style={{ position: "absolute", inset: 0 }}>
        {particles.map((particle, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: \`\${particle.x}%\`,
              top: \`\${particle.y}%\`,
              width: \`\${particle.size}px\`,
              height: \`\${particle.size}px\`,
              backgroundColor: "#a855f7",
              borderRadius: "50%",
              opacity: particle.opacity,
              filter: "blur(1px)",
              boxShadow: "0 0 10px rgba(168, 85, 247, 0.5)",
            }}
          />
        ))}
      </div>

      {/* Animated grid background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: \`
            repeating-linear-gradient(0deg, rgba(168, 85, 247, 0.03) 0px, transparent 1px, transparent 100px, rgba(168, 85, 247, 0.03) 101px),
            repeating-linear-gradient(90deg, rgba(168, 85, 247, 0.03) 0px, transparent 1px, transparent 100px, rgba(168, 85, 247, 0.03) 101px)
          \`,
          transform: \`scale(\${bgPulse})\`,
          opacity: interpolate(frame, [0, fps * 2], [0, 1]),
        }}
      />

      {/* Stage 1: Logo reveal */}
      {frame >= logoRevealStart && frame < logoRevealEnd && (
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
            transform: \`scale(\${logoProgress})\`,
            opacity: interpolate(
              frame,
              [logoRevealEnd - fps * 0.3, logoRevealEnd],
              [1, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            ),
          }}
        >
          <div
            style={{
              width: "120px",
              height: "120px",
              background: "linear-gradient(135deg, #a855f7, #3b82f6)",
              borderRadius: "30px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 20px 60px rgba(168, 85, 247, 0.4)",
              transform: \`rotate(\${interpolate(frame, [0, fps * 2], [0, 180])}deg)\`,
            }}
          >
            <div
              style={{
                fontSize: "60px",
                fontWeight: "bold",
                color: "white",
                transform: \`rotate(\${interpolate(frame, [0, fps * 2], [0, -180])}deg)\`,
              }}
            >
              B
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* Stage 2: Main title and subtitle */}
      <Sequence from={titleStart} durationInFrames={titleEnd - titleStart}>
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
          }}
        >
          <h1
            style={{
              fontSize: isMobile ? "2.5rem" : isTablet ? "3.5rem" : "5rem",
              fontWeight: "800",
              margin: 0,
              opacity: titleOpacity,
              transform: \`scale(\${titleScale})\`,
              background: "linear-gradient(135deg, #ffffff, #a855f7, #3b82f6)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "-2px",
              textAlign: "center",
              filter: "drop-shadow(0 4px 20px rgba(168, 85, 247, 0.3))",
              padding: "0 20px",
            }}
          >
            {displayedTitle}
            <span style={{
              opacity: Math.floor(frame / 15) % 2 ? 1 : 0,
              marginLeft: "2px"
            }}>|</span>
          </h1>
          
          <p
            style={{
              fontSize: isMobile ? "1.2rem" : isTablet ? "1.5rem" : "2rem",
              fontWeight: "300",
              color: "#e0e0e0",
              marginTop: "1rem",
              opacity: subtitleOpacity,
              transform: \`translateY(\${interpolate(
                frame,
                [subtitleStart, subtitleStart + fps],
                [30, 0]
              )}px)\`,
              letterSpacing: "1px",
              textAlign: "center",
              padding: "0 20px",
              maxWidth: isMobile ? "90%" : "80%",
            }}
          >
            {subtitle}
          </p>
        </AbsoluteFill>
      </Sequence>

      {/* Stage 3: Feature showcase */}
      <Sequence from={featuresStart} durationInFrames={fps * 2.5}>
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
            padding: "0 5%",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: isMobile ? "1rem" : "2rem",
              maxWidth: isMobile ? "100%" : "1200px",
              width: "100%",
              justifyContent: "center",
              flexWrap: isMobile ? "nowrap" : "wrap",
              flexDirection: isMobile ? "column" : "row",
              alignItems: "center",
              padding: isMobile ? "0 20px" : "0",
            }}
          >
            {/* Feature 1: Upload Image */}
            <div
              style={{
                ...getFeatureCardStyle(),
                transform: \`translateX(\${getFeatureAnimation(feature1Start).slideIn}px) scale(\${getFeatureAnimation(feature1Start).progress})\`,
                opacity: getFeatureAnimation(feature1Start).progress,
              }}
            >
              <div style={getIconStyle("#a855f7")}>📸</div>
              <h3 style={getFeatureTitle()}>Upload Images</h3>
              <p style={getFeatureDescription()}>
                Start with your own visuals
              </p>
            </div>

            {/* Feature 2: AI Generation */}
            <div
              style={{
                ...getFeatureCardStyle(),
                transform: \`translateX(\${getFeatureAnimation(feature2Start).slideIn}px) scale(\${getFeatureAnimation(feature2Start).progress})\`,
                opacity: getFeatureAnimation(feature2Start).progress,
              }}
            >
              <div style={getIconStyle("#3b82f6")}>✨</div>
              <h3 style={getFeatureTitle()}>AI-Powered</h3>
              <p style={getFeatureDescription()}>
                Generate motion graphics instantly
              </p>
            </div>

            {/* Feature 3: Export Ready */}
            <div
              style={{
                ...getFeatureCardStyle(),
                transform: \`translateX(\${getFeatureAnimation(feature3Start).slideIn}px) scale(\${getFeatureAnimation(feature3Start).progress})\`,
                opacity: getFeatureAnimation(feature3Start).progress,
              }}
            >
              <div style={getIconStyle("#10b981")}>🚀</div>
              <h3 style={getFeatureTitle()}>Twitter-Ready</h3>
              <p style={getFeatureDescription()}>
                Export in minutes, not hours
              </p>
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Stage 4: Call to action */}
      <Sequence from={ctaStart} durationInFrames={fps * 4}>
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              transform: \`scale(\${ctaScale})\`,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "2.5rem",
                fontWeight: "600",
                color: "white",
                marginBottom: "2rem",
                opacity: interpolate(
                  frame,
                  [ctaStart, ctaStart + fps],
                  [0, 1]
                ),
              }}
            >
              Ready to Create?
            </div>
            
            <div
              style={{
                background: "linear-gradient(135deg, #a855f7, #3b82f6)",
                padding: "1.5rem 3rem",
                borderRadius: "100px",
                fontSize: "1.2rem",
                fontWeight: "600",
                color: "white",
                boxShadow: "0 10px 40px rgba(168, 85, 247, 0.4)",
                transform: \`translateY(\${interpolate(
                  frame,
                  [ctaStart + fps * 0.5, ctaStart + fps * 1.5],
                  [20, 0]
                )}px)\`,
                opacity: interpolate(
                  frame,
                  [ctaStart + fps * 0.5, ctaStart + fps * 1.5],
                  [0, 1]
                ),
              }}
            >
              {displayedCta}
              <span style={{
                opacity: Math.floor(frame / 15) % 2 ? 1 : 0,
                marginLeft: "2px"
              }}>|</span>
            </div>

            {/* Pulsing indicator */}
            <div
              style={{
                marginTop: "2rem",
                display: "flex",
                gap: "0.5rem",
                justifyContent: "center",
                opacity: interpolate(
                  frame,
                  [ctaStart + fps * 2, ctaStart + fps * 3],
                  [0, 1]
                ),
              }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: "#a855f7",
                    opacity: Math.sin((frame - ctaStart - fps * 2) * 0.05 + i * 1.5) * 0.5 + 0.5,
                  }}
                />
              ))}
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );

  // Helper functions for consistent styling
  function getFeatureCardStyle() {
    return {
      background: "rgba(255, 255, 255, 0.05)",
      backdropFilter: "blur(20px)",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      borderRadius: "20px",
      padding: isMobile ? "1.5rem" : "2rem",
      width: isMobile ? "100%" : "300px",
      maxWidth: isMobile ? "280px" : "300px",
      textAlign: "center",
      boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2)",
    };
  }

  function getIconStyle(color) {
    return {
      fontSize: "3rem",
      marginBottom: "1rem",
      filter: \`drop-shadow(0 0 20px \${color})\`,
    };
  }

  function getFeatureTitle() {
    return {
      fontSize: "1.5rem",
      fontWeight: "600",
      color: "white",
      marginBottom: "0.5rem",
    };
  }

  function getFeatureDescription() {
    return {
      fontSize: "1rem",
      color: "rgba(255, 255, 255, 0.7)",
      lineHeight: "1.5",
    };
  }
}`,
          isWelcomeScene: true, // Flag to identify this as the welcome scene
        },
      }
    ],
  };
}

// Legacy constant for backward compatibility - but should not be used for new projects
export const DEFAULT_PROJECT_PROPS: InputProps = {
  meta: { 
    duration: 150, 
    title: "My First Video" 
  },
  scenes: [
    {
      id: uuidv4(),
      type: "text",
      start: 0,
      duration: 60,
      data: {
        text: "Welcome to your new video",
        color: "#FFFFFF",
        fontSize: 70,
        backgroundColor: "#000000",
      },
    }
  ],
};

// Constants for scene types
export const SCENE_TYPES = [
  "welcome",
  "text", 
  "image", 
  "custom", 
  "background-color", 
  "shape", 
  "simple-shape", 
  "gradient", 
  "particles", 
  "text-animation", 
  "split-screen", 
  "zoom-pan", 
  "svg-animation",
  "simple-colored-shape", 
] as const;

// Export the type derived from the constant
export type SceneType = (typeof SCENE_TYPES)[number];

// Constants for shape types
export const SHAPES = ["circle", "square", "triangle", "star", "heart"] as const;
export type Shape = (typeof SHAPES)[number];

// Constants for transitions
export const TRANSITIONS = ["fade", "slide", "wipe"] as const;
export type Transition = (typeof TRANSITIONS)[number];

// Constants for directions
export const DIRECTIONS = ["from-left", "from-right", "from-top", "from-bottom"] as const;
export type Direction = (typeof DIRECTIONS)[number];

// Constants for text animations
export const TEXT_ANIMATIONS = ["typewriter", "fadeLetters", "slideUp", "bounce", "wavy"] as const;
export type TextAnimation = (typeof TEXT_ANIMATIONS)[number];

// Constants for shape animations
export const SHAPE_ANIMATIONS = ["pulse", "rotate", "bounce", "scale"] as const;
export type ShapeAnimation = (typeof SHAPE_ANIMATIONS)[number];

// Constants for background color animations
export const BG_COLOR_ANIMATIONS = ["fade", "spring", "pulse"] as const;
export type BgColorAnimation = (typeof BG_COLOR_ANIMATIONS)[number];

// Constants for gradient types
export const GRADIENT_TYPES = ["linear", "radial", "conic"] as const;
export type GradientType = (typeof GRADIENT_TYPES)[number];

// Constants for particle types
export const PARTICLE_TYPES = ["circle", "square", "dot", "star"] as const;
export type ParticleType = (typeof PARTICLE_TYPES)[number];

// Constants for SVG animations
export const SVG_ANIMATIONS = ["draw", "scale", "rotate", "fade", "moveIn"] as const;
export type SvgAnimation = (typeof SVG_ANIMATIONS)[number];

// Constants for SVG icons
export const SVG_ICONS = ["circle", "square", "triangle", "star", "heart", "checkmark", "cross", "arrow"] as const;
export type SvgIcon = (typeof SVG_ICONS)[number];

export const DURATION_IN_FRAMES = 200;
export const VIDEO_WIDTH = 1920;
export const VIDEO_HEIGHT = 1080;
export const VIDEO_FPS = 30;