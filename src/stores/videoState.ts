// src/stores/videoState.ts
"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { applyPatch } from "fast-json-patch";
import type { Operation } from "fast-json-patch";
import type { InputProps } from "../types/input-props";
import { api } from "~/trpc/react";

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
  imageUrls?: string[]; // 🚨 NEW: Support for uploaded images
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

// Define database message type to match what comes from the API
export type DbMessage = {
  id: string;
  projectId: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt: Date;
  // Added for streaming support
  updatedAt?: Date;
  status?: 'pending' | 'success' | 'error' | 'building';
  kind?: 'text' | 'tool_result' | 'error' | 'status';
}

// Define ProjectState interface
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
  chatHistory: Record<string, ChatMessage[]>;
  refreshTokens: Record<string, number>;
  
  // 🚨 NEW: Global refresh counter to force all components to re-render
  globalRefreshCounter: number;
  
  // OPTIMIZATION #5: Scene selection state
  selectedScenes: Record<string, string | null>;
  
  // 🚨 NEW: Hybrid persistence state
  lastSyncTime: number;
  pendingDbSync: Record<string, boolean>; // Track which projects need DB sync
  
  // Actions
  setProject: (projectId: string, initialProps: InputProps) => void;
  replace: (projectId: string, newProps: InputProps) => void;
  getCurrentProps: () => InputProps | null;
  
  // 🚨 NEW: Reactive update that guarantees UI refresh
  updateAndRefresh: (projectId: string, updater: (props: InputProps) => InputProps) => void;
  
  // Chat management with hybrid persistence
  addUserMessage: (projectId: string, content: string, imageUrls?: string[]) => void;
  addAssistantMessage: (projectId: string, messageId: string, content: string) => void;
  updateMessage: (projectId: string, messageId: string, updates: MessageUpdates) => void;
  
  // 🚨 NEW: Database sync methods
  syncToDatabase: (projectId: string) => Promise<void>;
  loadFromDatabase: (projectId: string) => Promise<void>;
  markForSync: (projectId: string) => void;
  
  // Legacy methods (for backward compatibility)
  getChatHistory: () => ChatMessage[];
  getProjectChatHistory: (projectId: string) => ChatMessage[]; // Added to interface
  applyPatch: (projectId: string, patch: Operation[]) => void;
  addMessage: (projectId: string, message: string, isUser: boolean) => void;
  syncDbMessages: (projectId: string, dbMessages: DbMessage[]) => void;
  clearOptimisticMessages: (projectId: string) => void;
  clearProject: (projectId: string) => void;
  
  // Force refresh of preview components by generating a new refresh token
  forceRefresh: (projectId: string) => void;
  
  // OPTIMIZATION #2: Add/update individual scenes without full refetch
  addScene: (projectId: string, scene: any) => void;
  updateScene: (projectId: string, sceneId: string, updatedScene: any) => void;
  
  // OPTIMIZATION #5: Unified scene selection
  selectScene: (projectId: string, sceneId: string | null) => void;
  
  // Get selected scene
  getSelectedScene: (projectId: string) => InputProps['scenes'][number] | null;
}

export const useVideoState = create<VideoState>((set, get) => ({
  projects: {},
  currentProjectId: null,
  chatHistory: {},
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
    const { projects } = get();
    if (!projectId || !projects[projectId]) return [];
    return projects[projectId].chatHistory || [];
  },

  getChatHistory: () => {
    const { currentProjectId, projects } = get();
    if (!currentProjectId || !projects[currentProjectId]) return [];
    return projects[currentProjectId].chatHistory || [];
  },

  setProject: (projectId, initialProps) => 
    set((state) => {
      console.log('[videoState.setProject] Called. ProjectId:', projectId, 'InitialProps:', JSON.stringify(initialProps).substring(0, 300) + (JSON.stringify(initialProps).length > 300 ? '...' : ''));
      const isProjectSwitch = state.currentProjectId && state.currentProjectId !== projectId;
      
      // If switching to a different project, clear old chat history to avoid contamination
      if (isProjectSwitch) {
        console.log(`[VideoState] Switching from project ${state.currentProjectId} to ${projectId}, clearing chat history`);
      }
      
      return {
        currentProjectId: projectId,
        projects: {
          ...state.projects,
          [projectId]: {
            // Always use the provided initialProps - don't preserve old props
            props: initialProps,
            // Clear chat history on project switch, otherwise preserve
            chatHistory: isProjectSwitch ? (console.log('[videoState.setProject] Setting default chat history for new/switched project'), []) : (console.log('[videoState.setProject] Preserving existing chat history'), state.projects[projectId]?.chatHistory || []),
            dbMessagesLoaded: isProjectSwitch ? false : (state.projects[projectId]?.dbMessagesLoaded ?? false),
            activeStreamingMessageId: isProjectSwitch ? null : state.projects[projectId]?.activeStreamingMessageId,
            // Always generate a new refresh token to ensure Player re-renders with new props
            refreshToken: Date.now().toString(),
          }
        }
      };
    }),

  applyPatch: (projectId, patch) =>
    set((state) => {
      // Skip if project doesn't exist
      if (!state.projects[projectId]) return state;
      
      // Debug logging
      console.table(patch);
      console.log(
        "[applyPatch] scenes:",
        state.projects[projectId].props.scenes.map((s) => ({
          id: s.id,
          start: s.start,
          dur: s.duration,
        }))
      );
      
      try {
        // Store original state for potential rollback
        const originalProps = structuredClone(state.projects[projectId].props);

        // Apply patch to create new props
        const newProps = applyPatch(
          structuredClone(originalProps), 
          patch, 
          /* validate */ true
        ).newDocument;
        
        // Fire-and-forget persist to server
        // Use fetch directly to avoid React dependencies in Zustand
        fetch("/api/trpc/video.applyPatch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            json: { // Wrap in json property for tRPC
              projectId, 
              patch 
            }
          }),
        }).catch(() => {
          // Rollback if server rejects
          console.error("Server rejected patch, rolling back");
          // Use a safer approach that preserves the full state structure
          const currentState = get();
          const projectState = currentState.projects[projectId];
          
          if (projectState) {
            set({
              projects: {
                ...currentState.projects,
                [projectId]: {
                  ...projectState,
                  props: originalProps
                }
              }
            });
          }
        });
        
        // Return updated state
        return {
          ...state,
          projects: {
            ...state.projects,
            [projectId]: {
              ...state.projects[projectId],
              props: newProps
            }
          }
        };
      } catch (error) {
        console.error("Failed to apply patch:", error);
        return state; // Return unchanged state on error
      }
    }),

  replace: (projectId, next) => 
    set((state) => {
      // 🚨 CRITICAL FIX: Generate new refresh token and increment global counter
      const newRefreshToken = Date.now().toString();
      const newGlobalCounter = (state.globalRefreshCounter || 0) + 1;
      
      // If project exists, just update its props
      if (state.projects[projectId]) {
        return {
          ...state,
          currentProjectId: projectId,
          globalRefreshCounter: newGlobalCounter, // ✅ Force all components to re-render
          projects: {
            ...state.projects,
            [projectId]: {
              ...state.projects[projectId],
              props: next,
              refreshToken: newRefreshToken, // ✅ Force preview panel re-render
              lastUpdated: Date.now(), // ✅ Track when updated
            }
          }
        };
      }
      
      // Otherwise create a new project entry
      return {
        ...state,
        currentProjectId: projectId,
        globalRefreshCounter: newGlobalCounter,
        projects: {
          ...state.projects,
          [projectId]: {
            props: next,
            chatHistory: [],
            dbMessagesLoaded: false,
            refreshToken: newRefreshToken,
            lastUpdated: Date.now(),
          }
        }
      };
    }),
    
  addMessage: (projectId, message, isUser) =>
    set((state) => {
      // Skip if project doesn't exist
      if (!state.projects[projectId]) return state;
      
      // Create new message
      const newMessage: ChatMessage = {
        id: `${isUser ? 'user' : 'system'}-${Date.now()}`,
        message,
        isUser,
        timestamp: Date.now()
      };
      
      // Return updated state with new message
      return {
        ...state,
        projects: {
          ...state.projects,
          [projectId]: {
            ...state.projects[projectId],
            chatHistory: [
              ...state.projects[projectId].chatHistory,
              newMessage
            ]
          }
        }
      };
    }),
    
  // Add an assistant message with an ID from the server (for streaming)
  addAssistantMessage: (projectId, messageId, initialContent = '...') =>
    set((state) => {
      // Skip if project doesn't exist
      if (!state.projects[projectId]) return state;
      
      // Create new message with the server-provided ID
      const newMessage: ChatMessage = {
        id: messageId, // Use the server-provided ID
        message: initialContent,
        isUser: false,
        timestamp: Date.now(),
        status: 'pending',
        kind: 'status'
      };
      
      // Return updated state with new message and track it as the active streaming message
      return {
        ...state,
        projects: {
          ...state.projects,
          [projectId]: {
            ...state.projects[projectId],
            chatHistory: [
              ...state.projects[projectId].chatHistory,
              newMessage
            ],
            activeStreamingMessageId: messageId
          }
        }
      };
    }),
    
  // Update a message with new content or status information (for streaming)
  updateMessage: (projectId: string, messageId: string, updates: MessageUpdates) =>
    set((state) => {
      if (!state.projects[projectId]) return state;

      // Find the message by ID or active streaming message ID
      const activeId = state.projects[projectId].activeStreamingMessageId;
      const messageIndex = state.projects[projectId].chatHistory.findIndex(
        (msg) => msg.id === messageId || (activeId !== null && msg.id === activeId)
      );
      
      if (messageIndex === -1) return state;
      
      const currentMessage = state.projects[projectId].chatHistory[messageIndex];
      if (!currentMessage) return state; // Safety check
      
      // Create a clone of the current message that we'll update
      const updatedMessage: ChatMessage = { ...currentMessage };
      
      // Handle content updates with proper delta handling
      if (updates.delta !== undefined) {
        // If current message is placeholder or empty, replace it; otherwise append
        updatedMessage.message = (currentMessage.message === '...' || !currentMessage.message)
          ? updates.delta
          : `${currentMessage.message}${updates.delta}`; // Use template literal instead of + operator
      } else if (updates.content !== undefined) {
        // Full content replacement (for final message or specific updates)
        updatedMessage.message = updates.content;
      }
      
      // Update other fields if provided
      if (updates.status !== undefined) updatedMessage.status = updates.status;
      if (updates.kind !== undefined) updatedMessage.kind = updates.kind;
      if (updates.jobId !== undefined) updatedMessage.jobId = updates.jobId;
      
      // Update timestamp on modification
      updatedMessage.timestamp = Date.now();
      
      // Create a new chat history with the updated message
      const updatedChatHistory = [...state.projects[projectId].chatHistory];
      updatedChatHistory[messageIndex] = updatedMessage;
      
      return {
        projects: {
          ...state.projects,
          [projectId]: {
            ...state.projects[projectId],
            chatHistory: updatedChatHistory
          }
        }
      };
    }),
    
  // Sync messages from DB while preserving optimistic updates and active streaming message
  syncDbMessages: (projectId: string, dbMessages: DbMessage[]) =>
    set((state) => {
      if (!state.projects[projectId]) return state;
      
      console.log('[videoState.syncDbMessages] Called. ProjectId:', projectId, 'Incoming dbMessages:', JSON.stringify(dbMessages).substring(0,300) + (JSON.stringify(dbMessages).length > 300 ? '...' : ''));
      console.log('[videoState.syncDbMessages] Current chatHistory before sync (projectId:', projectId, '):', JSON.stringify(state.projects[projectId]?.chatHistory).substring(0,300) + (JSON.stringify(state.projects[projectId]?.chatHistory).length > 300 ? '...' : ''));
      const activeStreamingMessageId = state.projects[projectId].activeStreamingMessageId;

      // Convert DB messages to ChatMessage format
      const syncedMessages: ChatMessage[] = dbMessages.map((dbMessage) => ({
        id: dbMessage.id,
        message: dbMessage.content,
        isUser: dbMessage.role === "user",
        timestamp: new Date(dbMessage.createdAt).getTime(),
        status: dbMessage.status || "success",
        kind: dbMessage.kind || (dbMessage.role === "user" ? "text" : "text"), // User messages are also 'text' type
        jobId: null // DB messages don't have jobId
      }));
      
      // Create a Set of synced message IDs for quick lookups
      const syncedMessageIds = new Set(syncedMessages.map(msg => msg.id));
      
      // Find messages in the current state that are NOT in the DB yet
      // These are either optimistic updates or messages being streamed
      const unsyncedClientMessages = state.projects[projectId].chatHistory.filter(clientMsg => {
        // Keep messages that are not in the DB yet OR the active streaming message
        // (which might have more up-to-date content than the DB version)
        return !syncedMessageIds.has(clientMsg.id) || clientMsg.id === activeStreamingMessageId;
      });
      
      // Combine messages: Start with all synced DB messages
      const combinedHistory = [...syncedMessages];
      
      // Then add any unsynced client messages (optimistic ones) 
      unsyncedClientMessages.forEach(clientMsg => {
        if (!syncedMessageIds.has(clientMsg.id)) {
          // This message isn't in DB yet, add it
          combinedHistory.push(clientMsg);
        } else if (clientMsg.id === activeStreamingMessageId) {
          // If this is the active streaming message and it exists in DB,
          // use our client version which might be more up-to-date
          const index = combinedHistory.findIndex(m => m.id === activeStreamingMessageId);
          if (index !== -1) combinedHistory[index] = clientMsg;
        }
      });
      
      // Sort messages by timestamp to maintain chronological order
      combinedHistory.sort((a, b) => a.timestamp - b.timestamp);
      
      return {
        projects: {
          ...state.projects,
          [projectId]: {
            ...state.projects[projectId],
            chatHistory: (console.log('[videoState.syncDbMessages] Combined history after sync:', JSON.stringify(combinedHistory).substring(0,300) + '...'), combinedHistory),
            dbMessagesLoaded: true
          }
        }
      };
    }),
    
  clearOptimisticMessages: (projectId) =>
    set((state) => {
      // Skip if project doesn't exist
      if (!state.projects[projectId]) return state;
      
      return {
        ...state,
        projects: {
          ...state.projects,
          [projectId]: {
            ...state.projects[projectId],
            chatHistory: []
          }
        }
      };
    }),
    
  // Clear all data for a specific project (useful when switching projects)
  clearProject: (projectId) =>
    set((state) => {
      // Skip if project doesn't exist
      if (!state.projects[projectId]) return state;
      
      return {
        ...state,
        projects: {
          ...state.projects,
          [projectId]: {
            ...state.projects[projectId],
            chatHistory: [],
            dbMessagesLoaded: false,
            activeStreamingMessageId: null,
            refreshToken: undefined
          }
        },
        currentProjectId: null
      };
    }),
    
  // Force refresh of preview components by generating a new refresh token
  forceRefresh: (projectId) =>
    set((state) => {
      // Skip if project doesn't exist
      if (!state.projects[projectId]) return state;
      
      // Generate a new refresh token
      const newRefreshToken = Date.now().toString();
      
      return {
        ...state,
        projects: {
          ...state.projects,
          [projectId]: {
            ...state.projects[projectId],
            refreshToken: newRefreshToken
          }
        }
      };
    }),
    
  // OPTIMIZATION #2: Add/update individual scenes without full refetch
  addScene: (projectId: string, scene: any) =>
    set((state) => {
      const project = state.projects[projectId];
      if (!project) return state;
      
      const newScenes = [...project.props.scenes, {
        id: scene.id,
        type: 'custom' as const,
        start: project.props.scenes.length * 150,
        duration: 150,
        data: {
          code: scene.tsxCode,
          name: scene.name || 'Generated Scene',
          componentId: scene.id,
          props: scene.props || {}
        }
      }];
      
      return {
        ...state,
        projects: {
          ...state.projects,
          [projectId]: {
            ...project,
            props: {
              ...project.props,
              meta: {
                ...project.props.meta,
                duration: newScenes.length * 150
              },
              scenes: newScenes
            }
          }
        }
      };
    }),
    
  updateScene: (projectId: string, sceneId: string, updatedScene: any) =>
    set((state) => {
      const project = state.projects[projectId];
      if (!project) return state;
      
      const sceneIndex = project.props.scenes.findIndex((s: any) => s.id === sceneId);
      if (sceneIndex === -1) return state;
      
      const updatedScenes = [...project.props.scenes];
      const existingScene = updatedScenes[sceneIndex];
      
      // Use new duration if provided, otherwise preserve existing
      const newDuration = updatedScene.duration || existingScene?.duration || 150;
      const oldDuration = existingScene?.duration || 150;
      const durationChange = newDuration - oldDuration;
      
      // Update the current scene
      updatedScenes[sceneIndex] = {
        ...existingScene,
        id: existingScene?.id || sceneId,
        type: existingScene?.type || 'custom',
        start: existingScene?.start || 0,
        duration: newDuration, // Use new duration
        data: {
          ...existingScene?.data,
          code: updatedScene.tsxCode,
          name: updatedScene.name || existingScene?.data?.name || 'Scene',
          props: updatedScene.props || {}
        }
      };
      
      // TIMELINE FIX: Recalculate start times for subsequent scenes
      if (durationChange !== 0) {
        for (let i = sceneIndex + 1; i < updatedScenes.length; i++) {
          const currentScene = updatedScenes[i];
          if (currentScene) {
            updatedScenes[i] = {
              ...currentScene,
              start: currentScene.start + durationChange
            };
          }
        }
        console.log(`[VideoState] Scene ${sceneIndex + 1} duration changed by ${durationChange} frames, updated ${updatedScenes.length - sceneIndex - 1} subsequent scenes`);
      }
      
      // TOTAL DURATION FIX: Recalculate total video duration
      const totalDuration = updatedScenes.reduce((sum, scene) => sum + (scene.duration || 150), 0);
      
      return {
        ...state,
        projects: {
          ...state.projects,
          [projectId]: {
            ...project,
            props: {
              ...project.props,
              meta: {
                ...project.props.meta,
                duration: totalDuration // Update total duration
              },
              scenes: updatedScenes
            }
          }
        }
      };
    }),
    
  // OPTIMIZATION #5: Unified scene selection
  selectScene: (projectId: string, sceneId: string | null) =>
    set((state) => ({
      ...state,
      selectedScenes: {
        ...state.selectedScenes,
        [projectId]: sceneId
      }
    })),
    
  // Get selected scene
  getSelectedScene: (projectId: string) => {
    const state = get();
    const selectedSceneId = state.selectedScenes?.[projectId];
    if (!selectedSceneId) return null;
    
    const project = state.projects[projectId];
    if (!project) return null;
    
    return project.props.scenes.find((s: any) => s.id === selectedSceneId) || null;
  },
  
  // Implement missing addUserMessage method
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
        imageUrls: imageUrls // 🚨 NEW: Include uploaded images with message
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

  // 🚨 NEW: Reactive update that guarantees UI refresh
  updateAndRefresh: (projectId: string, updater: (props: InputProps) => InputProps) =>
    set((state) => {
      const project = state.projects[projectId];
      if (!project) {
        console.warn(`[VideoState.updateAndRefresh] Project ${projectId} not found`);
        return state;
      }
      
      console.log('[VideoState.updateAndRefresh] Starting reactive update for project:', projectId);
      
      try {
        const updatedProps = updater(project.props);
        const newRefreshToken = Date.now().toString();
        const newGlobalCounter = (state.globalRefreshCounter || 0) + 1;
        
        console.log('[VideoState.updateAndRefresh] Generated new refresh token:', newRefreshToken);
        console.log('[VideoState.updateAndRefresh] Global counter:', newGlobalCounter);
        
        // Update state with all necessary refresh triggers
        const newState = {
          ...state,
          currentProjectId: projectId,
          globalRefreshCounter: newGlobalCounter,
          projects: {
            ...state.projects,
            [projectId]: {
              ...project,
              props: updatedProps,
              refreshToken: newRefreshToken,
              lastUpdated: Date.now(),
            }
          }
        };
        
        // Dispatch custom event for components that need manual refresh
        setTimeout(() => {
          console.log('[VideoState.updateAndRefresh] Dispatching videostate-update event');
          window.dispatchEvent(new CustomEvent('videostate-update', {
            detail: { 
              projectId, 
              type: 'scenes-updated',
              refreshToken: newRefreshToken,
              globalCounter: newGlobalCounter
            }
          }));
        }, 0);
        
        return newState;
      } catch (error) {
        console.error('[VideoState.updateAndRefresh] Error during update:', error);
        return state;
      }
    }),
  
  // 🚨 NEW: Database sync methods
  syncToDatabase: async (projectId: string) => {
    const project = get().projects[projectId];
    if (!project) return;
    
    try {
      // Fetch the latest project data from the server
      const response = await fetch(`/api/trpc/video.getProjectData`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ projectId })
      });
      
      if (!response.ok) {
        console.error('Failed to fetch project data:', response.statusText);
        return;
      }
      
      const projectData = await response.json();
      
      // Update the project state with the latest data
      set((state) => {
        return {
          ...state,
          projects: {
            ...state.projects,
            [projectId]: {
              ...project,
              props: projectData.props,
              chatHistory: projectData.chatHistory,
              dbMessagesLoaded: true
            }
          }
        };
      });
    } catch (error) {
      console.error('Error syncing project data:', error);
    }
  },

  loadFromDatabase: async (projectId: string) => {
    try {
      // Fetch the latest project data from the server
      const response = await fetch(`/api/trpc/video.getProjectData`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ projectId })
      });
      
      if (!response.ok) {
        console.error('Failed to fetch project data:', response.statusText);
        return;
      }
      
      const projectData = await response.json();
      
      // Update the project state with the latest data
      set((state) => {
        return {
          ...state,
          projects: {
            ...state.projects,
            [projectId]: {
              props: projectData.props,
              chatHistory: projectData.chatHistory,
              dbMessagesLoaded: true
            }
          }
        };
      });
    } catch (error) {
      console.error('Error loading project data:', error);
    }
  },
  
  markForSync: (projectId: string) => 
    set((state) => {
      return {
        ...state,
        pendingDbSync: {
          ...state.pendingDbSync,
          [projectId]: true
        }
      };
    }),
}));