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
  videoUrls?: string[]; // Support for uploaded videos
  audioUrls?: string[]; // Support for uploaded audio files
  sceneUrls?: string[]; // Support for scene attachments
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
  // Support for uploaded images
  imageUrls?: string[] | null;
  // Support for uploaded videos
  videoUrls?: string[] | null;
  // Support for uploaded audio files
  audioUrls?: string[] | null;
  // Support for scene attachments
  sceneUrls?: string[] | null;
}

// Define ProjectState interface
export interface AudioTrack {
  id: string;
  url: string;
  name: string;
  duration: number;
  startTime: number;
  endTime: number;
  // Where to place the audio segment on the video timeline (seconds)
  timelineOffsetSec?: number;
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

// Timeline action types for undo/redo
export type TimelineAction =
  | { type: 'deleteScene'; scene: any }
  | { type: 'reorder'; beforeOrder: string[]; afterOrder: string[] }
  | { type: 'updateDuration'; sceneId: string; prevDuration: number; newDuration: number }
  | { type: 'split'; sceneId: string; offset: number; leftBeforeDuration: number; rightSceneId: string }
  | { type: 'trimLeft'; originalScene: any; rightSceneId: string; offset: number }
  | { type: 'duplicate'; scene: any };

// Draft attachment interface
export interface DraftAttachment {
  id: string;
  status: 'uploading' | 'uploaded' | 'error';
  url?: string;
  error?: string;
  type?: 'image' | 'video' | 'audio' | 'scene';
  isLoaded?: boolean;
  duration?: number;
  name?: string;
  fileName?: string; // Store filename for reference
  fileSize?: number; // Store file size for reference
  mimeType?: string; // Store MIME type for reference
  // Scene-specific fields
  sceneId?: string;
  sceneIndex?: number;
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
  draftAttachments?: DraftAttachment[]; // Persist uploaded attachments when panels change
  playbackSpeed?: number; // Playback speed for preview and export (0.25-4.0)
}

// Code cache entry
interface CodeCacheEntry {
  prompt: string;
  tsxCode: string;
  name: string;
  duration: number;
  timestamp: number;
  hitCount: number;
}

interface VideoState {
  currentProjectId: string | null;
  projects: Record<string, ProjectState>;
  chatHistory: Record<string, ChatMessage[]>;
  refreshTokens: Record<string, number>;
  
  // CLIENT-SIDE CODE CACHE (saves 8-12 seconds on repeated prompts)
  codeCache: Map<string, CodeCacheEntry>;
  cacheStats: { hits: number; misses: number };
  
  // OPTIMIZATION #5: Scene selection state
  selectedScenes: Record<string, string | null>;
  
  // 🚨 NEW: Hybrid persistence state
  lastSyncTime: number;
  pendingDbSync: Record<string, boolean>; // Track which projects need DB sync
  
  // Track which scene plan messages are currently generating
  generatingScenes: Record<string, Set<string>>; // projectId -> Set of messageIds
  
  // Undo/Redo stacks per project (timeline-focused actions)
  undoStacks: Record<string, Array<TimelineAction> | null>;
  redoStacks: Record<string, Array<TimelineAction> | null>;
  // Persisted stacks timestamp for TTL pruning
  undoSavedAt?: Record<string, number>;
  
  // Actions
  setProject: (projectId: string, initialProps: InputProps, options?: { force?: boolean }) => void;
  replace: (projectId: string, newProps: InputProps) => void;
  getCurrentProps: () => InputProps | null;
  
  // 🚨 NEW: Reactive update that guarantees UI refresh
  updateAndRefresh: (projectId: string, updater: (props: InputProps) => InputProps) => void;
  
  // Chat management with hybrid persistence
  addUserMessage: (projectId: string, content: string, imageUrls?: string[], videoUrls?: string[], audioUrls?: string[], sceneUrls?: string[]) => void;
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
  
  // CLIENT-SIDE CODE CACHING
  getCachedCode: (projectId: string, prompt: string) => CodeCacheEntry | null;
  setCachedCode: (projectId: string, prompt: string, code: { tsxCode: string; name: string; duration: number }) => void;
  getCacheStats: () => { hits: number; misses: number; hitRate: number };
  clearCache: () => void;
  
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
  
  // Playback speed management
  setPlaybackSpeed: (projectId: string, speed: number) => void;
  getPlaybackSpeed: (projectId: string) => number;
  
  // Scene generation tracking
  setSceneGenerating: (projectId: string, messageId: string, isGenerating: boolean) => void;
  isSceneGenerating: (projectId: string, messageId: string) => boolean;
  clearAllGeneratingScenes: (projectId: string) => void;
  
  // Draft message persistence
  setDraftMessage: (projectId: string, message: string) => void;
  getDraftMessage: (projectId: string) => string;
  setDraftAttachments: (projectId: string, attachments: DraftAttachment[]) => void;
  getDraftAttachments: (projectId: string) => DraftAttachment[];
  clearDraft: (projectId: string) => void;
}

// Simple hash function for cache keys
const hashPrompt = (projectId: string, prompt: string): string => {
  const normalized = prompt.toLowerCase().trim().replace(/\s+/g, ' ');
  return `${projectId}:${normalized}`;
};

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
      undoStacks: {},
      redoStacks: {},
  
  // Initialize code cache
  codeCache: new Map(),
  cacheStats: { hits: 0, misses: 0 },
  
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
        content: m.content.substring(0, 30) + '...',
        hasAudioUrls: !!m.audioUrls && m.audioUrls.length > 0,
        audioUrlsCount: m.audioUrls?.length || 0
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
        jobId: null, // DB messages don't have jobId
        imageUrls: dbMessage.imageUrls || undefined, // Include uploaded images from database
        videoUrls: dbMessage.videoUrls || undefined, // Include uploaded videos from database
        audioUrls: dbMessage.audioUrls || undefined, // Include uploaded audio files from database
        sceneUrls: dbMessage.sceneUrls || undefined // Include scene attachments from database
      }));
      

      
      // Helper function to check if two messages are duplicates
      const isDuplicateMessage = (msg1: ChatMessage, msg2: ChatMessage) => {
        // Same role/type
        if (msg1.isUser !== msg2.isUser) return false;
        
        // Check if scene URLs are different - if so, they're NOT duplicates
        const sceneUrls1 = msg1.sceneUrls || [];
        const sceneUrls2 = msg2.sceneUrls || [];
        if (sceneUrls1.length !== sceneUrls2.length || 
            !sceneUrls1.every((url, index) => url === sceneUrls2[index])) {
          return false; // Different scene attachments = not duplicates
        }
        
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
        const sceneUrlsKey = dbMsg.sceneUrls?.join(',') || 'no-scenes';
        const contentKey = `${dbMsg.isUser ? 'user' : 'assistant'}-${dbMsg.message.substring(0, 50)}-scenes:${sceneUrlsKey}`;
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
          const sceneUrlsKey = clientMsg.sceneUrls?.join(',') || 'no-scenes';
          const contentKey = `${clientMsg.isUser ? 'user' : 'assistant'}-${clientMsg.message.substring(0, 50)}-scenes:${sceneUrlsKey}`;
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

  // ---- UNDO / REDO SUPPORT ----
  pushAction: (projectId: string, action: TimelineAction) => set((state) => {
    const stack = state.undoStacks[projectId] || [];
    return {
      undoStacks: { ...state.undoStacks, [projectId]: [...stack, action] },
      // Clear redo stack on new action
      redoStacks: { ...state.redoStacks, [projectId]: [] },
      undoSavedAt: { ...(state.undoSavedAt || {}), [projectId]: Date.now() },
    } as any;
  }),
  popUndo: (projectId: string): TimelineAction | null => {
    const state = get();
    const stack = state.undoStacks[projectId] || [];
    if (stack.length === 0) return null;
    const action = stack[stack.length - 1];
    if (!action) return null;
    state.undoStacks[projectId] = stack.slice(0, -1);
    state.undoSavedAt = { ...(state.undoSavedAt || {}), [projectId]: Date.now() };
    return action;
  },
  pushRedo: (projectId: string, action: TimelineAction) => set((state) => {
    const stack = state.redoStacks[projectId] || [];
    return { 
      redoStacks: { ...state.redoStacks, [projectId]: [...stack, action] },
      undoSavedAt: { ...(state.undoSavedAt || {}), [projectId]: Date.now() },
    } as any;
  }),
  popRedo: (projectId: string): TimelineAction | null => {
    const state = get();
    const stack = state.redoStacks[projectId] || [];
    if (stack.length === 0) return null;
    const action = stack[stack.length - 1];
    if (!action) return null;
    state.redoStacks[projectId] = stack.slice(0, -1);
    state.undoSavedAt = { ...(state.undoSavedAt || {}), [projectId]: Date.now() };
    return action;
  },
    
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
      if (movedScene) {
        scenes.splice(newIndex, 0, movedScene);
      }
      
      // Recalculate start times AND order field for all scenes
      let currentStart = 0;
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        if (scene) {
          scenes[i] = {
            ...scene,
            start: currentStart,
            order: i  // CRITICAL: Update order field to match new position!
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
  addUserMessage: (projectId: string, content: string, imageUrls?: string[], videoUrls?: string[], audioUrls?: string[], sceneUrls?: string[]) =>
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
        imageUrls: imageUrls, // Include uploaded images with message
        videoUrls: videoUrls, // Include uploaded videos with message
        audioUrls: audioUrls, // Include uploaded audio files with message
        sceneUrls: sceneUrls // Include scene attachments with message
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

  addPendingDelete: (projectId: string, sceneId: string) =>
    set((state) => {
      const map = (state as any).pendingDeleteIds || {};
      const setForProject = new Set(map[projectId] || []);
      setForProject.add(sceneId);
      return {
        ...(state as any),
        pendingDeleteIds: { ...map, [projectId]: setForProject }
      } as any;
    }),

  clearPendingDelete: (projectId: string, sceneId: string) =>
    set((state) => {
      const map = (state as any).pendingDeleteIds || {};
      const setForProject = new Set(map[projectId] || []);
      setForProject.delete(sceneId);
      return {
        ...(state as any),
        pendingDeleteIds: { ...map, [projectId]: setForProject }
      } as any;
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

  setDraftAttachments: (projectId: string, attachments: DraftAttachment[]) =>
    set((state) => {
      if (!state.projects[projectId]) return state;
      
      return {
        ...state,
        projects: {
          ...state.projects,
          [projectId]: {
            ...state.projects[projectId],
            draftAttachments: attachments
          }
        }
      };
    }),

  getDraftAttachments: (projectId: string) => {
    const state = get();
    const project = state.projects[projectId];
    return project?.draftAttachments || [];
  },

  clearDraft: (projectId: string) =>
    set((state) => {
      if (!state.projects[projectId]) return state;
      
      return {
        ...state,
        projects: {
          ...state.projects,
          [projectId]: {
            ...state.projects[projectId],
            draftMessage: undefined,
            draftAttachments: undefined
          }
        }
      };
    }),

  // CLIENT-SIDE CODE CACHING METHODS
  getCachedCode: (projectId: string, prompt: string) => {
    const state = get();
    const cacheKey = hashPrompt(projectId, prompt);
    const cached = state.codeCache.get(cacheKey);
    
    if (cached) {
      // Update stats and hit count
      set((state) => {
        const entry = state.codeCache.get(cacheKey);
        if (entry) {
          entry.hitCount++;
          state.codeCache.set(cacheKey, entry);
        }
        return {
          ...state,
          cacheStats: {
            ...state.cacheStats,
            hits: state.cacheStats.hits + 1
          }
        };
      });
      
      console.log(`💾 [Client Cache] HIT for "${prompt.slice(0, 50)}..." (saved ~8s)`);
      return cached;
    }
    
    // Update miss count
    set((state) => ({
      ...state,
      cacheStats: {
        ...state.cacheStats,
        misses: state.cacheStats.misses + 1
      }
    }));
    
    return null;
  },
  
  setCachedCode: (projectId: string, prompt: string, code: { tsxCode: string; name: string; duration: number }) => {
    set((state) => {
      const cacheKey = hashPrompt(projectId, prompt);
      const newCache = new Map(state.codeCache);
      
      // Limit cache size to 100 entries (LRU)
      if (newCache.size >= 100) {
        // Remove oldest entry (first in map)
        const firstKey = newCache.keys().next().value;
        if (firstKey) newCache.delete(firstKey);
      }
      
      newCache.set(cacheKey, {
        prompt,
        tsxCode: code.tsxCode,
        name: code.name,
        duration: code.duration,
        timestamp: Date.now(),
        hitCount: 0
      });
      
      console.log(`💾 [Client Cache] Stored code for "${prompt.slice(0, 50)}..."`);
      
      return {
        ...state,
        codeCache: newCache
      };
    });
  },
  
  getCacheStats: () => {
    const state = get();
    const total = state.cacheStats.hits + state.cacheStats.misses;
    return {
      hits: state.cacheStats.hits,
      misses: state.cacheStats.misses,
      hitRate: total > 0 ? state.cacheStats.hits / total : 0
    };
  },
  
  clearCache: () => {
    set((state) => ({
      ...state,
      codeCache: new Map(),
      cacheStats: { hits: 0, misses: 0 }
    }));
    console.log('🗑️ [Client Cache] Cleared all cached code');
  },

  setPlaybackSpeed: (projectId: string, speed: number) =>
    set((state) => {
      if (!state.projects[projectId]) return state;
      
      // Clamp speed to valid range
      const clampedSpeed = Math.max(0.25, Math.min(4, speed));
      
      return {
        ...state,
        projects: {
          ...state.projects,
          [projectId]: {
            ...state.projects[projectId],
            playbackSpeed: clampedSpeed
          }
        }
      };
    }),

  getPlaybackSpeed: (projectId: string) => {
    const state = get();
    const project = state.projects[projectId];
    return project?.playbackSpeed ?? 1.0;
  },
    }),
    {
      name: 'bazaar-video-state',
      storage: createJSONStorage(() => localStorage),
      // Persist only durable UI state. DO NOT persist chatHistory/streaming/refresh tokens.
      partialize: (state) => {
        const projects: Record<string, ProjectState> = {} as any;
        for (const [pid, p] of Object.entries(state.projects)) {
          projects[pid] = {
            // Persist props, audio, and a few UI prefs
            props: p.props,
            chatHistory: [], // never persist messages
            dbMessagesLoaded: false,
            activeStreamingMessageId: null,
            refreshToken: undefined,
            audio: p.audio ?? null,
            shouldOpenAudioPanel: p.shouldOpenAudioPanel ?? false,
            draftMessage: p.draftMessage ?? '',
            draftAttachments: p.draftAttachments ?? [],
            playbackSpeed: p.playbackSpeed ?? 1,
          };
        }
        return {
          projects,
          currentProjectId: state.currentProjectId,
          selectedScenes: state.selectedScenes,
          undoStacks: state.undoStacks,
          redoStacks: state.redoStacks,
          undoSavedAt: state.undoSavedAt,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Reset global ephemeral state
          state.chatHistory = {};
          state.refreshTokens = {};
          state.lastSyncTime = 0;
          state.pendingDbSync = {};
          state.generatingScenes = {};
          // Ensure per-project ephemerals are reset to avoid duplicate messages after refresh
          try {
            for (const pid of Object.keys(state.projects || {})) {
              const p = state.projects[pid]! as ProjectState;
              p.chatHistory = [];
              p.activeStreamingMessageId = null;
              p.refreshToken = undefined;
              p.dbMessagesLoaded = false;
            }
          } catch {}
          // TTL prune undo/redo (24h)
          try {
            const ttlMs = 24 * 60 * 60 * 1000;
            const now = Date.now();
            const savedAt = state.undoSavedAt || {};
            const undo = state.undoStacks || {};
            const redo = state.redoStacks || {};
            Object.keys(savedAt).forEach((pid) => {
              if (now - (savedAt[pid] || 0) > ttlMs) {
                undo[pid] = [] as any;
                redo[pid] = [] as any;
              }
            });
            state.undoStacks = undo as any;
            state.redoStacks = redo as any;
          } catch {}
        }
      },
    }
  )
);
