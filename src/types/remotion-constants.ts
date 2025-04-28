// src/types/remotion-constants.ts
import crypto from "crypto";
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

// Default initial props for new projects
export const DEFAULT_PROJECT_PROPS: InputProps = {
  meta: { 
    duration: 150, 
    title: "My First Video" 
  },
  scenes: [
    {
      id: crypto.randomUUID(),
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
  "text", 
  "image", 
  "custom", 
  "background-color", 
  "shape", 
  "gradient", 
  "particles", 
  "text-animation", 
  "split-screen", 
  "zoom-pan", 
  "svg-animation"
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