// src/stores/videoState.ts
"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { applyPatch } from "fast-json-patch";
import type { Operation } from "fast-json-patch";
import type { InputProps } from "~/lib/types/video/input-props";
import { api } from "~/trpc/react";

// Define chat message types
export interface ChatMessage {
  id: string;
  message: string;
  isUser: boolean;
  timestamp: number;
  sequence?: number; // Message sequence number for proper ordering
  status?: "pending" | "error" | "success" | "building" | "tool_calling";
  kind?: "text" | "error" | "status" | "tool_result" | "scene_plan";
  jobId?: string | null;
  toolName?: string;
  toolStartTime?: number;
  executionTimeSeconds?: number | null;
  imageUrls?: string[]; // Support for uploaded images
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
  sequence: number;
  // Added for streaming support
  updatedAt?: Date;
  status?: 'pending' | 'success' | 'error' | 'building';
  kind?: 'text' | 'tool_result' | 'error' | 'status' | 'scene_plan';
}

// Define ProjectState interface
interface AudioTrack {
  id: string;
  url: string;
  name: string;
  duration: number;
  startTime: number;
  endTime: number;
  volume: number;
  // Phase 1 enhancements
  fadeInDuration?: number;  // Fade in duration in seconds
  fadeOutDuration?: number; // Fade out duration in seconds
  playbackRate?: number;    // Speed control (0.5 = half speed, 2 = double speed)
  // Future enhancements
  pitchShift?: number;      // Pitch adjustment in semitones
  muted?: boolean;          // Mute toggle
  loop?: boolean;           // Loop the audio
}

interface ProjectState {
  props: InputProps;
  chatHistory: ChatMessage[];
  dbMessagesLoaded: boolean;
  activeStreamingMessageId?: string | null;
  refreshToken?: string;
  audio?: AudioTrack | null;
  shouldOpenAudioPanel?: boolean; // Flag to trigger audio panel opening
  draftMessage?: string; // Persist chat input when panels change
}

interface VideoState {
  currentProjectId: string | null;
  projects: Record<string, ProjectState>;
  chatHistory: Record<string, ChatMessage[]>;
  refreshTokens: Record<string, number>;
  
  
  // OPTIMIZATION #5: Scene selection state
  selectedScenes: Record<string, string | null>;
  
  // 🚨 NEW: Hybrid persistence state
  lastSyncTime: number;
  pendingDbSync: Record<string, boolean>; // Track which projects need DB sync
  
  // Track which scene plan messages are currently generating
  generatingScenes: Record<string, Set<string>>; // projectId -> Set of messageIds
  
  // Actions
  setProject: (projectId: string, initialProps: InputProps, options?: { force?: boolean }) => void;
  replace: (projectId: string, newProps: InputProps) => void;
  getCurrentProps: () => InputProps | null;
  
  // 🚨 NEW: Reactive update that guarantees UI refresh
  updateAndRefresh: (projectId: string, updater: (props: InputProps) => InputProps) => void;
  
  // Chat management with hybrid persistence
  addUserMessage: (projectId: string, content: string, imageUrls?: string[]) => void;
  addAssistantMessage: (projectId: string, messageId: string, content: string) => void;
  updateMessage: (projectId: string, messageId: string, updates: MessageUpdates) => void;
  
  // 🚨 NEW: Add system message for cross-panel communication
  addSystemMessage: (projectId: string, content: string, kind?: ChatMessage['kind']) => void;
  
  // 🚨 NEW: Database sync methods
  syncToDatabase: (projectId: string) => Promise<void>;
  loadFromDatabase: (projectId: string) => Promise<void>;
  markForSync: (projectId: string) => void;
  
  // Legacy methods (for backward compatibility)
  getChatHistory: () => ChatMessage[];
  getProjectChatHistory: (projectId: string) => ChatMessage[]; // Added to interface
  addMessage: (projectId: string, message: string, isUser: boolean) => void;
  syncDbMessages: (projectId: string, dbMessages: DbMessage[]) => void;
  clearOptimisticMessages: (projectId: string) => void;
  clearProject: (projectId: string) => void;
  
  // Force refresh of preview components by generating a new refresh token
  
  // OPTIMIZATION #2: Add/update/delete individual scenes without full refetch
  addScene: (projectId: string, scene: any) => void;
  updateScene: (projectId: string, sceneId: string, updatedScene: any) => void;
  deleteScene: (projectId: string, sceneId: string) => void;
  updateProjectAudio: (projectId: string, audio: AudioTrack | null) => void;
  
  // Audio panel auto-opening
  setShouldOpenAudioPanel: (projectId: string, shouldOpen: boolean) => void;
  
  // OPTIMIZATION #5: Unified scene selection
  selectScene: (projectId: string, sceneId: string | null) => void;
  
  // Get selected scene
  getSelectedScene: (projectId: string) => InputProps['scenes'][number] | null;
  
  // Reorder scenes in timeline
  reorderScenes: (projectId: string, oldIndex: number, newIndex: number) => void;
  
  // Remove a specific message by ID
  removeMessage: (projectId: string, messageId: string) => void;
  
  // Scene generation tracking
  setSceneGenerating: (projectId: string, messageId: string, isGenerating: boolean) => void;
  isSceneGenerating: (projectId: string, messageId: string) => boolean;
  clearAllGeneratingScenes: (projectId: string) => void;
  
  // Draft message persistence
  setDraftMessage: (projectId: string, message: string) => void;
  getDraftMessage: (projectId: string) => string;
}

export const useVideoState = create<VideoState>()(
  persist(
    (set, get) => ({
  projects: {},
  currentProjectId: null,
  chatHistory: {},
  refreshTokens: {},
  selectedScenes: {},
  lastSyncTime: 0,
  pendingDbSync: {},
  generatingScenes: {},
  
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

  setProject: (projectId, initialProps, options = {}) => 
    set((state) => {
      console.log('[videoState.setProject] Called. ProjectId:', projectId, 'InitialProps:', JSON.stringify(initialProps).substring(0, 300) + (JSON.stringify(initialProps).length > 300 ? '...' : ''), 'Options:', options);
      const isProjectSwitch = state.currentProjectId && state.currentProjectId !== projectId;
      
      // If switching to a different project, clear old chat history to avoid contamination
      if (isProjectSwitch) {
        console.log(`[VideoState] Switching from project ${state.currentProjectId} to ${projectId}, clearing chat history`);
      }
      
      // Check if we should skip update (only if not forcing)
      if (!options.force && state.projects[projectId]) {
        const localScenes = state.projects[projectId].props?.scenes || [];
        const newScenes = initialProps?.scenes || [];
        
        // Only skip if local has real scenes (not just welcome) and new has none/welcome only
        const hasRealLocalScenes = localScenes.some(s => 
          s.type !== 'welcome' && !s.data?.isWelcomeScene
        );
        const hasRealNewScenes = newScenes.some(s => 
          s.type !== 'welcome' && !s.data?.isWelcomeScene
        );
        
        if (hasRealLocalScenes && !hasRealNewScenes) {
          console.log('[VideoState] Keeping local scenes (has real scenes), skipping update with welcome/empty scenes');
          return state;
        }
      }
      
      return {
        currentProjectId: projectId,
        projects: {
          ...state.projects,
          [projectId]: {
            // Always use the provided initialProps when force=true or when it makes sense
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


  replace: (projectId, next) => 
    set((state) => {
      // 🚨 CRITICAL FIX: Generate new refresh token
      const newRefreshToken = Date.now().toString();
      
      // If project exists, just update its props
      if (state.projects[projectId]) {
        return {
          ...state,
          currentProjectId: projectId,
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
      
      // Calculate next sequence number
      const maxSequence = state.projects[projectId].chatHistory.reduce((max, msg) => 
        Math.max(max, msg.sequence ?? 0), 0
      );
      
      // Create new message
      const newMessage: ChatMessage = {
        id: `${isUser ? 'user' : 'system'}-${Date.now()}`,
        message,
        isUser,
        timestamp: Date.now(),
        sequence: maxSequence + 1
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
      
      // Check if this message ID already exists
      const existingMessage = state.projects[projectId].chatHistory.find(msg => msg.id === messageId);
      if (existingMessage) {
        console.warn('[VideoState] Assistant message with ID already exists, skipping:', messageId);
        return state;
      }
      
      // Calculate next sequence number
      const maxSequence = state.projects[projectId].chatHistory.reduce((max, msg) => 
        Math.max(max, msg.sequence ?? 0), 0
      );
      
      // Create new message with the server-provided ID
      const newMessage: ChatMessage = {
        id: messageId, // Use the server-provided ID
        message: initialContent,
        isUser: false,
        timestamp: Date.now(),
        sequence: maxSequence + 1,
        status: 'pending',
        kind: 'status'
      };
      
      console.log('[VideoState] Adding assistant message:', { id: messageId, content: initialContent.substring(0, 50) + '...' });
      
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
      
      console.log('[videoState.syncDbMessages] Called. ProjectId:', projectId, 'Incoming dbMessages count:', dbMessages.length);
      
      // Log sequence numbers to debug ordering
      console.log('[videoState.syncDbMessages] DB message sequences:', dbMessages.map(m => ({
        id: m.id.substring(0, 8),
        role: m.role,
        seq: m.sequence,
        content: m.content.substring(0, 30) + '...'
      })));
      
      console.log('[videoState.syncDbMessages] Current chatHistory before sync:', state.projects[projectId]?.chatHistory.length || 0, 'messages');
      const activeStreamingMessageId = state.projects[projectId].activeStreamingMessageId;

      // Convert DB messages to ChatMessage format
      const syncedMessages: ChatMessage[] = dbMessages.map((dbMessage) => ({
        id: dbMessage.id,
        message: dbMessage.content,
        isUser: dbMessage.role === "user",
        timestamp: new Date(dbMessage.createdAt).getTime(),
        sequence: dbMessage.sequence,
        status: dbMessage.status || "success",
        kind: dbMessage.kind || (dbMessage.role === "user" ? "text" : "text"), // User messages are also 'text' type
        jobId: null // DB messages don't have jobId
      }));
      
      // Helper function to check if two messages are duplicates
      const isDuplicateMessage = (msg1: ChatMessage, msg2: ChatMessage) => {
        // Same role/type
        if (msg1.isUser !== msg2.isUser) return false;
        
        // Same content (trimmed and compared)
        const content1 = msg1.message.trim();
        const content2 = msg2.message.trim();
        
        // For exact matches
        if (content1 === content2) return true;
        
        // For partial matches (one message might be truncated)
        if (content1.length > 50 && content2.length > 50) {
          // Check if beginning of messages match (at least 50 chars)
          return content1.substring(0, 50) === content2.substring(0, 50);
        }
        
        return false;
      };
      
      // Get current client messages
      const currentClientMessages = state.projects[projectId].chatHistory;
      
      // Use database messages as the base (they have proper UUIDs)
      const deduplicatedHistory: ChatMessage[] = [];
      const processedContents = new Set<string>();
      
      // Add all DB messages first
      syncedMessages.forEach(dbMsg => {
        const contentKey = `${dbMsg.isUser ? 'user' : 'assistant'}-${dbMsg.message.substring(0, 50)}`;
        if (!processedContents.has(contentKey)) {
          deduplicatedHistory.push(dbMsg);
          processedContents.add(contentKey);
        }
      });
      
      // Only keep client messages that don't exist in DB (rare edge cases)
      currentClientMessages.forEach(clientMsg => {
        // Skip if this message is a duplicate of any DB message
        const isDuplicate = deduplicatedHistory.some(existingMsg => 
          isDuplicateMessage(clientMsg, existingMsg)
        );
        
        if (!isDuplicate) {
          const contentKey = `${clientMsg.isUser ? 'user' : 'assistant'}-${clientMsg.message.substring(0, 50)}`;
          if (!processedContents.has(contentKey)) {
            deduplicatedHistory.push(clientMsg);
            processedContents.add(contentKey);
          }
        }
      });
      
      // Sort messages by sequence (if available) or timestamp to maintain chronological order
      deduplicatedHistory.sort((a, b) => {
        // Primary sort by sequence if both have it
        if (a.sequence !== undefined && b.sequence !== undefined) {
          return a.sequence - b.sequence;
        }
        
        // If only one has sequence, prioritize the one with sequence
        if (a.sequence !== undefined && b.sequence === undefined) return -1;
        if (a.sequence === undefined && b.sequence !== undefined) return 1;
        
        // Secondary sort by timestamp
        if (a.timestamp !== b.timestamp) {
          return a.timestamp - b.timestamp;
        }
        
        // Tertiary sort by role (user messages before assistant)
        // This helps when messages have the same timestamp
        if (a.isUser !== b.isUser) {
          return a.isUser ? -1 : 1;
        }
        
        // Finally, sort by ID to ensure consistent ordering
        return a.id.localeCompare(b.id);
      });
      
      console.log('[videoState.syncDbMessages] Deduplication complete. Client:', currentClientMessages.length, 'DB:', syncedMessages.length, 'Final:', deduplicatedHistory.length);
      
      // Log final sorted order to debug
      console.log('[videoState.syncDbMessages] Final sorted order:', deduplicatedHistory.map(m => ({
        id: m.id.substring(0, 8),
        isUser: m.isUser,
        seq: m.sequence,
        timestamp: new Date(m.timestamp).toISOString(),
        content: m.message.substring(0, 30) + '...'
      })));
      
      return {
        projects: {
          ...state.projects,
          [projectId]: {
            ...state.projects[projectId],
            chatHistory: (console.log('[videoState.syncDbMessages] Combined history after sync:', JSON.stringify(deduplicatedHistory).substring(0,300) + '...'), deduplicatedHistory),
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
    
    
  // OPTIMIZATION #2: Add/update individual scenes without full refetch
  addScene: (projectId: string, scene: any) =>
    set((state) => {
      const project = state.projects[projectId];
      if (!project) return state;
      
      // Check if this is a welcome project (only has one scene with "Welcome" in the name)
      const isWelcomeProject = project.props.scenes.length === 1 && 
        project.props.scenes[0]?.data?.name && 
        typeof project.props.scenes[0].data.name === 'string' &&
        project.props.scenes[0].data.name.includes('Welcome');
      
      // If this is the first real scene being added to a welcome project, replace the welcome scene
      if (isWelcomeProject) {
        console.log('[VideoState.addScene] Replacing welcome scene with first real scene');
        const newScene = {
          id: scene.id,
          type: 'custom' as const,
          start: 0,
          duration: scene.duration || 150,
          data: {
            code: scene.tsxCode,
            name: scene.name || 'Generated Scene',
            componentId: scene.id,
            props: scene.props || {}
          }
        };
        
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
                  duration: newScene.duration
                },
                scenes: [newScene] // Replace welcome scene
              }
            }
          }
        };
      }
      
      // Normal flow: add scene to existing scenes
      // Calculate the correct start position based on existing scenes' actual durations
      const currentTotalDuration = project.props.scenes.reduce((sum, s) => sum + (s.duration || 150), 0);
      
      const newScene = {
        id: scene.id,
        type: 'custom' as const,
        start: currentTotalDuration, // Start after all existing scenes
        duration: scene.duration || 150, // Use scene's actual duration
        data: {
          code: scene.tsxCode,
          name: scene.name || 'Generated Scene',
          componentId: scene.id,
          props: scene.props || {}
        }
      };
      
      const newScenes = [...project.props.scenes, newScene];
      
      // Calculate total duration properly
      const totalDuration = currentTotalDuration + newScene.duration;
      
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
                duration: totalDuration
              },
              scenes: newScenes
            }
          }
        }
      };
    }),
    
  updateScene: (projectId: string, sceneId: string, updatedScene: any) =>
    set((state) => {
      console.log('[VideoState.updateScene] ⚡ Updating scene:', sceneId);
      
      const project = state.projects[projectId];
      if (!project) {
        console.log('[VideoState.updateScene] ❌ Project not found:', projectId);
        return state;
      }
      
      const sceneIndex = project.props.scenes.findIndex((s: any) => s.id === sceneId);
      if (sceneIndex === -1) {
        console.log('[VideoState.updateScene] ❌ Scene not found:', sceneId);
        return state;
      }
      
      const updatedScenes = [...project.props.scenes];
      const existingScene = updatedScenes[sceneIndex];
      
      // Use new duration if provided, otherwise preserve existing
      const newDuration = updatedScene.duration || existingScene?.duration || 150;
      const oldDuration = existingScene?.duration || 150;
      const durationChange = newDuration - oldDuration;
      
      // Update the current scene - ONLY update what's provided
      updatedScenes[sceneIndex] = {
        ...existingScene,
        id: existingScene?.id || sceneId,
        type: existingScene?.type || updatedScene.type || 'custom',
        start: existingScene?.start || 0,
        duration: newDuration, // Use new duration
        // Handle name at root level if provided
        ...(updatedScene.name !== undefined && { name: updatedScene.name }),
        data: {
          ...existingScene?.data,
          // Only update code if it's actually provided
          ...(updatedScene.tsxCode !== undefined && { code: updatedScene.tsxCode }),
          // Also update name in data for backward compatibility
          ...(updatedScene.name !== undefined && { name: updatedScene.name }),
          ...(updatedScene.data?.name !== undefined && { name: updatedScene.data.name }),
          // Only update props if provided
          ...(updatedScene.props !== undefined && { props: updatedScene.props })
        }
      };
      
      // 🚨 DEBUG: Log what we're actually storing
      const sceneData = updatedScenes[sceneIndex]?.data || {};
      console.log('[VideoState.updateScene] 🚨 STORED SCENE DATA:', {
        sceneId,
        codeLength: updatedScene.tsxCode?.length,
        codeStart: typeof sceneData.code === 'string' ? sceneData.code.substring(0, 100) : 'N/A',
        hasRed: typeof sceneData.code === 'string' ? sceneData.code.includes('#ff0000') : false,
        nameUpdate: {
          rootName: (updatedScenes[sceneIndex] as any).name,
          dataName: sceneData.name,
          providedName: updatedScene.name,
          providedDataName: updatedScene.data?.name
        }
      });
      
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
      
      console.log('[VideoState.updateScene] ✅ Scene updated successfully - all panels should refresh now');
      
      // 🚨 CRITICAL FIX: Generate new refresh token (same as replace method)
      const newRefreshToken = Date.now().toString();
      
      console.log('[VideoState.updateScene] 🔄 New refresh token:', newRefreshToken);
      
      
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
            },
            refreshToken: newRefreshToken, // ✅ Force preview panel re-render
            lastUpdated: Date.now(), // ✅ Track when updated
          }
        }
      };
    }),
  
  deleteScene: (projectId: string, sceneId: string) =>
    set((state) => {
      console.log('[VideoState.deleteScene] ⚡ Deleting scene:', sceneId);
      
      const project = state.projects[projectId];
      if (!project) {
        console.log('[VideoState.deleteScene] ❌ Project not found:', projectId);
        return state;
      }
      
      const sceneIndex = project.props.scenes.findIndex((s: any) => s.id === sceneId);
      if (sceneIndex === -1) {
        console.log('[VideoState.deleteScene] ❌ Scene not found:', sceneId);
        return state;
      }
      
      // Get the scene being deleted for duration calculation
      const deletedScene = project.props.scenes[sceneIndex];
      const deletedDuration = deletedScene?.duration || 150;
      
      // Filter out the deleted scene
      const updatedScenes = project.props.scenes.filter((s: any) => s.id !== sceneId);
      
      // TIMELINE FIX: Recalculate start times for subsequent scenes
      let currentStart = 0;
      for (let i = 0; i < updatedScenes.length; i++) {
        const scene = updatedScenes[i];
        if (scene) {
          updatedScenes[i] = {
            ...scene,
            start: currentStart
          };
          currentStart += scene.duration || 150;
        }
      }
      
      // TOTAL DURATION FIX: Recalculate total video duration
      const totalDuration = updatedScenes.reduce((sum, scene) => sum + (scene.duration || 150), 0);
      
      console.log('[VideoState.deleteScene] ✅ Scene deleted successfully - all panels should refresh now');
      
      // Dispatch event to clean up any error banners for this scene
      window.dispatchEvent(new CustomEvent('scene-deleted', {
        detail: { sceneId }
      }));
      
      // Generate new refresh token (same as replace method)
      const newRefreshToken = Date.now().toString();
      
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
                duration: totalDuration
              },
              scenes: updatedScenes
            },
            refreshToken: newRefreshToken,
            lastUpdated: Date.now(), // Track when updated
          }
        }
      };
    }),

  updateProjectAudio: (projectId: string, audio: AudioTrack | null) =>
    set((state) => {
      console.log('[VideoState.updateProjectAudio] ⚡ Updating audio:', audio);
      
      const project = state.projects[projectId];
      if (!project) {
        console.log('[VideoState.updateProjectAudio] ❌ Project not found:', projectId);
        return state;
      }
      
      const newRefreshToken = Date.now().toString();
      
      return {
        ...state,
        projects: {
          ...state.projects,
          [projectId]: {
            ...project,
            audio,
            refreshToken: newRefreshToken,
            lastUpdated: Date.now(),
          }
        }
      };
    }),
    
  // Audio panel auto-opening
  setShouldOpenAudioPanel: (projectId: string, shouldOpen: boolean) =>
    set((state) => {
      const project = state.projects[projectId];
      if (!project) return state;
      
      return {
        ...state,
        projects: {
          ...state.projects,
          [projectId]: {
            ...project,
            shouldOpenAudioPanel: shouldOpen,
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
  
  // Reorder scenes in timeline
  reorderScenes: (projectId: string, oldIndex: number, newIndex: number) =>
    set((state) => {
      console.log('[VideoState.reorderScenes] Reordering scenes:', { oldIndex, newIndex });
      
      const project = state.projects[projectId];
      if (!project) {
        console.log('[VideoState.reorderScenes] Project not found:', projectId);
        return state;
      }
      
      const scenes = [...project.props.scenes];
      
      // Validate indices
      if (oldIndex < 0 || oldIndex >= scenes.length || 
          newIndex < 0 || newIndex >= scenes.length) {
        console.log('[VideoState.reorderScenes] Invalid indices:', { oldIndex, newIndex, scenesLength: scenes.length });
        return state;
      }
      
      // Move the scene
      const [movedScene] = scenes.splice(oldIndex, 1);
      scenes.splice(newIndex, 0, movedScene);
      
      // Recalculate start times for all scenes
      let currentStart = 0;
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        if (scene) {
          scenes[i] = {
            ...scene,
            start: currentStart
          };
          currentStart += scene.duration || 150;
        }
      }
      
      // Calculate total duration
      const totalDuration = scenes.reduce((sum, scene) => sum + (scene.duration || 150), 0);
      
      console.log('[VideoState.reorderScenes] Scenes reordered successfully');
      
      // Generate new refresh token to force UI update
      const newRefreshToken = Date.now().toString();
      
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
                duration: totalDuration
              },
              scenes
            },
            refreshToken: newRefreshToken,
            lastUpdated: Date.now()
          }
        }
      };
    }),
  
  // Implement missing addUserMessage method
  addUserMessage: (projectId: string, content: string, imageUrls?: string[]) =>
    set((state) => {
      const project = state.projects[projectId];
      if (!project) return state;
      
      // Check for duplicate messages in the last 2 seconds
      const recentMessages = project.chatHistory.filter(
        msg => msg.isUser && Date.now() - msg.timestamp < 2000
      );
      
      if (recentMessages.some(msg => msg.message === content)) {
        console.warn('[VideoState] Duplicate user message detected, skipping:', content);
        return state;
      }
      
      // Calculate next sequence number
      const maxSequence = project.chatHistory.reduce((max, msg) => 
        Math.max(max, msg.sequence ?? 0), 0
      );
      
      const newMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        message: content,
        isUser: true,
        timestamp: Date.now(),
        sequence: maxSequence + 1,
        status: 'success',
        imageUrls: imageUrls // 🚨 NEW: Include uploaded images with message
      };
      
      console.log('[VideoState] Adding user message:', { id: newMessage.id, content: content.substring(0, 50) + '...' });
      
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
        
        console.log('[VideoState.updateAndRefresh] Generated new refresh token:', newRefreshToken);
        
        // Update state with all necessary refresh triggers
        const newState = {
          ...state,
          currentProjectId: projectId,
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

  // 🚨 NEW: Add system message for cross-panel communication
  addSystemMessage: (projectId: string, content: string, kind?: ChatMessage['kind']) =>
    set((state) => {
      const project = state.projects[projectId];
      if (!project) return state;
      
      const newMessage: ChatMessage = {
        id: `system-${Date.now()}`,
        message: content,
        isUser: false,
        timestamp: Date.now(),
        status: 'success',
        kind: kind || 'text'
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
    
  // Remove a specific message by ID
  removeMessage: (projectId: string, messageId: string) =>
    set((state) => {
      const project = state.projects[projectId];
      if (!project) return state;
      
      console.log('[VideoState] Removing message:', messageId);
      
      const updatedChatHistory = project.chatHistory.filter(msg => msg.id !== messageId);
      
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
    
  // Scene generation tracking methods
  setSceneGenerating: (projectId: string, messageId: string, isGenerating: boolean) =>
    set((state) => {
      const currentSet = state.generatingScenes[projectId] || new Set<string>();
      const newSet = new Set(currentSet);
      
      if (isGenerating) {
        newSet.add(messageId);
      } else {
        newSet.delete(messageId);
      }
      
      return {
        ...state,
        generatingScenes: {
          ...state.generatingScenes,
          [projectId]: newSet
        }
      };
    }),
    
  isSceneGenerating: (projectId: string, messageId: string) => {
    const state = get();
    const projectSet = state.generatingScenes[projectId];
    return projectSet ? projectSet.has(messageId) : false;
  },
  
  clearAllGeneratingScenes: (projectId: string) =>
    set((state) => ({
      ...state,
      generatingScenes: {
        ...state.generatingScenes,
        [projectId]: new Set<string>()
      }
    })),
    
  // Draft message persistence
  setDraftMessage: (projectId: string, message: string) =>
    set((state) => {
      if (!state.projects[projectId]) return state;
      
      return {
        ...state,
        projects: {
          ...state.projects,
          [projectId]: {
            ...state.projects[projectId],
            draftMessage: message
          }
        }
      };
    }),
    
  getDraftMessage: (projectId: string) => {
    const state = get();
    const project = state.projects[projectId];
    return project?.draftMessage || '';
  },
}),
    {
      name: 'bazaar-video-state',
      storage: createJSONStorage(() => localStorage),
      // Only persist essential data, exclude real-time state
      partialize: (state) => ({
        projects: state.projects,
        currentProjectId: state.currentProjectId,
        selectedScenes: state.selectedScenes,
        // Don't persist chat history (too large), refreshTokens, or generating state
      }),
      // Handle Sets in generatingScenes by not persisting them
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Reset non-persistent state
          state.chatHistory = {};
          state.refreshTokens = {};
          state.lastSyncTime = 0;
          state.pendingDbSync = {};
          state.generatingScenes = {};
        }
      },
    }
  )
);