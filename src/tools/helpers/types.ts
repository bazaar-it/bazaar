import { z } from "zod";

// ============================================================================
// TOOL INTERFACES - Pure Functions Only (Sprint 42)
// ============================================================================

/**
 * Base input that all tools receive
 * Tools are PURE FUNCTIONS - no side effects, no database access
 */
export interface BaseToolInput {
  userPrompt: string;
  projectId: string;  // For context only, not DB access
  userId?: string;    // For context only, not DB access
  requestedDurationFrames?: number;  // Explicit duration from user prompt (e.g. "5 seconds" = 150)
  formatContext?: {
    format: 'landscape' | 'portrait' | 'square';
    width: number;
    height: number;
  };
  assetUrls?: string[];  // All persistent project assets for context enforcement
}

/**
 * Base output that all tools return
 * MUST match database field names exactly
 */
export interface BaseToolOutput {
  success: boolean;
  tsxCode?: string;      // ✓ Correct field name (was sceneCode)
  name?: string;         // ✓ Correct field name (was sceneName)
  duration?: number;     // Always in frames
  reasoning: string;
  chatResponse?: string;
  error?: string;
  debug?: Record<string, unknown>;
  scene?: any;           // Scene object for database operations
}

// ============================================================================
// ADD TOOL TYPES
// ============================================================================

export interface AddToolInput extends BaseToolInput {
  sceneNumber?: number;
  storyboardSoFar?: Array<{
    id: string;
    name: string;
    duration: number;
    order: number;
    tsxCode: string;
  }>;
  previousSceneContext?: {
    tsxCode: string;
    style?: string;
  };
  referenceScenes?: Array<{  // For cross-scene style/color matching
    id: string;
    name: string;
    tsxCode: string;
  }>;
  templateContext?: {  // Template examples for better generation
    examples: Array<{
      id: string;
      name: string;
      code: string;
      style: string;
      description: string;
    }>;
  };
  imageUrls?: string[];
  videoUrls?: string[];
  audioUrls?: string[];
  // Brain-driven image handling intent when imageUrls present
  imageAction?: 'embed' | 'recreate';
  imageDirectives?: Array<{
    url: string;
    action: 'embed' | 'recreate';
    target?: 'newScene' | { sceneId: string; selector?: string };
  }>;
  isYouTubeAnalysis?: boolean; // Flag indicating this is YouTube analysis that should be followed closely
  webContext?: {
    originalUrl: string;
    screenshotUrls: {
      desktop: string;
      mobile: string;
    };
    pageData: {
      title: string;
      description?: string;
      headings: string[];
      url: string;
    };
    analyzedAt: string;
  };
  projectFormat?: {
    format: 'landscape' | 'portrait' | 'square';
    width: number;
    height: number;
  };
  figmaComponentData?: any; // Figma component data for recreation
}

export interface AddToolOutput extends BaseToolOutput {
  tsxCode: string;       // Required for new scenes
  name: string;          // Required for new scenes
  duration: number;      // Required for new scenes
  layoutJson?: string;
  props?: Record<string, any>;
}

// ============================================================================
// EDIT TOOL TYPES
// ============================================================================

export interface EditToolInput extends BaseToolInput {
  sceneId: string;       // Just for reference
  tsxCode: string;       // ✓ FIXED: Was existingCode
  sceneName?: string;    // Current scene name to preserve
  currentDuration?: number;
  imageUrls?: string[];
  videoUrls?: string[];
  audioUrls?: string[];
  targetSelector?: string; // Optional CSS-like hint for where to place/embed
  // Brain-driven image handling intent when imageUrls present
  imageAction?: 'embed' | 'recreate';
  imageDirectives?: Array<{
    url: string;
    action: 'embed' | 'recreate';
    target?: 'newScene' | { sceneId: string; selector?: string };
  }>;
  errorDetails?: string;
  referenceScenes?: Array<{  // For cross-scene style/color matching
    id: string;
    name: string;
    tsxCode: string;
  }>;
  webContext?: {
    originalUrl: string;
    screenshotUrls: {
      desktop: string;
      mobile: string;
    };
    pageData: {
      title: string;
      description?: string;
      headings: string[];
      url: string;
    };
    analyzedAt: string;
  };
  modelOverride?: string; // Optional model ID for overriding default model
}

export interface EditToolOutput extends BaseToolOutput {
  tsxCode: string;       // Updated code
  name?: string;         // Scene name (preserved from input)
  duration?: number;     // Only if changed
  props?: Record<string, any>;
  changesApplied?: string[];
}

// ============================================================================
// DELETE TOOL TYPES
// ============================================================================

export interface DeleteToolInput extends BaseToolInput {
  sceneId: string;       // Which scene to delete
  confirmDeletion?: boolean;
}

export interface DeleteToolOutput extends BaseToolOutput {
  deletedSceneId: string;
  // No content generation needed for delete
}

// ============================================================================
// TRIM TOOL TYPES
// ============================================================================

export interface TrimToolInput extends BaseToolInput {
  sceneId: string;          // Which scene to trim
  currentDuration: number;  // Current duration in frames
  newDuration?: number;     // New duration in frames
  trimFrames?: number;      // Frames to add (positive) or remove (negative)
  trimType?: 'start' | 'end'; // Where to trim from
}

export interface TrimToolOutput extends BaseToolOutput {
  duration: number;         // New duration
  trimmedFrames: number;    // How many frames were trimmed
}

// ============================================================================
// NEW SPECIALIZED TOOL TYPES



export interface ScenePlannerToolInput extends BaseToolInput {
  storyboardSoFar?: Array<{
    id: string;
    name: string;
    duration: number;
    order: number;
    tsxCode: string;
  }>;
  chatHistory?: Array<{role: string; content: string}>;
  imageUrls?: string[];
}

export interface ScenePlan {
  toolType: 'typography' | 'recreate' | 'code-generator';
  prompt: string;
  order: number;
  context: Record<string, any>;
  fallbackUsed?: boolean;
}

export interface ScenePlannerToolOutput extends BaseToolOutput {
  scenePlans: ScenePlan[];
  firstScene?: {
    tsxCode: string;
    name: string;
    duration: number;
  };
  shouldAutoGenerateFirstScene?: boolean;
  firstScenePlan?: ScenePlan;
}

// ============================================================================
// SERVICE HELPER TYPES
// ============================================================================

/**
 * Layout generation input
 */
export interface LayoutGenerationInput {
  userPrompt: string;
  projectId: string;
  sceneNumber?: number;
  previousSceneJson?: string;
}

/**
 * Layout generation output
 */
export interface LayoutGenerationOutput {
  layoutJson: any;
  reasoning: string;
  debug?: any;
}

/**
 * Code generation input
 */
export interface CodeGenerationInput {
  userPrompt: string;
  layoutJson: any;
  functionName: string;
  projectId: string;
  projectFormat?: {
    format: 'landscape' | 'portrait' | 'square';
    width: number;
    height: number;
  };
}

/**
 * Code generation output
 */
export interface CodeGenerationOutput {
  code: string;
  name: string;
  duration: number;
  reasoning: string;
  debug?: any;
}

/**
 * Image-to-code generation input
 */
export interface ImageToCodeInput {
  imageUrls: string[];
  userPrompt: string;
  functionName: string;
  projectId?: string;
  projectFormat?: {
    format: 'landscape' | 'portrait' | 'square';
    width: number;
    height: number;
  };
}

/**
 * Creative editing input
 */
export interface CreativeEditInput {
  userPrompt: string;
  tsxCode: string;        // ✓ FIXED: Was existingCode
  functionName: string;
  imageUrls?: string[];
  videoUrls?: string[];
}

/**
 * Surgical editing input
 */
export interface SurgicalEditInput {
  userPrompt: string;
  tsxCode: string;        // ✓ FIXED: Was existingCode
  functionName: string;
  targetElement?: string;
}

/**
 * Error fixing input
 */
export interface ErrorFixInput {
  tsxCode: string;        // ✓ FIXED: Was existingCode
  errorDetails: string;
  userPrompt?: string;
}

// ============================================================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================================================

export const baseToolInputSchema = z.object({
  userPrompt: z.string().describe("User's description of what they want"),
  projectId: z.string().describe("Project ID for context only"),
  userId: z.string().optional().describe("User ID for context only"),
});

export const addToolInputSchema = baseToolInputSchema.extend({
  sceneNumber: z.number().optional().describe("Optional scene number/position"),
  storyboardSoFar: z.array(z.object({
    id: z.string(),
    name: z.string(),
    duration: z.number(),
    order: z.number(),
    tsxCode: z.string(),
  })).optional().describe("Current storyboard scenes"),
  previousSceneContext: z.object({
    tsxCode: z.string(),
    style: z.string().optional(),
  }).optional().describe("Previous scene for style consistency"),
  referenceScenes: z.array(z.object({
    id: z.string(),
    name: z.string(),
    tsxCode: z.string(),
  })).optional().describe("Reference scenes for cross-scene style/color matching"),
  imageUrls: z.array(z.string()).optional().describe("Image URLs for reference"),
  videoUrls: z.array(z.string()).optional().describe("Video URLs for reference"),
  audioUrls: z.array(z.string()).optional().describe("Audio URLs for background music"),
  imageAction: z.enum(['embed','recreate']).optional().describe('How to handle provided images'),
  imageDirectives: z.array(z.object({
    url: z.string(),
    action: z.enum(['embed','recreate']),
    target: z.union([z.literal('newScene'), z.object({ sceneId: z.string(), selector: z.string().optional() })]).optional()
  })).optional().describe('Per-image directives for mixed intent'),
  webContext: z.object({
    originalUrl: z.string(),
    screenshotUrls: z.object({
      desktop: z.string(),
      mobile: z.string(),
    }),
    pageData: z.object({
      title: z.string(),
      description: z.string().optional(),
      headings: z.array(z.string()),
      url: z.string(),
    }),
    analyzedAt: z.string(),
  }).optional().describe("Web analysis context with screenshots for brand matching"),
  templateContext: z.object({
    examples: z.array(z.object({
      id: z.string(),
      name: z.string(),
      code: z.string(),
      style: z.string(),
      description: z.string(),
    })),
  }).optional().describe("Template examples for better first-scene generation"),
});

export const editToolInputSchema = baseToolInputSchema.extend({
  sceneId: z.string().describe("ID of the scene to edit (reference only)"),
  tsxCode: z.string().describe("Current scene TSX code"),
  currentDuration: z.number().optional().describe("Current duration in frames"),
  imageUrls: z.array(z.string()).optional().describe("Image URLs for reference"),
  videoUrls: z.array(z.string()).optional().describe("Video URLs for reference"),
  audioUrls: z.array(z.string()).optional().describe("Audio URLs for background music"),
  imageAction: z.enum(['embed','recreate']).optional().describe('How to handle provided images'),
  imageDirectives: z.array(z.object({
    url: z.string(),
    action: z.enum(['embed','recreate']),
    target: z.union([z.literal('newScene'), z.object({ sceneId: z.string(), selector: z.string().optional() })]).optional()
  })).optional().describe('Per-image directives for mixed intent'),
  errorDetails: z.string().optional().describe("Error details if fixing errors"),
  referenceScenes: z.array(z.object({
    id: z.string(),
    name: z.string(),
    tsxCode: z.string(),
  })).optional().describe("Reference scenes for cross-scene style/color matching"),
  webContext: z.object({
    originalUrl: z.string(),
    screenshotUrls: z.object({
      desktop: z.string(),
      mobile: z.string(),
    }),
    pageData: z.object({
      title: z.string(),
      description: z.string().optional(),
      headings: z.array(z.string()),
      url: z.string(),
    }),
    analyzedAt: z.string(),
  }).optional().describe("Web analysis context with screenshots for brand matching"),
  modelOverride: z.string().optional().describe("Optional model ID for overriding default model"),
});

export const deleteToolInputSchema = baseToolInputSchema.extend({
  sceneId: z.string().describe("ID of the scene to delete"),
  confirmDeletion: z.boolean().optional().describe("Confirmation flag for deletion"),
});

export const trimToolInputSchema = baseToolInputSchema.extend({
  sceneId: z.string().describe("ID of the scene to trim"),
  currentDuration: z.number().describe("Current duration in frames"),
  newDuration: z.number().optional().describe("Target duration in frames"),
  trimFrames: z.number().optional().describe("Frames to add (positive) or remove (negative)"),
  trimType: z.enum(['start', 'end']).optional().default('end').describe("Where to trim from"),
});

// ============================================================================
// SCHEMAS FOR NEW SPECIALIZED TOOLS
// ============================================================================

// (Removed) ImageRecreator tool types — use Add/Edit with imageAction instead

export const scenePlannerToolInputSchema = baseToolInputSchema.extend({
  storyboardSoFar: z.array(z.object({
    id: z.string(),
    name: z.string(),
    duration: z.number(),
    order: z.number(),
    tsxCode: z.string(),
  })).optional(),
  chatHistory: z.array(z.object({
    role: z.string(),
    content: z.string(),
  })).optional(),
  imageUrls: z.array(z.string()).optional(),
});

// ============================================================================
// PROGRESS CALLBACK TYPE
// ============================================================================

export type ProgressCallback = (stage: string, status: string) => void;

// ============================================================================
// TOOL RESULT WRAPPER
// ============================================================================

export interface ToolResult<T = BaseToolOutput> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  metadata?: {
    executionTime: number;
    toolName: string;
    timestamp: string;
  };
}

// ============================================================================
// TRANSITION TOOL TYPES (Boundary refinement between scene N and N+1)
// ============================================================================

export type TransitionType = 'auto' | 'crossfade' | 'fadeThroughBlack' | 'slide' | 'push' | 'zoom' | 'whip';

export interface BoundarySpec {
  overlapFrames: number; // how many frames both scenes render simultaneously
  type: TransitionType;
  easing?: 'easeInOutCubic' | 'easeOutQuad' | 'easeInQuad' | 'linear';
  direction?: 'left' | 'right' | 'up' | 'down';
}

export interface BoundaryPlan {
  aSceneId: string;
  bSceneId: string;
  spec: BoundarySpec;
  // Optional minimal code patches or hints limited to last/first window
  edits?: Array<{
    target: 'A' | 'B';
    description: string;
    // The tool may propose code snippets, not full files
    snippet?: string;
  }>;
  reasoning?: string;
}

export interface TransitionToolInput extends BaseToolInput {
  aSceneId: string;
  bSceneId: string;
  aCode: string;
  bCode: string;
  aDuration: number; // frames
  bDuration: number; // frames
  fps?: number; // default 30
  requested?: Partial<BoundarySpec>; // caller preference (e.g., overlap length)
}

export interface TransitionToolOutput extends BaseToolOutput {
  plan: BoundaryPlan;
  // Optional updated code for A and/or B if safe to emit
  updated?: {
    A?: { tsxCode: string; duration?: number };
    B?: { tsxCode: string; duration?: number };
  };
}

export const transitionToolInputSchema = baseToolInputSchema.extend({
  aSceneId: z.string().describe('Previous scene ID'),
  bSceneId: z.string().describe('Next scene ID'),
  aCode: z.string().min(50).describe('TSX of previous scene'),
  bCode: z.string().min(50).describe('TSX of next scene'),
  aDuration: z.number().int().min(1).describe('Duration of previous scene (frames)'),
  bDuration: z.number().int().min(1).describe('Duration of next scene (frames)'),
  fps: z.number().int().min(1).max(120).optional().default(30),
  requested: z.object({
    overlapFrames: z.number().int().min(5).max(180).optional(),
    type: z.enum(['auto','crossfade','fadeThroughBlack','slide','push','zoom','whip']).optional(),
    easing: z.enum(['easeInOutCubic','easeOutQuad','easeInQuad','linear']).optional(),
    direction: z.enum(['left','right','up','down']).optional(),
  }).optional(),
});
