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
export function createDefaultProjectProps(format: 'landscape' | 'portrait' | 'square' = 'landscape'): InputProps {
  const welcomeSceneId = uuidv4();
  
  // Define dimensions based on format
  const formatDimensions = {
    landscape: { width: 1920, height: 1080 },
    portrait: { width: 1080, height: 1920 },
    square: { width: 1080, height: 1080 }
  };
  
  const { width, height } = formatDimensions[format];
  
  return {
    meta: { 
      duration: 300,
      title: "New Project",
      backgroundColor: "#FFFFFF",
      format,
      width,
      height
    },
    scenes: [
      {
        id: welcomeSceneId,
        type: "welcome",
        start: 0,
        duration: 300,
        data: {
          name: "Welcome Scene",
          code: `
const { AbsoluteFill, interpolate, useCurrentFrame, spring, useVideoConfig } = window.Remotion;

const SearchBar = ({ opacity }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  
  // Detect format based on aspect ratio
  const aspectRatio = width / height;
  const isPortrait = aspectRatio < 1;
  const isSquare = Math.abs(aspectRatio - 1) < 0.1;
  const isLandscape = aspectRatio > 1.5;
  
  // Adaptive sizing based on format
  const boxWidth = isPortrait ? width * 0.85 : isSquare ? width * 0.8 : width * 0.83;
  const fontSize = isPortrait ? width * 0.045 : isSquare ? width * 0.05 : width * 0.034;
  const iconSize = isPortrait ? width * 0.06 : isSquare ? width * 0.065 : width * 0.037;
  const padding = isPortrait ? width * 0.04 : width * 0.025;
  const borderRadius = width * 0.026;
  
  // Adaptive text based on format
  const line1 = isPortrait ? "Start creating by adding" : "Start creating by adding a detailed prompt";
  const line2 = isPortrait ? "a prompt and image." : "and uploading an image.";
  
  const line1CharCount = Math.floor(
    interpolate(
      frame,
      [30, 90],
      [0, line1.length],
      { extrapolateLeft: "clamp" }
    )
  );
  
  const line2CharCount = Math.floor(
    interpolate(
      frame,
      [90, 150],
      [0, line2.length],
      { extrapolateLeft: "clamp" }
    )
  );
  
  const cursorVisible = Math.floor(frame / 15) % 2 === 0;
  const showLine2 = frame >= 90;
  const showCursorOnLine2 = frame >= 90 && frame <= 150;
  const iconProgress = 1;
  const boxHeight = isPortrait 
    ? (showLine2 ? height * 0.3 : height * 0.25)
    : (showLine2 ? height * 0.37 : height * 0.3);

  return (
    <>
      <div
        style={{
          width: boxWidth,
          height: boxHeight,
          background: "#F5F5F5",
          borderRadius: borderRadius,
          padding: padding,
          opacity,
          boxShadow: "0 8px 64px rgba(0, 0, 0, 0.1)",
          position: "relative",
          transition: "height 0.3s ease",
        }}
      >
        <div
          style={{
            fontSize: fontSize,
            fontFamily: "Inter, sans-serif",
            color: "#000000",
            opacity: 0.8,
            display: "flex",
            flexDirection: "column",
            gap: fontSize * 0.12,
            marginBottom: padding * 0.83,
            zIndex: 1,
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            {line1.slice(0, line1CharCount)}
            {cursorVisible && frame <= 90 && (
              <span
                style={{
                  width: fontSize * 0.1,
                  height: fontSize * 0.74,
                  background: "#000000",
                  display: "inline-block",
                  marginLeft: fontSize * 0.06,
                }}
              />
            )}
          </div>
          {showLine2 && (
            <div style={{ display: "flex", alignItems: "center" }}>
              {line2.slice(0, line2CharCount)}
              {cursorVisible && showCursorOnLine2 && (
                <span
                  style={{
                    width: fontSize * 0.1,
                    height: fontSize * 0.74,
                    background: "#000000",
                    display: "inline-block",
                    marginLeft: fontSize * 0.06,
                  }}
                />
              )}
            </div>
          )}
        </div>
        
        <div
          style={{
            position: "absolute",
            bottom: padding * 0.83,
            left: padding,
            display: "flex",
            gap: iconSize * 0.44,
            alignItems: "center",
            opacity: iconProgress,
            zIndex: 2,
          }}
        >
          <div
            style={{
              fontSize: iconSize,
              color: "#666666",
              cursor: "pointer",
              width: iconSize,
              height: iconSize,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "3px solid #666666",
              borderRadius: iconSize * 0.17,
            }}
          >
            <window.IconifyIcon
              icon="akar-icons:image"
              style={{
                fontSize: iconSize,
                color: "#666666",
              }}
            />
          </div>
          <div
            style={{
              fontSize: iconSize,
              color: "#666666",
              cursor: "pointer",
              width: iconSize,
              height: iconSize,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "3px solid #666666",
              borderRadius: iconSize * 0.17,
            }}
          >
            <window.IconifyIcon
              icon="material-symbols:mic-outline"
              style={{
                fontSize: "72px",
                color: "#666666",
              }}
            />
          </div>
        </div>
        
        <div
          style={{
            position: "absolute",
            bottom: padding * 0.83,
            right: padding,
            opacity: iconProgress,
          }}
        >
          <div
            style={{
              width: iconSize * 1.67,
              height: iconSize * 1.67,
              borderRadius: "50%",
              background: "#333333",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <window.IconifyIcon
              icon="quill:send"
              style={{
                fontSize: iconSize * 0.83,
                color: "#FFFFFF",
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default function PromptUI() {
  const frame = useCurrentFrame();
  
  const mainProgress = spring({
    frame: frame > 5 ? frame : 0,
    fps: 30,
    config: {
      damping: 20,
      stiffness: 80,
    },
  });

  return (
    <AbsoluteFill
      style={{
        background: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <SearchBar opacity={mainProgress} />
    </AbsoluteFill>
  );
}
`,
          isWelcomeScene: true
        }
      }
    ]
  };
}

// Legacy constant for backward compatibility - but should not be used for new projects
export const DEFAULT_PROJECT_PROPS: InputProps = {
  meta: { 
    duration: 150, 
    title: "My First Video",
    format: "landscape" as const,
    width: 1920,
    height: 1080
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