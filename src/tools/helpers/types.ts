import { z } from "zod";

// ============================================================================
// SHARED TOOL INTERFACES
// ============================================================================

/**
 * Base input that all tools receive
 */
export interface BaseToolInput {
  userPrompt: string;
  projectId: string;
  userId?: string;
  sessionId?: string;
}

/**
 * Base output that all tools return
 * Updated to match database field names (Sprint 41)
 */
export interface BaseToolOutput {
  success: boolean;
  tsxCode?: string;      // Changed from sceneCode
  name?: string;         // Changed from sceneName
  duration?: number;
  reasoning: string;
  chatResponse?: string;
  error?: string;
  debug?: Record<string, unknown>;
  metadata?: {
    executionTime: number;
    toolName: string;
    timestamp: string;
  };
}

// ============================================================================
// ADD TOOL TYPES
// ============================================================================

export interface AddToolInput extends BaseToolInput {
  sceneNumber?: number;
  storyboardSoFar?: any[];
  replaceWelcomeScene?: boolean;
  visionAnalysis?: any;
  imageUrls?: string[];
}

export interface AddToolOutput extends BaseToolOutput {
  layoutJson?: string;
  replacedWelcomeScene?: boolean;
}

// ============================================================================
// EDIT TOOL TYPES
// ============================================================================

export interface EditToolInput extends BaseToolInput {
  sceneId: string;
  existingCode: string;
  editType: 'creative' | 'surgical' | 'error-fix';
  imageUrls?: string[];
  visionAnalysis?: any;
  errorDetails?: string;
}

export interface EditToolOutput extends BaseToolOutput {
  originalCode?: string;
  editType?: string;
  changesApplied?: string[];
}

// ============================================================================
// DELETE TOOL TYPES
// ============================================================================

export interface DeleteToolInput extends BaseToolInput {
  sceneId: string;
  sceneName?: string;
  confirmDeletion?: boolean;
}

export interface DeleteToolOutput extends BaseToolOutput {
  deletedSceneId?: string;
  deletedSceneName?: string;
  remainingSceneCount?: number;
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
  visionAnalysis?: any;
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
  visionAnalysis?: any;
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
  visionAnalysis?: any;
}

/**
 * Creative editing input
 */
export interface CreativeEditInput {
  userPrompt: string;
  existingCode: string;
  functionName: string;
  imageUrls?: string[];
  visionAnalysis?: any;
}

/**
 * Surgical editing input
 */
export interface SurgicalEditInput {
  userPrompt: string;
  existingCode: string;
  functionName: string;
  targetElement?: string;
}

/**
 * Error fixing input
 */
export interface ErrorFixInput {
  existingCode: string;
  errorDetails: string;
  functionName: string;
  userPrompt?: string;
}

// ============================================================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================================================

export const baseToolInputSchema = z.object({
  userPrompt: z.string().describe("User's description of what they want"),
  projectId: z.string().describe("Project ID"),
  userId: z.string().optional().describe("User ID"),
  sessionId: z.string().optional().describe("Session ID"),
});

export const addToolInputSchema = baseToolInputSchema.extend({
  sceneNumber: z.number().optional().describe("Optional scene number/position"),
  storyboardSoFar: z.array(z.any()).optional().describe("Existing scenes for context"),
  replaceWelcomeScene: z.boolean().optional().describe("Whether to replace the welcome scene"),
  visionAnalysis: z.any().optional().describe("Vision analysis from image analysis"),
  imageUrls: z.array(z.string()).optional().describe("Image URLs for reference"),
});

export const editToolInputSchema = baseToolInputSchema.extend({
  sceneId: z.string().describe("ID of the scene to edit"),
  existingCode: z.string().describe("Current scene code"),
  editType: z.enum(['creative', 'surgical', 'error-fix']).describe("Type of edit to perform"),
  imageUrls: z.array(z.string()).optional().describe("Image URLs for reference"),
  visionAnalysis: z.any().optional().describe("Vision analysis from image analysis"),
  errorDetails: z.string().optional().describe("Error details for error-fix type"),
});

export const deleteToolInputSchema = baseToolInputSchema.extend({
  sceneId: z.string().describe("ID of the scene to delete"),
  sceneName: z.string().optional().describe("Name of the scene to delete"),
  confirmDeletion: z.boolean().optional().describe("Confirmation flag for deletion"),
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