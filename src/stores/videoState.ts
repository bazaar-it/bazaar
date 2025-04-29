"use client";

import { create } from "zustand";
import { applyPatch } from "fast-json-patch";
import type { Operation } from "fast-json-patch";
import type { InputProps } from "../types/input-props";

// Define chat message type for client-side optimistic updates
export interface ChatMessage {
  id: string;
  message: string;
  isUser: boolean;
  timestamp: number;
}

// Define database message type to match what comes from the API
export interface DbMessage {
  id: string;
  projectId: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt: Date;
}

interface VideoState {
  // Store data per project ID
  projects: Record<string, {
    props: InputProps;
    chatHistory: ChatMessage[];
    // Track if we've loaded the full database messages
    dbMessagesLoaded: boolean;
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
  
  // Sync with database messages (replaces optimistic ones when db data arrives)
  syncDbMessages: (projectId: string, dbMessages: DbMessage[]) => void;
  
  // Clear optimistic messages (e.g., when switching projects)
  clearOptimisticMessages: (projectId: string) => void;
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
    set((state) => {
      // If project already exists, just update the current ID
      if (state.projects[projectId]) {
        return {
          currentProjectId: projectId
        };
      }
      
      // Otherwise create a new project entry
      return {
        currentProjectId: projectId,
        projects: {
          ...state.projects,
          [projectId]: {
            props: initialProps,
            chatHistory: getDefaultChatHistory(),
            dbMessagesLoaded: false
          }
        }
      };
    }),

  applyPatch: (projectId, patch) =>
    set((state) => {
      // Skip if project doesn't exist
      if (!state.projects[projectId]) return state;
      
      try {
        // Apply patch to create new props
        const newProps = applyPatch(
          structuredClone(state.projects[projectId].props), 
          patch, 
          /* validate */ true
        ).newDocument;
        
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
    
  syncDbMessages: (projectId, dbMessages) =>
    set((state) => {
      // Skip if project doesn't exist
      if (!state.projects[projectId]) return state;
      
      // For a real app, you'd convert DB messages to the client format more carefully
      // and potentially merge with pending optimistic updates
      
      // Here we're just clearing optimistic updates when db data arrives
      return {
        ...state,
        projects: {
          ...state.projects,
          [projectId]: {
            ...state.projects[projectId],
            // We no longer need optimistic messages if we have real ones
            // In a real app, you might want to keep any pending ones
            chatHistory: [],
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
    })
})); 