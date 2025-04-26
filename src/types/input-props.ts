/**
 * Basic placeholder for InputProps structure
 * This will be expanded in future sprints to include scene data structure
 */
export interface Scene {
  id: string;
  type: "text" | "image" | "custom";
  start: number; // frame
  duration: number; // frames
  data: Record<string, unknown>; // scene-specific props
  componentId?: string; // for type === "custom"
}

export interface InputProps {
  meta: { duration: number; title: string };
  scenes: Scene[];
} 