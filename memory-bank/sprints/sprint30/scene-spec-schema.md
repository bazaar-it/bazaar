# SceneSpec Schema v1.0
**Date**: January 26, 2025  
**Purpose**: Structured contract for scene generation and validation

## 🎯 **Schema Overview**

The SceneSpec schema defines the four core elements of any animation scene:
1. **Components** - UI elements and their properties
2. **Style** - Visual design tokens and styling
3. **Text** - Content with semantic slots
4. **Motion** - Animations with timing and easing

## 📋 **Complete Schema Definition**

```typescript
// src/lib/types/storyboard.ts
import { z } from "zod";
import { nanoid } from "nanoid";

/**
 * Component specification for UI elements
 */
export const ComponentSpec = z.object({
  /** Component library source */
  lib: z.enum(["flowbite", "custom", "html", "bazaar"]).describe("UI library source"),
  
  /** Component name/identifier */
  name: z.string().min(1).describe("Component name (e.g., 'Modal', 'Button', 'TextInput')"),
  
  /** Component properties and configuration */
  props: z.record(z.any()).optional().describe("Component-specific properties"),
  
  /** Unique identifier for targeting - auto-generated if not provided */
  id: z.string().optional().describe("Unique ID for motion targeting"),
  
  /** Layout positioning - relative coordinates (0-1) */
  layout: z.object({
    x: z.number().min(0).max(1).describe("0-1 relative to width").optional(),
    y: z.number().min(0).max(1).describe("0-1 relative to height").optional(),
    width: z.number().min(0).max(1).describe("0-1 relative to scene width").optional(),
    height: z.number().min(0).max(1).describe("0-1 relative to scene height").optional(),
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
  
  /** Animation function - core set only */
  fn: z.enum([
    // Entrance animations (most common)
    "fadeIn", "fadeInUp", "slideInLeft", "slideInRight", "scaleIn", "bounceIn",
    
    // Exit animations
    "fadeOut", "slideOutLeft", "slideOutRight", "scaleOut",
    
    // Continuous animations
    "pulse", "bounce", "shake", "rotate", "float",
    
    // Camera movements
    "zoomIn", "zoomOut", "panLeft", "panRight",
    
    // Custom (use params.type for specific animations)
    "custom"
  ]).describe("Animation function name"),
  
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
    z.literal(Infinity)
  ]).default(1).describe("Number of iterations (Infinity for loop)"),
  
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
  // Auto-generate component IDs if missing
  rawScene.components.forEach(c => {
    if (!c.id) {
      c.id = nanoid();
    }
  });
  
  // Auto-compute scene duration from longest motion if not provided
  if (!rawScene.duration || rawScene.duration === 5) {
    const longestMotionEnd = rawScene.motion.reduce((max, motion) => {
      const motionEnd = (motion.delay || 0) + (motion.duration || 0);
      return Math.max(max, motionEnd);
    }, 0);
    
    if (longestMotionEnd > 0) {
      rawScene.duration = Math.max(longestMotionEnd + 1, 2); // Add 1s buffer, min 2s
    }
  }
  
  // Compute frame ranges from duration + delay if not provided
  const fps = rawScene.dimensions?.fps || 30;
  rawScene.motion.forEach(motion => {
    if (!motion.frames) {
      const startFrame = Math.floor((motion.delay || 0) * fps);
      const endFrame = Math.floor(((motion.delay || 0) + (motion.duration || 0)) * fps);
      motion.frames = { start: startFrame, end: endFrame };
    }
  });
  
  return rawScene;
};
```

## 🎨 **Example SceneSpec**

```json
{
  "id": "scene-001",
  "name": "Hero Text Input Animation",
  "duration": 6.0,
  "dimensions": {
    "width": 1920,
    "height": 1080,
    "fps": 30
  },
  "components": [
    {
      "lib": "html",
      "name": "TextInput",
      "id": "main-input",
      "props": {
        "placeholder": "Enter your text...",
        "borderRadius": "50%",
        "padding": "20px"
      },
      "layout": {
        "x": 960,
        "y": 400,
        "width": 600,
        "height": 80
      }
    },
    {
      "lib": "custom",
      "name": "MouseCursor",
      "id": "cursor",
      "props": {
        "size": "medium",
        "color": "#ffffff"
      }
    },
    {
      "lib": "html",
      "name": "Button",
      "id": "submit-btn",
      "props": {
        "text": "Submit",
        "variant": "primary"
      },
      "layout": {
        "x": 960,
        "y": 520,
        "width": 120,
        "height": 40
      }
    }
  ],
  "style": {
    "palette": ["#000000", "#ffffff", "#8b5cf6", "#a855f7"],
    "classes": ["bg-black", "text-white", "font-inter"],
    "background": {
      "type": "solid",
      "value": "#000000"
    },
    "typography": {
      "fontFamily": "Inter",
      "fontSize": "80px",
      "fontWeight": "400"
    }
  },
  "text": [
    {
      "slot": "typewriter",
      "content": "Wow, Bazaar can actually produce some good results",
      "animation": {
        "reveal": "typewriter",
        "speed": 15
      }
    }
  ],
  "motion": [
    {
      "target": "main-input",
      "fn": "fadeIn",
      "duration": 0.8,
      "delay": 0,
      "easing": "ease-out"
    },
    {
      "target": "typewriter",
      "fn": "custom",
      "duration": 3.0,
      "delay": 1.0,
      "params": {
        "type": "typewriter",
        "charactersPerSecond": 15
      }
    },
    {
      "target": "cursor",
      "fn": "fadeIn",
      "duration": 0.3,
      "delay": 4.0
    },
    {
      "target": "submit-btn",
      "fn": "pulse",
      "duration": 0.2,
      "delay": 4.5,
      "iterations": 1
    },
    {
      "target": "camera",
      "fn": "zoomIn",
      "duration": 0.5,
      "delay": 5.0,
      "params": {
        "scale": 10,
        "targetX": 960,
        "targetY": 520
      }
    }
  ],
  "metadata": {
    "version": "1.0",
    "tags": ["hero", "text-input", "animation"]
  }
}
```

## 🔍 **Validation Rules**

### **Component Validation**
- All components must have valid `lib` and `name`
- IDs must be unique within a scene
- Layout coordinates must be within scene dimensions

### **Style Validation**
- Color palette must contain valid hex codes
- Tailwind classes must be from approved list
- CSS must be valid and safe (no external imports)

### **Text Validation**
- Slots must be unique within a scene
- Content must be non-empty strings
- Animation speeds must be positive numbers

### **Motion Validation**
- Targets must reference existing component IDs
- Durations and delays must be non-negative
- Frame ranges must be within scene duration
- Easing functions must be supported by animation library

## 🚀 **Usage in System**

### **SceneBuilder Service**
```typescript
// src/lib/services/sceneBuilder.service.ts
export async function buildScene(input: {
  userMessage: string;
  userContext: Record<string, unknown>;
  storyboardSoFar: SceneSpec[];
}): Promise<SceneSpec> {
  // LLM generates JSON
  const rawOutput = await callSceneBuilderLLM(input);
  
  // Validate with schema
  const sceneSpec = SceneSpec.parse(rawOutput);
  
  return sceneSpec;
}
```

### **Component Generator**
```typescript
// src/lib/services/componentGenerator.service.ts
export async function generateComponent(sceneSpec: SceneSpec): Promise<string> {
  // Convert validated SceneSpec to Remotion component
  const remotionCode = await convertSceneSpecToRemotion(sceneSpec);
  
  return remotionCode;
}
```

### **Database Storage**
```sql
-- New table for structured scene storage
CREATE TABLE scene_specs (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  spec JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast JSON queries
CREATE INDEX idx_scene_specs_components ON scene_specs USING GIN ((spec->'components'));
CREATE INDEX idx_scene_specs_motion ON scene_specs USING GIN ((spec->'motion'));
```

This schema provides the foundation for intelligent, validated scene generation while maintaining flexibility for future enhancements. 