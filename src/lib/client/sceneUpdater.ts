// src/lib/client/sceneUpdater.ts
// Client-side handler for scene updates with optimistic UI

import type { StandardApiResponse, SceneOperationResponse, DeleteOperationResponse } from '~/lib/types/api/golden-rule-contracts';
import { useVideoState } from '~/stores/videoState';

/**
 * Handles scene updates with optimistic UI patterns
 * 
 * Flow:
 * 1. Optimistic update (instant UI)
 * 2. API call
 * 3. Reconciliation with server response
 */
export class SceneUpdater {
  private videoState = useVideoState.getState();

  /**
   * Handle edit scene with optimistic updates
   */
  async editSceneOptimistic(
    sceneId: string, 
    prompt: string,
    imageUrls?: string[]
  ): Promise<void> {
    // 1. Get current scene
    const currentProps = this.videoState.getCurrentProps();
    const scene = currentProps?.scenes.find(s => s.id === sceneId);
    if (!scene) return;

    // 2. Optimistic update - mark as updating
    this.videoState.updateScene(sceneId, {
      ...scene,
      _syncStatus: 'updating',
      _optimisticTimestamp: Date.now()
    });

    try {
      // 3. Call API
      const response = await api.generation.generateScene.mutate({
        projectId: currentProps.projectId,
        userMessage: prompt,
        userContext: {
          selectedSceneId: sceneId,
          imageUrls
        }
      });

      // 4. Handle response
      if (response.success) {
        this.handleSuccessResponse(response);
      } else {
        this.handleErrorResponse(response, sceneId, scene);
      }
    } catch (error) {
      // 5. Network error - revert
      this.videoState.updateScene(sceneId, {
        ...scene,
        _syncStatus: 'error',
        _errorMessage: 'Network error - changes not saved'
      });
    }
  }

  /**
   * Handle standardized API responses
   */
  private handleSuccessResponse(response: StandardApiResponse<any>): void {
    switch (response.operation) {
      case 'create':
      case 'update': {
        const data = response.data as SceneOperationResponse;
        const scene = data.scene;
        
        // Update with server data + sync status
        this.videoState.updateScene(scene.id, {
          ...scene,
          _syncStatus: 'synced',
          _lastSyncedAt: Date.now()
        });
        break;
      }

      case 'delete': {
        const data = response.data as DeleteOperationResponse;
        // Scene already deleted optimistically
        // Just update sync status of remaining scenes
        break;
      }
    }

    // Update chat with response
    if (response.metadata?.chatResponse) {
      this.videoState.updateMessage(
        response.metadata.affectedIds[0], 
        { 
          content: response.metadata.chatResponse,
          status: 'success' 
        }
      );
    }
  }

  /**
   * Handle errors by reverting optimistic updates
   */
  private handleErrorResponse(
    response: StandardApiResponse<any>, 
    sceneId: string,
    originalScene: any
  ): void {
    // Revert to original
    this.videoState.updateScene(sceneId, {
      ...originalScene,
      _syncStatus: 'error',
      _errorMessage: response.error?.message
    });

    // Show error in chat
    if (response.metadata?.chatResponse) {
      this.videoState.addSystemMessage(
        originalScene.projectId,
        response.metadata.chatResponse,
        'error'
      );
    }
  }

  /**
   * Check sync status of all scenes
   */
  getSyncStatus(): {
    synced: number;
    pending: number;
    errors: number;
  } {
    const props = this.videoState.getCurrentProps();
    const scenes = props?.scenes || [];
    
    return scenes.reduce((acc, scene) => {
      const status = (scene as any)._syncStatus || 'synced';
      if (status === 'synced') acc.synced++;
      else if (status === 'error') acc.errors++;
      else acc.pending++;
      return acc;
    }, { synced: 0, pending: 0, errors: 0 });
  }
}

// Export singleton
export const sceneUpdater = new SceneUpdater();