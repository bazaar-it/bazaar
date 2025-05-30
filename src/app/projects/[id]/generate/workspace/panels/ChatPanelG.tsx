"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { api } from "~/trpc/react";
import { useVideoState } from '~/stores/videoState';
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
  
  // Voice-to-text functionality
  const {
    recordingState,
    startRecording,
    stopRecording,
    transcription,
    error: voiceError,
    isSupported: isVoiceSupported,
  } = useVoiceToText();
  
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
  
  // Query to get current project details
  const { data: currentProject, refetch: refetchProject } = api.project.getById.useQuery({ id: projectId });

  // OPTIMIZATION #1: Use unified scene generation with chat persistence and MCP
  const generateSceneWithChatMutation = api.generation.generateSceneWithChat.useMutation({
    onSuccess: async (result: any) => {
      console.log("✅ Unified scene generation completed:", result);
      setIsGenerating(false);
      setGenerationComplete(true);
      
      // OPTIMIZATION #2: Add scene directly to video state instead of full refetch
      if (onSceneGenerated && result.scene) {
        console.log('[ChatPanelG] Calling onSceneGenerated callback for scene:', result.scene.id);
        onSceneGenerated(result.scene.id, result.scene.tsxCode);
      }
      
      // Check if this was the first scene and project title might have been updated
      if (scenes.length === 0 && onProjectRename) {
        try {
          // Refetch project to get updated title
          const updatedProject = await refetchProject();
          if (updatedProject.data && updatedProject.data.title !== currentProject?.title) {
            console.log('[ChatPanelG] Project title updated, notifying parent:', updatedProject.data.title);
            onProjectRename(updatedProject.data.title);
          }
        } catch (error) {
          console.error('[ChatPanelG] Failed to check for title update:', error);
        }
      }
      
      // Don't refetch immediately - let optimistic UI handle the success state
      // The real messages will be loaded when user sends next message or page refreshes
    },
    onError: (error: any) => {
      console.error("❌ Unified scene generation failed:", error);
      setIsGenerating(false);
      toast.error(`Scene generation failed: ${error.message}`);
      
      // Only refetch on error to show error message from server
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
      
      // Don't refetch immediately - let optimistic UI handle the success state
    },
    onError: (error: any) => {
      console.error("❌ Scene removal failed:", error);
      setIsGenerating(false);
      toast.error(`Scene removal failed: ${error.message}`);
      
      // Only refetch on error to show error message from server
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
    
    // OPTIMISTIC UI: Immediately add user message to chat (show original input, not processed)
    const optimisticUserMessageId = addOptimisticUserMessage(trimmedMessage);
    
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
          content: `Scene ${removalCheck.sceneNumber} removed ✅`,
          status: 'success',
        });
        
        // Keep optimistic messages - they'll be cleared when user sends next message
        
      } catch (error) {
        console.error('Error during scene removal:', error);
        
        // Update optimistic assistant message with error
        updateOptimisticMessage(optimisticAssistantMessageId, {
          content: `Failed to remove scene ${removalCheck.sceneNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          status: 'error',
        });
        
        // Keep error message visible - user can see what went wrong
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
      
      // Generate dynamic scene name for optimistic message
      const dynamicSceneName = summarizePrompt(trimmedMessage);
      
      // Update optimistic assistant message with success
      updateOptimisticMessage(optimisticAssistantMessageId, {
        content: `Scene ${isEditOperation ? 'updated' : 'generated'}: ${dynamicSceneName} ✅`,
        status: 'success',
      });
      
      // Keep optimistic messages - they'll be cleared when user sends next message
      
    } catch (error) {
      console.error('Error during scene generation:', error);
      
      // Update optimistic assistant message with error
      updateOptimisticMessage(optimisticAssistantMessageId, {
        content: `Scene generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'error',
      });
      
      // Keep error message visible - user can see what went wrong
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

  const hasMessages = allMessages && allMessages.length > 0;
  const isLoading = isLoadingMessages && !hasMessages;
  const showWelcome = !hasMessages && !isLoading;

  // Reset component state when projectId changes (for new projects)
  useEffect(() => {
    // Clear optimistic messages when switching projects
    setOptimisticMessages([]);
    setMessage("");
    setIsGenerating(false);
    setGenerationComplete(false);
    setCurrentPrompt('');
    
    // Reset first message flag for new projects
    isFirstMessageRef.current = true;
    
    console.log('[ChatPanelG] Reset state for new project:', projectId);
  }, [projectId]);

  // Check if we have any existing messages on load (V1 logic)
  useEffect(() => {
    if (dbMessages && dbMessages.length > 0) {
      isFirstMessageRef.current = false;
    }
  }, [dbMessages]);

  // Handle voice transcription results
  useEffect(() => {
    if (transcription && transcription.trim()) {
      setMessage(prev => {
        // If there's existing text, append with a space
        const newText = prev ? `${prev} ${transcription}` : transcription;
        return newText;
      });
    }
  }, [transcription]);

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

  // Clear optimistic messages when new database messages arrive (to avoid duplicates)
  useEffect(() => {
    if (dbMessages && dbMessages.length > 0) {
      // Only clear optimistic messages if we have real messages from the database
      // This prevents duplicates when the server responds with persisted messages
      const hasRecentDbMessage = dbMessages.some(msg => {
        const messageAge = Date.now() - new Date(msg.createdAt).getTime();
        return messageAge < 10000; // Clear if there's a message from the last 10 seconds
      });
      
      if (hasRecentDbMessage) {
        console.log('[ChatPanelG] Clearing optimistic messages due to new database messages');
        setOptimisticMessages([]);
      }
    }
  }, [dbMessages]);

  // Check if content has multiple lines
  const hasMultipleLines = message.split('\n').length > 1 || message.includes('\n');

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
        
        <form onSubmit={handleSubmit} className="flex gap-2 items-start">
          <div className={`flex-1 relative flex border border-input rounded-md bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ${hasMultipleLines ? 'items-start' : 'items-center'}`}>
            {/* Microphone button - Integrated inside input field (from HEAD) */}
            {isVoiceSupported && (
              <Button
                type="button"
                onClick={handleMicrophoneClick}
                size="sm"
                variant="ghost"
                className={`flex-shrink-0 h-8 w-8 p-1 m-1 ${(
                  recordingState === 'recording' 
                    ? 'text-red-500 hover:text-red-600' 
                    : recordingState === 'transcribing'
                    ? 'text-blue-500'
                    : 'text-gray-400 hover:text-gray-600'
                )}`}
                disabled={recordingState === 'transcribing'}
              >
                {recordingState === 'transcribing' ? (
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                ) : recordingState === 'recording' ? (
                  <StopCircle className="h-4 w-4" />
                ) : (
                  <MicIcon className="h-4 w-4" />
                )}
              </Button>
            )}
            
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                selectedScene 
                  ? "Describe changes to this scene or create a new scene..."
                  : "Describe the scene you want to create..."
              }
              className="flex-1 resize-none bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 min-h-[40px] max-h-[200px] overflow-y-auto border-0"
              onKeyDown={handleKeyDown}
              rows={1}
            />
            
            {/* Send button - Inside input area */}
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