# Remotion Compositions and Scene Management

## Summary
- Documents the architecture for dynamic video compositions in Bazaar-Vid
- Covers scene types, transitions, and composition patterns
- Provides TypeScript interfaces and implementation examples for scene rendering

## Scene Architecture

Bazaar-Vid implements a scene-based architecture that allows for dynamic video generation through JSON-based structures. This pattern enables:

1. **LLM-driven video creation**: AI can generate and modify video structure via JSON patches
2. **Serializable video state**: Full video state can be persisted and loaded from the database
3. **Type-safe scene handling**: TypeScript ensures valid scene configurations
4. **Modular architecture**: New scene types can be added without changing core logic

## Core Type Definitions

```typescript
// src/types/input-props.ts
import { z } from "zod";
import { SCENE_TYPES } from "./remotion-constants";

// Define a base scene schema with common properties
export const baseSceneSchema = z.object({
  id: z.string(),
  type: z.enum(SCENE_TYPES),
  start: z.number(),
  duration: z.number(),
  transition: z
    .object({
      type: z.enum(["fade", "slide", "wipe"]),
      duration: z.number().default(30),
    })
    .optional(),
});

// Text scene schema with specific data properties
export const textSceneSchema = baseSceneSchema.extend({
  type: z.literal("text"),
  data: z.object({
    text: z.string(),
    fontSize: z.number().default(60),
    color: z.string().default("#FFFFFF"),
    backgroundColor: z.string().default("#000000"),
    fontFamily: z.string().optional(),
    position: z
      .object({
        x: z.number().default(0.5),
        y: z.number().default(0.5),
      })
      .optional(),
    animation: z
      .enum(["none", "fadeIn", "typewriter", "slideIn"])
      .default("none"),
  }),
});

// Image scene schema
export const imageSceneSchema = baseSceneSchema.extend({
  type: z.literal("image"),
  data: z.object({
    src: z.string(),
    fit: z.enum(["contain", "cover", "fill"]).default("cover"),
    position: z
      .object({
        x: z.number().default(0.5),
        y: z.number().default(0.5),
      })
      .optional(),
    animation: z
      .enum(["none", "fadeIn", "zoomIn", "panLeft", "panRight"])
      .default("none"),
  }),
});

// Additional scene schemas for other types...

// Union type for all scene types
export const sceneSchema = z.discriminatedUnion("type", [
  textSceneSchema,
  imageSceneSchema,
  // Add other scene schemas here
]);

// Full video input props schema
export const inputPropsSchema = z.object({
  meta: z.object({
    duration: z.number(),
    title: z.string(),
  }),
  scenes: z.array(sceneSchema),
});

// TypeScript types derived from schemas
export type Scene = z.infer<typeof sceneSchema>;
export type TextScene = z.infer<typeof textSceneSchema>;
export type ImageScene = z.infer<typeof imageSceneSchema>;
export type InputProps = z.infer<typeof inputPropsSchema>;
```

## Dynamic Video Composition

The main composition component that handles all scenes:

```tsx
// src/remotion/compositions/DynamicVideo.tsx
import React from 'react';
import { AbsoluteFill, Sequence, useVideoConfig } from 'remotion';
import { InputProps } from '~/types/input-props';
import { SceneRenderer } from '../components/SceneRenderer';
import { TransitionSeries } from '@remotion/transitions';

export const DynamicVideo: React.FC<InputProps> = ({ meta, scenes }) => {
  const { fps } = useVideoConfig();
  
  // Sort scenes by start time
  const sortedScenes = [...scenes].sort((a, b) => a.start - b.start);
  
  // Check if there are transitions to use TransitionSeries
  const hasTransitions = scenes.some(
    (scene) => scene.transition && scene.transition.type
  );
  
  if (hasTransitions) {
    return (
      <AbsoluteFill style={{ backgroundColor: 'black' }}>
        <TransitionSeries>
          {sortedScenes.map((scene, index) => {
            const nextScene = sortedScenes[index + 1];
            const transitionDuration = nextScene?.transition?.duration || 0;
            
            return (
              <React.Fragment key={scene.id}>
                <TransitionSeries.Sequence
                  durationInFrames={scene.duration}
                  offset={scene.start}
                >
                  <SceneRenderer scene={scene} />
                </TransitionSeries.Sequence>
                
                {nextScene && nextScene.transition && (
                  <TransitionSeries.Transition
                    durationInFrames={transitionDuration}
                    transitionType={nextScene.transition.type}
                  />
                )}
              </React.Fragment>
            );
          })}
        </TransitionSeries>
      </AbsoluteFill>
    );
  }
  
  // No transitions - use regular Sequences
  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      {sortedScenes.map((scene) => (
        <Sequence
          key={scene.id}
          from={scene.start}
          durationInFrames={scene.duration}
        >
          <SceneRenderer scene={scene} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
```

## Scene Renderer Component

The SceneRenderer delegates to specific components based on scene type:

```tsx
// src/remotion/components/SceneRenderer.tsx
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Scene } from '~/types/input-props';
import { TextScene } from './scenes/TextScene';
import { ImageScene } from './scenes/ImageScene';
import { BackgroundColorScene } from './scenes/BackgroundColorScene';
import { ShapeScene } from './scenes/ShapeScene';
import { GradientScene } from './scenes/GradientScene';
import { ParticlesScene } from './scenes/ParticlesScene';
import { TextAnimationScene } from './scenes/TextAnimationScene';
import { SplitScreenScene } from './scenes/SplitScreenScene';
import { ZoomPanScene } from './scenes/ZoomPanScene';
import { SvgAnimationScene } from './scenes/SvgAnimationScene';
import { CustomScene } from './scenes/CustomScene';

export const SceneRenderer: React.FC<{ scene: Scene }> = ({ scene }) => {
  switch (scene.type) {
    case 'text':
      return <TextScene scene={scene} />;
    case 'image':
      return <ImageScene scene={scene} />;
    case 'background-color':
      return <BackgroundColorScene scene={scene} />;
    case 'shape':
      return <ShapeScene scene={scene} />;
    case 'gradient':
      return <GradientScene scene={scene} />;
    case 'particles':
      return <ParticlesScene scene={scene} />;
    case 'text-animation':
      return <TextAnimationScene scene={scene} />;
    case 'split-screen':
      return <SplitScreenScene scene={scene} />;
    case 'zoom-pan':
      return <ZoomPanScene scene={scene} />;
    case 'svg-animation':
      return <SvgAnimationScene scene={scene} />;
    case 'custom':
      return <CustomScene scene={scene} />;
    default:
      // Fallback for unknown scene types
      return (
        <AbsoluteFill
          style={{
            backgroundColor: 'black',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              color: 'white',
              fontSize: 32,
              textAlign: 'center',
              padding: 20,
            }}
          >
            Unknown scene type: {(scene as any).type}
          </div>
        </AbsoluteFill>
      );
  }
};
```

## Individual Scene Components

Examples of specific scene components:

### Text Scene

```tsx
// src/remotion/components/scenes/TextScene.tsx
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { TextScene as TextSceneType } from '~/types/input-props';

export const TextScene: React.FC<{ scene: TextSceneType }> = ({ scene }) => {
  const { data } = scene;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Position calculation
  const posX = data.position?.x ?? 0.5;
  const posY = data.position?.y ?? 0.5;
  
  // Animation logic
  let opacity = 1;
  let transform = '';
  
  if (data.animation === 'fadeIn') {
    opacity = interpolate(
      frame,
      [0, 30],
      [0, 1],
      { extrapolateRight: 'clamp' }
    );
  } else if (data.animation === 'typewriter') {
    // Typewriter effect - reveal text progressively
    const textToShow = data.text.substring(
      0,
      Math.floor(
        interpolate(
          frame,
          [0, scene.duration - 30],
          [0, data.text.length],
          { extrapolateRight: 'clamp' }
        )
      )
    );
    
    return (
      <AbsoluteFill
        style={{
          backgroundColor: data.backgroundColor,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            color: data.color,
            fontSize: data.fontSize,
            fontFamily: data.fontFamily || 'sans-serif',
            textAlign: 'center',
            position: 'absolute',
            top: `${posY * 100}%`,
            left: `${posX * 100}%`,
            transform: 'translate(-50%, -50%)',
            width: '80%',
          }}
        >
          {textToShow}
        </div>
      </AbsoluteFill>
    );
  } else if (data.animation === 'slideIn') {
    const slideProgress = spring({
      frame,
      fps,
      config: {
        damping: 20,
        stiffness: 80,
      },
    });
    
    transform = `translateY(${(1 - slideProgress) * 100}px)`;
    opacity = slideProgress;
  }
  
  return (
    <AbsoluteFill
      style={{
        backgroundColor: data.backgroundColor,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          color: data.color,
          fontSize: data.fontSize,
          fontFamily: data.fontFamily || 'sans-serif',
          textAlign: 'center',
          position: 'absolute',
          top: `${posY * 100}%`,
          left: `${posX * 100}%`,
          transform: `translate(-50%, -50%) ${transform}`,
          opacity,
          width: '80%',
        }}
      >
        {data.text}
      </div>
    </AbsoluteFill>
  );
};
```

### Image Scene

```tsx
// src/remotion/components/scenes/ImageScene.tsx
import React from 'react';
import { AbsoluteFill, Img, useCurrentFrame, interpolate, staticFile } from 'remotion';
import { ImageScene as ImageSceneType } from '~/types/input-props';

export const ImageScene: React.FC<{ scene: ImageSceneType }> = ({ scene }) => {
  const { data } = scene;
  const frame = useCurrentFrame();
  
  // Handle different image sources
  const imageSrc = data.src.startsWith('http') || data.src.startsWith('/')
    ? data.src
    : staticFile(data.src);
  
  // Position calculation
  const posX = data.position?.x ?? 0.5;
  const posY = data.position?.y ?? 0.5;
  
  // Animation properties
  let opacity = 1;
  let scale = 1;
  let translateX = 0;
  let translateY = 0;
  
  switch (data.animation) {
    case 'fadeIn':
      opacity = interpolate(
        frame,
        [0, 30],
        [0, 1],
        { extrapolateRight: 'clamp' }
      );
      break;
    case 'zoomIn':
      scale = interpolate(
        frame,
        [0, scene.duration],
        [1, 1.2],
        { extrapolateRight: 'clamp' }
      );
      break;
    case 'panLeft':
      translateX = interpolate(
        frame,
        [0, scene.duration],
        [0, -50],
        { extrapolateRight: 'clamp' }
      );
      break;
    case 'panRight':
      translateX = interpolate(
        frame,
        [0, scene.duration],
        [0, 50],
        { extrapolateRight: 'clamp' }
      );
      break;
  }
  
  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'black',
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        <Img
          src={imageSrc}
          style={{
            width: '100%',
            height: '100%',
            objectFit: data.fit || 'cover',
            objectPosition: `${posX * 100}% ${posY * 100}%`,
            opacity,
            transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
```

## Animation Utilities

```typescript
// src/remotion/utils/animation.ts
import { useCurrentFrame, useVideoConfig, spring } from 'remotion';

// Common animation curves
export const EASE_IN_OUT = (t: number) => 
  t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
export const EASE_OUT = (t: number) => 1 - Math.pow(1 - t, 2);
export const EASE_IN = (t: number) => t * t;

// Animation presets for common effects
export function useFadeIn(
  startFrame = 0,
  durationInFrames = 30,
  options = { 
    from: 0, 
    to: 1,
    curve: EASE_OUT,
  }
) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  if (frame < startFrame) {
    return options.from;
  }
  
  if (frame >= startFrame + durationInFrames) {
    return options.to;
  }
  
  const progress = (frame - startFrame) / durationInFrames;
  const curvedProgress = options.curve(progress);
  
  return options.from + (options.to - options.from) * curvedProgress;
}

// Spring-based animation hook
export function useSpringAnimation(
  startFrame = 0,
  options = {
    from: 0,
    to: 1,
    damping: 10,
    stiffness: 100,
    mass: 1,
  }
) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  if (frame < startFrame) {
    return options.from;
  }
  
  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: {
      damping: options.damping,
      stiffness: options.stiffness,
      mass: options.mass,
    },
  });
  
  return options.from + (options.to - options.from) * progress;
}

// Other animation utility hooks...
```

## JSON Patch Generation

For LLM-driven video editing:

```typescript
// src/utils/patch-generator.ts
import { applyPatch, Operation } from 'fast-json-patch';
import { InputProps, Scene } from '~/types/input-props';
import { v4 as uuidv4 } from 'uuid';

export function addScene(
  inputProps: InputProps,
  newScene: Omit<Scene, 'id'>
): { updatedProps: InputProps; operations: Operation[] } {
  // Create a copy of the input props
  const updatedProps = JSON.parse(JSON.stringify(inputProps)) as InputProps;
  
  // Generate a unique ID for the new scene
  const sceneWithId = {
    ...newScene,
    id: uuidv4(),
  } as Scene;
  
  // Add the new scene to the array
  updatedProps.scenes.push(sceneWithId);
  
  // Create the JSON Patch operation
  const operations: Operation[] = [
    {
      op: 'add',
      path: `/scenes/-`,
      value: sceneWithId,
    },
  ];
  
  return { updatedProps, operations };
}

export function updateScene(
  inputProps: InputProps,
  sceneId: string,
  updates: Partial<Scene>
): { updatedProps: InputProps; operations: Operation[] } {
  // Create a copy of the input props
  const updatedProps = JSON.parse(JSON.stringify(inputProps)) as InputProps;
  
  // Find the scene index
  const sceneIndex = updatedProps.scenes.findIndex(
    (scene) => scene.id === sceneId
  );
  
  if (sceneIndex === -1) {
    throw new Error(`Scene with ID ${sceneId} not found`);
  }
  
  // Create operations for each updated property
  const operations: Operation[] = [];
  
  for (const [key, value] of Object.entries(updates)) {
    if (key === 'data' && typeof value === 'object') {
      // For nested data objects, handle each property individually
      for (const [dataKey, dataValue] of Object.entries(value)) {
        operations.push({
          op: 'replace',
          path: `/scenes/${sceneIndex}/data/${dataKey}`,
          value: dataValue,
        });
      }
    } else {
      operations.push({
        op: 'replace',
        path: `/scenes/${sceneIndex}/${key}`,
        value,
      });
    }
  }
  
  // Apply patches to get updated props
  return {
    updatedProps: applyPatch(
      updatedProps,
      operations,
      undefined,
      false
    ).newDocument,
    operations,
  };
}

export function removeScene(
  inputProps: InputProps,
  sceneId: string
): { updatedProps: InputProps; operations: Operation[] } {
  // Create a copy of the input props
  const updatedProps = JSON.parse(JSON.stringify(inputProps)) as InputProps;
  
  // Find the scene index
  const sceneIndex = updatedProps.scenes.findIndex(
    (scene) => scene.id === sceneId
  );
  
  if (sceneIndex === -1) {
    throw new Error(`Scene with ID ${sceneId} not found`);
  }
  
  // Remove the scene
  updatedProps.scenes.splice(sceneIndex, 1);
  
  // Create the JSON Patch operation
  const operations: Operation[] = [
    {
      op: 'remove',
      path: `/scenes/${sceneIndex}`,
    },
  ];
  
  return { updatedProps, operations };
}
```

## LLM Integration for Video Generation

System prompt pattern for LLM to generate scenes:

```typescript
// src/lib/prompts/video-generation-prompt.ts
export const videoGenerationSystemPrompt = `
You are a video generation assistant. Your task is to create a JSON patch that will modify the scenes in a video based on the user's instructions.

The video has the following structure:
{
  "meta": {
    "duration": number,
    "title": string
  },
  "scenes": [
    {
      "id": string,
      "type": "text" | "image" | "background-color" | "shape" | "gradient" | "particles" | "text-animation" | "split-screen" | "zoom-pan" | "svg-animation" | "custom",
      "start": number,
      "duration": number,
      "data": object (structure depends on scene type)
    }
  ]
}

The JSON patch operations include:
- add: Add a new scene
- replace: Update an existing scene
- remove: Delete a scene

Example JSON patch:
[
  {
    "op": "add",
    "path": "/scenes/-",
    "value": {
      "id": "new-unique-id",
      "type": "text",
      "start": 0,
      "duration": 60,
      "data": {
        "text": "Welcome to my video",
        "fontSize": 60,
        "color": "#FFFFFF",
        "backgroundColor": "#000000"
      }
    }
  }
]

The user will provide natural language instructions to modify the video. Your task is to generate a valid JSON patch that fulfills these instructions.

IMPORTANT: Always use valid JSON patch format. Each scene must have a unique ID. Scene durations are in frames (30 frames = 1 second).
`;
```

## References

- [Remotion Composition Documentation](https://www.remotion.dev/docs/composition)
- [Remotion Sequence Documentation](https://www.remotion.dev/docs/sequence)
- [Remotion Transitions Documentation](https://www.remotion.dev/docs/transitions)
- [Fast JSON Patch Documentation](https://github.com/Starcounter-Jack/JSON-Patch)

## Related Documentation

- [Next.js App Router Integration](./next-app-router-integration.md)
- [Lambda Rendering Pipeline](./lambda-rendering.md)
- [Tailwind and Shadcn UI Integration](./tailwind-shadcn-integration.md)
