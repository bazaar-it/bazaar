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

import { ImageUpload, type UploadedImage, createImageUploadHandlers } from "~/components/chat/ImageUpload";
import { VoiceInput } from "~/components/chat/VoiceInput";
import { useAutoFix } from "~/hooks/use-auto-fix";

// Helper function to generate UUID in browser environment
const generateUUID = () => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  // Fallback for older browsers using nanoid
  return nanoid();
};

// Component message representation for UI display
interface ComponentMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  status?: "pending" | "error" | "success" | "building" | "tool_calling";
  kind?: "text" | "error" | "status" | "tool_result" | "scene_plan";
  imageUrls?: string[];
}

interface ChatPanelGProps {
  projectId: string;
  userId?: string;
  selectedSceneId: string | null;
  onSceneGenerated?: (sceneId: string) => void;
}

export default function ChatPanelG({
  projectId,
  userId,
  selectedSceneId,
  onSceneGenerated,
}: ChatPanelGProps) {
  const [message, setMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // 🚨 NEW: State for image uploads
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 🚨 NEW: Auto-expanding textarea state
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Get video state and current scenes
  const { getCurrentProps, replace, getProjectChatHistory, addUserMessage, addAssistantMessage, updateMessage, updateScene, deleteScene } = useVideoState();
  const currentProps = getCurrentProps();
  const scenes = currentProps?.scenes || [];
  
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

  // ✅ SIMPLIFIED: Direct tRPC mutation (no SSE complexity)
  const generateSceneMutation = api.generation.generateScene.useMutation();
  
  // Get tRPC utils for cache invalidation
  const utils = api.useUtils();
  
  // Helper function to convert database scenes to InputProps format
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

  // Auto-scroll function
  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM has updated
    requestAnimationFrame(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    });
  }, [componentMessages]);

  // Helper function to update VideoState with scene changes
  const updateVideoStateWithScene = useCallback(async (actualScene: any, operation: string) => {
    try {
      const currentScenes = getCurrentProps()?.scenes || [];
      
      if (operation === 'scene.delete') {
        // For delete operations, remove the scene from VideoState
        deleteScene(projectId, actualScene.id);
        console.log('[ChatPanelG] ✅ Deleted scene from VideoState:', actualScene.id);
        
      } else if (operation === 'scene.edit' || operation === 'scene.update') {
        // For edits, use the updateScene method from VideoState
        updateScene(projectId, actualScene.id, actualScene);
        console.log('[ChatPanelG] ✅ Updated scene via updateScene:', actualScene.id);
        
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
          console.log('[ChatPanelG] ✅ Added scene to VideoState:', transformedScene.id);
          
          // Call the callback if provided
          if (onSceneGenerated) {
            onSceneGenerated(transformedScene.id);
          }
        }
      }
      
      // Invalidate scenes query for background sync
      await utils.generation.getProjectScenes.invalidate({ projectId });
      
    } catch (error) {
      console.error('[ChatPanelG] Error updating VideoState:', error);
    }
  }, [getCurrentProps, projectId, deleteScene, updateScene, replace, onSceneGenerated, utils]);

  // ✅ SIMPLIFIED: Direct tRPC submission (no SSE complexity)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isGenerating) return;

    const trimmedMessage = message.trim();
    
    // Get image and video URLs from uploaded media
    const imageUrls = uploadedImages
      .filter(img => img.status === 'uploaded' && img.url && img.type !== 'video')
      .map(img => img.url!);
    
    const videoUrls = uploadedImages
      .filter(img => img.status === 'uploaded' && img.url && img.type === 'video')
      .map(img => img.url!);
    
         // Add user message immediately
     addUserMessage(projectId, trimmedMessage, imageUrls.length > 0 ? imageUrls : undefined);
     
     // Clear input and start generation
     setMessage("");
     setUploadedImages([]);
     setIsGenerating(true);
    
    // Scroll to bottom immediately
    setTimeout(scrollToBottom, 50);
    
    try {
      // ✅ SIMPLE: Direct tRPC call - no SSE complexity
      const result = await generateSceneMutation.mutateAsync({
        projectId,
        userMessage: trimmedMessage,
        userContext: {
          imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
          videoUrls: videoUrls.length > 0 ? videoUrls : undefined,
        },
      });
      
             console.log('[ChatPanelG] ✅ Generation completed:', result);
       
       const responseData = result as any;
       
       // Add the assistant response message
       const aiResponse = responseData.context?.chatResponse || 
                         responseData.chatResponse || 
                         responseData.message || 
                         'Scene generated successfully.';
       
       const assistantMessageId = generateUUID();
       addAssistantMessage(projectId, assistantMessageId, aiResponse);
       updateMessage(projectId, assistantMessageId, {
         status: 'success'
       });
      
      // Check if this is a clarification response
      if (responseData.context?.needsClarification) {
        console.log('[ChatPanelG] ✅ Received clarification request');
        // No scene to process, just show the clarification message
        return;
      }
      
      // Handle scene updates
      const actualScene = responseData.data;
      const operation = responseData.meta?.operation;
      
      if (actualScene) {
        await updateVideoStateWithScene(actualScene, operation);
      }
      
         } catch (error) {
       console.error('[ChatPanelG] Generation failed:', error);
       
       const errorMessage = error instanceof Error ? error.message : 'Generation failed';
       
       // Add error message
       const errorMessageId = generateUUID();
       addAssistantMessage(projectId, errorMessageId, `❌ ${errorMessage}`);
       updateMessage(projectId, errorMessageId, {
         status: 'error'
       });
       
       // Show toast for user feedback
       toast.error(`Generation failed: ${errorMessage}`);
      
    } finally {
      setIsGenerating(false);
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

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '20px';
      const scrollHeight = textareaRef.current.scrollHeight;
      const minHeight = 10;
      const lineHeight = 24;
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

  // Reset component state when projectId changes
  useEffect(() => {
    setMessage("");
    setIsGenerating(false);
    setUploadedImages([]);
    console.log('[ChatPanelG] Reset state for new project:', projectId);
  }, [projectId]);

  // Use auto-fix hook
  const { sceneErrors, handleAutoFix } = useAutoFix(projectId, scenes);

  // Convert scene errors to chat messages
  useEffect(() => {
    if (sceneErrors.size > 0) {
      Array.from(sceneErrors.entries()).forEach(([sceneId, errorDetails]) => {
        // Check if we've already added this error as a message
        const existingMessage = messages.find(m => 
          m.message.includes(`Scene ID: ${sceneId}`) && 
          m.message.includes('Scene Compilation Error') &&
          m.timestamp > errorDetails.timestamp - 5000
        );
        
        if (!existingMessage) {
          const errorMessageId = generateUUID();
          
          const errorText = `🚨 **Scene Compilation Error**

**Scene:** ${errorDetails.sceneName}
**Scene ID:** ${sceneId}
**Error:** ${errorDetails.errorMessage}

I can try to fix this automatically for you.`;
          
          addAssistantMessage(projectId, errorMessageId, errorText);
          updateMessage(projectId, errorMessageId, {
            status: 'error',
            kind: 'error'
          });
        }
      });
    }
  }, [sceneErrors, messages, projectId, addAssistantMessage, updateMessage]);

  // Handle revert action
  const [isReverting, setIsReverting] = useState(false);
  const revertMutation = api.generation.revertToIteration.useMutation();
  
  const handleRevert = useCallback(async (messageId: string) => {
    setIsReverting(true);
    
    try {
      const iterations = await utils.generation.getMessageIterations.fetch({ 
        messageId 
      });
      
      if (iterations.length === 0) {
        toast.error('No scene changes found for this message');
        return;
      }
      
      // Revert all iterations linked to this message
      for (const iteration of iterations) {
        const result = await revertMutation.mutateAsync({
          projectId,
          iterationId: iteration.id,
          messageId,
        });
        
        const responseData = result as any;
        const revertedScene = responseData.data;
        const operation = responseData.meta?.operation;
        
        if (revertedScene) {
          await updateVideoStateWithScene(revertedScene, operation);
        }
      }
      
      toast.success('Scene changes reverted successfully');
      
    } catch (error) {
      console.error('[ChatPanelG] Revert failed:', error);
      toast.error('Failed to revert scene changes');
    } finally {
      setIsReverting(false);
    }
  }, [utils, revertMutation, projectId, updateVideoStateWithScene]);

  // Listen for auto-fix events from chat messages
  useEffect(() => {
    const handleAutoFixEvent = (event: CustomEvent) => {
      const { sceneId } = event.detail;
      console.log('[ChatPanelG] Auto-fix event received for scene:', sceneId);
      handleAutoFix(sceneId);
    };

    window.addEventListener('autofix-scene', handleAutoFixEvent as EventListener);
    return () => {
      window.removeEventListener('autofix-scene', handleAutoFixEvent as EventListener);
    };
  }, [handleAutoFix]);

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
              console.log('Image clicked:', imageUrl);
            }}
            projectId={projectId}
            userId={userId}
            onRevert={isReverting ? undefined : handleRevert}
            hasIterations={messageIterations?.[msg.id] ? messageIterations[msg.id]!.length > 0 : false}
          />
        ))}
        
        {/* Show generating message when processing */}
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
      <div className="p-4">
        {/* Image upload preview area */}
        <ImageUpload
          uploadedImages={uploadedImages}
          onImagesChange={setUploadedImages}
          projectId={projectId}
          disabled={isGenerating}
        />
        
        <form onSubmit={handleSubmit} className="flex items-end" autoComplete="off">
          <div 
            className={cn(
              "flex-1 relative rounded-2xl border border-gray-300 bg-white shadow-sm",
              "focus-within:border-gray-400 focus-within:shadow-md transition-all",
              isDragOver && "border-blue-500 bg-blue-50"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col w-full">
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={handleMessageChange}
                  onKeyDown={handleKeyDown}
                  placeholder={!message ? "Describe what you want to create" : ""}
                  disabled={isGenerating}
                  className={cn(
                    "w-full resize-none bg-transparent border-none",
                    "px-3 py-1 text-sm leading-6",
                    "focus:outline-none focus:ring-0",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    "rounded-t-2xl"
                  )}
                  style={{
                    height: '32px',
                    maxHeight: '480px',
                    overflowY: "auto"
                  }}
                />
              </div>

              {/* Icon row at bottom */}
              <div className="flex items-center justify-between px-3 py-1">
                <div className="flex gap-2 items-center">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100"
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

                <Button
                  type="submit"
                  disabled={!message.trim() || isGenerating}
                  className="w-8 h-8 rounded-full bg-black hover:bg-gray-800 p-0"
                >
                  {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                </Button>
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/mp4,video/quicktime,video/webm"
            multiple
            onChange={imageHandlers.handleFileSelect}
            className="hidden"
          />
        </form>
      </div>
    </div>
  );
}