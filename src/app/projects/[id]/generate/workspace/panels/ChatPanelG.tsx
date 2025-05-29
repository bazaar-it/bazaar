"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { api } from "~/trpc/react";
import { useVideoState, type ChatMessage, type DbMessage as VideoStateDbMessage } from '~/stores/videoState';
// Renamed DbMessage import to avoid conflict with tRPC's inferred DbMessage type if any.
import { Loader2Icon, CheckCircleIcon, XCircleIcon, SendIcon, Mic, StopCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import { analytics } from '~/lib/analytics';

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
  
  // Handle voice recording
  const handleRecord = async () => {
    if (isRecording) {
      recorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Find supported MIME type for this browser
      const getMimeType = () => {
        const types = [
          'audio/webm',
          'audio/webm;codecs=opus',
          'audio/mp4',
          'audio/ogg;codecs=opus',
          'audio/wav'
        ];
        
        for (const type of types) {
          if (MediaRecorder.isTypeSupported(type)) {
            console.log(`Using supported MIME type: ${type}`);
            return type;
          }
        }
        
        // Fallback to default
        console.warn('No listed MIME type supported, using browser default');
        return '';
      };
      
      const mimeType = getMimeType();
      const recorderOptions = mimeType ? { mimeType } : {};
      
      // Create recorder with best supported format
      const recorder = new MediaRecorder(stream, recorderOptions);
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      recorder.onstop = async () => {
        // Get the actual MIME type that was used
        const actualType = recorder.mimeType || 'audio/webm';
        console.log(`Recording complete with MIME type: ${actualType}`);
        
        // Create blob with the recorder's actual MIME type
        const blob = new Blob(chunks, { type: actualType });
        
        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          toast.info('Transcribing audio...');
          transcribe.mutate({ 
            audio: base64, 
            mimeType: actualType
          });
        };
        reader.readAsDataURL(blob);
        
        // Cleanup
        stream.getTracks().forEach((t) => t.stop());
        setIsRecording(false);
      };
      
      recorderRef.current = recorder;
      // Set a timeslice to get data more frequently
      recorder.start(1000);
      setIsRecording(true);
      toast.success('Recording started');
    } catch (err) {
      console.error('Voice recording failed', err);
      toast.error('Failed to access microphone');
    }
  };

  // Helper function to remove optimistic message
  const removeOptimisticMessage = useCallback((id: string) => {
    setOptimisticMessages(prev => prev.filter(msg => msg.id !== id));
  }, []);

  // Helper function to clear only assistant optimistic messages (preserve user messages)
  const clearOptimisticAssistantMessages = useCallback(() => {
    setOptimisticMessages(prev => prev.filter(msg => msg.role === 'user'));
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

  // Scene removal mutation
  const removeSceneMutation = api.generation.removeScene.useMutation({
    onMutate: async () => {
      const optimisticAssistantMessageId = addOptimisticAssistantMessage("Assistant is working on it...");
      return { optimisticAssistantMessageId };
    },
    onSuccess: (result: any, variables, context) => {
      console.log("✅ Scene removal completed:", result);
      setIsGenerating(false);
      setGenerationComplete(true);
      
      // Trigger video state refresh specifically for removal
      // Instead of calling onSceneGenerated which expects scene data,
      // we'll trigger a direct refresh by refetching messages
      console.log('[ChatPanelG] Scene removed successfully, triggering UI refresh');
      
      // FIXED: Clear optimistic messages immediately when real messages arrive
      clearOptimisticMessages();
      
      // Update optimistic assistant message with success
      if (context?.optimisticAssistantMessageId) {
        updateOptimisticMessage(context.optimisticAssistantMessageId, { 
          content: "Scene removed!", 
          status: 'success', 
          createdAt: new Date() 
        });
      }
      
      // Refetch messages to show the assistant response
      setTimeout(() => {
        void refetchMessages();
      }, 100);
      
      // Trigger scene refresh if available
      if (onSceneGenerated) {
        // Call with special removal flag - empty strings indicate removal
        console.log('[ChatPanelG] Calling scene refresh after removal');
        onSceneGenerated('SCENE_REMOVED', '');
      }
    },
    onError: (error: any, variables, context) => {
      console.error("❌ Scene removal failed:", error);
      setIsGenerating(false);
      toast.error(`Scene removal failed: ${error.message}`);
      
      // FIXED: Clear optimistic messages on error too
      clearOptimisticMessages();
      
      // Update optimistic assistant message with error
      if (context?.optimisticAssistantMessageId) {
        updateOptimisticMessage(context.optimisticAssistantMessageId, { 
          content: `Error removing: ${error.message}`,
          status: 'error',
          createdAt: new Date()
        });
      }
      
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
                    
                    {/* Show status indicator for assistant messages (V1 logic) */}
                    {msg.role === 'assistant' && msg.status && (
                      <div className="flex items-center text-xs mt-2 opacity-70">
                        {getStatusIndicator(msg.status)}
                        <span>
                          {msg.status === 'tool_calling' && 'Generating scene...'}
                          {msg.status === 'building' && 'Building component...'}
                          {msg.status === 'pending' && 'Processing...'}
                          {msg.status === 'success' && 'Completed'}
                          {msg.status === 'error' && 'Error occurred'}
                        </span>
                      </div>
                    )}
                    
                    <div className="text-[10px] opacity-50 mt-2 flex items-center gap-2">
                      <span>{formatTimestamp(msg.createdAt.getTime())}</span>
                      {isOptimistic && <span className="text-blue-500">•</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input form */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200">
        {/* Context indicator (V1 logic) */}
        {selectedScene && (
          <div className="mb-2 text-xs text-muted-foreground bg-primary/10 rounded-md px-2 py-1">
            <span className="font-medium">
              {selectedSceneId ? 'Editing:' : 'Auto-selected for editing:'}
            </span> {(selectedScene as any).data?.name || selectedScene.type || `Scene ${selectedScene.id.slice(0, 8)}`}
            <span className="ml-2 opacity-70">
              {selectedSceneId ? '(manually selected)' : '(latest scene, edit commands will modify this)'}
            </span>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              selectedScene && !selectedScene.data?.isWelcomeScene && selectedScene.type !== "welcome"
                ? "Describe changes to this scene or create a new scene..."
                : scenes.length > 0
                ? "Describe a new scene or edit existing scenes..."
                : "Describe the scene you want to create..."
            }
            disabled={isGenerating}
            className="flex-1"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handleRecord}
            disabled={transcribe.isPending || isGenerating}
            size="sm"
            className="px-3"
          >
            {isRecording ? (
              <StopCircle className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
          <Button 
            type="submit" 
            disabled={!message.trim() || isGenerating}
            size="sm"
            className="px-3"
          >
            {isGenerating ? (
              <Loader2Icon className="h-4 w-4 animate-spin" />
            ) : (
              <SendIcon className="h-4 w-4" />
            )}
          </Button>
        </form>
        
        {/* Helper text (V1 logic) */}
        <p className="text-xs text-muted-foreground mt-2">
          {selectedScene && !selectedScene.data?.isWelcomeScene && selectedScene.type !== "welcome"
            ? `Edit commands will automatically target the ${selectedSceneId ? 'selected' : 'latest'} scene. Use descriptive prompts for new scenes.`
            : scenes.length > 0
            ? `You have ${scenes.length} scene${scenes.length === 1 ? '' : 's'}. Describe new scenes or use "scene 1", "scene 2" to edit existing ones.`
            : "Describe a scene to create your first animation. Once created, short commands will edit existing scenes."
          }
        </p>
      </div>
    </div>
  );
} 