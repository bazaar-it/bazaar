import { z } from "zod";
import { nanoid } from "nanoid";

/**
 * Component specification for UI elements
 */
export const ComponentSpec = z.object({
  /** Component library source */
  lib: z.enum(["flowbite", "flowbite-layout", "custom", "html", "bazaar"]).describe("UI library source"),
  
  /** Component name/identifier */
  name: z.string().min(1).describe("Component name (e.g., 'Modal', 'Button', 'TextInput')"),
  
  /** Component properties and configuration */
  props: z.record(z.any()).optional().describe("Component-specific properties"),
  
  /** Unique identifier for targeting - auto-generated if not provided */
  id: z.string().optional().describe("Unique ID for motion targeting"),
  
  /** Layout positioning - flexible coordinate system */
  layout: z.object({
    x: z.number().min(0).max(10).describe("Relative position (0-1 preferred, up to 10 for edge cases)").optional(),
    y: z.number().min(0).max(10).describe("Relative position (0-1 preferred, up to 10 for edge cases)").optional(),
    width: z.number().min(0).max(10).describe("Relative size (0-1 preferred, up to 10 for edge cases)").optional(),
    height: z.number().min(0).max(10).describe("Relative size (0-1 preferred, up to 10 for edge cases)").optional(),
    zIndex: z.number().optional().describe("Layering order"),
  }).partial().optional(),
  
  /** Component-specific Tailwind classes */
  classes: z.array(z.string()).optional().describe("Component-specific Tailwind classes"),
});

/**
 * Style specification for visual design (scene-wide)
 */
export const StyleSpec = z.object({
  /** Color palette for the scene */
  palette: z.array(z.string().regex(/^#?[0-9a-f]{3,8}$/i))
    .optional()
    .describe("Hex color codes for scene palette"),
  
  /** Global Tailwind utility classes */
  classes: z.array(z.string())
    .optional()
    .describe("Global Tailwind CSS utility classes"),
  
  /** Custom CSS overrides */
  css: z.string()
    .optional()
    .describe("Raw CSS for custom styling"),
  
  /** Background configuration */
  background: z.object({
    type: z.enum(["solid", "gradient", "image", "video"]),
    value: z.string(),
    opacity: z.number().min(0).max(1).optional(),
  }).optional(),
  
  /** Typography settings */
  typography: z.object({
    fontFamily: z.string().optional(),
    fontSize: z.union([z.string(), z.number()]).optional().describe("String (e.g., '80px') or number (px)"),
    fontWeight: z.string().optional(),
    lineHeight: z.string().optional(),
  }).optional(),
});

/**
 * Text content specification
 */
export const TextSpec = z.object({
  /** Semantic slot identifier */
  slot: z.string().describe("Semantic slot (e.g., 'headline', 'caption', 'cta')"),
  
  /** Text content */
  content: z.string().describe("Actual text content"),
  
  /** Language/locale */
  locale: z.string().optional().default("en").describe("Language code"),
  
  /** Text formatting */
  format: z.object({
    bold: z.boolean().optional(),
    italic: z.boolean().optional(),
    underline: z.boolean().optional(),
    color: z.string().optional(),
  }).optional(),
  
  /** Animation-specific properties */
  animation: z.object({
    reveal: z.enum(["instant", "typewriter", "fadeIn", "slideIn"]).optional(),
    speed: z.number().optional().describe("Characters per second for typewriter"),
  }).optional(),
});

/**
 * Motion/animation specification
 */
export const MotionSpec = z.object({
  /** Target component or element */
  target: z.string().describe("Component ID or CSS selector"),
  
  /** Animation function - expanded set for creative freedom */
  fn: z.enum([
    // === ENTRANCE ANIMATIONS ===
    "fadeIn", "fadeInUp", "fadeInDown", "fadeInLeft", "fadeInRight",
    "slideInLeft", "slideInRight", "slideInUp", "slideInDown", 
    "slideInTopLeft", "slideInTopRight", "slideInBottomLeft", "slideInBottomRight",
    "scaleIn", "scaleInX", "scaleInY", "bounceIn", "bounceInUp", "bounceInDown",
    "flipInX", "flipInY", "rotateIn", "rotateInUpLeft", "rotateInUpRight",
    "rollIn", "lightSpeedIn", "jackInTheBox", "backInUp", "backInDown",
    
    // === EXIT ANIMATIONS ===
    "fadeOut", "fadeOutUp", "fadeOutDown", "fadeOutLeft", "fadeOutRight",
    "slideOutLeft", "slideOutRight", "slideOutUp", "slideOutDown",
    "scaleOut", "scaleOutX", "scaleOutY", "bounceOut", "bounceOutUp", "bounceOutDown",
    "flipOutX", "flipOutY", "rotateOut", "rotateOutUpLeft", "rotateOutUpRight",
    "rollOut", "lightSpeedOut", "backOutUp", "backOutDown",
    
    // === CONTINUOUS/ATTENTION ANIMATIONS ===
    "pulse", "bounce", "shake", "shakeX", "shakeY", "wobble", "swing",
    "rotate", "rotateClockwise", "rotateCounterClockwise", "float", "bob",
    "heartbeat", "flash", "rubberBand", "jello", "tada", "headShake",
    
    // === CAMERA/VIEWPORT MOVEMENTS ===
    "zoomIn", "zoomOut", "zoomInUp", "zoomInDown", "zoomInLeft", "zoomInRight",
    "zoomOutUp", "zoomOutDown", "zoomOutLeft", "zoomOutRight",
    "panLeft", "panRight", "panUp", "panDown",
    
    // === SPECIAL EFFECTS ===
    "typewriter", "glitch", "neon", "glow", "sparkle", "shimmer",
    "blur", "focus", "pixelate", "wave", "ripple", "explode", "implode",
    "shatter", "crumble", "melt", "burn", "freeze", "electric",
    
    // === INTERACTION ANIMATIONS ===
    "click", "hover", "press", "release", "drag", "drop", "swipe",
    "pinch", "stretch", "squeeze", "morph", "transform",
    
    // === CUSTOM (use params.type for specific animations) ===
    "custom"
  ]).describe("Animation function name - expanded set for creative motion graphics"),
  
  /** Animation duration in seconds - primary timing control */
  duration: z.number().min(0).default(0.4).describe("Animation duration in seconds"),
  
  /** Easing function */
  easing: z.enum([
    "linear", "ease", "ease-in", "ease-out", "ease-in-out",
    "spring", "bounce"
  ]).default("ease-out").describe("Easing function"),
  
  /** Delay before animation starts */
  delay: z.number().min(0).default(0).describe("Delay in seconds"),
  
  /** Animation iteration count - explicit loop support */
  iterations: z.union([
    z.number().min(1), 
    z.literal("infinite")
  ]).default(1).describe("Number of iterations ('infinite' for loop)"),
  
  /** Animation direction */
  direction: z.enum(["normal", "reverse", "alternate", "alternate-reverse"])
    .default("normal")
    .describe("Animation direction"),
  
  /** Custom parameters for complex animations */
  params: z.record(z.any()).optional().describe("Custom animation parameters (e.g., {type: 'typewriter'})"),
  
  /** Frame range for Remotion - computed from duration if not provided */
  frames: z.object({
    start: z.number().optional(),
    end: z.number().optional(),
  }).optional().describe("Computed from duration + delay if not provided"),
});

/**
 * Complete scene specification
 */
export const SceneSpec = z.object({
  /** Unique scene identifier */
  id: z.string().uuid().optional().describe("Scene UUID"),
  
  /** Human-readable scene name */
  name: z.string().optional().describe("Scene display name"),
  
  /** Scene duration in seconds - primary duration control */
  duration: z.number().min(0.1).default(5).describe("Scene duration in seconds (auto-computed from longest motion if not provided)"),
  
  /** Scene dimensions */
  dimensions: z.object({
    width: z.number().default(1920),
    height: z.number().default(1080),
    fps: z.number().default(30),
  }).optional(),
  
  /** UI Components */
  components: z.array(ComponentSpec).min(1).describe("UI components in the scene"),
  
  /** Visual styling (scene-wide) */
  style: StyleSpec.describe("Scene styling and design tokens"),
  
  /** Text content */
  text: z.array(TextSpec).describe("Text content with semantic slots"),
  
  /** Animations and motion */
  motion: z.array(MotionSpec).describe("Animations and motion effects"),
  
  /** Scene metadata - version constant */
  metadata: z.object({
    created: z.date().optional(),
    modified: z.date().optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),
});

// Schema version - constant, never changed by LLM
export const SCENE_SPEC_VERSION = "1.0";

export type ComponentSpec = z.infer<typeof ComponentSpec>;
export type StyleSpec = z.infer<typeof StyleSpec>;
export type TextSpec = z.infer<typeof TextSpec>;
export type MotionSpec = z.infer<typeof MotionSpec>;
export type SceneSpec = z.infer<typeof SceneSpec>;

/**
 * Type guards for runtime validation
 */
export const isSceneSpec = (v: unknown): v is SceneSpec => {
  try { 
    SceneSpec.parse(v); 
    return true; 
  } catch { 
    return false; 
  }
};

export const isComponentSpec = (v: unknown): v is ComponentSpec => {
  try { 
    ComponentSpec.parse(v); 
    return true; 
  } catch { 
    return false; 
  }
};

/**
 * Post-processing utilities
 */
export const enhanceSceneSpec = (rawScene: SceneSpec): SceneSpec => {
  // Clone to avoid mutating the original object
  const scene = structuredClone(rawScene);
  
  // Auto-generate component IDs if missing
  scene.components.forEach(c => {
    if (!c.id) {
      c.id = nanoid();
    }
  });
  
  // Auto-compute scene duration from longest motion if not provided
  if (!scene.duration || scene.duration === 5) {
    const longestMotionEnd = scene.motion.reduce((max, motion) => {
      const motionEnd = (motion.delay || 0) + (motion.duration || 0);
      return Math.max(max, motionEnd);
    }, 0);
    
    if (longestMotionEnd > 0) {
      scene.duration = Math.max(longestMotionEnd + 1, 2); // Add 1s buffer, min 2s
    }
  }
  
  // Compute frame ranges from duration + delay if not provided
  const fps = scene.dimensions?.fps || 30;
  scene.motion.forEach(motion => {
    if (!motion.frames) {
      const startFrame = Math.floor((motion.delay || 0) * fps);
      const endFrame = Math.floor(((motion.delay || 0) + (motion.duration || 0)) * fps);
      motion.frames = { start: startFrame, end: endFrame };
    }
  });
  
  return scene;
}; 