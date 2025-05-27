"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { api } from "~/trpc/react";
import { useVideoState } from '~/stores/videoState';
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
  const { getCurrentProps } = useVideoState();
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

  // Helper function to clear all optimistic messages (when real messages arrive)
  const clearOptimisticMessages = useCallback(() => {
    setOptimisticMessages([]);
  }, []);

  // Combine database messages with optimistic messages for display
  const allMessages = useMemo(() => {
    // Filter and type-guard database messages to ensure they have valid roles
    const validDbMessages = (dbMessages || [])
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .map(msg => ({ 
        ...msg, 
        isOptimistic: false as const,
        role: msg.role as 'user' | 'assistant' // Type assertion since we filtered above
      }));
    
    const combined: (DbMessage | OptimisticMessage)[] = [
      ...validDbMessages,
      ...optimisticMessages
    ];
    
    // Sort by creation time
    return combined.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }, [dbMessages, optimisticMessages]);

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
    
    return title.length > 40 ? title.substring(0, 37) + '...' : title;
  }, []);
  
  // OPTIMIZATION #1: Use MCP scene generation instead of legacy
  const generateSceneWithChatMutation = api.generation.generateScene.useMutation({
    onSuccess: (result: any) => {
      console.log("✅ Unified scene generation completed:", result);
      setIsGenerating(false);
      setGenerationComplete(true);
      
      // OPTIMIZATION #2: Add scene directly to video state instead of full refetch
      if (onSceneGenerated && result.scene) {
        console.log('[ChatPanelG] Calling onSceneGenerated callback for scene:', result.scene.id);
        onSceneGenerated(result.scene.id, result.scene.tsxCode);
      }
      
      // Refetch messages to show the assistant response
      setTimeout(() => {
        void refetchMessages();
      }, 100);
    },
    onError: (error: any) => {
      console.error("❌ Unified scene generation failed:", error);
      setIsGenerating(false);
      toast.error(`Scene generation failed: ${error.message}`);
      
      void refetchMessages();
    }
  });

  // Scene removal mutation
  const removeSceneMutation = api.generation.removeScene.useMutation({
    onSuccess: (result: any) => {
      console.log("✅ Scene removal completed:", result);
      setIsGenerating(false);
      setGenerationComplete(true);
      
      // Trigger video state refresh to remove the scene from UI
      if (onSceneGenerated) {
        console.log('[ChatPanelG] Calling onSceneGenerated callback to refresh after removal');
        onSceneGenerated('', ''); // Empty values to trigger refresh
      }
      
      // Refetch messages to show the assistant response
      setTimeout(() => {
        void refetchMessages();
      }, 100);
    },
    onError: (error: any) => {
      console.error("❌ Scene removal failed:", error);
      setIsGenerating(false);
      toast.error(`Scene removal failed: ${error.message}`);
      
      void refetchMessages();
    }
  });

  // Project rename mutation for first message (V1 logic)
  const renameMutation = api.project.rename.useMutation({
    onSuccess: (data: any) => {
      if (data?.title) {
        onProjectRename?.(data.title);
      }
    },
    onError: (error: any) => {
      console.error("Error renaming project:", error);
    }
  });

  // AI title generation mutation (V1 logic)
  const generateAITitleMutation = api.project.generateAITitle.useMutation();

  // Helper function to get scene by number (1-based indexing) (V1 logic)
  const getSceneByNumber = useCallback((sceneNumber: number): Scene | null => {
    if (!scenes || scenes.length === 0) return null;
    const index = sceneNumber - 1;
    return scenes[index] || null;
  }, [scenes]);

  // Helper function to get scene number by ID (V1 logic)
  const getSceneNumber = useCallback((sceneId: string): number | null => {
    if (!scenes || scenes.length === 0) return null;
    const index = scenes.findIndex(scene => scene.id === sceneId);
    return index >= 0 ? index + 1 : null;
  }, [scenes]);

  // Helper function to detect if a message is likely an edit command (V1 enhanced logic)
  const isLikelyEdit = useCallback((msg: string): boolean => {
    const trimmed = msg.trim();
    if (!trimmed) return false;
    
    // If no scenes exist, it can't be an edit
    if (scenes.length === 0) return false;
    
    // If no scene is selected, don't auto-tag as edit
    if (!selectedScene?.id) return false;
    
    // Split by spaces and filter out empty strings
    const words = trimmed.split(/\s+/).filter(word => word.length > 0);
    
    // LESS AGGRESSIVE EDIT DETECTION: Only treat as edit if there are clear edit indicators
    
    // Very short messages (1-2 words) with clear edit verbs
    if (words.length <= 2) {
      const shortEditVerbs = ['red', 'blue', 'green', 'bigger', 'smaller', 'faster', 'slower'];
      const hasShortEditVerb = shortEditVerbs.some(verb => trimmed.toLowerCase().includes(verb));
      return hasShortEditVerb;
    }
    
    // Medium messages (3-6 words) need edit indicators
    if (words.length <= 6) {
      const editIndicators = ['make', 'change', 'set', 'turn', 'fix', 'update', 'modify', 'adjust'];
      const hasEditIndicator = editIndicators.some(indicator => trimmed.toLowerCase().includes(indicator));
      return hasEditIndicator;
    }
    
    // Longer messages (7+ words) need strong edit verbs at the beginning
    const strongEditVerbs = ['change', 'make', 'set', 'turn', 'modify', 'update', 'fix', 'adjust'];
    const startsWithEditVerb = strongEditVerbs.some(verb => trimmed.toLowerCase().startsWith(verb));
    
    return startsWithEditVerb;
  }, [scenes, selectedScene]);

  // Helper function to detect scene removal commands
  const isRemovalCommand = useCallback((msg: string): { isRemoval: boolean; sceneNumber?: number; sceneId?: string } => {
    const trimmed = msg.trim().toLowerCase();
    
    // Check for removal patterns
    const removalPatterns = [
      /(?:remove|delete|del)\s+scene\s+(\d+)/i,
      /scene\s+(\d+)\s+(?:remove|delete|del)/i,
      /(?:remove|delete|del)\s+(\d+)/i,
    ];
    
    for (const pattern of removalPatterns) {
      const match = pattern.exec(trimmed);
      if (match?.[1]) {
        const sceneNumber = parseInt(match[1], 10);
        const targetScene = getSceneByNumber(sceneNumber);
        if (targetScene) {
          return { isRemoval: true, sceneNumber, sceneId: targetScene.id };
        }
      }
    }
    
    return { isRemoval: false };
  }, [getSceneByNumber]);

  // Helper function to convert scene IDs to user-friendly numbers in display messages
  const convertSceneIdToNumber = useCallback((msg: string): string => {
    // Replace @scene(uuid) with @scene(number) for display
    return msg.replace(/@scene\(([^)]+)\)/g, (match, sceneId) => {
      const sceneNumber = getSceneNumber(sceneId);
      return sceneNumber ? `@scene(${sceneNumber})` : match;
    });
  }, [getSceneNumber]);

  // Helper function to auto-tag messages with @scene(id) when appropriate (V1 logic)
  const autoTagMessage = useCallback((msg: string): string => {
    // If already tagged, return as-is
    if (msg.startsWith('@scene(')) return msg;
    
    // STEP 1: Check for scene removal commands
    const removalCheck = isRemovalCommand(msg);
    if (removalCheck.isRemoval && removalCheck.sceneId) {
      console.log(`[ChatPanelG] Detected removal command for scene ${removalCheck.sceneNumber} (${removalCheck.sceneId})`);
      return `@scene(${removalCheck.sceneId}) ${msg}`;
    }
    
    // STEP 2: Check for scene number syntax (@scene(1), @scene(2), etc.)
    const sceneNumberMatch = /\bscene\s+(\d+)\b/i.exec(msg);
    if (sceneNumberMatch && sceneNumberMatch[1]) {
      const sceneNumber = parseInt(sceneNumberMatch[1], 10);
      const targetScene = getSceneByNumber(sceneNumber);
      if (targetScene) {
        console.log(`[ChatPanelG] Converting "scene ${sceneNumber}" to @scene(${targetScene.id})`);
        return `@scene(${targetScene.id}) ${msg}`;
      } else {
        console.warn(`[ChatPanelG] Scene ${sceneNumber} not found (only ${scenes.length} scenes available)`);
        return msg;
      }
    }
    
    // STEP 3: Auto-detect edit commands for the selected scene
    if (!selectedScene?.id) return msg;
    
    const sceneId = selectedScene.id;
    
    // If it's a likely edit command, auto-tag it
    if (isLikelyEdit(msg)) {
      const sceneNumber = getSceneNumber(sceneId);
      const sceneName = selectedScene.data?.name || `Scene ${sceneNumber || '?'}`;
      console.log(`[ChatPanelG] Auto-tagging edit command for ${sceneName} (${sceneId})`);
      return `@scene(${sceneId}) ${msg}`;
    }
    
    return msg;
  }, [selectedScene, isLikelyEdit, isRemovalCommand, getSceneByNumber, getSceneNumber, scenes]);

  // Generate project name from first message (V1 logic)
  const generateNameFromPrompt = useCallback((prompt: string): string => {
    const cleanPrompt = prompt.replace(/[^\w\s]/g, '').trim();
    const words = cleanPrompt.split(/\s+/).slice(0, 4);
    let name = words.join(' ');
    
    if (name.length > 30) {
      name = name.substring(0, 27) + '...';
    }
    
    return name || 'New Video Project';
  }, []);

  // Handle form submission (V1 logic with V2 improvements + OPTIMISTIC UI)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isGenerating) return;
    
    const trimmedMessage = message.trim();
    
    // Check if no scene is selected for edit commands (V1 logic)
    if (isLikelyEdit(trimmedMessage) && !selectedScene) {
      toast.error('Please select a scene to edit first, or create a new scene with a descriptive prompt.');
      return;
    }
    
    // Generate project name from first message using AI (V1 logic)
    if (isFirstMessageRef.current && (!dbMessages || dbMessages.length === 0)) {
      console.log("Generating AI-powered title from first message...");
      
      generateAITitleMutation.mutate(
        {
          prompt: trimmedMessage,
          contextId: projectId
        },
        {
          onSuccess: (result: any) => {
            const generatedTitle = result.title;
            console.log(`Generated AI project name: "${generatedTitle}"`);
            
            renameMutation.mutate({
              id: projectId,
              title: generatedTitle,
            });
          },
          onError: (error: any) => {
            console.error("Error using AI title generation:", error);
            const fallbackName = generateNameFromPrompt(trimmedMessage);
            console.log(`Falling back to regex-based name: "${fallbackName}"`);
            
            renameMutation.mutate({
              id: projectId,
              title: fallbackName,
            });
          }
        }
      );
      
      isFirstMessageRef.current = false;
    }
    
    // Auto-tag the message if it's an edit command and a scene is selected (V1 logic)
    const processedMessage = autoTagMessage(trimmedMessage);
    
    console.log('Original message:', trimmedMessage);
    console.log('Processed message:', processedMessage);
    console.log('Selected scene:', selectedScene?.id);
    console.log('Is likely edit:', isLikelyEdit(trimmedMessage));
    
    // OPTIMISTIC UI: Immediately add user message to chat
    const displayMessage = convertSceneIdToNumber(processedMessage);
    const optimisticUserMessageId = addOptimisticUserMessage(displayMessage);
    
    // Clear the input immediately for better UX
    setMessage("");
    setCurrentPrompt(trimmedMessage);
    setIsGenerating(true);
    setGenerationComplete(false);
    
    // OPTIMISTIC UI: Add assistant loading message
    const optimisticAssistantMessageId = addOptimisticAssistantMessage('Generating scene...');
    
    // Check if this is a scene removal command
    const removalCheck = isRemovalCommand(trimmedMessage);
    
    if (removalCheck.isRemoval && removalCheck.sceneId) {
      console.log(`[ChatPanelG] Processing scene removal for scene ${removalCheck.sceneNumber}`);
      
      // Update optimistic assistant message for removal
      updateOptimisticMessage(optimisticAssistantMessageId, {
        content: `Removing scene ${removalCheck.sceneNumber}...`,
      });
      
      // Execute scene removal using the tRPC mutation
      try {
        const result = await removeSceneMutation.mutateAsync({
          projectId,
          sceneId: removalCheck.sceneId,
        });
        
        console.log('Scene removal result:', result);
        
        // Update optimistic assistant message with success
        updateOptimisticMessage(optimisticAssistantMessageId, {
          content: `Scene ${removalCheck.sceneNumber} removed successfully ✅`,
          status: 'success',
        });
        
        // Clear optimistic messages after a delay to let real messages load
        setTimeout(() => {
          clearOptimisticMessages();
          void refetchMessages();
        }, 1000);
        
      } catch (error) {
        console.error('Error during scene removal:', error);
        
        // Update optimistic assistant message with error
        updateOptimisticMessage(optimisticAssistantMessageId, {
          content: `Failed to remove scene ${removalCheck.sceneNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          status: 'error',
        });
        
        // Clear optimistic messages after a delay
        setTimeout(() => {
          clearOptimisticMessages();
          void refetchMessages();
        }, 2000);
      }
      
      return; // Exit early for removal commands
    }
    
    // Use ONLY the unified mutation (OPTIMIZATION #1)
    try {
      const isEditOperation = processedMessage.startsWith('@scene(') || 
                             (selectedScene && isLikelyEdit(trimmedMessage));
      
      console.log('[ChatPanelG] Operation type:', isEditOperation ? 'EDIT' : 'NEW_SCENE');
      console.log('[ChatPanelG] Scene ID to pass:', isEditOperation ? selectedScene?.id : undefined);
      console.log('[ChatPanelG] Auto-tagged message:', processedMessage);
      
      const result = await generateSceneWithChatMutation.mutateAsync({
        projectId,
        userMessage: processedMessage, // Send UUID version to backend
        sceneId: isEditOperation ? selectedScene?.id : undefined,
      });
      
      console.log('Scene generation result:', result);
      
      // Update optimistic assistant message with success
      updateOptimisticMessage(optimisticAssistantMessageId, {
        content: `Scene ${isEditOperation ? 'updated' : 'generated'} successfully ✅`,
        status: 'success',
      });
      
      // Clear optimistic messages after a delay to let real messages load
      setTimeout(() => {
        clearOptimisticMessages();
        void refetchMessages();
      }, 1000);
      
    } catch (error) {
      console.error('Error during scene generation:', error);
      
      // Update optimistic assistant message with error
      updateOptimisticMessage(optimisticAssistantMessageId, {
        content: `Scene generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'error',
      });
      
      // Clear optimistic messages after a delay
      setTimeout(() => {
        clearOptimisticMessages();
        void refetchMessages();
      }, 2000);
    }

    // Track chat message analytics
    const messageLength = processedMessage.length;
    const hasContext = scenes.length > 0;
    analytics.chatMessageSent(projectId, messageLength, hasContext);
  };

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

  // Get welcome message for new projects (V1 logic)
  const getWelcomeMessage = () => (
    <div className="text-center py-8">
      <div className="bg-muted/80 rounded-[15px] shadow-sm p-4 mx-auto max-w-md">
        <h3 className="font-medium text-base mb-2">Welcome to your new project!</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Describe what kind of video scene you want to create. For example:
        </p>
        <div className="text-left bg-primary/5 rounded-[15px] p-3 text-sm">
          <p className="mb-1">• "Create a gradient background in blue and purple"</p>
          <p className="mb-1">• "Add a title that says Hello World in the center"</p>
          <p className="mb-1">• "Make the title fade in and add a subtle animation"</p>
          <p className="mb-1">• "make it red" (when a scene is selected)</p>
        </div>
      </div>
    </div>
  );

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
  const showWelcome = !hasMessages && !isLoading;

  // Check if we have any existing messages on load (V1 logic)
  useEffect(() => {
    if (dbMessages && dbMessages.length > 0) {
      isFirstMessageRef.current = false;
    }
  }, [dbMessages]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages container */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-10">
            <Loader2Icon className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="ml-2 text-xs text-muted-foreground">Loading...</span>
          </div>
        ) : showWelcome ? (
          getWelcomeMessage()
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
              selectedScene 
                ? "Describe changes to this scene or create a new scene..."
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
          {selectedScene 
            ? `Edit commands will automatically target the ${selectedSceneId ? 'selected' : 'latest'} scene. Use descriptive prompts for new scenes.`
            : "Describe a scene to create your first animation. Once created, short commands will edit existing scenes."
          }
        </p>
      </div>
    </div>
  );
} 