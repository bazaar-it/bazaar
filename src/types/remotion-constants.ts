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
      duration: 150, // 5 seconds at 30fps for welcome animation
      title: "New Project",
      backgroundColor: "#0f0f23"
    },
    scenes: [
      {
        id: welcomeSceneId,
        type: "welcome",
        start: 0,
        duration: 150, // 5 seconds at 30fps
        data: {
          name: "Welcome Scene",
          code: `//src/remotion/components/scenes/WelcomeScene.tsx
const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, random } = window.Remotion;

export default function WelcomeScene({
  title = "Welcome to Bazaar",
  subtitle = "Start creating your video by describing what you want to see",
  backgroundColor = "#0f0f23",
  textColor = "#ffffff"
}) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Animation timings
  const titleStart = 0;
  const titleDuration = fps * 1.5; // 1.5 seconds
  const subtitleStart = fps * 0.8; // Start 0.8 seconds in
  const subtitleDuration = fps * 2; // 2 seconds
  const pulseStart = fps * 2; // Start pulsing after 2 seconds

  // Title animation - fade in and scale
  const titleOpacity = interpolate(
    frame,
    [titleStart, titleStart + titleDuration],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const titleScale = interpolate(
    frame,
    [titleStart, titleStart + titleDuration],
    [0.8, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Subtitle animation - fade in with slight delay
  const subtitleOpacity = interpolate(
    frame,
    [subtitleStart, subtitleStart + subtitleDuration],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const subtitleTranslateY = interpolate(
    frame,
    [subtitleStart, subtitleStart + subtitleDuration],
    [20, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Gentle pulsing effect for the entire scene
  const pulseScale = interpolate(
    frame,
    [pulseStart, pulseStart + fps * 2, pulseStart + fps * 4],
    [1, 1.02, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "extend" }
  );

  // Gradient background animation
  const gradientRotation = interpolate(
    frame,
    [0, durationInFrames],
    [0, 360],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Call to action opacity
  const ctaOpacity = interpolate(
    frame,
    [fps * 3, fps * 4.5],
    [0, 0.6],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        background: \`linear-gradient(\${gradientRotation}deg, \${backgroundColor}, #1a1a3a, \${backgroundColor})\`,
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Animated background particles */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          opacity: 0.1,
        }}
      >
        {[...Array(20)].map((_, i) => {
          const particleDelay = i * 0.2;
          const particleOpacity = interpolate(
            frame,
            [fps * particleDelay, fps * (particleDelay + 2)],
            [0, 0.3],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          
          // Use deterministic positioning with Remotion's random function
          const particleX = random(\`particle-x-\${i}\`) * 100;
          const particleStartY = random(\`particle-start-y-\${i}\`) * 100;
          const particleEndY = particleStartY - 20;
          
          const particleY = interpolate(
            frame,
            [0, durationInFrames],
            [particleStartY, particleEndY],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: \`\${particleX}%\`,
                top: \`\${particleY}%\`,
                width: "4px",
                height: "4px",
                backgroundColor: textColor,
                borderRadius: "50%",
                opacity: particleOpacity,
              }}
            />
          );
        })}
      </div>

      {/* Main content container */}
      <div
        style={{
          transform: \`scale(\${pulseScale})\`,
          textAlign: "center",
          zIndex: 1,
        }}
      >
        {/* Title */}
        <h1
          style={{
            fontSize: "4rem",
            fontWeight: "700",
            color: textColor,
            margin: "0 0 1rem 0",
            opacity: titleOpacity,
            transform: \`scale(\${titleScale})\`,
            background: \`linear-gradient(45deg, \${textColor}, #a855f7, #3b82f6)\`,
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundSize: "200% 200%",
          }}
        >
          {title}
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: "1.5rem",
            color: textColor,
            opacity: subtitleOpacity * 0.8,
            transform: \`translateY(\${subtitleTranslateY}px)\`,
            margin: "0",
            maxWidth: "600px",
            lineHeight: "1.6",
          }}
        >
          {subtitle}
        </p>

        {/* Decorative line */}
        <div
          style={{
            width: interpolate(
              frame,
              [fps * 2.5, fps * 4],
              [0, 200],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            ),
            height: "2px",
            background: \`linear-gradient(90deg, transparent, \${textColor}, transparent)\`,
            margin: "2rem auto",
            opacity: 0.6,
          }}
        />

        {/* Call to action */}
        <div
          style={{
            fontSize: "1rem",
            color: textColor,
            opacity: ctaOpacity,
            marginTop: "1rem",
          }}
        >
          Type your first prompt to begin...
        </div>
      </div>
    </AbsoluteFill>
  );
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
export const VIDEO_WIDTH = 1280;
export const VIDEO_HEIGHT = 720;
export const VIDEO_FPS = 30;