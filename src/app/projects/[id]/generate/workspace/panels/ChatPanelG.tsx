// src/app/projects/[id]/generate/workspace/panels/ChatPanelG.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import { useVideoState } from '~/stores/videoState';
import { nanoid } from 'nanoid';
import { toast } from 'sonner';
import { Loader2, Send, ImageIcon } from 'lucide-react';
import { cn } from "~/lib/cn";
import { ChatMessage } from "~/components/chat/ChatMessage";
import { GeneratingMessage } from "~/components/chat/GeneratingMessage";
import { AutoFixErrorBanner } from "~/components/chat/AutoFixErrorBanner";
import { ImageUpload, type UploadedImage, createImageUploadHandlers } from "~/components/chat/ImageUpload";
import { VoiceInput } from "~/components/chat/VoiceInput";
import { useAutoFix } from "~/hooks/use-auto-fix";
import { useSSEGeneration } from "~/hooks/use-sse-generation";


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
}

export default function ChatPanelG({
  projectId,
  selectedSceneId,
  onSceneGenerated,
}: ChatPanelGProps) {
  const [message, setMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationComplete, setGenerationComplete] = useState(false);
  const activeAssistantMessageIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  
  // 🚨 NEW: State for image uploads
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 🚨 NEW: Auto-expanding textarea state
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Get video state and current scenes
  const { getCurrentProps, replace, updateAndRefresh, getProjectChatHistory, addUserMessage, addAssistantMessage, updateMessage, updateScene, deleteScene, removeMessage } = useVideoState();
  const currentProps = getCurrentProps();
  const scenes = currentProps?.scenes || [];
  
  // 🚨 SIMPLIFIED: Scene context logic - let Brain LLM handle scene targeting
  const selectedScene = selectedSceneId ? scenes.find((s: any) => s.id === selectedSceneId) : null;
  
  // ✅ SINGLE SOURCE OF TRUTH: Use only VideoState for messages
  const messages = getProjectChatHistory(projectId);
  
  // Debug: Log messages to check for duplicates
  console.log('[ChatPanelG] Messages from VideoState:', messages.length, messages.map(m => ({
    id: m.id,
    content: m.message.substring(0, 50) + '...',
    isUser: m.isUser
  })));
  
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

  // ✅ BATCH LOADING: Get iterations for all messages at once
  const messageIds = componentMessages
    .filter(m => !m.isUser && m.id && !m.id.startsWith('_') && !m.id.startsWith('temp-') && !m.id.startsWith('optimistic-'))
    .map(m => m.id);

  const { data: messageIterations } = api.generation.getBatchMessageIterations.useQuery(
    { messageIds },
    { 
      enabled: messageIds.length > 0,
      staleTime: 60000, // Cache for 1 minute
    }
  );

  // ✅ CORRECT: Use the generation endpoint that goes through Brain Orchestrator
  const generateSceneMutation = api.generation.generateScene.useMutation();

  // Auto-scroll function
  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
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

  // Force scroll to bottom whenever messages change
  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM has updated
    requestAnimationFrame(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    });
  }, [componentMessages]); // Trigger on any message change

  
  // 🚀 [TICKET-006] Retry logic with exponential backoff
  const retryWithBackoff = async <T,>(
    fn: () => Promise<T>,
    retries = 3,
    delay = 1000
  ): Promise<T> => {
    try {
      return await fn();
    } catch (error) {
      if (retries === 0) throw error;
      
      console.log(`[ChatPanelG] 🔄 Retrying in ${delay}ms... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryWithBackoff(fn, retries - 1, delay * 2);
    }
  };

  // Simple, honest loading message
  const getInitialLoadingMessage = () => {
    return "Processing your request...";
  };

  // ✅ HYBRID APPROACH: SSE for messages, mutation for generation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isGenerating) return;

    const trimmedMessage = message.trim();
    
    // 🚨 NEW: Get image and video URLs from uploaded media
    const imageUrls = uploadedImages
      .filter(img => img.status === 'uploaded' && img.url && img.type !== 'video')
      .map(img => img.url!);
    
    const videoUrls = uploadedImages
      .filter(img => img.status === 'uploaded' && img.url && img.type === 'video')
      .map(img => img.url!);
    
    if (imageUrls.length > 0) {
      console.log('[ChatPanelG] 🖼️ Including images in chat submission:', imageUrls);
    }
    
    if (videoUrls.length > 0) {
      console.log('[ChatPanelG] 🎥 Including videos in chat submission:', videoUrls);
    }
    
    // Show user message immediately
    addUserMessage(projectId, trimmedMessage, imageUrls.length > 0 ? imageUrls : undefined);
    
    // Clear input immediately for better UX
    setMessage("");
    setUploadedImages([]);
    setIsGenerating(true);
    
    // Immediately scroll to bottom after adding messages
    setTimeout(() => {
      scrollToBottom();
    }, 50);
    
    // Let SSE handle DB sync in background
    generateSSE(trimmedMessage, imageUrls, videoUrls);
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
      const maxLines = 20;
      const maxHeight = lineHeight * maxLines;
      
      const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, []);

  // Auto-resize when message changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [message, adjustTextareaHeight]);


  // Create image upload handlers
  const imageHandlers = createImageUploadHandlers(
    uploadedImages,
    setUploadedImages,
    projectId
  );

  // Wrap drag handlers to manage isDragOver state
  const handleDragOver = useCallback((e: React.DragEvent) => {
    imageHandlers.handleDragOver(e);
    setIsDragOver(true);
  }, [imageHandlers]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    imageHandlers.handleDragLeave(e);
    setIsDragOver(false);
  }, [imageHandlers]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    imageHandlers.handleDrop(e);
    setIsDragOver(false);
  }, [imageHandlers]);

  // Reset component state when projectId changes (for new projects)
  useEffect(() => {
    setMessage("");
    setIsGenerating(false);
    setGenerationComplete(false);
    setUploadedImages([]); // 🚨 NEW: Clear uploaded images when switching projects
    
    console.log('[ChatPanelG] Reset state for new project:', projectId);
  }, [projectId]);



  // Check if content has multiple lines
  const hasMultipleLines = message.split('\n').length > 1 || message.includes('\n');

  // Use auto-fix hook
  const { sceneErrors, handleAutoFix } = useAutoFix(projectId, scenes);

  // No need for pendingMessageRef - data will come from SSE
  
  // Handle revert action
  const [isReverting, setIsReverting] = useState(false);
  const revertMutation = api.generation.revertToIteration.useMutation();
  
  const handleRevert = useCallback(async (messageId: string) => {
    // No confirmation needed - ChatMessage component handles the two-click confirmation
    setIsReverting(true);
    
    try {
      // Get iterations for this message
      const iterations = await utils.generation.getMessageIterations.fetch({ 
        messageId 
      });
      
      if (iterations.length === 0) {
        toast.error('No scene changes found for this message');
        return;
      }
      
      console.log('[ChatPanelG] Found iterations:', iterations);
      
      // For now, revert all iterations linked to this message
      for (const iteration of iterations) {
        const result = await revertMutation.mutateAsync({
          projectId,
          iterationId: iteration.id,
          messageId,
        });
        
        console.log('[ChatPanelG] Revert result:', result);
        
        // Handle the reverted scene based on operation
        const responseData = result as any;
        const revertedScene = responseData.data;
        const operation = responseData.meta?.operation;
        
        if (revertedScene) {
          if (operation === 'scene.create') {
            // Scene was restored (was deleted)
            const currentScenes = getCurrentProps()?.scenes || [];
            const lastScene = currentScenes[currentScenes.length - 1];
            const startTime = lastScene ? (lastScene.start + lastScene.duration) : 0;
            
            const transformedScene = {
              id: revertedScene.id,
              type: 'custom' as const,
              start: startTime,
              duration: revertedScene.duration || 150,
              data: {
                code: revertedScene.tsxCode,
                name: revertedScene.name || 'Restored Scene',
                componentId: revertedScene.id,
                props: revertedScene.props || {}
              }
            };
            
            const updatedScenes = [...currentScenes, transformedScene];
            const currentPropsData = getCurrentProps();
            
            if (currentPropsData) {
              const updatedProps = {
                ...currentPropsData,
                scenes: updatedScenes,
                meta: {
                  ...currentPropsData.meta,
                  duration: updatedScenes.reduce((sum: number, s: any) => sum + s.duration, 0),
                }
              };
              
              replace(projectId, updatedProps);
            }
          } else {
            // Scene was updated
            updateScene(projectId, revertedScene.id, revertedScene);
          }
        }
      }
      
      // Refresh and show success
      await updateAndRefresh(projectId, (props) => props);
      toast.success('Successfully reverted to previous version');
      
    } catch (error) {
      console.error('[ChatPanelG] Revert error:', error);
      toast.error('Failed to revert changes');
    } finally {
      setIsReverting(false);
    }
  }, [projectId, revertMutation, utils, getCurrentProps, replace, updateScene, updateAndRefresh]);

  // Use SSE generation hook
  const { generate: generateSSE, cancel: cancelSSE } = useSSEGeneration({
    projectId,
    onMessageCreated: async (messageId, data) => {
      console.log('[ChatPanelG] ✅ SSE ready with data:', data);
      // messageId is undefined when creating new assistant message
      
      // Now trigger the actual generation using data from SSE
      if (data?.userMessage) {
        const { userMessage, imageUrls = [], videoUrls = [] } = data;
        
        try {
          const result = await generateSceneMutation.mutateAsync({
            projectId,
            userMessage,
            userContext: {
              imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
              videoUrls: videoUrls.length > 0 ? videoUrls : undefined,
            },
            // Don't pass assistantMessageId - let mutation create it
          });
          
          console.log('[ChatPanelG] ✅ Generation completed:', result);
          
          // The result contains the actual response
          const responseData = result as any;
          
          // Get the assistant message ID from the response
          const assistantMessageId = responseData.assistantMessageId;
          
          if (assistantMessageId) {
            // First, add the assistant message to VideoState since it doesn't exist yet
            const aiResponse = responseData.context?.chatResponse || 
                              responseData.chatResponse || 
                              responseData.message || 
                              'Scene generated successfully.';
            
            // Add the assistant message to VideoState
            addAssistantMessage(projectId, assistantMessageId, aiResponse);
            
            // Then update its status to success
            updateMessage(projectId, assistantMessageId, {
              status: 'success'
            });
            
            // Hide the pulsating message immediately when we have the real message
            setIsGenerating(false);
          }
          
          // Check if this is a clarification response
          if (responseData.context?.needsClarification) {
            console.log('[ChatPanelG] ✅ Received clarification request:', responseData.context.chatResponse);
            // No scene to process, clarification message already added above
            // Skip scene processing but continue to finally block
          } else {
            // Process scene normally
            const actualScene = responseData.data;
            const operation = responseData.meta?.operation;
            
            if (actualScene) {
              // Get current scenes to calculate start time
              const currentScenes = getCurrentProps()?.scenes || [];
              
              if (operation === 'scene.delete') {
                // For delete operations, remove the scene from VideoState
                deleteScene(projectId, actualScene.id);
                
                console.log('[ChatPanelG] ✅ Deleted scene from VideoState:', {
                  sceneId: actualScene.id,
                  sceneName: actualScene.name
                });
                
                // Invalidate the scenes query to ensure fresh data
                await utils.generation.getProjectScenes.invalidate({ projectId });
                
              } else if (operation === 'scene.edit' || operation === 'scene.update') {
                // For edits, use the updateScene method from VideoState
                updateScene(projectId, actualScene.id, actualScene);
                
                console.log('[ChatPanelG] ✅ Updated scene via updateScene:', {
                  sceneId: actualScene.id,
                  operation
                });
                
                // Invalidate the scenes query to ensure fresh data
                await utils.generation.getProjectScenes.invalidate({ projectId });
                
                // Call the callback if provided
                if (onSceneGenerated) {
                  onSceneGenerated(actualScene.id);
                }
              } else if (operation === 'scene.create' || !operation) {
                // For create operations
                const lastScene = currentScenes[currentScenes.length - 1];
                const startTime = lastScene ? (lastScene.start + lastScene.duration) : 0;
                
                // Transform database format to InputProps format
                const transformedScene = {
                  id: actualScene.id,
                  type: 'custom' as const,
                  start: startTime,
                  duration: actualScene.duration || 180,
                  data: {
                    code: actualScene.tsxCode,
                    name: actualScene.name || 'Generated Scene',
                    componentId: actualScene.id,
                    props: actualScene.props || {}
                  }
                };
                
                // Check if this is a welcome project
                const isWelcomeProject = currentScenes.length === 1 && 
                  (currentScenes[0]?.data?.name === 'Welcome Scene' ||
                   currentScenes[0]?.data?.isWelcomeScene === true ||
                   currentScenes[0]?.type === 'welcome');
                
                // If welcome project, replace the welcome scene; otherwise append
                const updatedScenes = isWelcomeProject 
                  ? [transformedScene]
                  : [...currentScenes, transformedScene];
                
                const currentPropsData = getCurrentProps();
                if (currentPropsData) {
                  const updatedProps = {
                    ...currentPropsData,
                    scenes: updatedScenes,
                    meta: {
                      ...currentPropsData.meta,
                      duration: updatedScenes.reduce((sum: number, s: any) => sum + s.duration, 0),
                      title: currentPropsData.meta?.title || 'New Project'
                    }
                  };
                  
                  replace(projectId, updatedProps);
                  
                  console.log('[ChatPanelG] ✅ Added scene to VideoState:', {
                    sceneId: transformedScene.id,
                    totalScenes: updatedScenes.length,
                    replacedWelcome: isWelcomeProject
                  });
                  
                  // Invalidate the scenes query to ensure fresh data
                  await utils.generation.getProjectScenes.invalidate({ projectId });
                  
                  // Call the callback if provided
                  if (onSceneGenerated) {
                    onSceneGenerated(transformedScene.id);
                  }
                }
              }
            }
          } // Close the else block for clarification check
          
        } catch (error) {
          console.error('[ChatPanelG] Generation failed:', error);
          
          // No optimistic messages to clean up
        } finally {
          setIsGenerating(false);
          setGenerationComplete(true);
          
          // Always invalidate scenes to ensure UI is in sync with database
          await utils.generation.getProjectScenes.invalidate({ projectId });
        }
      }
    },
    onComplete: (messageId: string) => {
      console.log('[ChatPanelG] SSE completed:', messageId);
    },
    onError: (error: string) => {
      console.error('[ChatPanelG] SSE error:', error);
      toast.error(error);
      setIsGenerating(false);
    }
  });

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      cancelSSE();
    };
  }, [cancelSSE]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages container */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {componentMessages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={{
              id: msg.id,
              message: msg.content,
              isUser: msg.isUser,
              timestamp: msg.timestamp.getTime(),
              status: msg.status,
              kind: msg.kind,
              imageUrls: msg.imageUrls,
            }}
            onImageClick={(imageUrl) => {
              // TODO: Implement image click handler
              console.log('Image clicked:', imageUrl);
            }}
            projectId={projectId}
            onRevert={isReverting ? undefined : handleRevert}
            hasIterations={messageIterations?.[msg.id] ? messageIterations[msg.id]!.length > 0 : false}
          />
        ))}
        
        {/* Show pulsating message UI when generating */}
        {isGenerating && (
          <div className="flex justify-start mb-4">
            <div className="bg-gray-100 text-gray-900 rounded-2xl px-4 py-3 max-w-[80%]">
              <GeneratingMessage />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-4 border-t bg-gray-50/50">

        {/* Auto-fix error banner */}
        <AutoFixErrorBanner
          scenes={scenes}
          sceneErrors={sceneErrors}
          onAutoFix={handleAutoFix}
          isGenerating={isGenerating}
        />

        {/* Image upload preview area */}
        <ImageUpload
          uploadedImages={uploadedImages}
          onImagesChange={setUploadedImages}
          projectId={projectId}
          disabled={isGenerating}
        />

        {/* Current operation indicator removed to prevent duplicate "Analyzing your request..." messages */}
        
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleMessageChange}
              onKeyDown={handleKeyDown}
              placeholder="Describe your video"
              disabled={isGenerating}
              className={cn(
                "w-full resize-none rounded-md border border-input bg-background",
                "pl-16 pr-3 py-3 text-sm leading-5",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
                isDragOver && "border-blue-500 bg-blue-50"
              )}
              style={{
                height: '40px', // Start at button height
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

              <VoiceInput 
                onTranscription={(text) => {
                  setMessage(prevMessage => {
                    const newMessage = prevMessage.trim() 
                      ? `${prevMessage} ${text}` 
                      : text;
                    return newMessage;
                  });
                }}
                disabled={isGenerating}
              />
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/mp4,video/quicktime,video/webm"
              multiple
              onChange={imageHandlers.handleFileSelect}
              className="hidden"
            />
          </div>

          <Button
            type="submit"
            disabled={!message.trim() || isGenerating}
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