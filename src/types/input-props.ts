import { z } from "zod";

/**
 * Basic placeholder for InputProps structure
 * This will be expanded in future sprints to include scene data structure
 */
export const sceneSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["text", "image", "custom"]),
  start: z.number().int().min(0).describe("Start frame"),
  duration: z.number().int().min(1).describe("Duration in frames"),
  data: z.record(z.unknown()).describe("Scene-specific props, structure depends on 'type'"),
  // Example data structure hints:
  // data for type 'text': { text: string, color: string, fontSize: number, ... }
  // data for type 'image': { src: string, fit: "cover" | "contain", ... }
  // data for type 'custom': { componentId: string, /* other props based on component */ }
});

export const inputPropsSchema = z.object({
  meta: z.object({
    duration: z.number().int().min(1).describe("Total composition duration in frames"),
    title: z.string().min(1),
  }).strict(),
  scenes: z.array(sceneSchema),
}).strict();

export type Scene = z.infer<typeof sceneSchema>;
export type InputProps = z.infer<typeof inputPropsSchema>; 