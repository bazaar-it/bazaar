// src/remotion/compositions/DynamicVideo.tsx
import React from "react";
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

/**
 * Maps `"from-left"` → `"left"` (etc.) because the helper
 * directions don’t include the `"from-"` prefix.
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

export const DynamicVideo: React.FC<InputProps> = ({ scenes, meta }) => {
  const hasTransitions = scenes.some((s) => s.transitionToNext);

  // ──────────────────── WITH TRANSITIONS ────────────────────
  if (hasTransitions) {
    return (
      <AbsoluteFill style={{ backgroundColor: meta?.backgroundColor ?? "#000" }}>
        <TransitionSeries>
          {scenes.map((scene, i) => {
            const Scene = sceneRegistry[scene.type] ?? TextScene;
            const next  = scenes[i + 1];

            return (
              <React.Fragment key={scene.id}>
                {/* In TransitionSeries you NEVER pass `from={…}` */}
                <TransitionSeries.Sequence durationInFrames={scene.duration}>
                  <Scene data={scene.data} />
                </TransitionSeries.Sequence>

                {next && scene.transitionToNext && (
                  <TransitionSeries.Transition
                    presentation={presentationFor(scene.transitionToNext)}
                    timing={linearTiming({
                      durationInFrames: scene.transitionToNext.duration ?? 30,
                    })}
                  />
                )}
              </React.Fragment>
            );
          })}
        </TransitionSeries>
      </AbsoluteFill>
    );
  }

  // ──────────────────── NO TRANSITIONS ───────────────────────
  return (
    <AbsoluteFill style={{ backgroundColor: meta?.backgroundColor ?? "#000" }}>
      {scenes.map((scene) => {
        const Scene = sceneRegistry[scene.type] ?? TextScene;

        return (
          <Sequence
            key={scene.id}
            from={scene.start}
            durationInFrames={scene.duration}
          >
            <Scene data={scene.data} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};