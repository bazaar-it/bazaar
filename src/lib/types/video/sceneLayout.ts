import { z } from "zod";

// Animation configuration schema - RELAXED
export const animationConfigSchema = z.object({
  type: z.enum(["spring", "fadeIn", "pulse", "interpolate"]).optional(),
  delay: z.number().optional(),
  duration: z.number().optional(),
  config: z.object({
    damping: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? parseFloat(val) : val),
    stiffness: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? parseFloat(val) : val),
  }).optional(),
}).optional();

// Glow effect schema - RELAXED
export const glowEffectSchema = z.object({
  color: z.string().optional(),
  intensity: z.number().optional(),
  spread: z.number().optional(),
}).optional();

// Element schema - VERY RELAXED, NO IMAGES
export const elementSchema = z.object({
  type: z.enum(["title", "subtitle", "button", "text"]).optional().default("text"),
  id: z.string().optional().default("element1"),
  text: z.string().optional().default("Text"),
  fontSize: z.number().optional().default(24),
  fontWeight: z.union([z.string(), z.number()]).optional().default("400"), // Accept both string and number
  color: z.string().optional().default("#ffffff"),
  glow: glowEffectSchema,
  style: z.record(z.any()).optional(), // Very flexible style object
});

// Layout schema - RELAXED
export const layoutSchema = z.object({
  align: z.string().optional().default("center"),
  direction: z.string().optional().default("column"),
  gap: z.number().optional().default(16),
  padding: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? parseFloat(val) : val).optional(),
  margin: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? parseFloat(val) : val).optional(),
}).optional().default({});

// Main scene layout schema - VERY RELAXED
export const sceneLayoutSchema = z.object({
  sceneType: z.string().optional().default("simple"),
  background: z.string().optional().default("#000000"),
  elements: z.array(elementSchema).optional().default([]),
  layout: layoutSchema,
  animations: z.record(animationConfigSchema).optional().default({}),
});

export type SceneLayout = z.infer<typeof sceneLayoutSchema>;
export type Element = z.infer<typeof elementSchema>;
export type AnimationConfig = z.infer<typeof animationConfigSchema>;
export type GlowEffect = z.infer<typeof glowEffectSchema>;
export type LayoutConfig = z.infer<typeof layoutSchema>; 