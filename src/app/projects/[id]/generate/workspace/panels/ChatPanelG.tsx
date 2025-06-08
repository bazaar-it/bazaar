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
import { toast } from 'sonner';
import { Loader2, CheckCircleIcon, XCircleIcon, Send, Mic, StopCircle, MicIcon, Plus, Edit, Trash2, RefreshCwIcon, ImageIcon } from 'lucide-react';
import { cn } from "~/lib/utils";

// Define UploadedImage interface for image uploads
interface UploadedImage {
  id: string;
  file: File;
  status: 'uploading' | 'uploaded' | 'error';
  url?: string;
  error?: string;
}

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
  imageUrls?: string[] | null; // 🚨 FIXED: Added missing imageUrls field
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
  
  // 🚨 NEW: Voice error dismissal state
  const [showVoiceError, setShowVoiceError] = useState(false);
  
  // 🚨 NEW: Auto-expanding textarea state
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [textareaHeight, setTextareaHeight] = useState('40px');
  
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

  // ✅ CORRECT: Use the generation endpoint that goes through Brain Orchestrator
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
    
    // 🚨 NEW: Get image URLs from uploaded images
    const imageUrls = uploadedImages
      .filter(img => img.status === 'uploaded' && img.url)
      .map(img => img.url!);
    
    if (imageUrls.length > 0) {
      console.log('[ChatPanelG] 🖼️ Including images in chat submission:', imageUrls);
    }
    
    // ✅ SIMPLE: Add user message to VideoState
    addUserMessage(projectId, trimmedMessage, imageUrls.length > 0 ? imageUrls : undefined);
    
    // ✅ SIMPLE: Add assistant loading message  
    const assistantMessageId = `assistant-${Date.now()}`;
    activeAssistantMessageIdRef.current = assistantMessageId;
    addAssistantMessage(projectId, assistantMessageId, "🧠 Processing your request...");
    
    // 🚨 NEW: Immediately scroll to bottom after adding messages
    setTimeout(() => {
      scrollToBottom();
    }, 50);
    
    setMessage("");
    // 🚨 NEW: Clear uploaded images after submission (as per user feedback)
    setUploadedImages([]);
    setIsGenerating(true);

    try {
      console.log('[ChatPanelG] 🚀 Starting generation via Brain Orchestrator...');
      
      // ✅ CORRECT: Use generation endpoint that goes through Brain Orchestrator
      const result = await generateSceneMutation.mutateAsync({
        projectId,
        userMessage: trimmedMessage,
        sceneId: selectedSceneId || undefined,
        userContext: {
          sceneId: selectedSceneId || undefined,
          imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
        }
      });

      console.log('[ChatPanelG] ✅ Generation completed:', result);
      
      // ✅ Update assistant message with response from Brain Orchestrator
      const finalResponse = result.chatResponse || 'Scene operation completed! ✅';
      updateMessage(projectId, assistantMessageId, {
        content: finalResponse,
        status: 'success'
      });

      // 🚨 NEW: Scroll to bottom after updating assistant message
      setTimeout(() => {
        scrollToBottom();
      }, 100);
      
      try {
        // ✅ CRITICAL FIX: Force refresh scene data after successful operation
        console.log('[ChatPanelG] ♻️ CRITICAL: Starting forced state refresh...');
        
        // STEP 1: Invalidate all related caches
        await utils.generation.getProjectScenes.invalidate({ projectId });
        await utils.generation.invalidate(); // Invalidate entire generation namespace
        
        console.log('[ChatPanelG] 🔄 CRITICAL: Fetching fresh scenes from database...');
        
        // STEP 2: Force refetch with error handling
        let updatedScenes;
        try {
          updatedScenes = await refetchScenes();
        } catch (refetchError) {
          console.error('[ChatPanelG] ❌ CRITICAL: refetchScenes failed, trying direct query...', refetchError);
          // Fallback: Try to refetch manually
          updatedScenes = await utils.generation.getProjectScenes.fetch({ projectId });
        }
        
        console.log('[ChatPanelG] 📊 CRITICAL: Raw scenes data:', updatedScenes);
        
        if (updatedScenes) {
          // Handle different response formats from tRPC query
          const scenesArray = Array.isArray(updatedScenes) ? updatedScenes : updatedScenes.data;
          console.log('[ChatPanelG] ✅ CRITICAL: Fetched updated scenes from database:', scenesArray?.length || 0);
          
          if (scenesArray && scenesArray.length > 0) {
            const updatedProps = convertDbScenesToInputProps(scenesArray);
            console.log('[ChatPanelG] ✅ CRITICAL: Converted scenes to InputProps format:', updatedProps);
            
            console.log('[ChatPanelG] 🚀 CRITICAL: Forcing VideoState update with updateAndRefresh...');
            updateAndRefresh(projectId, () => updatedProps);
            
            console.log('[ChatPanelG] 🎬 CRITICAL: VideoState updated - all panels should refresh NOW');
            
            // STEP 3: Also force global VideoState refresh
            console.log('[ChatPanelG] 🔄 CRITICAL: Forcing VideoState global refresh...');
            useVideoState.getState().forceRefresh(projectId);
            
            // STEP 4: Manual dispatch of update event as backup
            console.log('[ChatPanelG] 📡 CRITICAL: Manually dispatching videostate-update event...');
            window.dispatchEvent(new CustomEvent('videostate-update', {
              detail: { 
                projectId,
                type: 'scenes-updated',
                refreshToken: Date.now().toString(),
                sceneCount: scenesArray?.length || 0
              }
            }));
            
            console.log('[ChatPanelG] ✅ CRITICAL: All refresh operations completed successfully');
            
          } else {
            console.error('[ChatPanelG] ❌ CRITICAL: No scenes in updated data - something is wrong');
          }
        } else {
          console.error('[ChatPanelG] ❌ CRITICAL: No scenes data returned from database query');
          
          // Last resort: Force reload the page after a short delay
          console.log('[ChatPanelG] 🚨 LAST RESORT: Will force page reload in 2 seconds if state sync failed');
          setTimeout(() => {
            console.log('[ChatPanelG] 🔄 FORCING PAGE RELOAD due to state sync failure');
            window.location.reload();
          }, 2000);
        }
      } catch (refreshError) {
        console.error('[ChatPanelG] ❌ CRITICAL: Refresh failed, but chat will continue:', refreshError);
        
        // 🚨 FALLBACK: Even if refresh fails, still try to notify other panels
        try {
          console.log('[ChatPanelG] 🔧 CRITICAL: Attempting fallback refresh...');
          useVideoState.getState().forceRefresh(projectId);
          
          // Force a manual event dispatch as last resort
          window.dispatchEvent(new CustomEvent('videostate-update', {
            detail: { 
              projectId,
              type: 'emergency-refresh',
              error: refreshError,
              timestamp: Date.now()
            }
          }));
          
          console.log('[ChatPanelG] ✅ CRITICAL: Fallback refresh completed');
        } catch (fallbackError) {
          console.error('[ChatPanelG] 💥 CRITICAL: Even fallback refresh failed:', fallbackError);
        }
      }

      // Handle callbacks
      if (onSceneGenerated && result.scene?.id) {
        onSceneGenerated(result.scene.id);
      }

    } catch (error) {
      console.error('[ChatPanelG] ❌ Chat flow failed:', error);
      
      // Update message with error status
      updateMessage(projectId, assistantMessageId, {
        content: `❌ Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'error'
      });
    } finally {
      setIsGenerating(false);
      activeAssistantMessageIdRef.current = null;
      setGenerationComplete(true);
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

  // Handle message input change
  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  }, []);

  // 🚨 NEW: Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '40px'; // Reset to button height first
      const scrollHeight = textareaRef.current.scrollHeight;
      const minHeight = 40; // Match button height
      const lineHeight = 24; // Approximate line height
      const maxLines = 6;
      const maxHeight = lineHeight * maxLines;
      
      const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
      textareaRef.current.style.height = `${newHeight}px`;
      setTextareaHeight(`${newHeight}px`);
    }
  }, []);

  // Auto-resize when message changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [message, adjustTextareaHeight]);

  // Handle microphone button click
  const handleMicrophoneClick = useCallback(() => {
    if (recordingState === 'idle') {
      startRecording();
    } else if (recordingState === 'recording') {
      stopRecording();
    }
    // Do nothing during transcribing state
  }, [recordingState, startRecording, stopRecording]);

  // 🚨 NEW: Delete uploaded image function
  const handleDeleteImage = useCallback((imageId: string) => {
    setUploadedImages(prev => prev.filter(img => img.id !== imageId));
  }, []);

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

  // 🎤 NEW: Auto-fill transcribed text into message input
  useEffect(() => {
    if (transcription && transcription.trim()) {
      console.log('[ChatPanelG] 🎤 Transcription complete, filling into message input:', transcription);
      
      // Auto-fill the transcribed text into the message input
      setMessage(prevMessage => {
        // If there's already text, append the transcription with a space
        const newMessage = prevMessage.trim() 
          ? `${prevMessage} ${transcription}` 
          : transcription;
        return newMessage;
      });
      
      // Optional: Show success toast
      toast.success(`Transcription complete: "${transcription.slice(0, 50)}${transcription.length > 50 ? '...' : ''}"`);
    }
  }, [transcription]);

  // 🚨 NEW: Show voice error when it occurs
  useEffect(() => {
    if (voiceError) {
      setShowVoiceError(true);
    }
  }, [voiceError]);

  // Check if content has multiple lines
  const hasMultipleLines = message.split('\n').length > 1 || message.includes('\n');

  // 🚨 NEW: Error fix state
  const [hasSceneError, setHasSceneError] = useState(false);
  const [sceneErrorDetails, setSceneErrorDetails] = useState<{
    sceneId: string;
    sceneName: string;
    errorMessage: string;
  } | null>(null);

  // 🚨 NEW: Auto-fix function (moved before useEffect that uses it)
  const handleAutoFix = useCallback(async () => {
    if (!sceneErrorDetails) {
      console.log('[ChatPanelG] 🔧 AUTOFIX DEBUG: No sceneErrorDetails available');
      return;
    }
    
    const fixPrompt = `🔧 AUTO-FIX: Scene "${sceneErrorDetails.sceneName}" has a Remotion error: "${sceneErrorDetails.errorMessage}". Please analyze and fix this scene automatically.`;
    
    console.log('[ChatPanelG] 🔧 AUTOFIX DEBUG: Starting autofix flow:', {
      sceneId: sceneErrorDetails.sceneId,
      sceneName: sceneErrorDetails.sceneName,
      errorMessage: sceneErrorDetails.errorMessage,
      fixPrompt: fixPrompt
    });
    
    // ✅ IMMEDIATE: Add user message to chat right away (like normal chat)
    addUserMessage(projectId, fixPrompt);
    
    // ✅ IMMEDIATE: Add assistant loading message
    const assistantMessageId = `assistant-fix-${Date.now()}`;
    activeAssistantMessageIdRef.current = assistantMessageId;
    addAssistantMessage(projectId, assistantMessageId, '🔧 Analyzing and fixing scene error...');
    
    setIsGenerating(true);
    setHasSceneError(false);
    
    console.log('[ChatPanelG] 🔧 AUTOFIX DEBUG: Sending fix request to backend...');
    
    try {
      const result = await generateSceneMutation.mutateAsync({
        projectId,
        userMessage: fixPrompt,
        sceneId: sceneErrorDetails.sceneId,
        userContext: {
          sceneId: sceneErrorDetails.sceneId,
          errorMessage: sceneErrorDetails.errorMessage,
          sceneName: sceneErrorDetails.sceneName,
          isAutoFix: true
        }
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
  }, [sceneErrorDetails, projectId, generateSceneMutation, utils, refetchScenes, convertDbScenesToInputProps, updateAndRefresh, addUserMessage, addAssistantMessage, updateMessage, activeAssistantMessageIdRef, setIsGenerating, setHasSceneError]);

  // 🚨 ENHANCED: Listen for preview panel errors with better debugging
  useEffect(() => {
    const handlePreviewError = (event: CustomEvent) => {
      const { sceneId, sceneName, error } = event.detail;
      console.log('[ChatPanelG] 🔧 AUTOFIX DEBUG: Preview error detected:', { 
        sceneId, 
        sceneName, 
        error: error?.message || String(error),
        errorType: typeof error,
        fullEvent: event.detail 
      });
      
      // 🚨 IMMEDIATE: Set error state to show autofix button
      setHasSceneError(true);
      setSceneErrorDetails({
        sceneId,
        sceneName,
        errorMessage: error?.message || String(error)
      });

      console.log('[ChatPanelG] 🔧 AUTOFIX DEBUG: Error state updated, autofix button should appear');
      
      // 🚨 ENHANCED: Also show a toast notification for immediate feedback
      toast.error(`Scene "${sceneName}" has an error - AutoFix available!`, {
        duration: 5000,
        action: {
          label: "Auto-Fix",
          onClick: () => {
            console.log('[ChatPanelG] 🔧 AUTOFIX: Toast action clicked');
            // The autofix button will handle this
          }
        }
      });
    };

    // 🚨 NEW: Also listen for direct autofix triggers from error boundaries
    const handleDirectAutoFix = (event: CustomEvent) => {
      const { sceneId, sceneName, error } = event.detail;
      console.log('[ChatPanelG] 🔧 AUTOFIX DEBUG: Direct autofix trigger received:', { 
        sceneId, 
        sceneName, 
        error 
      });
      
      // Set error state and immediately trigger autofix
      setSceneErrorDetails({
        sceneId,
        sceneName,
        errorMessage: error?.message || String(error)
      });
      
      // Immediately trigger autofix without waiting for button click
      setTimeout(() => {
        handleAutoFix();
      }, 100);
    };

    console.log('[ChatPanelG] 🔧 AUTOFIX DEBUG: Setting up preview-scene-error listener');
    window.addEventListener('preview-scene-error', handlePreviewError as EventListener);
    window.addEventListener('trigger-autofix', handleDirectAutoFix as EventListener);
    
    return () => {
      console.log('[ChatPanelG] 🔧 AUTOFIX DEBUG: Removing preview-scene-error listener');
      window.removeEventListener('preview-scene-error', handlePreviewError as EventListener);
      window.removeEventListener('trigger-autofix', handleDirectAutoFix as EventListener);
          };
    }, [handleAutoFix]);

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
              className={`flex ${msg.isUser ? "justify-end" : "justify-start"}`}
            >
              <Card
                className={`max-w-[80%] ${
                  msg.isUser
                    ? "bg-primary text-primary-foreground"
                    : msg.status === "error"
                    ? "bg-destructive/10 border-destructive"
                    : msg.kind === "status"
                    ? "bg-blue-50 border-blue-200 border-dashed"
                    : "bg-muted"
                }`}
              >
                <CardContent className="px-3"> 
                  <div className="space-y-1">
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
                    
                    <div className={`whitespace-pre-wrap text-sm leading-none flex items-center gap-1 ${
                      msg.kind === "status" ? "text-blue-700 font-medium" : ""
                    }`}>
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
        {/* Voice error with close button */}
        {showVoiceError && voiceError && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
            <span>Error: {voiceError}</span>
            <button
              onClick={() => setShowVoiceError(false)}
              className="ml-2 text-red-500 hover:text-red-700 p-1"
              aria-label="Close error"
            >
              ✕
            </button>
          </div>
        )}

        {/* Auto-fix error banner */}
        {hasSceneError && sceneErrorDetails && (
          <div className="mb-3 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600 text-sm">⚠</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    Scene Compilation Error
                  </span>
                  <p className="text-xs text-gray-500">{sceneErrorDetails.sceneName}</p>
                </div>
              </div>
              <Button
                onClick={handleAutoFix}
                disabled={isGenerating}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 font-medium"
              >
                {isGenerating ? (
                  <>
                    <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />
                    Fixing...
                  </>
                ) : (
                  <>
                    🔧 Auto-Fix
                  </>
                )}
              </Button>
            </div>
            
            {/* Quotes */}
            <div className="bg-gray-50 border-l-4 border-gray-300 p-4 mb-3 rounded-r">
              <p className="text-sm italic text-gray-700 mb-2">
                "If you're not embarrassed by the first version of your product, you've launched too late."
              </p>
              <p className="text-xs text-gray-500 mb-3">— Reid Hoffman</p>
              
              <p className="text-xs text-gray-600 leading-relaxed">
                If you're one of those few people who still knows how to code, you can open the code panel and fix it yourself, or else send it to the higher powers and hope for the best.
              </p>
            </div>
            
            <div className="text-xs text-gray-500">
              <span className="font-medium">Error:</span> {sceneErrorDetails.errorMessage.substring(0, 120)}...
            </div>
          </div>
        )}

        {/* 🚨 NEW: Compact image preview area (only when images are uploading/uploaded) */}
        {uploadedImages.length > 0 && (
          <div className="mb-3 flex gap-2">
            {uploadedImages.map((image) => (
              <div key={image.id} className="relative w-24 h-24 rounded border bg-gray-50 flex items-center justify-center group">
                {image.status === 'uploading' && (
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                )}
                {image.status === 'uploaded' && (
                  <CheckCircleIcon className="h-6 w-6 text-green-500" />
                )}
                {image.status === 'error' && (
                  <XCircleIcon className="h-6 w-6 text-red-500" />
                )}
                {image.url && image.status === 'uploaded' && (
                  <img 
                    src={image.url} 
                    alt="Upload preview" 
                    className="absolute inset-0 w-full h-full object-cover rounded"
                  />
                )}
                {/* Delete button - always visible for uploaded images, hidden for uploading */}
                {image.status !== 'uploading' && (
                  <button
                    onClick={() => handleDeleteImage(image.id)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm transition-colors opacity-40 hover:opacity-100"
                    aria-label="Delete image"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleMessageChange}
              onKeyDown={handleKeyDown}
              placeholder={
                selectedSceneId
                  ? "Describe changes to the selected scene..."
                  : "Describe your video or add a new scene..."
              }
              disabled={isGenerating || recordingState === 'recording'}
              className={cn(
                "w-full resize-none rounded-md border border-input bg-background",
                "pl-16 pr-3 py-3 text-sm leading-5",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
                isDragOver && "border-blue-500 bg-blue-50"
              )}
              style={{
                height: textareaHeight,
                minHeight: '40px', // Match button height
                maxHeight: 24 * 6, // 6 lines
                overflowY: "auto"
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            />

            <div className="absolute left-3 flex gap-1 items-center" style={{ bottom: '16px' }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-0.5 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                disabled={isGenerating}
                aria-label="Upload images"
              >
                <ImageIcon className="h-4 w-4" />
              </button>

              {isVoiceSupported && (
                <button
                  type="button"
                  onClick={recordingState === 'recording' ? stopRecording : startRecording}
                  className={cn(
                    "p-0.5 rounded-full flex items-center justify-center",
                    recordingState === 'recording'
                      ? "text-red-500 bg-red-50 animate-pulse"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  )}
                  disabled={isGenerating}
                  aria-label={recordingState === 'recording' ? 'Stop recording' : 'Start voice recording'}
                >
                  <MicIcon className="h-4 w-4" />
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          <Button
            type="submit"
            disabled={!message.trim() || isGenerating || recordingState === 'recording'}
            className="w-10 flex-shrink-0"
            style={{ minHeight: '42px', marginBottom: '6px' }}
          >
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>

        {selectedSceneId && (
          <div className="text-xs text-muted-foreground mt-2 space-y-1">
            <p className="opacity-75">💡 Our AI targets scenes automatically — you can also specify which scene, if dont trust the beta</p>
          </div>
        )}
      </div>
    </div>
  );
}