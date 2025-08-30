//src/types/input-props.ts
import { z } from "zod";
import { 
  SCENE_TYPES,
  type SceneType,
  type Transition as TransitionType,
  type Direction 
} from "./remotion-constants";

/**
 * Transition schema - defines the data structure for transitions between scenes
 */
export const transitionSchema = z.object({
  type: z.enum(["fade", "slide", "wipe"]).describe("Transition type"),
  duration: z.number().int().min(1).optional().describe("Transition duration in frames"),
  direction: z.enum([
    "from-left", 
    "from-right", 
    "from-top", 
    "from-bottom"
  ]).optional().describe("Transition direction"),
  useSpring: z.boolean().optional().describe("Whether to use spring timing"),
});

/**
 * Scene schema - defines the data structure for each scene type
 */
export const sceneSchema = z.object({
  id: z.string().uuid(),
  type: z.enum([...SCENE_TYPES] as [SceneType, ...SceneType[]]),
  start: z.number().int().min(0).describe("Start frame"),
  duration: z.number().int().min(1).describe("Duration in frames"),
  order: z.number().int().min(0).optional().describe("Scene order in timeline"),
  data: z.record(z.unknown()).describe("Scene-specific props, structure depends on 'type'"),
  // New field for transitions between scenes
  transitionToNext: transitionSchema.optional().describe("Transition to the next scene"),
  // Data structure examples for each type:
  //
  // 'text': { 
  //   text: string, 
  //   color: string, 
  //   fontSize: number, 
  //   backgroundColor: string 
  // }
  //
  // 'image': { 
  //   src: string, 
  //   fit: "cover" | "contain" 
  // }
  //
  // 'background-color': { 
  //   color: string, 
  //   toColor?: string, 
  //   animationType?: 'fade' | 'spring' | 'pulse' 
  // }
  //
  // 'shape': { 
  //   shapeType: 'circle' | 'square' | 'triangle', 
  //   color: string, 
  //   backgroundColor: string, 
  //   size: number, 
  //   animation: 'pulse' | 'rotate' | 'bounce' | 'scale' 
  // }
  //
  // 'gradient': { 
  //   colors: string[], 
  //   direction: 'linear' | 'radial' | 'conic', 
  //   angle?: number, 
  //   animationSpeed?: number 
  // }
  //
  // 'particles': { 
  //   count: number, 
  //   type: 'circle' | 'square' | 'dot' | 'star', 
  //   colors: string[], 
  //   backgroundColor: string 
  // }
  //
  // 'text-animation': { 
  //   text: string, 
  //   color: string, 
  //   animation: 'typewriter' | 'fadeLetters' | 'slideUp' | 'bounce' | 'wavy' 
  // }
  //
  // 'split-screen': { 
  //   direction: 'horizontal' | 'vertical', 
  //   ratio: number, 
  //   backgroundColor1: string, 
  //   backgroundColor2: string 
  // }
  //
  // 'zoom-pan': { 
  //   src: string, 
  //   startScale: number, 
  //   endScale: number, 
  //   startX: number, 
  //   endX: number 
  // }
  //
  // 'svg-animation': { 
  //   icon: string, 
  //   color: string, 
  //   animation: 'draw' | 'scale' | 'rotate' | 'fade' | 'moveIn' 
  // }
  //
  // 'custom': { 
  //   componentId: string, /* other props based on component */ 
  // }
});

/**
 * Main input props schema for the Remotion video
 */
export const inputPropsSchema = z.object({
  meta: z.object({
    duration: z.number().int().min(1).describe("Total composition duration in frames"),
    title: z.string().min(1),
    backgroundColor: z.string().optional().describe("Global background color"),
    // Video format configuration
    format: z.enum(["landscape", "portrait", "square"]).default("landscape"),
    width: z.number().int().default(1920),
    height: z.number().int().default(1080)
  }).strict(),
  scenes: z.array(sceneSchema),
}).strict();

export type Scene = z.infer<typeof sceneSchema>;
export type InputProps = z.infer<typeof inputPropsSchema>;
export type Transition = z.infer<typeof transitionSchema>; 