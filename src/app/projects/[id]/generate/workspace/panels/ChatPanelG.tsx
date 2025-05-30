"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { api } from "~/trpc/react";
import { useVideoState, type ChatMessage, type DbMessage as VideoStateDbMessage } from '~/stores/videoState';
// Renamed DbMessage import to avoid conflict with tRPC's inferred DbMessage type if any.
import { Loader2Icon, CheckCircleIcon, XCircleIcon, SendIcon, Mic, StopCircle, MicIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import { analytics } from '~/lib/analytics';
import { useVoiceToText } from '~/hooks/useVoiceToText';

interface Scene {
  id: string;
  type: string;
  start: number;
  duration: number;
  data?: {
    name?: string;
    code?: string;
    componentId?: string;
    props?: any;
    [key: string]: any;
  };
  props?: any;
  metadata?: any;
}

// Optimistic message type for immediate UI updates
interface OptimisticMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt: Date;
  status?: 'pending' | 'success' | 'error';
  isOptimistic: true;
}

// Database message type
interface DbMessage {
  id: string;
  projectId: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt: Date;
  status?: string | null; // Match database schema - can be null
  isOptimistic?: false;
}

export function ChatPanelG({
  projectId,
  selectedSceneId,
  onSceneGenerated,
  onProjectRename,
}: {
  projectId: string;
  selectedSceneId?: string | null;
  onSceneGenerated?: (sceneId: string, code: string) => void;
  onProjectRename?: (newTitle: string) => void;
}) {
  const [message, setMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationComplete, setGenerationComplete] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [optimisticMessages, setOptimisticMessages] = useState<OptimisticMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isFirstMessageRef = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Get video state and current scenes
  const { getCurrentProps, syncDbMessages, getProjectChatHistory } = useVideoState();
  const currentProps = getCurrentProps();
  const scenes = currentProps?.scenes || [];
  
  // Auto-select latest scene if none is selected and scenes exist (for edit-first behavior)
  const effectiveSelectedSceneId = selectedSceneId || (scenes.length > 0 ? scenes[scenes.length - 1]?.id : null);
  const selectedScene = effectiveSelectedSceneId ? scenes.find(s => s.id === effectiveSelectedSceneId) : null;
  
  // Database message fetching (V1 logic)
  const { data: dbMessages, isLoading: isLoadingMessages, refetch: refetchMessages } = 
    api.chat.getMessages.useQuery({ projectId });
    
  // Voice transcription
  const transcribe = api.voice.transcribe.useMutation({
    onSuccess: (data) => {
      setMessage((prev) => (prev ? `${prev} ${data.text}` : data.text));
    },
  });
  
  // Voice-to-text functionality
  const {
    recordingState,
    startRecording,
    stopRecording,
    transcription: voiceTranscription,
    error: voiceError,
    isSupported: isVoiceSupported,
  } = useVoiceToText();
  
  // Helper function to add optimistic user message
  const addOptimisticUserMessage = useCallback((content: string) => {
    const optimisticMessage: OptimisticMessage = {
      id: `optimistic-${Date.now()}-${Math.random()}`,
      content,
      role: 'user',
      createdAt: new Date(),
      status: 'success',
      isOptimistic: true,
    };
    
    setOptimisticMessages(prev => [...prev, optimisticMessage]);
    return optimisticMessage.id;
  }, []);

  // Helper function to add optimistic assistant message
  const addOptimisticAssistantMessage = useCallback((content: string = 'Generating scene...') => {
    const optimisticMessage: OptimisticMessage = {
      id: `optimistic-assistant-${Date.now()}-${Math.random()}`,
      content,
      role: 'assistant',
      createdAt: new Date(),
      status: 'pending',
      isOptimistic: true,
    };
    
    setOptimisticMessages(prev => [...prev, optimisticMessage]);
    return optimisticMessage.id;
  }, []);

  // Helper function to update optimistic message
  const updateOptimisticMessage = useCallback((id: string, updates: Partial<OptimisticMessage>) => {
    setOptimisticMessages(prev => 
      prev.map(msg => 
        msg.id === id ? { ...msg, ...updates } : msg
      )
    );
  }, []);
  
  // Helper function to clear all optimistic messages (when real messages arrive)
  const clearOptimisticMessages = useCallback(() => {
    setOptimisticMessages([]);
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isGenerating) return;
    
    const trimmedMessage = message.trim();
    
    setIsGenerating(true);
    setCurrentPrompt(trimmedMessage);
    
    // Clear the input immediately for better UX
    setMessage("");
    
    // Add optimistic user message
    const optimisticUserMessageId = addOptimisticUserMessage(trimmedMessage);
    
    // Add optimistic assistant message
    const optimisticAssistantMessageId = addOptimisticAssistantMessage("Assistant is working on it...");
    
    // Use the unified scene generation
    try {
      await generateSceneWithChatMutation.mutateAsync({
        projectId,
        userMessage: trimmedMessage,
        sceneId: effectiveSelectedSceneId || undefined,
      });
    } catch (error) {
      console.error('Error during scene generation:', error);
      setIsGenerating(false);
      // Error handling is done in the mutation onError callback
    }
  };

  // Combine database messages with optimistic messages for display
  // Effect to sync database messages with videoState
  useEffect(() => {
    console.log('[ChatPanelG] dbMessages useEffect triggered. isLoadingMessages:', isLoadingMessages, 'dbMessages:', dbMessages ? JSON.stringify(dbMessages).substring(0,300) + '...' : 'null');
    if (dbMessages) {
      // Filter messages to ensure they have a valid role and cast the role type
      const validRoleMessages = dbMessages
        .filter(msg => msg.role === 'user' || msg.role === 'assistant')
        .map((msg): VideoStateDbMessage => { // Explicitly type the return of map to VideoStateDbMessage
          const sanitizedStatus = (statusVal: string | null | undefined): 'pending' | 'success' | 'error' | 'building' | undefined => {
            if (statusVal === null || statusVal === undefined) return undefined;
            if (['pending', 'success', 'error', 'building'].includes(statusVal)) {
              return statusVal as 'pending' | 'success' | 'error' | 'building';
            }
            return undefined; // Default for unrecognized status strings
          };
          return {
            // Ensure all properties of VideoStateDbMessage are present and correctly typed
            id: msg.id,
            projectId: msg.projectId, // Assuming projectId is on msg from tRPC
            content: msg.content,
            role: msg.role as 'user' | 'assistant', // Already filtered
            createdAt: msg.createdAt, // Assuming createdAt is a Date object
            updatedAt: msg.updatedAt === null ? undefined : msg.updatedAt, // Convert null to undefined
            status: sanitizedStatus(msg.status),
            kind: msg.kind as 'text' | 'tool_result' | 'error' | 'status' | undefined, // Add kind if it's part of VideoStateDbMessage
          };
        });
      syncDbMessages(projectId, validRoleMessages); // Removed 'as DbMessage[]' cast as map now returns VideoStateDbMessage[] // Lint fix ID: 355b15d0-640a-4d10-a185-b1bba0b81a8c
    }
  }, [dbMessages, projectId, syncDbMessages]);

  // 🚨 SIMPLIFIED: Just show DB messages + simple optimistic messages
  const allMessages = useMemo(() => {
    // Get synchronized chat history from videoState (these are the real DB messages)
    const synchronizedHistory = getProjectChatHistory(projectId);
    
    // Convert to display format
    const dbMessages: (DbMessage | OptimisticMessage)[] = synchronizedHistory.map((chatMsg: ChatMessage) => ({
      id: chatMsg.id,
      projectId: projectId,
      content: chatMsg.message,
      role: chatMsg.isUser ? 'user' : 'assistant',
      status: 'success' as const,
      createdAt: new Date(chatMsg.timestamp),
    }));
    
    // Add optimistic messages (only if not already in DB)
    const allDisplayMessages = [...dbMessages];
    
    optimisticMessages.forEach(optimistic => {
      // Only add if not already in DB
      const alreadyInDb = dbMessages.some(db => 
        db.content === optimistic.content && 
        db.role === optimistic.role
      );
      
      if (!alreadyInDb) {
        allDisplayMessages.push(optimistic);
      }
    });
    
    // Sort by timestamp
    return allDisplayMessages.sort((a, b) => {
      const aTime = a.createdAt ? a.createdAt.getTime() : Date.now();
      const bTime = b.createdAt ? b.createdAt.getTime() : Date.now();
      return aTime - bTime;
    });
  }, [getProjectChatHistory, projectId, optimisticMessages]);

  // Auto-scroll function (V2 improvement)
  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, []);
  
  // Function to create contextual summary from user prompt (V2 improvement)
  const summarizePrompt = useCallback((prompt: string): string => {
    const cleanPrompt = prompt.replace(/@scene\([^)]+\)\s*/, '').trim();
    
    if (!cleanPrompt) return 'Custom scene';
    
    const words = cleanPrompt.split(/\s+/);
    const meaningfulWords = words.filter(word => {
      const lowerWord = word.toLowerCase();
      return word.length > 2 && 
             !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'she', 'use', 'her', 'way', 'many', 'then', 'them', 'well', 'were'].includes(lowerWord) &&
             !['make', 'create', 'add', 'show', 'with', 'that', 'this', 'have', 'will', 'want', 'need', 'lets', 'please'].includes(lowerWord);
    });
    
    if (meaningfulWords.length === 0) {
      return words.slice(0, 3).join(' ').toLowerCase();
    }
    
    const selectedWords = meaningfulWords.slice(0, 4);
    const title = selectedWords.map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
    
    return title || 'New Scene';
  }, []);

  // OPTIMIZATION #1: Use MCP scene generation instead of legacy
  const generateSceneWithChatMutation = api.generation.generateScene.useMutation({
    onMutate: async () => {
      // Don't add optimistic messages here - handleSubmit already does it
      return {};
    },
    onSuccess: (result: any, variables, context) => {
      console.log("✅ Unified scene generation completed:", result);
      setIsGenerating(false);
      setGenerationComplete(true);
      
      // CRITICAL FIX: Ensure scene persistence to video state
      if (result.scene) {
        console.log('[ChatPanelG] Persisting scene to video state:', result.scene.id);
        
        try {
          // Get video state functions
          const { addScene, updateScene, getCurrentProps } = useVideoState.getState();
          const currentProps = getCurrentProps();
          
          console.log('[ChatPanelG] Current props before update:', currentProps ? 'exist' : 'null');
          console.log('[ChatPanelG] Current scenes count:', currentProps?.scenes?.length || 0);
          
          // Check if this is an edit (scene already exists) or new scene
          const existingSceneIndex = currentProps?.scenes?.findIndex((s: any) => s.id === result.scene.id);
          const isEdit = existingSceneIndex !== -1;
          
          console.log('[ChatPanelG] Scene operation type:', isEdit ? 'EDIT' : 'NEW');
          
          if (isEdit) {
            console.log('[ChatPanelG] Updating existing scene in video state');
            updateScene(projectId, result.scene.id, {
              tsxCode: result.scene.tsxCode,
              name: result.scene.name,
              duration: result.scene.duration,
              props: result.scene.props || {}
            });
          } else {
            console.log('[ChatPanelG] Adding new scene to video state');
            addScene(projectId, {
              id: result.scene.id,
              name: result.scene.name,
              tsxCode: result.scene.tsxCode,
              duration: result.scene.duration,
              order: result.scene.order,
              props: result.scene.props || {}
            });
          }
          
          // Verify the update worked
          const updatedProps = getCurrentProps();
          console.log('[ChatPanelG] Scenes count after update:', updatedProps?.scenes?.length || 0);
          
          // Call the external callback if provided
          if (onSceneGenerated) {
            console.log('[ChatPanelG] Calling external onSceneGenerated callback');
            onSceneGenerated(result.scene.id, result.scene.tsxCode);
          }
          
        } catch (error) {
          console.error('[ChatPanelG] Error updating video state:', error);
          // Still call the external callback as fallback
          if (onSceneGenerated) {
            console.log('[ChatPanelG] Fallback: calling external callback after state error');
            onSceneGenerated(result.scene.id, result.scene.tsxCode);
          }
        }
      } else {
        console.warn('[ChatPanelG] No scene data in result:', result);
      }
      
      // 🚨 NEW: Clean up optimistic messages that match the real ones
      if (result.scene) {
        // Clear optimistic messages after a brief delay to allow UI to update
        setTimeout(() => {
          setOptimisticMessages(prev => 
            prev.filter(opt => {
              // Keep optimistic messages that don't have DB counterparts yet
              return !dbMessages?.some(db => 
                db.content === opt.content && 
                db.role === opt.role &&
                Math.abs(new Date(db.createdAt).getTime() - opt.createdAt.getTime()) < 60000 // Within 1 minute
              );
            })
          );
        }, 1000); // 1 second delay to ensure DB update
      }
      
      // Refetch messages to show the assistant response
      setTimeout(() => {
        void refetchMessages();
      }, 100);
    },
    onError: (error: any, variables, context) => {
      console.error("❌ Unified scene generation failed:", error);
      setIsGenerating(false);
      toast.error(`Scene generation failed: ${error.message}`);
      
      // 🚨 FIXED: Don't clear optimistic messages on error
      // Users should see their message and any error responses
      // clearOptimisticMessages();
      
      void refetchMessages();
    }
  });

  // Auto-scroll to bottom when messages change (V2 improvement)
  useEffect(() => {
    if (!generationComplete) {
      scrollToBottom();
    }
  }, [dbMessages, scrollToBottom, generationComplete]);

  // Separate effect for completion scroll (V2 improvement)
  useEffect(() => {
    if (generationComplete) {
      scrollToBottom();
    }
  }, [generationComplete, scrollToBottom]);

  // Format timestamp for display (V1 logic)
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Type guard for any message type (V1 logic + optimistic support)
  function isValidMessage(msg: any): msg is DbMessage | OptimisticMessage {
    return (
      typeof msg === 'object' && 
      msg !== null && 
      typeof msg.id === 'string' && 
      typeof msg.content === 'string' && 
      (msg.role === 'user' || msg.role === 'assistant') &&
      msg.createdAt instanceof Date
    );
  }

  // Status indicator component for tool messages (V1 logic)
  const getStatusIndicator = (status?: string | null) => {
    if (!status) return null;
    
    switch (status) {
      case "tool_calling":
      case "building":
      case "pending":
        return <Loader2Icon className="h-4 w-4 animate-spin text-primary mr-2" />;
      case "success":
        return <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />;
      case "error":
        return <XCircleIcon className="h-4 w-4 text-red-500 mr-2" />;
      default:
        return null;
    }
  };

  const hasMessages = allMessages && allMessages.length > 0;
  const isLoading = isLoadingMessages && !hasMessages;

  // Check if we have any existing messages on load (V1 logic)
  useEffect(() => {
    if (dbMessages && dbMessages.length > 0) {
      isFirstMessageRef.current = false;
    }
  }, [dbMessages]);

  // 🚨 FIXED: Simple polling without dependency issues
  useEffect(() => {
    const interval = setInterval(() => {
      void refetchMessages();
    }, 3000); // Every 3 seconds

    return () => clearInterval(interval);
  }, [projectId]); // Only depend on projectId, refetchMessages should be stable

  // Handle voice transcription results
  useEffect(() => {
    if (voiceTranscription && voiceTranscription.trim()) {
      setMessage(prev => {
        // If there's existing text, append with a space
        const newText = prev ? `${prev} ${voiceTranscription}` : voiceTranscription;
        return newText;
      });
    }
  }, [voiceTranscription]);

  // Handle voice errors
  useEffect(() => {
    if (voiceError) {
      console.error('[ChatPanelG] Voice error:', voiceError);
      // Error is already handled by the hook with toast, just log it
    }
  }, [voiceError]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Calculate new height (min 40px, max 10 lines ~200px)
      const newHeight = Math.min(Math.max(textarea.scrollHeight, 40), 200);
      textarea.style.height = `${newHeight}px`;
    }
  }, [message]);

  // Handle keyboard events for textarea
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!message.trim() || isGenerating) return;
      
      // Trigger form submission directly
      const form = e.currentTarget.closest('form');
      if (form) {
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);
      }
    }
  }, [message, isGenerating]);

  // Handle microphone button click
  const handleMicrophoneClick = useCallback(() => {
    if (recordingState === 'idle') {
      startRecording();
    } else if (recordingState === 'recording') {
      stopRecording();
    }
    // Do nothing during transcribing state
  }, [recordingState, startRecording, stopRecording]);

  // Check if content has multiple lines
  const hasMultipleLines = message.split('\n').length > 1 || message.includes('\n');

  // Get welcome message for new projects (from main2-Update)
  const getWelcomeMessage = () => (
    <div className="flex items-center justify-center min-h-[400px] py-8 px-4">
      <div className="bg-gradient-to-br from-white to-gray-50/80 rounded-2xl shadow-lg border border-gray-200/60 p-8 mx-auto max-w-3xl">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h3 className="text-2xl font-semibold text-gray-900 mb-3">Welcome to your new project</h3>
          <p className="text-gray-600 text-base leading-relaxed max-w-xl mx-auto">
            Create, edit or delete scenes — all with simple prompts.
          </p>
        </div>
        
        {/* Divider */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
          <span className="px-4 text-sm font-medium text-gray-500 bg-white rounded-full">Examples</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
        </div>
        
        {/* Examples Section */}
        <div className="space-y-6">
          {/* Create Example */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  Create
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">New Scene</span>
                </h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 text-sm leading-relaxed italic">
                    "Animate a hero section for Finance.ai. Use white text on a black background. Add a heading that says 'Smarter Finance. Powered by AI.' The subheading is 'Automate reports, optimize decisions, and forecast in real-time.' Use blue and white colors similar to Facebook's branding. At the bottom center, add a neon blue 'Try Now' button with a gentle pulsing animation."
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Edit Example */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  Edit
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Modify Scene</span>
                </h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 text-sm leading-relaxed italic">
                    "Make the header bold and increase font size to 120px."
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Delete Example */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  Delete
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">Remove Scene</span>
                </h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 text-sm leading-relaxed italic">
                    "Delete the CTA scene."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-center text-sm text-gray-500">
            💡 <strong>Tip:</strong> Be specific with colors, fonts, animations, and layout for best results
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Messages container */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-10">
            <Loader2Icon className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="ml-2 text-xs text-muted-foreground">Loading...</span>
          </div>
        ) : (
          <>
            {/* Render combined messages (database + optimistic) */}
            {hasMessages && allMessages.map((msg) => {
              if (!isValidMessage(msg)) return null;
              
              const isUser = msg.role === 'user';
              const isError = msg.status === 'error';
              const isSuccess = msg.status === 'success';
              const isGenerating = msg.status === 'building' || msg.status === 'tool_calling' || msg.status === 'pending';
              const isOptimistic = 'isOptimistic' in msg && msg.isOptimistic;
              
              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-[15px] px-4 py-3 ${
                      isUser
                        ? 'bg-primary text-primary-foreground'
                        : isError
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : isSuccess
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : isGenerating
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-muted text-muted-foreground border'
                    } ${isOptimistic ? 'opacity-90' : ''}`}
                  >
                    {isUser ? (
                      // User messages: plain text only, no icons or markdown
                      <div>
                        <div className="text-sm">
                          {msg.content}
                        </div>
                        <div className="text-[10px] opacity-50 mt-2">
                          <span>{formatTimestamp(msg.createdAt.getTime())}</span>
                        </div>
                      </div>
                    ) : (
                      // Assistant messages: keep icons and markdown
                      <div>
                        <div className="flex items-center">
                          {isGenerating && <Loader2Icon className="h-4 w-4 animate-spin mr-2" />}
                          {isSuccess && <CheckCircleIcon className="h-4 w-4 mr-2" />}
                          {isError && <XCircleIcon className="h-4 w-4 mr-2" />}
                          
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                        
                        <div className="text-[10px] opacity-50 mt-2 flex items-center gap-2">
                          <span>{formatTimestamp(msg.createdAt.getTime())}</span>
                          {isOptimistic && <span className="text-blue-500">•</span>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            
            {/* Show welcome message when no messages */}
            {!hasMessages && !isLoading && getWelcomeMessage()}
          </>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input form */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200">
        <form onSubmit={handleSubmit} className="flex gap-2 items-start">
          <div className={`flex-1 relative flex border border-input rounded-md bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ${hasMultipleLines ? 'items-start' : 'items-center'}`}>
            {/* Microphone button */}
            {isVoiceSupported && (
              <Button
                type="button"
                onClick={handleMicrophoneClick}
                size="sm"
                variant="ghost"
                className={`flex-shrink-0 h-8 w-8 p-1 m-1 ${
                  recordingState === 'recording' 
                    ? 'text-red-500 hover:text-red-600' 
                    : recordingState === 'transcribing'
                    ? 'text-blue-500'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
                disabled={recordingState === 'transcribing'}
              >
                {recordingState === 'transcribing' ? (
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                ) : (
                  <MicIcon className="h-4 w-4" />
                )}
              </Button>
            )}
            
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe a scene to create or edit an existing one..."
              className="flex-1 resize-none bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 min-h-[40px] max-h-[200px] overflow-y-auto border-0"
              onKeyDown={handleKeyDown}
              rows={1}
            />
            
            {/* Send button */}
            <Button 
              type="submit" 
              disabled={!message.trim() || isGenerating}
              size="sm"
              variant="ghost"
              className="flex-shrink-0 h-8 w-8 p-1 m-1"
            >
              {isGenerating ? (
                <Loader2Icon className="h-4 w-4 animate-spin" />
              ) : (
                <SendIcon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 