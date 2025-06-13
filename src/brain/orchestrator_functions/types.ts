// Types shared across orchestrator functions

export interface OrchestrationInput {
  prompt: string;
  projectId: string;
  userId: string;
  userContext?: Record<string, unknown>;
  storyboardSoFar?: any[];
  chatHistory?: Array<{role: string, content: string}>;
  onProgress?: (stage: string, status: string) => void;
}

export interface OrchestrationOutput {
  success: boolean;
  result?: any;
  toolUsed?: string;
  reasoning?: string;
  error?: string;
  chatResponse?: string;
  isAskSpecify?: boolean;
  debug?: {
    prompt?: { system: string; user: string };
    response?: string;
    parsed?: any;
  };
}

export interface ToolSelectionResult {
  success: boolean;
  toolName?: string;
  targetSceneId?: string;
  editComplexity?: 'surgical' | 'creative' | 'structural';
  reasoning?: string;
  error?: string;
  toolInput?: Record<string, unknown>;
  workflow?: Array<{
    toolName: string;
    context: string;
    dependencies?: string[];
    targetSceneId?: string;
  }>;
  needsClarification?: boolean;
  clarificationQuestion?: string;
  userFeedback?: string;
  requestedDurationSeconds?: number;
}

export interface ContextPacket {
  userPreferences: Record<string, string>;
  sceneHistory: Array<{id: string, name: string, type: string}>;
  imageAnalyses: Array<{
    id: string;
    imageUrls: string[];
    palette: string[];
    typography: string;
    mood: string;
    layoutJson?: any;
    processingTimeMs: number;
    timestamp: string;
  }>;
  conversationContext: string;
  last5Messages?: Array<{role: string, content: string}>;
  sceneList?: Array<{id: string, name: string}>;
  pendingImageIds?: string[];
  imageContext?: {
    conversationImages: Array<{
      position: number;
      userPrompt: string;
      imageCount: number;
      imageUrls: string[];
    }>;
    imagePatterns: string[];
  };
}

export interface DatabaseOperationContext {
  operationType: 'create' | 'edit' | 'delete';
  toolName: string;
  editComplexity?: 'surgical' | 'creative' | 'structural';
  projectId: string;
  userId: string;
  userPrompt: string;
  reasoning?: string;
}

export interface ModelUsageData {
  model: string;
  temperature: number;
  generationTimeMs: number;
  sessionId: string;
}

export interface SceneData {
  sceneId?: string;
  name: string;          // Changed from sceneName
  tsxCode: string;       // Changed from sceneCode
  duration: number;
  layoutJson?: any;
  reasoning?: string;
  changes?: string[];
  preserved?: string[];
  chatResponse?: string;
} 