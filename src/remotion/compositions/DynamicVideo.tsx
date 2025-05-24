// src/remotion/compositions/DynamicVideo.tsx
// @ts-nocheck
import React, { useMemo, useEffect, useRef } from 'react';
import { AbsoluteFill, Sequence } from "remotion";

import { TransitionSeries } from "@remotion/transitions";
import { linearTiming } from "@remotion/transitions";

import { fade,      type FadeProps }  from "@remotion/transitions/fade";
import { slide,     type SlideDirection,     type SlideProps } from "@remotion/transitions/slide";
import { wipe,      type WipeDirection,      type WipeProps }  from "@remotion/transitions/wipe";
import type {
  TransitionPresentation,
} from "@remotion/transitions";

import type {
  InputProps,
  Transition as TransitionSpec,
} from "../../types/input-props";

import { sceneRegistry, TextScene } from "../components/scenes";
import type { Scene } from '~/types/input-props';
import { BackgroundColorScene } from '~/remotion/components/scenes/BackgroundColorScene';
import { CustomScene } from '~/remotion/components/scenes/CustomScene';
import { ImageScene } from '~/remotion/components/scenes/ImageScene';
import { ShapeScene } from '~/remotion/components/scenes/ShapeScene';

/**
 * Maps `"from-left"` → `"left"` (etc.) because the helper
 * directions don't include the `"from-"` prefix.
 */
const toHelperDir = (dir: string | undefined) =>
  (
    {
      "from-left":   "left",
      "from-right":  "right",
      "from-top":    "up",
      "from-bottom": "down",
      "left":        "left",
      "right":       "right",
      "up":          "up",
      "down":        "down",
    } as const
  )[dir ?? "from-right"] ?? "right";

/**
 * Returns the presentation object for a given transition spec.
 * (The generic is a union of all helper-prop types so the return
 * value satisfies `TransitionPresentation<…>` without `any` casts.)
 */
const presentationFor = (
  t: TransitionSpec,
): TransitionPresentation<any> => {        // 👈  wider return
  switch (t.type) {
    case "fade":
      return fade();
    case "slide":
      return slide({ direction: toHelperDir(t.direction) as SlideDirection });
    case "wipe":
      return wipe({ direction: toHelperDir(t.direction) as WipeDirection });
    /* istanbul ignore next */
    default:
      return fade();
  }
};

type CompositionProps = {
  scenes: Scene[];
  meta: InputProps['meta'];
  refreshToken?: string; // Add a refresh token to force remounts
};

/**
 * A dynamic video composition that builds sequences based on scene data
 * 
 * This is the main composition that Remotion renders. It takes scene data
 * and renders a sequence of components based on the scene type.
 * 
 * @param props Scene data for the video
 * @returns A Remotion composition
 */
export const DynamicVideo: React.FC<CompositionProps> = ({ 
  scenes,
  meta,
  refreshToken = 'default'
}) => {
  const prevRefreshToken = useRef<string>(refreshToken);
  
  // Log the refreshToken change
  useEffect(() => {
    if (prevRefreshToken.current !== refreshToken) {
      console.log(`[DynamicVideo] 🔄 RefreshToken changed: ${prevRefreshToken.current} -> ${refreshToken}`);
      prevRefreshToken.current = refreshToken;
      
      // Log all the scenes that should be receiving the refresh token
      const customScenes = scenes.filter(scene => scene.type === 'custom');
      console.log(`[DynamicVideo] Custom scenes that will get new refreshToken:`, 
        customScenes.map(s => ({
          id: s.id,
          componentId: s.data.componentId
        }))
      );
    }
  }, [refreshToken, scenes]);

  console.log('[DynamicVideo] Rendering with props:', {
    sceneCount: scenes.length,
    metaDuration: meta.duration,
    refreshToken,
    customSceneIds: scenes
      .filter(scene => scene.type === 'custom')
      .map(scene => scene.data.componentId)
  });

  // Log scene details for debugging
  useEffect(() => {
    console.log('[DynamicVideo] Scenes after render:', 
      scenes.map(scene => ({
        id: scene.id,
        type: scene.type,
        componentId: scene.type === 'custom' ? scene.data.componentId : undefined,
      }))
    );
    console.log('[DynamicVideo] Current refreshToken:', refreshToken);
  }, [scenes, refreshToken]);

  // Get the scene component for a given scene type
  const getSceneComponent = (scene: Scene) => {
    // Generate a unique key for each scene that includes the refreshToken
    // REMOVED Date.now() from the key to prevent unnecessary remounts
    const sceneKey = `scene-${scene.id}-${refreshToken}`;
    
    // Add extra logging for custom scenes
    if (scene.type === 'custom') {
      console.log(`[DynamicVideo] 🎬 Creating custom scene component for ${scene.id} with componentId ${scene.data.componentId}, key: ${sceneKey}`);
    }
    
    switch (scene.type) {
      case 'text':
        return <TextScene key={sceneKey} data={scene.data} />;
      case 'image':
        return <ImageScene key={sceneKey} data={scene.data} />;
      case 'background-color':
        return <BackgroundColorScene key={sceneKey} data={scene.data} />;
      case 'custom':
        return <CustomScene key={sceneKey} data={{
          componentId: scene.data.componentId as string,
          ...scene.data,
          refreshToken
        }} />;
      case 'shape':
        return <ShapeScene key={sceneKey} data={scene.data} />;
      default:
        console.warn(`[DynamicVideo] Unknown scene type: ${scene.type}. Using fallback.`);
        return (
          <AbsoluteFill
            key={sceneKey}
            style={{
              backgroundColor: '#000',
              color: 'white',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <h1>Unknown Scene Type: {scene.type}</h1>
          </AbsoluteFill>
        );
    }
  };

  // Cache scene components between renders when inputs haven't changed
  const sceneComponents = useMemo(() => {
    return scenes.map((scene) => {
      // Each scene has a start, duration, and component
      return {
        start: scene.start,
        duration: scene.duration,
        component: getSceneComponent(scene),
      };
    });
  }, [scenes, refreshToken]); // Add refreshToken to dependencies

  return (
    <AbsoluteFill style={{ backgroundColor: meta.backgroundColor || '#000' }}>
      {sceneComponents.map(({ start, duration, component }, index) => {
        return (
          <Sequence
            key={`sequence-${index}-${refreshToken}`}
            from={start}
            durationInFrames={duration}
          >
            {component}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};