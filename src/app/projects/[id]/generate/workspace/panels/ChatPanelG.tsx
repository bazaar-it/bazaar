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
  const { getCurrentProps, replace, forceRefresh, updateAndRefresh, getProjectChatHistory, addUserMessage, addAssistantMessage, updateMessage, updateScene, addScene } = useVideoState();
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
        
        // ✅ IMMEDIATE: Update VideoState with backend response data (0ms delay)
        if (result.scene && result.operation === 'editScene') {
          console.log('[ChatPanelG] ⚡ Updating VideoState immediately with backend data:', result.scene);
          
          // 🚨 NEW: Check if database write failed
          if (result.databaseWriteFailed) {
            console.log('[ChatPanelG] ⚠️ Database write failed, but updating UI anyway. Will retry in background.');
            // Could show a subtle notification that save is pending
          }
          
          // 🚨 FIX: Access the correct scene data structure
          const sceneData = result.scene.scene || result.scene; // Handle both possible structures
          console.log('[ChatPanelG] 🔍 Scene data extracted:', { id: sceneData.id, name: sceneData.name });
          
          // Transform backend scene format to VideoState format
          const transformedScene = {
            ...sceneData,
            tsxCode: sceneData.tsxCode,
            name: sceneData.name,
            duration: sceneData.duration
          };
          
          // 🚨 DEBUG: Log what we're actually passing to updateScene
          console.log('[ChatPanelG] 🚨 UPDATE SCENE DATA:', {
            sceneId: sceneData.id,
            tsxCodeLength: transformedScene.tsxCode?.length,
            tsxCodeStart: transformedScene.tsxCode?.substring(0, 100),
            hasRed: transformedScene.tsxCode?.includes('#ff0000')
          });
          
          // Update VideoState immediately - all panels will react instantly
          updateScene(projectId, sceneData.id, transformedScene);
          console.log('[ChatPanelG] ⚡ VideoState updated - all panels should refresh immediately');
          
        } else if (result.operation === 'createSceneFromImage') {
          // TEMPORARY WORKAROUND: createSceneFromImage doesn't return the scene ID
          // We need to refresh from database to get the newly created scene
          console.log('[ChatPanelG] 🔄 createSceneFromImage detected - refreshing from database');
          console.log('[ChatPanelG] 🐛 Response missing scene ID, using updateAndRefresh workaround');
          
          // The scene was created in the database, but we don't have its ID
          // So we must refresh to see it
          await updateAndRefresh();
          
          console.log('[ChatPanelG] ✅ Refreshed after createSceneFromImage');
          
          // Skip the rest of the update flow
          setGenerationComplete(true);
          return;
          
        } else if (result.scene && (result.operation === 'addScene' || result.operation === 'unknown')) {
          // For new scenes, trust the backend response directly
          console.log('[ChatPanelG] 🆕 New scene detected, using backend data directly');
          const sceneData = result.scene.scene || result.scene;
          
          // ✅ FIX: Transform and add the scene properly
          if (sceneData) {
            // Get current scenes to calculate start time
            const currentScenes = getCurrentProps()?.scenes || [];
            const lastScene = currentScenes[currentScenes.length - 1];
            const startTime = lastScene ? (lastScene.start + lastScene.duration) : 0;
            
            // Transform database format to InputProps format
            const transformedScene = {
              id: sceneData.id,
              type: 'custom' as const,
              start: startTime,
              duration: sceneData.duration || 180,
              data: {
                code: sceneData.tsxCode,
                name: sceneData.name || 'Generated Scene',
                componentId: sceneData.id,
                props: sceneData.props || {}
              }
            };
            
            // Use replace to update the entire scenes array
            const updatedScenes = [...currentScenes, transformedScene];
            const updatedProps = {
              ...getCurrentProps(),
              scenes: updatedScenes,
              meta: {
                ...getCurrentProps()?.meta,
                duration: updatedScenes.reduce((sum, s) => sum + s.duration, 0)
              }
            };
            
            replace(projectId, updatedProps);
            
            console.log('[ChatPanelG] ✅ Added transformed scene to VideoState:', {
              sceneId: transformedScene.id,
              start: transformedScene.start,
              duration: transformedScene.duration,
              totalScenes: updatedScenes.length,
              operation: result.operation
            });
          }
        } else if (result.scene && result.operation === 'changeDuration') {
          // ✅ FIX: Handle duration changes
          console.log('[ChatPanelG] ⏱️ Duration change detected');
          
          const durationData = result.scene;
          const targetSceneId = durationData.targetSceneId;
          
          if (targetSceneId && durationData.newDurationFrames) {
            // Find the scene and update its duration
            const scene = scenes.find(s => s.id === targetSceneId);
            if (scene) {
              console.log('[ChatPanelG] 🔄 Updating scene duration:', {
                sceneId: targetSceneId,
                oldDuration: durationData.oldDurationFrames,
                newDuration: durationData.newDurationFrames
              });
              
              // Update the scene with new duration
              updateScene(projectId, targetSceneId, {
                ...scene,
                duration: durationData.newDurationFrames
              });
              
              console.log('[ChatPanelG] ✅ Scene duration updated in VideoState');
            }
          }
        } else {
          console.log('[ChatPanelG] 🔄 No scene data or unhandled operation:', result.operation);
        }
        
        // ✅ TRUST STATE: For ALL operations, we trust our immediate state update
        // No need to refetch from database - VideoState is our single source of truth
        console.log('[ChatPanelG] ✨ Operation completed:', result.operation, '- trusting direct state update');
        
        // Skip notifying WorkspaceContentAreaG - it would just refetch and overwrite our good state
        // The direct VideoState update is sufficient for ALL operations
        
        // Skip cache invalidation - VideoState is our source of truth
        // The database will be updated by the backend asynchronously
        
        console.log('[ChatPanelG] ✅ Optimal update flow completed');
      } catch (error) {
        console.error('[ChatPanelG] ❌ State update error:', error);
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

  // 🚨 IMPROVED: Track multiple scene errors
  const [sceneErrors, setSceneErrors] = useState<Map<string, {
    sceneName: string;
    errorMessage: string;
    timestamp: number;
  }>>(new Map());

  // 🚨 IMPROVED: Auto-fix function with specific scene targeting
  const handleAutoFix = useCallback(async (sceneId: string) => {
    const errorDetails = sceneErrors.get(sceneId);
    if (!errorDetails) {
      console.log('[ChatPanelG] 🔧 AUTOFIX DEBUG: No error details for scene:', sceneId);
      return;
    }
    
    // Check if scene still exists
    const sceneStillExists = scenes.some(s => s.id === sceneId);
    if (!sceneStillExists) {
      console.log('[ChatPanelG] 🔧 AUTOFIX DEBUG: Scene no longer exists:', sceneId);
      // Clean up the error
      setSceneErrors(prev => {
        const next = new Map(prev);
        next.delete(sceneId);
        return next;
      });
      return;
    }
    
    // More explicit prompt for brain orchestrator
    const fixPrompt = `🔧 FIX BROKEN SCENE: Scene "${errorDetails.sceneName}" (ID: ${sceneId}) has a compilation error. The error message is: "${errorDetails.errorMessage}". This scene needs to be fixed using the fixBrokenScene tool. The broken code is in the scene with ID ${sceneId}.`;
    
    console.log('[ChatPanelG] 🔧 AUTOFIX DEBUG: Starting autofix flow:', {
      sceneId: sceneId,
      sceneName: errorDetails.sceneName,
      errorMessage: errorDetails.errorMessage,
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
      // Clean up the error for this scene after successful fix
      setSceneErrors(prev => {
        const next = new Map(prev);
        next.delete(sceneId);
        return next;
      });
      activeAssistantMessageIdRef.current = null;
    }
  }, [sceneErrors, scenes, projectId, generateSceneMutation, utils, refetchScenes, convertDbScenesToInputProps, updateAndRefresh, addUserMessage, addAssistantMessage, updateMessage]);

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
      
      // 🚨 IMPROVED: Track scene error with Map
      setSceneErrors(prev => {
        const next = new Map(prev);
        next.set(sceneId, {
          sceneName,
          errorMessage: error?.message || String(error),
          timestamp: Date.now()
        });
        return next;
      });

      console.log('[ChatPanelG] 🔧 AUTOFIX DEBUG: Error state updated for scene:', sceneId);
      
      // 🚨 ENHANCED: Also show a toast notification for immediate feedback
      toast.error(`Scene "${sceneName}" has an error - AutoFix available!`, {
        duration: 5000,
        action: {
          label: "Auto-Fix",
          onClick: () => {
            console.log('[ChatPanelG] 🔧 AUTOFIX: Toast action clicked for scene:', sceneId);
            handleAutoFix(sceneId);
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
      setSceneErrors(prev => {
        const next = new Map(prev);
        next.set(sceneId, {
          sceneName,
          errorMessage: error?.message || String(error),
          timestamp: Date.now()
        });
        return next;
      });
      
      // Immediately trigger autofix without waiting for button click
      setTimeout(() => {
        handleAutoFix(sceneId);
      }, 100);
    };

    // 🚨 NEW: Clean up stale errors when scenes are removed
    const handleSceneDeleted = (event: CustomEvent) => {
      const { sceneId } = event.detail;
      console.log('[ChatPanelG] 🔧 AUTOFIX DEBUG: Scene deleted, cleaning up error state:', sceneId);
      
      setSceneErrors(prev => {
        if (!prev.has(sceneId)) return prev;
        const next = new Map(prev);
        next.delete(sceneId);
        return next;
      });
    };

    console.log('[ChatPanelG] 🔧 AUTOFIX DEBUG: Setting up preview-scene-error listener');
    window.addEventListener('preview-scene-error', handlePreviewError as EventListener);
    window.addEventListener('trigger-autofix', handleDirectAutoFix as EventListener);
    window.addEventListener('scene-deleted', handleSceneDeleted as EventListener);
    
    return () => {
      console.log('[ChatPanelG] 🔧 AUTOFIX DEBUG: Removing preview-scene-error listener');
      window.removeEventListener('preview-scene-error', handlePreviewError as EventListener);
      window.removeEventListener('trigger-autofix', handleDirectAutoFix as EventListener);
      window.removeEventListener('scene-deleted', handleSceneDeleted as EventListener);
    };
  }, [handleAutoFix, scenes]);

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
        {sceneErrors.size > 0 && Array.from(sceneErrors.entries()).map(([sceneId, errorDetails]) => {
          // Check if scene still exists
          const sceneStillExists = scenes.some(s => s.id === sceneId);
          if (!sceneStillExists) return null;
          
          return (
            <div key={sceneId} className="mb-3 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-red-600 text-sm">⚠</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-900">
                      Scene Compilation Error
                    </span>
                    <p className="text-xs text-gray-500">{errorDetails.sceneName}</p>
                  </div>
                </div>
                <Button
                  onClick={() => handleAutoFix(sceneId)}
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
              <span className="font-medium">Error:</span> {errorDetails.errorMessage.substring(0, 120)}...
            </div>
          </div>
          );
        })}

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
                      : recordingState === 'transcribing'
                      ? "text-gray-500 bg-gray-100"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  )}
                  disabled={isGenerating || recordingState === 'transcribing'}
                  aria-label={
                    recordingState === 'recording' 
                      ? 'Stop recording' 
                      : recordingState === 'transcribing'
                      ? 'Transcribing audio...'
                      : 'Start voice recording'
                  }
                >
                  {recordingState === 'transcribing' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MicIcon className="h-4 w-4" />
                  )}
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
      </div>
    </div>
  );
}