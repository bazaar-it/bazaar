// src/types/remotion-constants.ts
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
    title: "Untitled Video" 
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

export const DURATION_IN_FRAMES = 200;
export const VIDEO_WIDTH = 1280;
export const VIDEO_HEIGHT = 720;
export const VIDEO_FPS = 30;