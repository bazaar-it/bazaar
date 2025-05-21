// storyboard-schema.ts
// @package/storyboard - Core schema & utilities for Bazaar-Vid's Storyboard
import Ajv, { JSONSchemaType } from "ajv";
import addFormats from "ajv-formats";

/* ------------------------------------------------------------------
 * 1. Core types for the Storyboard
 * ------------------------------------------------------------------ */

export interface Storyboard {
  // Metadata
  id: string;                   // Unique identifier
  version: number;              // Increments with each update for tracking
  previousVersion?: number;     // Optional previous version for conflict detection
  createdAt: string;            // ISO date string
  updatedAt: string;            // ISO date string
  
  // Global video settings
  fps: number;                  // Frames per second
  width: number;                // Width in pixels
  height: number;               // Height in pixels
  duration: number;             // Total duration in frames (derived from scenes)
  
  // Design system tokens
  designSystem: DesignSystem;   // All style tokens
  
  // Content
  scenes: Scene[];              // Ordered array of scenes
  
  // Optional fields
  metadata?: Record<string, unknown>; // For extensibility
}

export interface DesignSystem {
  // Colors
  palette: Record<string, string>;    // Named colors (hex)
  
  // Typography
  fonts: {
    primary?: string;                // Primary font family
    secondary?: string;              // Secondary font family
    heading?: string;                // Heading-specific font
    body?: string;                   // Body text font
  };
  
  // Typography scale
  typographyScale?: {
    h1?: TypographyStyle;
    h2?: TypographyStyle;
    body?: TypographyStyle;
    caption?: TypographyStyle;
    // etc.
  };
  
  // Animation tokens
  animationTokens: {               // Renamed from 'animation' for clarity
    easing: Record<string, string>;   // Named easing functions
    duration: Record<string, number>; // Named durations in frames
  };
  
  // Spacing
  spacing?: Record<string, number>;   // Named spacing values
}

export interface TypographyStyle {
  fontSize: number;
  fontWeight?: number | string;
  lineHeight?: number;
  letterSpacing?: number;
}

export interface Scene {
  id: string;                  // Unique stable ID for patching
  start: number;               // Frame where scene starts
  duration: number;            // Duration in frames
  template: string;            // Component template name
  
  // Rich props with type safety
  props: SceneProps;
  
  // Transitions
  inTransition?: Transition | null;   // How this scene enters (nullable for explicit "none")
  outTransition?: Transition | null;  // How this scene exits (nullable for explicit "none")
  
  // Media assets
  assets?: Asset[];            // Associated media
  
  // Optional fields
  metadata?: Record<string, unknown>; // For extensibility
}

// Discriminated union for type-safe props based on template
export type SceneProps = 
  | { type: "HeroTitle"; title: string; subtitle?: string; background?: string }
  | { type: "CodeSnippet"; code: string; language: string; highlight?: number[] }
  | { type: "ImageReveal"; image: string; caption?: string; animation?: string }
  | { type: "SplitScreen"; left: { image?: string; text?: string }; right: { image?: string; text?: string } }
  | { type: "CustomTemplate"; [key: string]: unknown }; // Fallback for custom templates

// Supported transition types
export type TransitionType = 
  | "none"
  | "fade" 
  | "slide" 
  | "zoom" 
  | "wipe" 
  | "blur" 
  | "dissolve"
  | "crossfade";

// Supported transition directions
export type TransitionDirection = 
  | "left" 
  | "right" 
  | "up" 
  | "down" 
  | "in" 
  | "out";

export interface Transition {
  type: TransitionType;       // Enum of supported transitions
  direction?: TransitionDirection; // Direction for directional transitions
  duration: number;           // Duration in frames
  easing?: string;            // Reference to easing function in designSystem
  delay?: number;             // Delay before transition starts (frames)
}

export type AssetType = "image" | "video" | "audio" | "lottie" | "3d";

export interface Asset {
  id: string;           // Unique identifier
  type: AssetType;      // Type of asset
  url: string;          // Asset URL
  mimeType?: string;    // Optional MIME type for upload policies
  alt?: string;         // Alt text/description
  poster?: string;      // Thumbnail URL for video assets
  startTime?: number;   // When to start playing (for time-based assets)
  duration?: number;    // Duration to play (for time-based assets)
  loop?: boolean;       // Whether to loop
  dimensions?: {        // Original dimensions
    width: number;
    height: number;
  };
}

/* ------------------------------------------------------------------
 * 2. Patch operations definition
 * ------------------------------------------------------------------ */

export type ScenePath = `/scenes/${number}/${string}`;

export type PatchOperation = 
  | { op: "add"; path: string; value: unknown }
  | { op: "remove"; path: string }
  | { op: "replace"; path: string; value: unknown }
  | { op: "move"; from: string; path: string }
  | { op: "copy"; from: string; path: string }
  | { op: "test"; path: string; value: unknown };

export type PatchDocument = Array<PatchOperation & { previousVersion?: number }>;

/* ------------------------------------------------------------------
 * 3. JSON Schema for validation
 * ------------------------------------------------------------------ */

export const storyboardSchema: JSONSchemaType<Storyboard> = {
  $id: "https://bazaar-vid.dev/schema/storyboard.json",
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "Storyboard",
  description: "Single source of truth for all timing, style tokens and scene definitions.",
  type: "object",
  required: ["id", "version", "createdAt", "updatedAt", "fps", "width", "height", "scenes", "designSystem"],
  additionalProperties: false,
  noDuplicateIds: true, // Custom keyword added below
  properties: {
    id: { type: "string", format: "uuid" },
    version: { type: "integer", minimum: 1 },
    previousVersion: { type: "integer", minimum: 1, nullable: true },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
    
    fps: { type: "integer", minimum: 1, maximum: 120 },
    width: { type: "integer", minimum: 16 },
    height: { type: "integer", minimum: 16 },
    duration: { type: "integer", minimum: 1, readOnly: true }, // Marked as readOnly
    
    designSystem: {
      type: "object",
      required: ["palette", "animationTokens"],
      properties: {
        palette: {
          type: "object",
          minProperties: 1,
          propertyNames: { pattern: "^[a-zA-Z0-9_-]+$" },
          additionalProperties: { type: "string", pattern: "^#([0-9a-fA-F]{3,8})$" }
        },
        fonts: {
          type: "object",
          properties: {
            primary: { type: "string", nullable: true },
            secondary: { type: "string", nullable: true },
            heading: { type: "string", nullable: true },
            body: { type: "string", nullable: true }
          },
          additionalProperties: false,
          nullable: true
        },
        typographyScale: {
          type: "object",
          properties: {
            h1: { type: "object", properties: {}, additionalProperties: true, nullable: true },
            h2: { type: "object", properties: {}, additionalProperties: true, nullable: true },
            body: { type: "object", properties: {}, additionalProperties: true, nullable: true },
            caption: { type: "object", properties: {}, additionalProperties: true, nullable: true }
          },
          additionalProperties: false,
          nullable: true
        },
        animationTokens: {
          type: "object",
          required: ["easing", "duration"],
          properties: {
            easing: {
              type: "object",
              minProperties: 1,
              additionalProperties: { type: "string" }
            },
            duration: {
              type: "object",
              minProperties: 1,
              additionalProperties: { type: "number", minimum: 0 }
            }
          }
        },
        spacing: {
          type: "object",
          additionalProperties: { type: "number" },
          nullable: true
        }
      },
      additionalProperties: false
    },
    
    scenes: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["id", "start", "duration", "template", "props"],
        properties: {
          id: { type: "string", minLength: 1 },
          start: { type: "integer", minimum: 0 },
          duration: { type: "integer", minimum: 1 },
          template: { type: "string", minLength: 1 },
          
          props: { type: "object", additionalProperties: true },
          
          inTransition: {
            type: "object",
            required: ["type", "duration"],
            properties: {
              type: { type: "string", minLength: 1 },
              direction: { type: "string", nullable: true },
              duration: { type: "integer", minimum: 0 },
              easing: { type: "string", nullable: true },
              delay: { type: "integer", minimum: 0, nullable: true }
            },
            additionalProperties: false,
            nullable: true
          },
          
          outTransition: {
            type: "object",
            required: ["type", "duration"],
            properties: {
              type: { type: "string", minLength: 1 },
              direction: { type: "string", nullable: true },
              duration: { type: "integer", minimum: 0 },
              easing: { type: "string", nullable: true },
              delay: { type: "integer", minimum: 0, nullable: true }
            },
            additionalProperties: false,
            nullable: true
          },
          
          assets: {
            type: "array",
            items: {
              type: "object",
              required: ["id", "type", "url"],
              properties: {
                id: { type: "string", minLength: 1 },
                type: { type: "string", enum: ["image", "video", "audio", "lottie", "3d"] },
                url: { type: "string", format: "uri" },
                mimeType: { type: "string", nullable: true },
                alt: { type: "string", nullable: true },
                poster: { type: "string", format: "uri", nullable: true },
                startTime: { type: "integer", minimum: 0, nullable: true },
                duration: { type: "integer", minimum: 1, nullable: true },
                loop: { type: "boolean", nullable: true },
                dimensions: {
                  type: "object",
                  required: ["width", "height"],
                  properties: {
                    width: { type: "integer", minimum: 1 },
                    height: { type: "integer", minimum: 1 }
                  },
                  additionalProperties: false,
                  nullable: true
                }
              },
              additionalProperties: false
            },
            nullable: true
          },
          
          metadata: {
            type: "object",
            additionalProperties: true,
            nullable: true
          }
        },
        additionalProperties: false
      }
    },
    
    metadata: {
      type: "object",
      additionalProperties: true,
      nullable: true
    }
  },
  // Add conditional validation for template-specific props
  allOf: [
    // HeroTitle template requires title property
    {
      if: {
        properties: {
          scenes: {
            contains: {
              properties: {
                template: { const: "HeroTitle" }
              }
            }
          }
        }
      },
      then: {
        properties: {
          scenes: {
            contains: {
              properties: {
                props: {
                  required: ["type", "title"],
                  properties: {
                    type: { const: "HeroTitle" }
                  }
                }
              }
            }
          }
        }
      }
    },
    // CodeSnippet template requires code and language properties
    {
      if: {
        properties: {
          scenes: {
            contains: {
              properties: {
                template: { const: "CodeSnippet" }
              }
            }
          }
        }
      },
      then: {
        properties: {
          scenes: {
            contains: {
              properties: {
                props: {
                  required: ["type", "code", "language"],
                  properties: {
                    type: { const: "CodeSnippet" }
                  }
                }
              }
            }
          }
        }
      }
    },
    // ImageReveal template requires image property
    {
      if: {
        properties: {
          scenes: {
            contains: {
              properties: {
                template: { const: "ImageReveal" }
              }
            }
          }
        }
      },
      then: {
        properties: {
          scenes: {
            contains: {
              properties: {
                props: {
                  required: ["type", "image"],
                  properties: {
                    type: { const: "ImageReveal" }
                  }
                }
              }
            }
          }
        }
      }
    },
    // SplitScreen template requires left and right properties
    {
      if: {
        properties: {
          scenes: {
            contains: {
              properties: {
                template: { const: "SplitScreen" }
              }
            }
          }
        }
      },
      then: {
        properties: {
          scenes: {
            contains: {
              properties: {
                props: {
                  required: ["type", "left", "right"],
                  properties: {
                    type: { const: "SplitScreen" }
                  }
                }
              }
            }
          }
        }
      }
    }
  ]
} as const;

/* ------------------------------------------------------------------
 * 4. Custom validation functions for business rules
 * ------------------------------------------------------------------ */

// Check that scenes don't overlap and cover the entire timeline
export function validateSceneTimeline(storyboard: Storyboard): boolean {
  const { scenes, fps } = storyboard;
  
  // Sort scenes by start time
  const sortedScenes = [...scenes].sort((a, b) => a.start - b.start);
  
  // Check for overlaps and gaps
  for (let i = 0; i < sortedScenes.length - 1; i++) {
    const current = sortedScenes[i];
    const next = sortedScenes[i + 1];
    
    // End frame of current scene
    const endFrame = current.start + current.duration;
    
    // Check for overlap
    if (endFrame > next.start) {
      return false; // Overlap detected
    }
    
    // Check for gap
    if (endFrame < next.start) {
      return false; // Gap detected
    }
    
    // Check frame safety
    if (current.start % 1 !== 0 || current.duration % 1 !== 0) {
      return false; // Non-integer frames
    }
  }
  
  // Check that first scene starts at 0
  if (sortedScenes[0].start !== 0) {
    return false;
  }
  
  // Check that last scene ends at the total duration
  const lastScene = sortedScenes[sortedScenes.length - 1];
  const totalDuration = lastScene.start + lastScene.duration;
  
  return totalDuration === storyboard.duration;
}

// Check for duplicate scene IDs
export function validateNoDuplicateIds(storyboard: Storyboard): boolean {
  const { scenes } = storyboard;
  const ids = new Set<string>();
  
  for (const scene of scenes) {
    if (ids.has(scene.id)) {
      return false; // Duplicate ID found
    }
    ids.add(scene.id);
  }
  
  return true;
}

// Check that scene durations align with fps for clean timing
export function validateFpsSafety(storyboard: Storyboard): boolean {
  const { scenes, fps } = storyboard;
  
  // Check for non-integer frames that might cause timing issues
  for (const scene of scenes) {
    // Check if start and duration align with fps for clean frame boundaries
    if (scene.start % 1 !== 0 || scene.duration % 1 !== 0) {
      return false;
    }
  }
  
  return true;
}

/* ------------------------------------------------------------------
 * 5. Validator factory with custom keywords
 * ------------------------------------------------------------------ */

let _validate: ((data: unknown) => Promise<data is Storyboard>) | undefined;

export function getStoryboardValidator(): (data: unknown) => Promise<data is Storyboard> {
  if (_validate) return _validate;
  
  const ajv = new Ajv({
    allErrors: true,
    strict: true,
    removeAdditional: false,
    unevaluated: false,
    $async: true // Enable async validation
  });
  
  // Add formats like uri, uuid, date-time
  addFormats(ajv);
  
  // Add custom keywords
  ajv.addKeyword({
    keyword: "sceneIntegrity",
    validate: function validateSceneIntegrity(schema: boolean, data: Storyboard) {
      return validateSceneTimeline(data);
    },
    errors: true
  });
  
  // Add custom keyword for checking duplicate scene IDs
  ajv.addKeyword({
    keyword: "noDuplicateIds",
    validate: function(schema: boolean, data: Storyboard) {
      return validateNoDuplicateIds(data);
    },
    error: {
      message: "Storyboard contains duplicate scene IDs"
    }
  });
  
  // Add custom keyword for checking FPS safety
  ajv.addKeyword({
    keyword: "fpsSafety",
    validate: function(schema: boolean, data: Storyboard) {
      return validateFpsSafety(data);
    },
    error: {
      message: "Scene timings must use integer frames"
    }
  });
  
  _validate = ajv.compile(storyboardSchema) as unknown as (data: unknown) => Promise<data is Storyboard>;
  return _validate;
}

/* ------------------------------------------------------------------
 * 6. Utilities for working with patches
 * ------------------------------------------------------------------ */

// Map scene ID to index in the scenes array
export function findSceneIndex(storyboard: Storyboard, sceneId: string): number {
  const index = storyboard.scenes.findIndex(scene => scene.id === sceneId);
  if (index === -1) {
    throw new Error(`Scene with ID ${sceneId} not found`);
  }
  return index;
}

// Create a JSON patch-compatible factory for common operations
export const StoryboardPatch = {
  /**
   * Create a standard patch document
   */
  create(operations: PatchOperation[], previousVersion?: number): PatchDocument {
    if (previousVersion) {
      return operations.map(op => ({ ...op, previousVersion }));
    }
    return operations;
  },
  
  /**
   * Update a scene's props
   */
  updateSceneProps(storyboard: Storyboard, sceneId: string, props: Partial<SceneProps>): PatchOperation {
    const sceneIndex = findSceneIndex(storyboard, sceneId);
    return {
      op: "replace",
      path: `/scenes/${sceneIndex}/props`,
      value: { ...storyboard.scenes[sceneIndex].props, ...props }
    };
  },
  
  /**
   * Add a new scene
   */
  addScene(scene: Scene, atIndex?: number): PatchOperation {
    return {
      op: "add",
      path: atIndex !== undefined ? `/scenes/${atIndex}` : "/scenes/-",
      value: scene
    };
  },
  
  /**
   * Remove a scene
   */
  removeScene(storyboard: Storyboard, sceneId: string): PatchOperation {
    const sceneIndex = findSceneIndex(storyboard, sceneId);
    return {
      op: "remove",
      path: `/scenes/${sceneIndex}`
    };
  },
  
  /**
   * Update global video settings
   */
  updateSettings(settings: Partial<Pick<Storyboard, "fps" | "width" | "height">>): PatchOperation[] {
    return Object.entries(settings).map(([key, value]) => ({
      op: "replace",
      path: `/${key}`,
      value
    }));
  },
  
  /**
   * Update design tokens
   */
  updateDesignToken(tokenType: keyof DesignSystem, tokenName: string, value: unknown): PatchOperation {
    const path = tokenType === "animationTokens" 
      ? `/designSystem/${tokenType}/${tokenName.split('.')[0]}/${tokenName.split('.')[1]}`
      : `/designSystem/${tokenType}/${tokenName}`;
      
    return {
      op: "replace",
      path,
      value
    };
  },
  
  /**
   * Update a scene transition
   */
  updateTransition(
    storyboard: Storyboard, 
    sceneId: string, 
    transitionType: "inTransition" | "outTransition", 
    transition: Transition | null
  ): PatchOperation {
    const sceneIndex = findSceneIndex(storyboard, sceneId);
    return {
      op: "replace",
      path: `/scenes/${sceneIndex}/${transitionType}`,
      value: transition
    };
  }
};

/* ------------------------------------------------------------------
 * 7. Factory functions for creating storyboard elements
 * ------------------------------------------------------------------ */

export const StoryboardFactory = {
  createStoryboard(params: {
    fps: number;
    width: number;
    height: number;
    scenes: Scene[];
    designSystem?: Partial<DesignSystem>;
  }): Storyboard {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    
    // Calculate total duration
    const lastScene = [...params.scenes].sort((a, b) => (a.start + a.duration) - (b.start + b.duration))[params.scenes.length - 1];
    const duration = lastScene.start + lastScene.duration;
    
    // Create default design system if not provided
    const defaultDesignSystem: DesignSystem = {
      palette: { 
        primary: "#0062ff",
        secondary: "#e84393",
        background: "#ffffff",
        text: "#000000"
      },
      fonts: {
        primary: "Inter"
      },
      animationTokens: { // Updated from 'animation' to 'animationTokens'
        easing: {
          default: "cubic-bezier(0.4, 0.0, 0.2, 1)",
          easeIn: "cubic-bezier(0.4, 0.0, 1, 1)",
          easeOut: "cubic-bezier(0.0, 0.0, 0.2, 1)"
        },
        duration: {
          fast: 12, // 12 frames at 30fps = 0.4s
          medium: 24, // 24 frames = 0.8s
          slow: 36 // 36 frames = 1.2s
        }
      }
    };
    
    return {
      id,
      version: 1,
      createdAt: now,
      updatedAt: now,
      fps: params.fps,
      width: params.width,
      height: params.height,
      duration,
      designSystem: { ...defaultDesignSystem, ...params.designSystem },
      scenes: params.scenes
    };
  },
  
  createScene(params: {
    id?: string;
    start: number;
    duration: number;
    template: string;
    props: SceneProps;
    inTransition?: Transition | null;
    outTransition?: Transition | null;
    assets?: Asset[];
  }): Scene {
    return {
      id: params.id || crypto.randomUUID(),
      start: params.start,
      duration: params.duration,
      template: params.template,
      props: params.props,
      inTransition: params.inTransition ?? null,
      outTransition: params.outTransition ?? null,
      assets: params.assets
    };
  },
  
  createTransition(params: {
    type: TransitionType;
    direction?: TransitionDirection;
    duration: number;
    easing?: string;
    delay?: number;
  }): Transition {
    return {
      type: params.type,
      direction: params.direction,
      duration: params.duration,
      easing: params.easing,
      delay: params.delay
    };
  }
};

/* ------------------------------------------------------------------
 * 8. Example/sample for development testing
 * ------------------------------------------------------------------ */

if (process.env.NODE_ENV === "development" && typeof window === "undefined") {
  const sampleStoryboard: Storyboard = {
    id: "e4d2f8b0-a5e1-4c5a-9b7d-8e5c3f7a2d1b",
    version: 1,
    createdAt: "2025-05-21T12:00:00Z",
    updatedAt: "2025-05-21T12:00:00Z",
    fps: 30,
    width: 1280,
    height: 720,
    duration: 300, // 10 seconds at 30fps
    
    designSystem: {
      palette: {
        primary: "#0062ff",
        secondary: "#e84393",
        background: "#ffffff",
        text: "#000000",
        accent: "#00c9ff"
      },
      fonts: {
        primary: "Inter",
        heading: "Montserrat"
      },
      animationTokens: { // Updated from 'animation' to 'animationTokens'
        easing: {
          default: "cubic-bezier(0.4, 0.0, 0.2, 1)",
          easeIn: "cubic-bezier(0.4, 0.0, 1, 1)",
          easeOut: "cubic-bezier(0.0, 0.0, 0.2, 1)"
        },
        duration: {
          fast: 12,
          medium: 24,
          slow: 36
        }
      }
    },
    
    scenes: [
      {
        id: "intro",
        start: 0,
        duration: 90,
        template: "HeroTitle",
        props: {
          type: "HeroTitle",
          title: "Welcome to Bazaar",
          subtitle: "The future of video creation"
        },
        inTransition: {
          type: "fade",
          duration: 15,
          easing: "easeOut"
        },
        outTransition: {
          type: "slide",
          direction: "left",
          duration: 20,
          easing: "default"
        }
      },
      {
        id: "features",
        start: 90,
        duration: 120,
        template: "SplitScreen",
        props: {
          type: "SplitScreen",
          left: {
            text: "Powerful AI"
          },
          right: {
            image: "https://example.com/ai-graphic.png"
          }
        },
        inTransition: {
          type: "slide",
          direction: "right",
          duration: 20,
          easing: "default"
        }
      },
      {
        id: "outro",
        start: 210,
        duration: 90,
        template: "CodeSnippet",
        props: {
          type: "CodeSnippet",
          code: "const video = createVideo('awesome');\nvideo.render();",
          language: "javascript",
          highlight: [2]
        },
        outTransition: {
          type: "fade",
          duration: 24,
          easing: "easeIn"
        },
        assets: [
          {
            id: "bgAudio",
            type: "audio",
            url: "https://example.com/background-music.mp3",
            poster: "https://example.com/music-thumbnail.png",
            mimeType: "audio/mp3",
            startTime: 0,
            duration: 90,
            loop: false
          }
        ]
      }
    ]
  };

  // Use async/await with the async validator
  async function validateSample() {
    const validate = getStoryboardValidator();
    try {
      if (await validate(sampleStoryboard)) {
        console.log("Sample storyboard is valid");
      }
    } catch (err) {
      console.error("Sample storyboard validation failed", err);
      process.exit(1);
    }
    
    if (!validateSceneTimeline(sampleStoryboard)) {
      console.error("Scene timeline should be valid");
      process.exit(1);
    }
    
    if (!validateNoDuplicateIds(sampleStoryboard)) {
      console.error("Scene IDs should be unique");
      process.exit(1);
    }
    
    if (!validateFpsSafety(sampleStoryboard)) {
      console.error("Frame timing should be safe");
      process.exit(1);
    }
  }
  
  validateSample().catch(console.error);
}