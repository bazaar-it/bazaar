// src/lib/types/api/golden-rule-contracts.ts

/**
 * Golden Rule Compliant Interface Design
 * Zero transformations, normalized state, predictable responses
 */

// ============= STANDARDIZED API RESPONSE (Golden Rule #7) =============

/**
 * Every API response follows this exact format - no exceptions
 */
export interface StandardApiResponse<T = any> {
  success: boolean;
  operation: 'create' | 'update' | 'delete' | 'analyze';
  data: T;
  metadata: {
    timestamp: number;
    affectedIds: string[];
    reasoning?: string;
    chatResponse?: string;
  };
  debug?: any;
}

// ============= NORMALIZED ENTITIES (Golden Rule #4) =============

/**
 * Scene entity - flat structure matching database EXACTLY
 * No nested objects, no transformations needed
 */
export interface Scene {
  // Core fields (matching database column names exactly)
  id: string;
  projectId: string;
  name: string;
  tsxCode: string;        // Exact database column name
  duration: number;       // Always in frames
  order: number;
  
  // Optional fields
  layoutJson?: string | null;
  props?: Record<string, any> | null;
  
  // Publishing fields
  publishedUrl?: string | null;
  publishedHash?: string | null;
  publishedAt?: string | null;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

/**
 * Project entity - normalized, no nested scenes
 */
export interface Project {
  id: string;
  userId: string;
  title: string;
  backgroundColor?: string;
  totalDuration: number;  // Sum of all scene durations
  createdAt: string;
  updatedAt: string;
}

/**
 * Chat message entity
 */
export interface ChatMessage {
  id: string;
  projectId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  imageUrls?: string[];
  timestamp: string;
}

// ============= STANDARDIZED OPERATION RESPONSES =============

/**
 * Scene operation response - used for create/update
 */
export interface SceneOperationResponse {
  scene: Scene;
  changes?: string[];     // For updates only
  preserved?: string[];   // For updates only
}

/**
 * Delete operation response
 */
export interface DeleteOperationResponse {
  deletedId: string;
  deletedEntity: Scene;
}

/**
 * Analysis operation response
 */
export interface AnalysisOperationResponse {
  analysis: any;
  targetIds?: string[];   // IDs of entities this analysis relates to
}

// ============= NORMALIZED STORE STRUCTURE (Golden Rule #4) =============

/**
 * Normalized video state structure
 */
export interface NormalizedVideoState {
  // Entities (normalized)
  projects: Record<string, Project>;
  scenes: Record<string, Scene>;
  messages: Record<string, ChatMessage>;
  
  // Relationships
  projectScenes: Record<string, string[]>;      // projectId -> sceneIds[]
  projectMessages: Record<string, string[]>;    // projectId -> messageIds[]
  
  // UI State
  currentProjectId: string | null;
  selectedSceneId: string | null;
  isLoading: boolean;
  
  // Single update method (Golden Rule #5)
  handleApiResponse: <T>(response: StandardApiResponse<T>) => void;
  
  // Selectors (Golden Rule #6)
  getCurrentProject: () => Project | null;
  getProjectScenes: (projectId: string) => Scene[];
  getProjectMessages: (projectId: string) => ChatMessage[];
  getSceneById: (sceneId: string) => Scene | null;
}

// ============= SERVICE CONTRACTS (ALL RETURN SAME FORMAT) =============

/**
 * Every service method returns StandardApiResponse
 * No special cases, no exceptions
 */
export interface UnifiedServiceContract {
  // Simplified 3-tool architecture
  addScene: (params: any) => Promise<StandardApiResponse<SceneOperationResponse>>;
  editScene: (params: any) => Promise<StandardApiResponse<SceneOperationResponse>>;
  deleteScene: (params: any) => Promise<StandardApiResponse<DeleteOperationResponse>>;
  
  // Analysis operations
  analyzeImage: (params: any) => Promise<StandardApiResponse<AnalysisOperationResponse>>;
}

// ============= IMPLEMENTATION EXAMPLE =============

/**
 * Example: How services return data
 */
const serviceExample = {
  async addScene(input: any): Promise<StandardApiResponse<SceneOperationResponse>> {
    // Generate scene...
    const scene: Scene = {
      id: 'uuid',
      projectId: input.projectId,
      name: 'Scene1_abc',
      tsxCode: generatedCode,  // Using exact DB field name
      duration: 150,
      order: 0,
      layoutJson: null,
      props: null,
      publishedUrl: null,
      publishedHash: null,
      publishedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    return {
      success: true,
      operation: 'create',
      data: { scene },
      metadata: {
        timestamp: Date.now(),
        affectedIds: [scene.id],
        reasoning: 'Created motion graphics scene',
        chatResponse: 'Scene created successfully!'
      }
    };
  }
};

/**
 * Example: How VideoState handles ALL responses
 */
const videoStateExample = {
  handleApiResponse<T>(response: StandardApiResponse<T>) {
    if (!response.success) return;
    
    switch (response.operation) {
      case 'create':
      case 'update': {
        const data = response.data as SceneOperationResponse;
        // Update normalized store
        this.scenes[data.scene.id] = data.scene;
        // Update relationships if needed
        if (response.operation === 'create') {
          this.projectScenes[data.scene.projectId].push(data.scene.id);
        }
        break;
      }
      case 'delete': {
        const data = response.data as DeleteOperationResponse;
        // Remove from normalized store
        delete this.scenes[data.deletedId];
        // Update relationships
        const projectId = data.deletedEntity.projectId;
        this.projectScenes[projectId] = this.projectScenes[projectId].filter(
          id => id !== data.deletedId
        );
        break;
      }
      case 'analyze': {
        // Handle analysis results
        break;
      }
    }
  }
};

/**
 * Benefits:
 * 1. Zero transformations - data flows unchanged through all layers
 * 2. Normalized store - efficient updates, no nested mutations
 * 3. Single update path - one method handles ALL API responses
 * 4. Predictable responses - same format for everything
 * 5. Type safety - TypeScript knows exactly what to expect
 * 6. No refetching - trust the state completely
 */