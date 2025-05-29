/**
 * Scene Events System for real-time updates during MCP scene generation
 * Supports SSE (Server-Sent Events) for progressive UI updates
 */

export type SceneEventType = 
  | 'scene-spec-generated'
  | 'scene-building'
  | 'scene-ready'
  | 'scene-error'
  | 'tool-selected'
  | 'clarification-needed'
  | 'code_validation'
  | 'project_cost_update';

export interface SceneEvent {
  type: SceneEventType;
  projectId: string;
  sceneId?: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface SceneSpecGeneratedEvent extends SceneEvent {
  type: 'scene-spec-generated';
  payload: {
    sceneId: string;
    sceneSpec: Record<string, unknown>;
    reasoning: string;
    toolUsed: string;
  };
}

export interface SceneBuildingEvent extends SceneEvent {
  type: 'scene-building';
  payload: {
    sceneId: string;
    stage: 'component-generation' | 'bundling' | 'uploading';
    progress?: number;
  };
}

export interface SceneReadyEvent extends SceneEvent {
  type: 'scene-ready';
  payload: {
    sceneId: string;
    bundleUrl: string;
    duration: number;
  };
}

export interface SceneErrorEvent extends SceneEvent {
  type: 'scene-error';
  payload: {
    sceneId?: string;
    error: string;
    stage: string;
    retryable: boolean;
  };
}

export interface ToolSelectedEvent extends SceneEvent {
  type: 'tool-selected';
  payload: {
    toolName: string;
    reasoning: string;
    confidence: number;
  };
}

export interface ClarificationNeededEvent extends SceneEvent {
  type: 'clarification-needed';
  payload: {
    question: string;
    options?: string[];
    ambiguityType: string;
  };
}

/**
 * Event emitter for scene events
 * TODO PHASE2: Implement with Redis/Pusher for production scalability
 */
class SceneEventEmitter {
  private listeners = new Map<string, Set<(event: SceneEvent) => void>>();
  
  constructor() {
    // Warn about in-memory limitations in production
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️ SceneEventEmitter is in-memory; use Redis/Pusher in production for multi-instance support.');
    }
  }
  
  /**
   * Subscribe to events for a specific project
   */
  subscribe(projectId: string, callback: (event: SceneEvent) => void): () => void {
    if (!this.listeners.has(projectId)) {
      this.listeners.set(projectId, new Set());
    }
    
    this.listeners.get(projectId)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const projectListeners = this.listeners.get(projectId);
      if (projectListeners) {
        projectListeners.delete(callback);
        if (projectListeners.size === 0) {
          this.listeners.delete(projectId);
        }
      }
    };
  }
  
  /**
   * Emit an event to all subscribers of a project
   */
  emit(projectId: string, type: SceneEventType, payload: Record<string, unknown>): void {
    const event: SceneEvent = {
      type,
      projectId,
      timestamp: new Date().toISOString(),
      payload,
    };
    
    const projectListeners = this.listeners.get(projectId);
    if (projectListeners) {
      projectListeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('[SceneEvents] Error in event callback:', error);
        }
      });
    }
    
    // TODO PHASE2: Also emit to external systems (Redis, Pusher, etc.)
    this.emitToExternalSystems(event);
  }
  
  private emitToExternalSystems(event: SceneEvent): void {
    // TODO PHASE2: Implement Redis/Pusher broadcasting
    // For now, just log for debugging
    console.log('[SceneEvents] Event emitted:', {
      type: event.type,
      projectId: event.projectId,
      timestamp: event.timestamp,
    });
  }
}

// Global singleton instance
export const sceneEventEmitter = new SceneEventEmitter();

/**
 * Convenience function to emit scene events
 */
export function emitSceneEvent(
  projectId: string, 
  type: SceneEventType, 
  payload: Record<string, unknown>
): void {
  sceneEventEmitter.emit(projectId, type, payload);
}

/**
 * Type-safe event emitters for specific event types
 */
export const sceneEvents = {
  sceneSpecGenerated: (projectId: string, payload: SceneSpecGeneratedEvent['payload']) =>
    emitSceneEvent(projectId, 'scene-spec-generated', payload),
    
  sceneBuilding: (projectId: string, payload: SceneBuildingEvent['payload']) =>
    emitSceneEvent(projectId, 'scene-building', payload),
    
  sceneReady: (projectId: string, payload: SceneReadyEvent['payload']) =>
    emitSceneEvent(projectId, 'scene-ready', payload),
    
  sceneError: (projectId: string, payload: SceneErrorEvent['payload']) =>
    emitSceneEvent(projectId, 'scene-error', payload),
    
  toolSelected: (projectId: string, payload: ToolSelectedEvent['payload']) =>
    emitSceneEvent(projectId, 'tool-selected', payload),
    
  clarificationNeeded: (projectId: string, payload: ClarificationNeededEvent['payload']) =>
    emitSceneEvent(projectId, 'clarification-needed', payload),
}; 