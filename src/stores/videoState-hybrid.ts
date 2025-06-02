//src/stores/videoState-hybrid.ts
"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { applyPatch } from "fast-json-patch";
import type { Operation } from "fast-json-patch";
import type { InputProps } from "../types/input-props";

// Define chat message types
export interface ChatMessage {
  id: string;
  message: string;
  isUser: boolean;
  timestamp: number;
  status?: "pending" | "error" | "success" | "building" | "tool_calling";
  kind?: "text" | "error" | "status" | "tool_result";
  jobId?: string | null;
  toolName?: string;
  toolStartTime?: number;
  executionTimeSeconds?: number | null;
  imageUrls?: string[]; // 🚨 HYBRID PERSISTENCE: Support for uploaded images
}

// Define message update parameters for streaming support
export interface MessageUpdates {
  content?: string;     // For full content replacement
  delta?: string;      // For streaming content chunks to be appended
  status?: ChatMessage['status'];
  kind?: ChatMessage['kind'];
  jobId?: string | null;
  toolName?: string;
  toolStartTime?: number;
  executionTimeSeconds?: number | null;
}

interface ProjectState {
  props: InputProps;
  chatHistory: ChatMessage[];
  dbMessagesLoaded: boolean;
  activeStreamingMessageId?: string | null;
  refreshToken?: string;
}

interface VideoState {
  currentProjectId: string | null;
  projects: Record<string, ProjectState>;
  refreshTokens: Record<string, number>;
  
  globalRefreshCounter: number;
  selectedScenes: Record<string, string | null>;
  
  // 🚨 HYBRID PERSISTENCE: Track sync status
  lastSyncTime: number;
  pendingDbSync: Record<string, boolean>;
  
  // Actions
  setProject: (projectId: string, initialProps: InputProps) => void;
  replace: (projectId: string, newProps: InputProps) => void;
  getCurrentProps: () => InputProps | null;
  updateAndRefresh: (projectId: string, updater: (props: InputProps) => InputProps) => void;
  
  // Chat management with persistence
  addUserMessage: (projectId: string, content: string, imageUrls?: string[]) => void;
  addAssistantMessage: (projectId: string, messageId: string, content: string) => void;
  updateMessage: (projectId: string, messageId: string, updates: MessageUpdates) => void;
  getProjectChatHistory: (projectId: string) => ChatMessage[];
  
  // Database sync methods
  markForSync: (projectId: string) => void;
  syncToDatabase: (projectId: string) => Promise<void>;
  loadFromDatabase: (projectId: string) => Promise<void>;
  
  // Other methods
  getChatHistory: () => ChatMessage[];
  applyPatch: (projectId: string, patch: Operation[]) => void;
  addMessage: (projectId: string, message: string, isUser: boolean) => void;
  syncDbMessages: (projectId: string, dbMessages: any[]) => void;
  clearOptimisticMessages: (projectId: string) => void;
  clearProject: (projectId: string) => void;
  forceRefresh: (projectId: string) => void;
  addScene: (projectId: string, scene: any) => void;
  updateScene: (projectId: string, sceneId: string, updatedScene: any) => void;
  selectScene: (projectId: string, sceneId: string | null) => void;
  getSelectedScene: (projectId: string) => InputProps['scenes'][number] | null;
}

export const useVideoState = create<VideoState>()(
  persist(
    (set, get) => ({
      projects: {},
      currentProjectId: null,
      refreshTokens: {},
      selectedScenes: {},
      globalRefreshCounter: 0,
      lastSyncTime: 0,
      pendingDbSync: {},

      getCurrentProps: () => {
        const { currentProjectId, projects } = get();
        if (!currentProjectId || !projects[currentProjectId]) return null;
        return projects[currentProjectId].props || null;
      },

      getProjectChatHistory: (projectId: string) => {
        const project = get().projects[projectId];
        return project?.chatHistory || [];
      },

      setProject: (projectId: string, initialProps: InputProps) =>
        set((state) => {
          return {
            ...state,
            currentProjectId: projectId,
            projects: {
              ...state.projects,
              [projectId]: {
                props: initialProps,
                chatHistory: state.projects[projectId]?.chatHistory || [],
                dbMessagesLoaded: state.projects[projectId]?.dbMessagesLoaded || false,
              },
            },
          };
        }),

      replace: (projectId: string, newProps: InputProps) =>
        set((state) => {
          const existingProject = state.projects[projectId];
          if (!existingProject) return state;

          return {
            ...state,
            projects: {
              ...state.projects,
              [projectId]: {
                ...existingProject,
                props: newProps,
              },
            },
            refreshTokens: {
              ...state.refreshTokens,
              [projectId]: (state.refreshTokens[projectId] || 0) + 1,
            },
            globalRefreshCounter: state.globalRefreshCounter + 1,
          };
        }),

      updateAndRefresh: (projectId: string, updater: (props: InputProps) => InputProps) =>
        set((state) => {
          const project = state.projects[projectId];
          if (!project) return state;

          const newProps = updater(project.props);
          return {
            ...state,
            projects: {
              ...state.projects,
              [projectId]: {
                ...project,
                props: newProps,
              },
            },
            refreshTokens: {
              ...state.refreshTokens,
              [projectId]: (state.refreshTokens[projectId] || 0) + 1,
            },
            globalRefreshCounter: state.globalRefreshCounter + 1,
          };
        }),

      // 🚨 HYBRID PERSISTENCE: Enhanced addUserMessage
      addUserMessage: (projectId: string, content: string, imageUrls?: string[]) =>
        set((state) => {
          const project = state.projects[projectId];
          if (!project) return state;

          const newMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            message: content,
            isUser: true,
            timestamp: Date.now(),
            status: 'success',
            imageUrls: imageUrls // 🚨 PERSIST IMAGES with message
          };

          const updatedState = {
            ...state,
            projects: {
              ...state.projects,
              [projectId]: {
                ...project,
                chatHistory: [...project.chatHistory, newMessage]
              }
            },
            pendingDbSync: {
              ...state.pendingDbSync,
              [projectId]: true // Mark for database sync
            }
          };

          // Auto-sync to database in background
          setTimeout(() => {
            get().syncToDatabase(projectId).catch(console.error);
          }, 100);

          return updatedState;
        }),

      addAssistantMessage: (projectId: string, messageId: string, content: string) =>
        set((state) => {
          const project = state.projects[projectId];
          if (!project) return state;

          const newMessage: ChatMessage = {
            id: messageId,
            message: content,
            isUser: false,
            timestamp: Date.now(),
            status: 'pending'
          };

          return {
            ...state,
            projects: {
              ...state.projects,
              [projectId]: {
                ...project,
                chatHistory: [...project.chatHistory, newMessage]
              }
            }
          };
        }),

      updateMessage: (projectId: string, messageId: string, updates: MessageUpdates) =>
        set((state) => {
          const project = state.projects[projectId];
          if (!project) return state;

          const updatedChatHistory = project.chatHistory.map(msg => {
            if (msg.id === messageId) {
              return {
                ...msg,
                message: updates.content !== undefined ? updates.content : 
                        updates.delta ? msg.message + updates.delta : msg.message,
                status: updates.status || msg.status,
                kind: updates.kind || msg.kind,
                jobId: updates.jobId !== undefined ? updates.jobId : msg.jobId,
                toolName: updates.toolName || msg.toolName,
                toolStartTime: updates.toolStartTime || msg.toolStartTime,
                executionTimeSeconds: updates.executionTimeSeconds !== undefined ? 
                                    updates.executionTimeSeconds : msg.executionTimeSeconds,
              };
            }
            return msg;
          });

          return {
            ...state,
            projects: {
              ...state.projects,
              [projectId]: {
                ...project,
                chatHistory: updatedChatHistory
              }
            }
          };
        }),

      // 🚨 HYBRID PERSISTENCE: Database sync methods
      markForSync: (projectId: string) =>
        set((state) => ({
          ...state,
          pendingDbSync: {
            ...state.pendingDbSync,
            [projectId]: true
          }
        })),

      syncToDatabase: async (projectId: string) => {
        const project = get().projects[projectId];
        if (!project) return;

        try {
          // Here you would implement actual database sync
          // For now, just mark as synced
          set((state) => ({
            ...state,
            pendingDbSync: {
              ...state.pendingDbSync,
              [projectId]: false
            },
            lastSyncTime: Date.now()
          }));
        } catch (error) {
          console.error('Error syncing to database:', error);
        }
      },

      loadFromDatabase: async (projectId: string) => {
        try {
          // Here you would implement database loading
          // This is a placeholder for the actual implementation
          console.log('Loading from database for project:', projectId);
        } catch (error) {
          console.error('Error loading from database:', error);
        }
      },

      // Legacy methods implementation (simplified)
      getChatHistory: () => {
        const { currentProjectId } = get();
        if (!currentProjectId) return [];
        return get().getProjectChatHistory(currentProjectId);
      },

      applyPatch: (projectId: string, patch: Operation[]) => {
        // Simplified patch application
        set((state) => {
          const project = state.projects[projectId];
          if (!project) return state;

          try {
            const newProps = applyPatch(project.props, patch).newDocument;
            return {
              ...state,
              projects: {
                ...state.projects,
                [projectId]: {
                  ...project,
                  props: newProps
                }
              }
            };
          } catch (error) {
            console.error('Failed to apply patch:', error);
            return state;
          }
        });
      },

      addMessage: (projectId: string, message: string, isUser: boolean) => {
        if (isUser) {
          get().addUserMessage(projectId, message);
        } else {
          get().addAssistantMessage(projectId, `msg-${Date.now()}`, message);
        }
      },

      syncDbMessages: (projectId: string, dbMessages: any[]) => {
        // Implementation for syncing database messages
        set((state) => {
          const project = state.projects[projectId];
          if (!project) return state;

          return {
            ...state,
            projects: {
              ...state.projects,
              [projectId]: {
                ...project,
                dbMessagesLoaded: true
              }
            }
          };
        });
      },

      clearOptimisticMessages: (projectId: string) => {
        // Implementation for clearing optimistic messages
      },

      clearProject: (projectId: string) =>
        set((state) => {
          const { [projectId]: removed, ...remainingProjects } = state.projects;
          return {
            ...state,
            projects: remainingProjects
          };
        }),

      forceRefresh: (projectId: string) =>
        set((state) => ({
          ...state,
          refreshTokens: {
            ...state.refreshTokens,
            [projectId]: (state.refreshTokens[projectId] || 0) + 1,
          },
          globalRefreshCounter: state.globalRefreshCounter + 1,
        })),

      addScene: (projectId: string, scene: any) => {
        get().updateAndRefresh(projectId, (props) => ({
          ...props,
          scenes: [...props.scenes, scene]
        }));
      },

      updateScene: (projectId: string, sceneId: string, updatedScene: any) => {
        get().updateAndRefresh(projectId, (props) => ({
          ...props,
          scenes: props.scenes.map(s => s.id === sceneId ? { ...s, ...updatedScene } : s)
        }));
      },

      selectScene: (projectId: string, sceneId: string | null) =>
        set((state) => ({
          ...state,
          selectedScenes: {
            ...state.selectedScenes,
            [projectId]: sceneId
          }
        })),

      getSelectedScene: (projectId: string) => {
        const { selectedScenes, projects } = get();
        const selectedSceneId = selectedScenes[projectId];
        const project = projects[projectId];
        
        if (!selectedSceneId || !project) return null;
        return project.props.scenes.find(s => s.id === selectedSceneId) || null;
      },
    }),
    {
      name: 'bazaar-vid-state', // localStorage key
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // 🚨 HYBRID PERSISTENCE: Only persist essential data for quick recovery
        projects: state.projects, // This includes chatHistory with imageUrls
        currentProjectId: state.currentProjectId,
        selectedScenes: state.selectedScenes,
        lastSyncTime: state.lastSyncTime,
        // Don't persist pendingDbSync - it should reset on reload
      }),
      version: 1,
      migrate: (persistedState: any, version: number) => {
        // Handle version migrations if needed
        return persistedState;
      },
    }
  )
);
