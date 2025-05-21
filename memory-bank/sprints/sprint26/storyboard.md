// storyboard-schema.ts
// Draft JSON Schema + AJV helper utilities for the canonical Storyboard document
// ------------------------------------------------------------
// 1. The JSON Schema itself (const storyboardSchema)
// 2. Factory that returns an AJV validation function (getStoryboardValidator)
// 3. Example usage (will be tree-shaken in builds)
// ------------------------------------------------------------
// NOTE: Keep this file framework-agnostic – it can run in Node, Vite, or Next.js.
// If you need bundler-specific wrappers, create thin entrypoints that re-export from here.

import Ajv, {JSONSchemaType} from "ajv";

/* ------------------------------------------------------------------
 * 1. TypeScript interface that mirrors the Storyboard structure
 * ------------------------------------------------------------------ */
export interface Storyboard {
  fps: number;            // frames per second for the whole video
  width: number;          // px – global width
  height: number;         // px – global height
  palette?: Record<string, string>; // optional design-tokens (HEX)
  fontFamily?: string;    // optional base font
  scenes: Scene[];        // ordered, non-overlapping scenes
}

export interface Scene {
  id: string;             // unique stable id
  start: number;          // frame index where scene starts
  duration: number;       // duration **in frames** – keep integers
  template: string;       // name of Remotion template/component
  props?: Record<string, unknown>; // free-form props forwarded to component
  asset?: string;         // optional URL to user-uploaded asset
}

/* ------------------------------------------------------------------
 * 2. JSON Schema (Draft-2020-12) for runtime validation
 * ------------------------------------------------------------------ */
export const storyboardSchema: JSONSchemaType<Storyboard> = {
  $id: "https://bazaar-vid.dev/schema/storyboard.json",
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "Storyboard",
  description: "Single source of truth for all timing, style tokens and scene definitions.",
  type: "object",
  required: ["fps", "width", "height", "scenes"],
  additionalProperties: false,
  properties: {
    fps: {type: "integer", minimum: 1, maximum: 120},
    width: {type: "integer", minimum: 16},
    height: {type: "integer", minimum: 16},
    palette: {
      type: "object",
      propertyNames: {type: "string", pattern: "^[a-zA-Z0-9_-]+$"},
      additionalProperties: {type: "string", pattern: "^#([0-9a-fA-F]{3}){1,2}$"},
      nullable: true,
    },
    fontFamily: {type: "string", nullable: true},
    scenes: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["id", "start", "duration", "template"],
        additionalProperties: false,
        properties: {
          id: {type: "string", minLength: 1},
          start: {type: "integer", minimum: 0},
          duration: {type: "integer", minimum: 1},
          template: {type: "string", minLength: 1},
          props: {type: "object", nullable: true},
          asset: {type: "string", format: "uri", nullable: true},
        },
      },
    },
  },
} as const;

/* ------------------------------------------------------------------
 * 3. AJV factory – returns a cached validator instance so callers don’t
 *    repeatedly compile the schema (compilation is expensive).
 * ------------------------------------------------------------------ */

let _validate: ((data: unknown) => data is Storyboard) | undefined;

export function getStoryboardValidator(): (data: unknown) => data is Storyboard {
  if (_validate) return _validate;
  const ajv = new Ajv({allErrors: true, strict: true});
  _validate = ajv.compile(storyboardSchema) as (data: unknown) => data is Storyboard;
  return _validate;
}

/* ------------------------------------------------------------------
 * 4. Example – dev-time sanity check (stripped in production if tree-shaken)
 * ------------------------------------------------------------------ */
if (process.env.NODE_ENV === "development" && typeof window === "undefined") {
  const sample: Storyboard = {
    fps: 30,
    width: 1280,
    height: 720,
    palette: {primary: "#0062ff"},
    scenes: [
      {id: "hero", start: 0, duration: 90, template: "HeroTitle", props: {title: "Hello"}},
    ],
  };

  const validate = getStoryboardValidator();
  if (!validate(sample)) {
    console.error("Sample storyboard should be valid", validate.errors);
    process.exit(1);
  }
}




----------------
	•	declares the canonical Storyboard and Scene interfaces
	•	ships a strict Draft-2020-12 JSON Schema (storyboardSchema)
	•	exposes getStoryboardValidator() that returns a cached AJV validator
	•	includes a tiny dev-time sanity check

Because the schema lives in regular TypeScript you can:
	•	import it in both Node workers and browser bundles
	•	tree-shake the sample section in production
	•	extend it later (e.g. add transition objects) without hunting through multiple files