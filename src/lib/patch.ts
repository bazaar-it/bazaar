// src/lib/patch.ts
import type { Operation } from "fast-json-patch";
import type { Scene } from "~/types/input-props";
import type { InputProps } from "~/types/input-props";
import { nanoid } from "nanoid";

/**
 * Creates a JSON Patch operation to add a new scene to the timeline
 */
export function addScene(newScene: Scene): Operation[] {
  return [{ op: "add", path: "/scenes/-", value: newScene }];
}

/**
 * Creates a JSON Patch operation to remove a scene by its index
 */
export function removeSceneByIndex(idx: number): Operation[] {
  return [{ op: "remove", path: `/scenes/${idx}` }];
}

/**
 * Creates a JSON Patch operation to replace a specific property of a scene
 */
export function replace<K extends keyof Scene>(
  idx: number,
  key: K,
  value: Scene[K],
): Operation[] {
  return [{ op: "replace", path: `/scenes/${idx}/${key}`, value }];
}

/**
 * Convenience function to create a new scene with default values
 */
export function createDefaultScene(
  type: string = "text",
  start: number = 0, 
  duration: number = 60
): Scene {
  return {
    id: nanoid(),
    type: type as any, // Cast to Scene's type requirement
    start,
    duration,
    data: type === "text" ? { text: "New Text" } : {},
  };
}

/**
 * Creates a patch operation to bump the total duration if needed
 * @param current The current video properties
 * @param newSceneEnd The end frame of the new scene
 * @returns Array of patch operations (empty if no bump needed)
 */
export function bumpDurationIfNeeded(
  current: InputProps,
  newSceneEnd: number
): Operation[] {
  const curEnd = current.meta.duration;
  return newSceneEnd > curEnd
    ? [{ op: "replace", path: "/meta/duration", value: newSceneEnd }]
    : [];
}
