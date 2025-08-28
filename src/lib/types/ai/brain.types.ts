/**
 * Brain/AI Types - Consolidated
 * Single source of truth for all AI/orchestration related types
 * 
 * IMPORTANT: We use simple, flat architecture - no complexity types
 * Field names MUST match database: tsxCode (not code), name (not sceneName)
 */

// ============================================================================
// TOOL NAMES - Original 4 tools plus 3 new multi-scene tools
// ============================================================================

export type ToolName = 'addScene' | 'editScene' | 'deleteScene' | 'trimScene' | 'imageRecreatorScene' | 'addAudio' | 'websiteToVideo'; // | 'scenePlanner'; [DISABLED]

// ============================================================================
// TOOL TO OPERATION MAPPING - Single source of truth
// ============================================================================

export const TOOL_OPERATION_MAP = {
  addScene: 'scene.create',
  editScene: 'scene.update',
  trimScene: 'scene.update',
  deleteScene: 'scene.delete',
  imageRecreatorScene: 'scene.create',
  addAudio: 'audio.add',
  websiteToVideo: 'scene.create',
  // scenePlanner: 'multi-scene.create' [DISABLED]
} as const;

export type ToolOperationType = typeof TOOL_OPERATION_MAP[ToolName];

// ============================================================================
// BRAIN DECISION - What the orchestrator returns
// ============================================================================

export interface BrainDecision {
  success: boolean;
  
  // Tool selection
  toolName?: ToolName;
  
  // Context for the selected tool
  toolContext?: {
    userPrompt: string;
    targetSceneId?: string;
    targetDuration?: number; // For trim operations
    requestedDurationFrames?: number; // Explicit duration from user prompt (e.g. "5 seconds" = 150)
    referencedSceneIds?: string[]; // For cross-scene references
    websiteUrl?: string; // For websiteToVideo tool
    imageUrls?: string[];
    videoUrls?: string[];
    audioUrls?: string[];
    assetUrls?: string[]; // All persistent project assets
    errorDetails?: string;
    modelOverride?: string; // Optional model ID for overriding default model
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
    templateContext?: {  // Template examples for better generation
      examples: Array<{
        id: string;
        name: string;
        code: string;
        style: string;
        description: string;
      }>;
    };
  };
  
  // Brain's reasoning
  reasoning?: string;
  
  // Chat response to show user
  chatResponse?: string;
  
  // Error if decision failed
  error?: string;
  
  // Clarification needed
  needsClarification?: boolean;
  clarificationQuestion?: string;
}

// ============================================================================
// ORCHESTRATION TYPES
// ============================================================================

export interface OrchestrationInput {
  prompt: string;
  projectId: string;
  userId: string;
  userContext?: Record<string, unknown> & {
    modelOverride?: string; // Optional model override for this request
    useGitHub?: boolean; // Explicit GitHub component search mode
  };
  storyboardSoFar?: Array<{
    id: string;
    name: string;
    duration: number;
    order: number;
    tsxCode: string;
  }>;
  chatHistory?: Array<{role: string, content: string}>;
  onProgress?: (stage: string, status: string) => void;
}

export interface OrchestrationOutput {
  success: boolean;
  result?: {
    toolName: ToolName;
    toolContext: BrainDecision['toolContext'];
  };
  reasoning?: string;
  error?: string;
  chatResponse?: string;
  needsClarification?: boolean;
  toolUsed?: ToolName;
}

// ============================================================================
// CONTEXT PACKET - What context builder creates
// ============================================================================

export interface ContextPacket {
  // Real scene history with full TSX code for cross-scene operations
  sceneHistory: Array<{
    id: string;
    name: string;
    tsxCode: string;  // CRITICAL: Full code for cross-scene references
    order: number;
  }>;
  
  // Recent conversation context
  conversationContext: string;
  recentMessages: Array<{
    role: string;
    content: string;
  }>;
  
  // Media context from uploads (images and videos)
  imageContext: {
    currentImages?: string[];
    currentVideos?: string[];
    recentImagesFromChat?: Array<{
      position: number;
      userPrompt: string;
      imageUrls: string[];
    }>;
    recentVideosFromChat?: Array<{
      position: number;
      userPrompt: string;
      videoUrls: string[];
    }>;
  };
  
  // Web analysis context from URL detection
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
  
  // Scene list for quick reference
  sceneList: Array<{
    id: string;
    name: string;
    order: number;
  }>;
  
  // Persistent asset context from project memory
  assetContext?: {
    allAssets: Array<{
      url: string;
      type: string;
      originalName: string;
    }>;
    logos: string[];  // Quick access to logo URLs
    assetUrls: string[];  // All asset URLs for prompt enforcement
  };
  
  // Template context for improved generation (when no previous scenes exist)
  templateContext?: {
    examples: Array<{
      id: string;
      name: string;
      description: string;
      keywords: string[];
      style: string;
      reasoning: string;
      code: string;        // Full template code
      codePreview: string;  // Short preview for logging
    }>;
    message: string;
    matchDetails: string;
  };
}

// ============================================================================
// TOOL SELECTION RESULT - Internal use by intent analyzer
// ============================================================================

export interface ToolSelectionResult {
  success: boolean;
  toolName?: ToolName;
  targetSceneId?: string;
  targetDuration?: number; // For trim operations - exact frame count
  referencedSceneIds?: string[]; // For cross-scene style/color matching
  websiteUrl?: string; // For websiteToVideo tool
  reasoning?: string;
  error?: string;
  needsClarification?: boolean;
  clarificationQuestion?: string;
  userFeedback?: string;
  requestedDurationSeconds?: number;
  workflow?: Array<any>;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isValidToolName(value: string): value is ToolName {
  return ['addScene', 'editScene', 'deleteScene', 'trimScene', 'typographyScene', 'imageRecreatorScene', 'addAudio', 'websiteToVideo'].includes(value); // , 'scenePlanner' [DISABLED]
}