import { z } from 'zod';

/**
 * Schema for input props from the A2A API
 */
export const InputPropsSchema = z.object({
  projectId: z.string().uuid(),
  sceneId: z.string(),
  effect: z.string(),
  promptText: z.string().optional(),
  targetComponent: z.string().optional(),
});

/**
 * Schema for running the GUI version of the A2A workflow
 */
export const RunGUISchema = z.object({
  projectId: z.string().uuid(),
  sceneId: z.string().optional(),
  effect: z.string(),
  message: z.object({
    id: z.string().uuid(),
    createdAt: z.string().datetime(),
    parts: z.array(z.object({
      type: z.literal('text'),
      text: z.string()
    })),
  }),
  animationDesignBrief: z.object({
    sceneName: z.string(),
    description: z.string(),
  }).optional(),
});

export type InputProps = z.infer<typeof InputPropsSchema>;
export type RunGUI = z.infer<typeof RunGUISchema>; 