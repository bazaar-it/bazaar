// src/stores/videoState.normalized.ts
// Normalized state management following golden rules

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  StandardApiResponse, 
  SceneOperationResponse, 
  DeleteOperationResponse,
  Scene
} from '~/lib/types/api/golden-rule-contracts';
import type { TimelineUpdate } from '~/lib/types/api/brain-contracts';
import { calculateTimelineState } from '~/lib/utils/timeline';

// ============= NORMALIZED STATE STRUCTURE =============

interface NormalizedVideoState {
  // Entities (flat, normalized)
  scenes: Record<string, Scene & SyncStatus>;
  messages: Record<string, ChatMessage>;
  projects: Record<string, Project>;
  
  // Relationships (just IDs)
  projectScenes: Record<string, string[]>;
  projectMessages: Record<string, string[]>;
  
  // UI State
  currentProjectId: string | null;
  selectedSceneId: string | null;
  isLoading: boolean;
  
  // Sync tracking
  syncQueue: string[]; // Scene IDs pending sync
  
  // ============= SINGLE UPDATE METHOD (Golden Rule) =============
  handleApiResponse: <T>(response: StandardApiResponse<T>) => void;
  
  // ============= OPTIMISTIC UPDATES =============
  updateSceneOptimistic: (sceneId: string, updates: Partial<Scene>) => void;
  addSceneOptimistic: (projectId: string, scene: Scene) => void;
  deleteSceneOptimistic: (sceneId: string) => void;
  
  // ============= RECONCILIATION =============
  reconcileScene: (sceneId: string, serverData: Scene) => void;
  revertScene: (sceneId: string) => void;
  
  // ============= SELECTORS =============
  getProjectScenes: (projectId: string) => Scene[];
  getScene: (sceneId: string) => (Scene & SyncStatus) | null;
  getTimeline: (projectId: string) => TimelineState;
  getSyncStatus: () => SyncStatusSummary;
  
  // ============= MESSAGES =============
  addMessage: (projectId: string, message: ChatMessage) => void;
  updateMessage: (messageId: string, updates: Partial<ChatMessage>) => void;
  
  // ============= PROJECT MANAGEMENT =============
  setCurrentProject: (projectId: string) => void;
  selectScene: (sceneId: string | null) => void;
  
  // ============= TIMELINE UPDATES =============
  applyTimelineUpdates: (updates: TimelineUpdate[]) => void;
}

// ============= TYPES =============

interface SyncStatus {
  _syncStatus: 'local' | 'syncing' | 'synced' | 'error';
  _lastSyncedAt?: number;
  _errorMessage?: string;
  _optimisticTimestamp?: number;
  _originalData?: Scene; // For reverting
}

interface ChatMessage {
  id: string;
  projectId: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: number;
  status?: 'pending' | 'success' | 'error';
  imageUrls?: string[];
}

interface Project {
  id: string;
  title: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface TimelineState {
  scenes: Array<{
    id: string;
    start: number;
    end: number;
    duration: number;
  }>;
  totalDuration: number;
}

interface SyncStatusSummary {
  synced: number;
  pending: number;
  errors: number;
}

// ============= STORE IMPLEMENTATION =============

export const useVideoState = create<NormalizedVideoState>(
  persist(
    (set, get) => ({
      // Initial state
      scenes: {},
      messages: {},
      projects: {},
      projectScenes: {},
      projectMessages: {},
      currentProjectId: null,
      selectedSceneId: null,
      isLoading: false,
      syncQueue: [],
      
      // ============= GOLDEN RULE: SINGLE UPDATE METHOD =============
      handleApiResponse: <T>(response: StandardApiResponse<T>) => {
        if (!response.success) {
          console.error('[VideoState] API error:', response.error);
          return;
        }
        
        set((state) => {
          const newState = { ...state };
          
          switch (response.operation) {
            case 'create':
            case 'update': {
              const data = response.data as SceneOperationResponse;
              const scene = data.scene;
              
              // Update scene entity
              newState.scenes[scene.id] = {
                ...scene,
                _syncStatus: 'synced',
                _lastSyncedAt: Date.now()
              };
              
              // Update relationships for create
              if (response.operation === 'create' && scene.projectId) {
                if (!newState.projectScenes[scene.projectId]) {
                  newState.projectScenes[scene.projectId] = [];
                }
                if (!newState.projectScenes[scene.projectId].includes(scene.id)) {
                  newState.projectScenes[scene.projectId].push(scene.id);
                }
              }
              
              // Remove from sync queue
              newState.syncQueue = newState.syncQueue.filter(id => id !== scene.id);
              break;
            }
            
            case 'delete': {
              const data = response.data as DeleteOperationResponse;
              const deletedId = data.deletedScene.id;
              const projectId = data.deletedScene.projectId;
              
              // Remove entity
              delete newState.scenes[deletedId];
              
              // Update relationships
              if (projectId && newState.projectScenes[projectId]) {
                newState.projectScenes[projectId] = newState.projectScenes[projectId]
                  .filter(id => id !== deletedId);
              }
              
              // Remove from sync queue
              newState.syncQueue = newState.syncQueue.filter(id => id !== deletedId);
              break;
            }
          }
          
          return newState;
        });
      },
      
      // ============= OPTIMISTIC UPDATES =============
      updateSceneOptimistic: (sceneId, updates) => {
        set((state) => {
          const currentScene = state.scenes[sceneId];
          if (!currentScene) return state;
          
          // Store original for potential revert
          const originalData = currentScene._originalData || 
            (({ _syncStatus, _lastSyncedAt, _errorMessage, _optimisticTimestamp, _originalData, ...scene }) => scene)(currentScene);
          
          return {
            ...state,
            scenes: {
              ...state.scenes,
              [sceneId]: {
                ...currentScene,
                ...updates,
                _syncStatus: 'syncing' as const,
                _optimisticTimestamp: Date.now(),
                _originalData: originalData as Scene
              }
            },
            syncQueue: [...state.syncQueue, sceneId].filter((id, i, arr) => arr.indexOf(id) === i)
          };
        });
      },
      
      addSceneOptimistic: (projectId, scene) => {
        set((state) => ({
          ...state,
          scenes: {
            ...state.scenes,
            [scene.id]: {
              ...scene,
              _syncStatus: 'syncing' as const,
              _optimisticTimestamp: Date.now()
            }
          },
          projectScenes: {
            ...state.projectScenes,
            [projectId]: [...(state.projectScenes[projectId] || []), scene.id]
          },
          syncQueue: [...state.syncQueue, scene.id]
        }));
      },
      
      deleteSceneOptimistic: (sceneId) => {
        set((state) => {
          const scene = state.scenes[sceneId];
          if (!scene) return state;
          
          const projectId = scene.projectId;
          
          return {
            ...state,
            scenes: {
              ...state.scenes,
              [sceneId]: {
                ...scene,
                _syncStatus: 'syncing' as const,
                _optimisticTimestamp: Date.now()
              }
            },
            projectScenes: {
              ...state.projectScenes,
              [projectId]: state.projectScenes[projectId]?.filter(id => id !== sceneId) || []
            }
          };
        });
      },
      
      // ============= RECONCILIATION =============
      reconcileScene: (sceneId, serverData) => {
        set((state) => ({
          ...state,
          scenes: {
            ...state.scenes,
            [sceneId]: {
              ...serverData,
              _syncStatus: 'synced' as const,
              _lastSyncedAt: Date.now()
            }
          },
          syncQueue: state.syncQueue.filter(id => id !== sceneId)
        }));
      },
      
      revertScene: (sceneId) => {
        set((state) => {
          const scene = state.scenes[sceneId];
          if (!scene || !scene._originalData) return state;
          
          return {
            ...state,
            scenes: {
              ...state.scenes,
              [sceneId]: {
                ...scene._originalData,
                _syncStatus: 'error' as const,
                _errorMessage: 'Failed to save changes'
              }
            },
            syncQueue: state.syncQueue.filter(id => id !== sceneId)
          };
        });
      },
      
      // ============= SELECTORS =============
      getProjectScenes: (projectId) => {
        const state = get();
        const sceneIds = state.projectScenes[projectId] || [];
        return sceneIds
          .map(id => state.scenes[id])
          .filter(Boolean)
          .map(({ _syncStatus, _lastSyncedAt, _errorMessage, _optimisticTimestamp, _originalData, ...scene }) => scene as Scene)
          .sort((a, b) => a.order - b.order);
      },
      
      getScene: (sceneId) => {
        return get().scenes[sceneId] || null;
      },
      
      getTimeline: (projectId) => {
        const scenes = get().getProjectScenes(projectId);
        return calculateTimelineState(scenes);
      },
      
      getSyncStatus: () => {
        const scenes = Object.values(get().scenes);
        return scenes.reduce((acc, scene) => {
          if (scene._syncStatus === 'synced') acc.synced++;
          else if (scene._syncStatus === 'error') acc.errors++;
          else acc.pending++;
          return acc;
        }, { synced: 0, pending: 0, errors: 0 });
      },
      
      // ============= MESSAGES =============
      addMessage: (projectId, message) => {
        set((state) => ({
          ...state,
          messages: {
            ...state.messages,
            [message.id]: message
          },
          projectMessages: {
            ...state.projectMessages,
            [projectId]: [...(state.projectMessages[projectId] || []), message.id]
          }
        }));
      },
      
      updateMessage: (messageId, updates) => {
        set((state) => ({
          ...state,
          messages: {
            ...state.messages,
            [messageId]: {
              ...state.messages[messageId],
              ...updates
            }
          }
        }));
      },
      
      // ============= PROJECT MANAGEMENT =============
      setCurrentProject: (projectId) => {
        set({ currentProjectId: projectId });
      },
      
      selectScene: (sceneId) => {
        set({ selectedSceneId: sceneId });
      },
      
      // ============= TIMELINE UPDATES =============
      applyTimelineUpdates: (updates) => {
        set((state) => {
          const newScenes = { ...state.scenes };
          
          for (const update of updates) {
            if (newScenes[update.sceneId]) {
              // Note: We don't store start/end in the scene entity
              // These are calculated on-demand by selectors
              newScenes[update.sceneId] = {
                ...newScenes[update.sceneId],
                duration: update.duration
              };
            }
          }
          
          return { ...state, scenes: newScenes };
        });
      }
    }),
    {
      name: 'video-state',
      // Only persist non-UI state
      partialize: (state) => ({
        scenes: state.scenes,
        messages: state.messages,
        projects: state.projects,
        projectScenes: state.projectScenes,
        projectMessages: state.projectMessages
      })
    }
  )
);