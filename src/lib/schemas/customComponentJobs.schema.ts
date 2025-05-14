import { z } from "zod";

export const componentStatusSchema = z.enum([
  'pending',
  'generating',
  'failed', 
  'building',
  'complete',
  'fixable',  // New status for components that failed but can be fixed
  'fixing'    // New status for when a component is being fixed
]); 