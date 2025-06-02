// src/app/projects/[id]/generate/workspace/panels/ChatPanelG.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { api } from "~/trpc/react";
import { useVideoState } from '~/stores/videoState';
import { useVoiceToText } from '~/hooks/useVoiceToText';
import { Card, CardContent } from "~/components/ui/card";
import { nanoid } from 'nanoid';
import { Loader2, CheckCircleIcon, XCircleIcon, Send, Mic, StopCircle, MicIcon, Plus, Edit, Trash2, RefreshCwIcon, ImageIcon } from 'lucide-react';

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

// Component message representation for UI display
interface ComponentMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  status?: "pending" | "error" | "success" | "building" | "tool_calling";
  kind?: "text" | "error" | "status" | "tool_result";
  imageUrls?: string[];
}

interface ChatPanelGProps {
  projectId: string;
  selectedSceneId: string | null;
  onSceneGenerated?: (sceneId: string) => void;
  onProjectRename?: (newName: string) => void;
}

export default function ChatPanelG({
  projectId,
  selectedSceneId,
  onSceneGenerated,
  onProjectRename,
}: ChatPanelGProps) {
  const [message, setMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationComplete, setGenerationComplete] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [optimisticMessages, setOptimisticMessages] = useState<OptimisticMessage[]>([]);
  const activeAssistantMessageIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isFirstMessageRef = useRef(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const [progressStage, setProgressStage] = useState<string | null>(null);
  const [editComplexityFeedback, setEditComplexityFeedback] = useState<string | null>(null);
  
  // 🚨 NEW: State for image uploads
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Voice-to-text functionality (SIMPLIFIED: single voice system)
  const {
    recordingState,
    startRecording,
    stopRecording,
    transcription,
    error: voiceError,
    isSupported: isVoiceSupported,
  } = useVoiceToText();
  
  // Get video state and current scenes
  const { getCurrentProps, replace, forceRefresh, updateAndRefresh, getProjectChatHistory, addUserMessage, addAssistantMessage, updateMessage } = useVideoState();
  const currentProps = getCurrentProps();
  const scenes = currentProps?.scenes || [];
  
  // 🚨 SIMPLIFIED: Scene context logic - let Brain LLM handle scene targeting
  const selectedScene = selectedSceneId ? scenes.find(s => s.id === selectedSceneId) : null;
  
  // ✅ SINGLE SOURCE OF TRUTH: Use only VideoState for messages
  const messages = getProjectChatHistory(projectId);
  
  // Convert VideoState messages to component format for rendering
  const componentMessages: ComponentMessage[] = messages.map(msg => ({
    id: msg.id,
    content: msg.message,
    isUser: msg.isUser,
    timestamp: new Date(msg.timestamp),
    status: msg.status,
    kind: msg.kind,
    imageUrls: msg.imageUrls,
  }));

  // ✅ FIXED: Use the correct tRPC endpoint
  const generateSceneMutation = api.generation.generateScene.useMutation();

  // Auto-scroll function
  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, []);
  
  // 🚨 CRITICAL FIX: Use getProjectScenes instead of getById to get actual scene data
  const { data: scenesData, refetch: refetchScenes } = api.generation.getProjectScenes.useQuery({ projectId: projectId });
  
  // 🚨 NEW: Get tRPC utils for cache invalidation
  const utils = api.useUtils();
  
  // Helper function to convert database scenes to InputProps format (same as page.tsx)
  const convertDbScenesToInputProps = useCallback((dbScenes: any[]) => {
    let currentStart = 0;
    const convertedScenes = dbScenes.map((dbScene) => {
      const sceneDuration = dbScene.duration || 150; 
      const scene = {
        id: dbScene.id,
        type: 'custom' as const,
        start: currentStart,
        duration: sceneDuration,
        data: {
          code: dbScene.tsxCode,
          name: dbScene.name,
          componentId: dbScene.id,
          props: dbScene.props || {}
        }
      };
      currentStart += sceneDuration;
      return scene;
    });
    
    return {
      meta: {
        title: currentProps?.meta?.title || 'New Project',
        duration: currentStart,
        backgroundColor: currentProps?.meta?.backgroundColor || '#000000'
      },
      scenes: convertedScenes
    };
  }, [currentProps]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (!generationComplete) {
      scrollToBottom();
    }
  }, [componentMessages, scrollToBottom, generationComplete]);

  // Separate effect for completion scroll
  useEffect(() => {
    if (generationComplete) {
      scrollToBottom();
    }
  }, [generationComplete, scrollToBottom]);

  // Format timestamp for display
  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // 🎯 NEW: Edit Complexity Feedback Messages
  const getComplexityFeedback = (complexity: string) => {
    const feedbackMap = {
      surgical: [
        "⚡ Quick fix coming up!",
        "🎯 Making that precise change...",
        "✂️ Surgical precision mode activated!",
        "🔧 Simple tweak in progress...",
        "⚡ Lightning-fast edit incoming!"
      ],
      creative: [
        "🎨 Let me work some creative magic...",
        "✨ Enhancing the design aesthetics...",
        "🎪 Time for some creative flair!",
        "🌟 Polishing this to perfection...",
        "🎭 Adding some artistic touches..."
      ],
      structural: [
        "🏗️ This is a bigger change — restructuring the layout...",
        "🔨 Doing some heavy lifting here...",
        "🏗️ Rebuilding the foundation...",
        "⚙️ Major reconstruction in progress...",
        "🏗️ Architectural changes incoming..."
      ]
    };

    const messages = feedbackMap[complexity as keyof typeof feedbackMap] || [];
    return messages[Math.floor(Math.random() * messages.length)] || "⚙️ Processing your request...";
  };

  // 🎯 PROGRESS: Continuous subtle messages until completion
  useEffect(() => {
    if (isGenerating) {
      // 50 subtle progress messages that loop until completion
      const progressMessages = [
        '🧠 Analyzing your request...',
        '🎨 Planning the design...',
        '✨ Gathering inspiration...',
        '🎬 Setting up the scene...',
        '⚡ Generating code...',
        '🎯 Fine-tuning details...',
        '🌟 Adding polish...',
        '🎪 Crafting animations...',
        '🎭 Perfecting timing...',
        '🎨 Mixing colors...',
        '✨ Sprinkling magic...',
        '🔧 Optimizing performance...',
        '🎵 Syncing rhythms...',
        '🌈 Balancing elements...',
        '🎪 Choreographing motion...',
        '🎯 Aligning components...',
        '✨ Enhancing visuals...',
        '🎬 Directing the scene...',
        '🎨 Painting pixels...',
        '⚡ Energizing animations...',
        '🌟 Illuminating details...',
        '🎭 Staging drama...',
        '🎪 Orchestrating flow...',
        '🎯 Targeting perfection...',
        '✨ Weaving wonder...',
        '🔧 Engineering elegance...',
        '🎵 Harmonizing elements...',
        '🌈 Colorizing creation...',
        '🎪 Choreographing chaos...',
        '🎯 Zeroing in...',
        '✨ Almost there...',
        '🎬 Final touches...',
        '🎨 Last brushstrokes...',
        '⚡ Finalizing magic...',
        '🌟 Polishing brilliance...',
        '🎭 Curtain rising...',
        '🎪 Show time approaching...',
        '🎯 Precision mode...',
        '✨ Creating wonder...',
        '🔧 Final adjustments...',
        '🎵 Perfect harmony...',
        '🌈 Vivid completion...',
        '🎪 Grand finale...',
        '🎯 Mission complete...',
        '✨ Masterpiece ready...',
        '🎬 And... action!',
        '🎨 Voilà!',
        '⚡ Lightning fast!',
        '🌟 Shining bright!',
        '🎭 Take a bow!'
      ];
      
      let messageIndex = 0;
      
      // Show edit complexity feedback immediately if available
      if (editComplexityFeedback) {
        setProgressStage(editComplexityFeedback);
        
        // Update the assistant message with complexity feedback
        if (activeAssistantMessageIdRef.current) {
          updateMessage(projectId, activeAssistantMessageIdRef.current, {
            content: editComplexityFeedback,
            status: 'building'
          });
        }
        
        // After 3 seconds, switch to regular progress messages
        setTimeout(() => {
          const firstMessage = progressMessages[0];
          if (firstMessage) {
            setProgressStage(firstMessage);
            if (activeAssistantMessageIdRef.current) {
              updateMessage(projectId, activeAssistantMessageIdRef.current, {
                content: firstMessage,
                status: 'building'
              });
            }
          }
        }, 3000);
      } else {
        // No complexity feedback, start with regular progress
        const firstMessage = progressMessages[0];
        if (firstMessage) {
          setProgressStage(firstMessage);
        }
      }
      
      const interval = setInterval(() => {
        messageIndex = (messageIndex + 1) % progressMessages.length;
        const currentMessage = progressMessages[messageIndex];
        
        if (currentMessage) {
          setProgressStage(currentMessage);
          
          // Update the assistant message with current progress
          if (activeAssistantMessageIdRef.current) {
            updateMessage(projectId, activeAssistantMessageIdRef.current, {
              content: currentMessage,
              status: 'building'
            });
          }
        }
      }, 2000); // Change every 2 seconds
      
      return () => {
        clearInterval(interval);
        setProgressStage(null);
        setEditComplexityFeedback(null);
      };
    }
  }, [isGenerating, projectId, updateMessage, editComplexityFeedback]);

  // 🎯 NEW: Listen for edit complexity from Brain LLM (would come from mutation result)
  const handleEditComplexityDetected = (complexity: string) => {
    const feedback = getComplexityFeedback(complexity);
    setEditComplexityFeedback(feedback);
  };

  // ✅ SIMPLIFIED: Single message submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isGenerating) return;

    const trimmedMessage = message.trim();
    
    // 🚨 NEW: Build user context with image URLs if available
    const userContext: Record<string, unknown> = {};
    if (selectedSceneId) {
      userContext.sceneId = selectedSceneId;
    }
    if (uploadedImages.length > 0) {
      const imageUrls = uploadedImages
        .filter(img => img.status === 'uploaded' && img.url)
        .map(img => img.url!);
      userContext.imageUrls = imageUrls;
      console.log('[ChatPanelG] 🖼️ Including images in chat submission:', imageUrls);
    }
    
    // ✅ SIMPLE: Add user message to VideoState
    addUserMessage(projectId, trimmedMessage, uploadedImages.length > 0 ? uploadedImages.filter(img => img.status === 'uploaded' && img.url).map(img => img.url!) : undefined);
    
    // ✅ SIMPLE: Add assistant loading message with progress simulation
    const assistantMessageId = `assistant-${Date.now()}`;
    activeAssistantMessageIdRef.current = assistantMessageId;
    addAssistantMessage(projectId, assistantMessageId, "🧠 Starting scene generation...");
    
    // 🚨 NEW: Start progress tracking with realistic steps
    const progressSteps = uploadedImages.length > 0 
      ? [
          "🖼️ Analyzing uploaded images...",
          "🎨 Extracting visual style and colors...", 
          "📐 Planning scene layout...",
          "⚡ Generating React/Remotion code...",
          "🎬 Compiling and saving scene..."
        ]
      : [
          "🧠 Understanding your request...",
          "📐 Planning scene layout...", 
          "⚡ Generating React/Remotion code...",
          "🎬 Compiling and saving scene..."
        ];
    
    let currentStep = 0;
    const progressInterval = setInterval(() => {
      if (currentStep < progressSteps.length - 1) {
        currentStep++;
        updateMessage(projectId, assistantMessageId, {
          content: progressSteps[currentStep],
          status: 'building'
        });
      }
    }, 3000); // Update every 3 seconds
    
    setMessage("");
    // 🚨 NEW: Clear uploaded images after submission (as per user feedback)
    setUploadedImages([]);
    setIsGenerating(true);

    try {
      console.log('[ChatPanelG] 🚀 Starting scene generation via generateSceneMutation...');
      
      const result = await generateSceneMutation.mutateAsync({
        projectId,
        userMessage: trimmedMessage,
        sceneId: selectedSceneId || undefined, // Convert null to undefined for type compatibility
        userContext: Object.keys(userContext).length > 0 ? userContext : undefined, // 🚨 NEW: Include user context with images
      });

      console.log('[ChatPanelG] ✅ Generation completed:', result);
      
      // 🚨 NEW: Clear progress interval once generation completes
      clearInterval(progressInterval);
      
      // 🚨 CRITICAL FIX: Update VideoState with latest scene data after successful operation
      if (result.success) {
        console.log('[ChatPanelG] 🔄 Scene operation successful, refreshing VideoState...');
        
        // ✅ STEP 1: Update assistant message with success status
        updateMessage(projectId, assistantMessageId, {
          content: result.chatResponse || 'Scene generated successfully! ✅',
          status: 'success'
        });
        
        try {
          // ✅ STEP 2: Invalidate tRPC cache FIRST to ensure fresh data
          console.log('[ChatPanelG] ♻️ Invalidating tRPC cache...');
          await utils.generation.getProjectScenes.invalidate({ projectId });
          
          // ✅ STEP 3: Fetch fresh data from database
          console.log('[ChatPanelG] 🔄 Fetching fresh scenes from database...');
          const updatedScenes = await refetchScenes();
          
          if (updatedScenes.data && updatedScenes.data.length > 0) {
            console.log('[ChatPanelG] ✅ Fetched updated scenes from database:', updatedScenes.data.length);
            
            // ✅ STEP 4: Convert database scenes to InputProps format
            const updatedProps = convertDbScenesToInputProps(updatedScenes.data);
            console.log('[ChatPanelG] ✅ Converted scenes to InputProps format');
            
            // ✅ STEP 5: Use updateAndRefresh for guaranteed UI updates
            console.log('[ChatPanelG] 🚀 Using updateAndRefresh for guaranteed state sync...');
            updateAndRefresh(projectId, () => updatedProps);
            
            console.log('[ChatPanelG] 🎬 VideoState updated with updateAndRefresh, all panels should refresh');
          } else {
            console.warn('[ChatPanelG] ⚠️ No scenes data returned from database query');
          }
        } catch (refreshError) {
          console.error('[ChatPanelG] ❌ Failed to refresh scene data:', refreshError);
          // Don't throw - the scene operation succeeded, just state sync failed
        }
      } else {
        // ✅ Handle failed operations
        console.error('[ChatPanelG] ❌ Scene operation failed:', result);
        updateMessage(projectId, assistantMessageId, {
          content: `Error: Scene generation failed`,
          status: 'error'
        });
      }

      // Handle callbacks
      if (result.scene?.id && onSceneGenerated) {
        onSceneGenerated(result.scene.id);
      }

    } catch (error) {
      // 🚨 NEW: Clear progress interval on error
      clearInterval(progressInterval);
      
      console.error('[ChatPanelG] ❌ Scene generation failed:', error);
      
      // Update message with error status
      updateMessage(projectId, assistantMessageId, {
        content: `❌ Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'error'
      });
    } finally {
      setIsGenerating(false);
      activeAssistantMessageIdRef.current = null;
      setGenerationComplete(true);
      
      // 🚨 NEW: Final cleanup - ensure interval is cleared
      clearInterval(progressInterval);
    }
  };

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

  // 🚨 NEW: Image upload functions
  const handleImageUpload = useCallback(async (files: File[]) => {
    const newImages: UploadedImage[] = files.map(file => ({
      id: nanoid(),
      file,
      status: 'uploading' as const,
    }));

    setUploadedImages(prev => [...prev, ...newImages]);

    // Upload each image to R2
    for (const image of newImages) {
      try {
        const formData = new FormData();
        formData.append('file', image.file);
        formData.append('projectId', projectId);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        const result = await response.json();
        
        setUploadedImages(prev => 
          prev.map(img => 
            img.id === image.id 
              ? { ...img, status: 'uploaded' as const, url: result.url }
              : img
          )
        );
      } catch (error) {
        console.error('Image upload failed:', error);
        setUploadedImages(prev => 
          prev.map(img => 
            img.id === image.id 
              ? { ...img, status: 'error' as const, error: error instanceof Error ? error.message : 'Upload failed' }
              : img
          )
        );
      }
    }
  }, [projectId]);

  // Handle file input change
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleImageUpload(files);
    }
    // Clear input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleImageUpload]);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );
    
    if (files.length > 0) {
      handleImageUpload(files);
    }
  }, [handleImageUpload]);

  // Reset component state when projectId changes (for new projects)
  useEffect(() => {
    // Clear optimistic messages when switching projects
    setOptimisticMessages([]);
    setMessage("");
    setIsGenerating(false);
    setGenerationComplete(false);
    setCurrentPrompt('');
    setEditComplexityFeedback(null);
    setUploadedImages([]); // 🚨 NEW: Clear uploaded images when switching projects
    
    // Reset first message flag for new projects
    isFirstMessageRef.current = true;
    
    console.log('[ChatPanelG] Reset state for new project:', projectId);
  }, [projectId]);

  // Check if we have any existing messages on load
  useEffect(() => {
    if (messages.length > 0) {
      isFirstMessageRef.current = false;
    }
  }, [messages]);

  // Check if content has multiple lines
  const hasMultipleLines = message.split('\n').length > 1 || message.includes('\n');

  // 🚨 NEW: Error fix state
  const [hasSceneError, setHasSceneError] = useState(false);
  const [sceneErrorDetails, setSceneErrorDetails] = useState<{
    sceneId: string;
    sceneName: string;
    errorMessage: string;
  } | null>(null);

  // 🚨 NEW: Listen for preview panel errors
  useEffect(() => {
    const handlePreviewError = (event: CustomEvent) => {
      const { sceneId, sceneName, error } = event.detail;
      console.log('[ChatPanelG] 🔧 Preview error detected:', { sceneId, sceneName, error });
      
      setHasSceneError(true);
      setSceneErrorDetails({
        sceneId,
        sceneName,
        errorMessage: error.message || String(error)
      });
    };

    window.addEventListener('preview-scene-error', handlePreviewError as EventListener);
    
    return () => {
      window.removeEventListener('preview-scene-error', handlePreviewError as EventListener);
    };
  }, []);

  // 🚨 NEW: Auto-fix function
  const handleAutoFix = async () => {
    if (!sceneErrorDetails) return;
    
    const fixPrompt = `🔧 AUTO-FIX: Scene "${sceneErrorDetails.sceneName}" has a Remotion error: "${sceneErrorDetails.errorMessage}". Please analyze and fix this scene automatically.`;
    
    // ✅ IMMEDIATE: Add user message to chat right away (like normal chat)
    addUserMessage(projectId, fixPrompt);
    
    // ✅ IMMEDIATE: Add assistant loading message
    const assistantMessageId = `assistant-fix-${Date.now()}`;
    activeAssistantMessageIdRef.current = assistantMessageId;
    addAssistantMessage(projectId, assistantMessageId, '🔧 Analyzing and fixing scene error...');
    
    setIsGenerating(true);
    setHasSceneError(false);
    
    try {
      const result = await generateSceneMutation.mutateAsync({
        projectId,
        userMessage: fixPrompt,
        sceneId: sceneErrorDetails.sceneId,
      });

      // ✅ CRITICAL: Force complete state refresh after successful fix
      if (result.success) {
        console.log('[ChatPanelG] 🔧 Auto-fix successful, force refreshing all state...');
        
        // ✅ STEP 1: Invalidate tRPC cache FIRST
        console.log('[ChatPanelG] ♻️ Auto-fix: Invalidating tRPC cache...');
        await utils.generation.getProjectScenes.invalidate({ projectId });
        
        // ✅ STEP 2: Fetch latest scene data
        console.log('[ChatPanelG] 🔄 Auto-fix: Fetching fresh scenes...');
        const updatedScenes = await refetchScenes();
        
        if (updatedScenes.data && updatedScenes.data.length > 0) {
          // ✅ STEP 3: Convert and update with guaranteed refresh
          const updatedProps = convertDbScenesToInputProps(updatedScenes.data);
          
          console.log('[ChatPanelG] 🚀 Auto-fix: Using updateAndRefresh for guaranteed sync...');
          updateAndRefresh(projectId, () => updatedProps);
          
          console.log('[ChatPanelG] ✅ Auto-fix complete - preview should show fixed scene');
        }
      }
      
    } catch (error) {
      console.error('Auto-fix failed:', error);
      
      // Update assistant message with error
      updateMessage(projectId, assistantMessageId, {
        content: `Auto-fix failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'error'
      });
    } finally {
      setIsGenerating(false);
      setSceneErrorDetails(null);
      activeAssistantMessageIdRef.current = null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages container */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {componentMessages.length === 0 ? (
          <div className="text-center p-8 space-y-6">
            {/* Welcome Header */}
            <div>
              <p className="text-lg font-medium">Welcome to your new project</p>
              <p className="text-sm text-muted-foreground mt-2">
                Create, edit or delete scenes — all with simple prompts.
              </p>
            </div>

            {/* Examples Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Examples</h3>
              
              <div className="grid gap-3">
                {/* Create Example */}
                <Card className="p-3 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setMessage("Animate a hero section for Finance.ai. Use white text on a black background. Add a heading that says 'Smarter Finance. Powered by AI.' The subheading is 'Automate reports, optimize decisions, and forecast in real-time.' Use blue and white colors similar to Facebook's branding. At the bottom center, add a neon blue 'Try Now' button with a gentle pulsing animation.")}>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <Plus className="w-4 h-4 text-green-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-green-800 mb-1">Create</div>
                      <div className="text-sm text-green-700 mb-2">New Scene</div>
                      <div className="text-xs text-green-600 leading-relaxed">
                        "Animate a hero section for Finance.ai. Use white text on a black background. Add a heading that says 'Smarter Finance. Powered by AI.' The subheading is 'Automate reports, optimize decisions, and forecast in real-time.' Use blue and white colors similar to Facebook's branding. At the bottom center, add a neon blue 'Try Now' button with a gentle pulsing animation."
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Edit Example */}
                <Card className="p-3 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setMessage("Make the header bold and increase font size to 120px.")}>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Edit className="w-4 h-4 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-blue-800 mb-1">Edit</div>
                      <div className="text-sm text-blue-700 mb-2">Modify Scene</div>
                      <div className="text-xs text-blue-600">
                        "Make the header bold and increase font size to 120px."
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Delete Example */}
                <Card className="p-3 bg-gradient-to-br from-red-50 to-pink-50 border-red-200 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setMessage("Delete the CTA scene.")}>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-red-800 mb-1">Delete</div>
                      <div className="text-sm text-red-700 mb-2">Remove Scene</div>
                      <div className="text-xs text-red-600">
                        "Delete the CTA scene."
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          componentMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.isUser ? "justify-end" : "justify-start"} mb-4`}
            >
              <Card
                className={`max-w-[80%] ${
                  msg.isUser
                    ? "bg-primary text-primary-foreground"
                    : msg.status === "error"
                    ? "bg-destructive/10 border-destructive"
                    : "bg-muted"
                }`}
              >
                <CardContent className="p-3">
                  <div className="space-y-2">
                    {/* 🚨 NEW: Show uploaded images for user messages */}
                    {msg.isUser && msg.imageUrls && msg.imageUrls.length > 0 && (
                      <div className="space-y-2 mb-2">
                        <div className="grid grid-cols-2 gap-2">
                          {msg.imageUrls.map((imageUrl, index) => (
                            <div key={index} className="relative">
                              <img 
                                src={imageUrl} 
                                alt={`Uploaded image ${index + 1}`}
                                className="w-full h-20 object-cover rounded border"
                              />
                              <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                                ✓
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-1 text-xs opacity-75">
                          <span>📎</span>
                          <span>{msg.imageUrls.length} image{msg.imageUrls.length > 1 ? 's' : ''} included</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="whitespace-pre-wrap text-sm flex items-center gap-2">
                      {msg.content}
                      {msg.status === "building" && (
                        <div className="flex space-x-1">
                          <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs opacity-70">
                      <span>{formatTimestamp(msg.timestamp)}</span>
                      {msg.status && msg.status !== "success" && (
                        <span className="capitalize flex items-center gap-1">
                          {msg.status === "pending" && <Loader2 className="h-3 w-3 animate-spin" />}
                          {msg.status === "building" && <Loader2 className="h-3 w-3 animate-spin" />}
                          {msg.status}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-4 border-t bg-gray-50/50">
        {/* Voice recording feedback */}
        {recordingState === 'recording' && (
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-blue-700">Listening... {transcription && `"${transcription}"`}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={stopRecording}
              className="ml-auto text-blue-700 hover:bg-blue-100"
            >
              <StopCircle className="h-4 w-4" />
              Stop
            </Button>
          </div>
        )}
        {voiceError && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            Error: {voiceError}
          </div>
        )}

        {/* 🚨 NEW: Auto-fix error banner */}
        {hasSceneError && sceneErrorDetails && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-red-700">
                  Scene Error Detected: {sceneErrorDetails.sceneName}
                </span>
              </div>
              <Button
                onClick={handleAutoFix}
                disabled={isGenerating}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 h-7"
              >
                {isGenerating ? (
                  <>
                    <RefreshCwIcon className="h-3 w-3 mr-1 animate-spin" />
                    Fixing...
                  </>
                ) : (
                  <>
                    🔧 Fix Automatically
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-red-600 mt-1">
              {sceneErrorDetails.errorMessage.substring(0, 100)}...
            </p>
          </div>
        )}

        {/* 🚨 NEW: Compact image preview area (only when images are uploading/uploaded) */}
        {uploadedImages.length > 0 && (
          <div className="mb-3 flex gap-2">
            {uploadedImages.map((image) => (
              <div key={image.id} className="relative w-12 h-12 rounded border bg-gray-50 flex items-center justify-center">
                {image.status === 'uploading' && (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                )}
                {image.status === 'uploaded' && (
                  <CheckCircleIcon className="h-4 w-4 text-green-500" />
                )}
                {image.status === 'error' && (
                  <XCircleIcon className="h-4 w-4 text-red-500" />
                )}
                {image.url && image.status === 'uploaded' && (
                  <img 
                    src={image.url} 
                    alt="Upload preview" 
                    className="absolute inset-0 w-full h-full object-cover rounded"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                selectedSceneId
                  ? "Describe changes to the selected scene..."
                  : "Describe your video or add a new scene..."
              }
              disabled={isGenerating || recordingState === 'recording'}
              className={`flex-1 pr-20 ${isDragOver ? 'border-blue-500 bg-blue-50' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            />
            
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {/* Gallery icon button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute right-12 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              disabled={isGenerating}
              aria-label="Upload images"
            >
              <ImageIcon className="h-5 w-5" />
            </button>

            {/* Voice recording button */}
            {isVoiceSupported && (
              <button
                type="button"
                onClick={recordingState === 'recording' ? stopRecording : startRecording}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full ${
                  recordingState === 'recording' 
                    ? 'text-red-500 animate-pulse' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                disabled={isGenerating}
                aria-label={recordingState === 'recording' ? 'Stop recording' : 'Start voice recording'}
              >
                {recordingState === 'recording' ? (
                  <Mic className="h-5 w-5" />
                ) : (
                  <MicIcon className="h-5 w-5" />
                )}
              </button>
            )}
          </div>
          <Button 
            type="submit" 
            disabled={!message.trim() || isGenerating || recordingState === 'recording'}
            className="min-w-[40px]"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
        {selectedSceneId && (
          <div className="text-xs text-muted-foreground mt-2 space-y-1">
            {/* <p>📍 Scene selected: {selectedScene?.data?.name || `Scene ${scenes.findIndex(s => s.id === selectedSceneId) + 1}`}</p> */}
            <p className="opacity-75">💡 Our AI targets scenes automatically — you can also specify which scene, if dont trust the beta</p>
          </div>
        )}
      </div>
    </div>
  );
} 

interface UploadedImage {
  id: string;
  file: File;
  status: 'uploading' | 'uploaded' | 'error';
  url?: string;
  error?: string;
}