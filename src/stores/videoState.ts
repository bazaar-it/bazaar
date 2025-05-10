// src/stores/videoState.ts
"use client";

import { create } from "zustand";
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

interface VideoState {
  // Store data per project ID
  projects: Record<string, {
    props: InputProps;
    chatHistory: ChatMessage[];
    // Track if we've loaded the full database messages
    dbMessagesLoaded: boolean;
    // Store active streaming messages
    activeStreamingMessageId?: string | null;
    // Store refresh token for forcing remounts
    refreshToken?: string;
  }>;
  currentProjectId: string | null;
  
  // Get current project's inputProps
  getCurrentProps: () => InputProps | null;
  
  // Get current project's chat history (for optimistic updates)
  getChatHistory: () => ChatMessage[];
  
  // Set the current project ID and its initial props
  setProject: (projectId: string, initialProps: InputProps) => void;
  
  // Apply a patch to the current project
  applyPatch: (projectId: string, patch: Operation[]) => void;
  
  // Replace props for a specific project
  replace: (projectId: string, next: InputProps) => void;
  
  // Add a temporary optimistic message to the chat history
  addMessage: (projectId: string, message: string, isUser: boolean) => void;
  
  // Add an assistant message with an ID from the server (for streaming)
  addAssistantMessage: (projectId: string, messageId: string, initialContent?: string) => void;
  
  // Update a message with new content or status information (for streaming)
  updateMessage: (projectId: string, messageId: string, updates: MessageUpdates) => void;
  
  // Sync with database messages (replaces optimistic ones when db data arrives)
  syncDbMessages: (projectId: string, dbMessages: DbMessage[]) => void;
  
  // Clear optimistic messages (e.g., when switching projects)
  clearOptimisticMessages: (projectId: string) => void;
  
  // Force refresh of preview components by generating a new refresh token
  forceRefresh: (projectId: string) => void;
}

// Default welcome message
const getDefaultChatHistory = (): ChatMessage[] => [
  {
    id: "system-welcome",
    message: "Welcome to your video editor! I can help you create beautiful animations with text, images, colors, and effects. Try saying:\n\n• \"Create a blue background with a bouncing red ball\"\n• \"Add a title that says 'My Amazing Video' with a fade-in animation\"\n• \"Create a split-screen with an image on the left and text on the right\"\n• \"Add a gradient background that transitions from purple to orange\"\n\nWhat would you like to create today?",
    isUser: false,
    timestamp: Date.now(),
  }
];

export const useVideoState = create<VideoState>((set, get) => ({
  projects: {},
  currentProjectId: null,

  getCurrentProps: () => {
    const { currentProjectId, projects } = get();
    if (!currentProjectId || !projects[currentProjectId]) return null;
    return projects[currentProjectId].props || null;
  },

  getChatHistory: () => {
    const { currentProjectId, projects } = get();
    if (!currentProjectId || !projects[currentProjectId]) return getDefaultChatHistory();
    return projects[currentProjectId].chatHistory || getDefaultChatHistory();
  },

  setProject: (projectId, initialProps) => 
    set((state) => ({
      currentProjectId: projectId,
      projects: {
        ...state.projects,
        [projectId]: {
          ...(state.projects[projectId] || {}),
          props: initialProps,
          chatHistory: state.projects[projectId]?.chatHistory || getDefaultChatHistory(),
          dbMessagesLoaded: state.projects[projectId]?.dbMessagesLoaded ?? false,
        }
      }
    })),

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
      // If project exists, just update its props
      if (state.projects[projectId]) {
        return {
          ...state,
          projects: {
            ...state.projects,
            [projectId]: {
              ...state.projects[projectId],
              props: next
            }
          }
        };
      }
      
      // Otherwise create a new project entry
      return {
        ...state,
        projects: {
          ...state.projects,
          [projectId]: {
            props: next,
            chatHistory: getDefaultChatHistory(),
            dbMessagesLoaded: false
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
      let combinedHistory = [...syncedMessages];
      
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
            chatHistory: combinedHistory,
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
    })
})); 