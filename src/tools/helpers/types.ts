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
  currentDuration?: number;
  imageUrls?: string[];
  videoUrls?: string[];
  audioUrls?: string[];
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
// ============================================================================

export interface TypographyToolInput extends BaseToolInput {
  textStyle?: 'fast' | 'typewriter' | 'cascade';
  projectFormat?: {
    format: 'landscape' | 'portrait' | 'square';
    width: number;
    height: number;
  };
  previousSceneContext?: {
    tsxCode: string;
    style?: string;
  };
}

export interface TypographyToolOutput extends BaseToolOutput {
  tsxCode: string;
  name: string;
  duration: number;
}

export interface ImageRecreatorToolInput extends BaseToolInput {
  imageUrls: string[];
  recreationType?: 'full' | 'segment';
  projectFormat?: {
    format: 'landscape' | 'portrait' | 'square';
    width: number;
    height: number;
  };
}

export interface ImageRecreatorToolOutput extends BaseToolOutput {
  tsxCode: string;
  name: string;
  duration: number;
}

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

export const typographyToolInputSchema = baseToolInputSchema.extend({
  textStyle: z.enum(['fast', 'typewriter', 'cascade']).optional(),
  projectFormat: z.object({
    format: z.enum(['landscape', 'portrait', 'square']),
    width: z.number(),
    height: z.number(),
  }).optional(),
});

export const imageRecreatorToolInputSchema = baseToolInputSchema.extend({
  imageUrls: z.array(z.string()).min(1, "At least one image URL is required"),
  recreationType: z.enum(['full', 'segment']).optional(),
  projectFormat: z.object({
    format: z.enum(['landscape', 'portrait', 'square']),
    width: z.number(),
    height: z.number(),
  }).optional(),
});

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