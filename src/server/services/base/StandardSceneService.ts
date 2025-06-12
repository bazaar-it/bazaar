import { StandardApiResponse, SceneOperationResponse, Scene } from '@/lib/types/api/golden-rule-contracts';
import { nanoid } from 'nanoid';

/**
 * Base class for all scene-related services
 * Enforces standardized output format with exact database field names
 */
export abstract class StandardSceneService {
  /**
   * Generate a unique ID for scenes
   */
  protected generateId(): string {
    return nanoid();
  }

  /**
   * Helper to create a Scene entity with all required DB fields
   * Enforces exact database column names
   */
  protected createSceneEntity(params: {
    id?: string;
    projectId: string;
    name: string;
    tsxCode: string;      // MUST use exact DB field name
    duration: number;     // In frames
    order: number;
    layoutJson?: string | null;
    props?: Record<string, any> | null;
  }): Scene {
    return {
      // Core fields
      id: params.id || this.generateId(),
      projectId: params.projectId,
      order: params.order,
      name: params.name,
      tsxCode: params.tsxCode,  // Enforced by TypeScript
      duration: params.duration,
      props: params.props || null,
      layoutJson: params.layoutJson || null,
      
      // Publishing fields (always null for new scenes)
      publishedUrl: null,
      publishedHash: null,
      publishedAt: null,
      
      // Timestamps
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Helper to create standardized response for scene creation
   */
  protected createSceneResponse(
    scene: Scene,
    reasoning: string,
    chatResponse?: string,
    debug?: any
  ): StandardApiResponse<SceneOperationResponse> {
    return {
      success: true,
      operation: 'create',
      data: { scene },
      metadata: {
        timestamp: Date.now(),
        affectedIds: [scene.id],
        reasoning,
        chatResponse
      },
      debug
    };
  }

  /**
   * Helper to create standardized response for scene updates
   */
  protected updateSceneResponse(
    scene: Scene,
    changes: string[],
    preserved: string[],
    reasoning: string,
    chatResponse?: string,
    debug?: any
  ): StandardApiResponse<SceneOperationResponse> {
    return {
      success: true,
      operation: 'update',
      data: { 
        scene,
        changes,
        preserved
      },
      metadata: {
        timestamp: Date.now(),
        affectedIds: [scene.id],
        reasoning,
        chatResponse
      },
      debug
    };
  }

  /**
   * Helper to create error response
   */
  protected errorResponse(
    error: Error,
    operation: 'create' | 'update' = 'create'
  ): StandardApiResponse<SceneOperationResponse> {
    return {
      success: false,
      operation,
      data: { 
        scene: {} as Scene  // Empty scene for error case
      },
      metadata: {
        timestamp: Date.now(),
        affectedIds: [],
        reasoning: `Error: ${error.message}`
      },
      debug: {
        error: error.message,
        stack: error.stack
      }
    };
  }

  /**
   * Validate that a scene has all required fields
   * Helps catch missing fields during development
   */
  protected validateScene(scene: Partial<Scene>): scene is Scene {
    const requiredFields: (keyof Scene)[] = [
      'id', 'projectId', 'order', 'name', 'tsxCode', 'duration',
      'createdAt', 'updatedAt'
    ];
    
    for (const field of requiredFields) {
      if (scene[field] === undefined) {
        throw new Error(`Scene missing required field: ${field}`);
      }
    }
    
    // Validate field names are correct
    if ('code' in scene) {
      throw new Error('Scene contains "code" field - use "tsxCode" instead');
    }
    if ('sceneName' in scene) {
      throw new Error('Scene contains "sceneName" field - use "name" instead');
    }
    
    return true;
  }

  /**
   * Convert layout object to JSON string if needed
   */
  protected stringifyLayout(layout: any): string | null {
    if (!layout) return null;
    if (typeof layout === 'string') return layout;
    return JSON.stringify(layout);
  }

  /**
   * Abstract method that all scene services must implement
   * This ensures consistent return type across all services
   */
  abstract generateScene(
    input: any
  ): Promise<StandardApiResponse<SceneOperationResponse>>;
}

/**
 * Base class for scene editing services
 */
export abstract class StandardSceneEditService extends StandardSceneService {
  /**
   * Abstract method for scene editing services
   */
  abstract editScene(
    input: any
  ): Promise<StandardApiResponse<SceneOperationResponse>>;

  /**
   * Helper to update existing scene entity
   */
  protected updateSceneEntity(
    existingScene: Scene,
    updates: {
      name?: string;
      tsxCode?: string;
      duration?: number;
      layoutJson?: string | null;
      props?: Record<string, any> | null;
    }
  ): Scene {
    return {
      ...existingScene,
      ...updates,
      updatedAt: new Date().toISOString()
    };
  }
}