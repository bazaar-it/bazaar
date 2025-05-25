"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { api } from "~/trpc/react";
import { useVideoState } from '~/stores/videoState';
import { toast } from "sonner";
import { Loader2Icon, CheckCircleIcon, XCircleIcon, SendIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

export function ChatPanelG({ 
  projectId,
  selectedSceneId,
  onSceneGenerated
}: { 
  projectId: string;
  selectedSceneId?: string | null;
  onSceneGenerated?: (sceneId: string, code: string) => void;
}) {
  const [message, setMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isFirstMessageRef = useRef(true);
  
  // Get video state and current scenes
  const { getCurrentProps } = useVideoState();
  const currentProps = getCurrentProps();
  const scenes = currentProps?.scenes || [];
  
  // Auto-select latest scene if none is selected and scenes exist (for edit-first behavior)
  const effectiveSelectedSceneId = selectedSceneId || (scenes.length > 0 ? scenes[scenes.length - 1]?.id : null);
  const selectedScene: Scene | null = effectiveSelectedSceneId ? (scenes.find(s => s.id === effectiveSelectedSceneId) || null) : null;
  
  // Debug logging to trace scene selection issues
  console.log('[ChatPanelG] selectedSceneId prop:', selectedSceneId);
  console.log('[ChatPanelG] scenes available:', scenes.map(s => ({ id: s.id, name: s.data?.name || s.type })));
  console.log('[ChatPanelG] effectiveSelectedSceneId (auto-selected):', effectiveSelectedSceneId);
  console.log('[ChatPanelG] selectedScene resolved:', selectedScene ? { id: selectedScene.id, name: selectedScene.data?.name || selectedScene.type } : 'none');
  
  // Get chat messages for this project
  const { data: dbMessages, isLoading: isLoadingMessages, refetch: refetchMessages } = api.chat.getMessages.useQuery({ 
    projectId 
  });

  // Chat initiation mutation for proper message persistence
  const initiateChatMutation = api.chat.initiateChat.useMutation({
    onSuccess: (response) => {
      const { assistantMessageId } = response;
      
      // Add placeholder assistant message to the store
      const { addAssistantMessage } = useVideoState.getState();
      addAssistantMessage(projectId, assistantMessageId, "Generating scene...");
      
      // Set the streaming message ID for tracking
      setStreamingMessageId(assistantMessageId);
    },
    onError: (error: any) => {
      console.error("Error initiating chat:", error);
      setIsGenerating(false);
      toast.error(`Chat initiation failed: ${error.message}`);
    }
  });

  // Add streaming message ID state for tracking
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  // Scene generation mutation using the BAZAAR-302 approach
  const generateSceneCodeMutation = api.generation.generateSceneCode.useMutation({
    onSuccess: (result: any) => {
      console.log("✅ Scene generation completed:", result);
      setIsGenerating(false);
      
      // Show success toast
      const successMessage = result.isEdit ? 'Scene updated successfully!' : 'Scene generated successfully!';
      toast.success(successMessage);
      
      // SINGLE CALLBACK: Notify parent component about the generated scene (for both new and edit)
      if (onSceneGenerated) {
        console.log('[ChatPanelG] Calling onSceneGenerated callback for scene:', result.sceneId, 'isEdit:', result.isEdit);
        onSceneGenerated(result.sceneId, result.code);
      }
      
      // Update the streaming assistant message with the result
      if (streamingMessageId) {
        const { updateMessage } = useVideoState.getState();
        
        // Create a more descriptive and human response
        let assistantMessage: string;
        
        if (result.isEdit) {
          // For edits, describe what was changed
          assistantMessage = `I've updated your scene! ✨ 

Here's what I modified:
• Applied your changes to the ${selectedScene?.data?.name || 'selected scene'}
• Regenerated the animation code with your requested adjustments
• The scene is now ready for preview

${result.insight?.patternHint ? `The scene features ${result.insight.patternHint} animation patterns` : ''}${result.styleHint ? ` with ${result.styleHint.toLowerCase()}` : ''}.`;
        } else {
          // For new scenes, describe what was created
          const sceneType = result.insight?.patternHint || 'custom';
          const duration = result.insight?.requestedDurationSec || 5;
          
          assistantMessage = `Perfect! I've created your new scene 🎬

**Scene Details:**
• **Type**: ${sceneType.charAt(0).toUpperCase() + sceneType.slice(1)} animation
• **Duration**: ~${duration} seconds (${duration * 30} frames)
• **Style**: ${result.styleHint || 'Modern animation design'}

The scene is now visible in all panels - you can preview it, edit the code, or select it from the storyboard. Feel free to ask for any adjustments!`;
        }
        
        updateMessage(projectId, streamingMessageId, {
          content: assistantMessage,
          status: 'success'
        });
        
        setStreamingMessageId(null);
      }
      
      // Refetch messages to show any server-side stored messages
      // Add a small delay to ensure database update has completed
      setTimeout(() => {
        void refetchMessages();
      }, 100);
    },
    onError: (error: any) => {
      console.error("❌ Scene generation failed:", error);
      setIsGenerating(false);
      toast.error(`Scene generation failed: ${error.message}`);
      
      // Update the streaming assistant message with error
      if (streamingMessageId) {
        const { updateMessage } = useVideoState.getState();
        
        // Create a helpful error message
        const errorMessage = `I encountered an issue creating your scene. ❌

**Error**: ${error.message}

**What you can try:**
• Simplify your prompt and try again
• Check if you're editing a specific scene or creating a new one
• Try describing the animation differently

I'm here to help - just send another message and I'll try again!`;
        
        updateMessage(projectId, streamingMessageId, {
          content: errorMessage,
          status: 'error'
        });
        
        setStreamingMessageId(null);
      }
      
      // Refetch messages to ensure consistency
      void refetchMessages();
    }
  });

  // Project rename mutation for first message
  const renameMutation = api.project.rename.useMutation({
    onError: (error: any) => {
      console.error("Error renaming project:", error);
    }
  });

  // AI title generation mutation
  const generateAITitleMutation = api.project.generateAITitle.useMutation();

  // Helper function to get scene by number (1-based indexing)
  const getSceneByNumber = useCallback((sceneNumber: number): Scene | null => {
    if (!scenes || scenes.length === 0) return null;
    const index = sceneNumber - 1; // Convert to 0-based index
    return scenes[index] || null;
  }, [scenes]);

  // Helper function to get scene number by ID
  const getSceneNumber = useCallback((sceneId: string): number | null => {
    if (!scenes || scenes.length === 0) return null;
    const index = scenes.findIndex(scene => scene.id === sceneId);
    return index >= 0 ? index + 1 : null; // Convert to 1-based numbering
  }, [scenes]);

  // Helper function to convert scene number references to actual IDs
  const convertSceneNumbersToIds = useCallback((message: string): string => {
    // Match patterns like "@scene(1)", "@scene(2)", etc.
    return message.replace(/@scene\((\d+)\)/g, (match, numberStr) => {
      const sceneNumber = parseInt(numberStr, 10);
      const scene = getSceneByNumber(sceneNumber);
      if (scene) {
        console.log(`[ChatPanelG] Converting @scene(${sceneNumber}) to @scene(${scene.id})`);
        return `@scene(${scene.id})`;
      } else {
        console.warn(`[ChatPanelG] Scene ${sceneNumber} not found, keeping original: ${match}`);
        return match; // Keep original if scene not found
      }
    });
  }, [getSceneByNumber]);

  // Helper function to detect if a message is likely an edit command
  const isLikelyEdit = useCallback((msg: string): boolean => {
    const trimmed = msg.trim();
    if (!trimmed) return false;
    
    // If no scenes exist, it can't be an edit
    if (scenes.length === 0) return false;
    
    // Split by spaces and filter out empty strings
    const words = trimmed.split(/\s+/).filter(word => word.length > 0);
    
    // AGGRESSIVE EDIT DETECTION: If we have scenes and message is short, assume it's an edit
    // This makes the system much more likely to edit existing scenes
    if (scenes.length > 0) {
      // Very short messages (1-3 words) are almost always edits
      if (words.length <= 3) return true;
      
      // Medium messages (4-8 words) are likely edits if they contain edit indicators
      if (words.length <= 8) {
        const editIndicators = ['make', 'change', 'set', 'turn', 'add', 'remove', 'fix', 'update', 'modify', 'adjust', 'improve', 'move', 'put', 'place', 'show', 'hide', 'bigger', 'smaller', 'faster', 'slower', 'color', 'position', 'size'];
        const hasEditIndicator = editIndicators.some(indicator => trimmed.toLowerCase().includes(indicator));
        if (hasEditIndicator) return true;
      }
      
      // Longer messages (9-15 words) need strong edit verbs to be considered edits
      if (words.length <= 15) {
        const strongEditVerbs = ['change', 'make', 'set', 'turn', 'modify', 'update', 'fix', 'adjust', 'improve'];
        const hasStrongEditVerb = strongEditVerbs.some(verb => trimmed.toLowerCase().includes(verb));
        if (hasStrongEditVerb) return true;
      }
    }
    
    return false;
  }, [scenes]);

  // Helper function to auto-tag messages with @scene(id) when appropriate
  const autoTagMessage = useCallback((msg: string): string => {
    // If already tagged, return as-is
    if (msg.startsWith('@scene(')) return msg;
    
    // STEP 1: Check for scene number syntax (@scene(1), @scene(2), etc.)
    const sceneNumberMatch = /\bscene\s+(\d+)\b/i.exec(msg);
    if (sceneNumberMatch) {
      const sceneNumber = parseInt(sceneNumberMatch[1], 10);
      const targetScene = getSceneByNumber(sceneNumber);
      if (targetScene) {
        console.log(`[ChatPanelG] Converting "scene ${sceneNumber}" to @scene(${targetScene.id})`);
        return `@scene(${targetScene.id}) ${msg}`;
      } else {
        console.warn(`[ChatPanelG] Scene ${sceneNumber} not found (only ${scenes.length} scenes available)`);
        return msg; // Keep original if scene number not found
      }
    }
    
    // STEP 2: Auto-detect edit commands for the selected scene
    // If no scene available (neither selected nor auto-selected), return as-is
    if (!selectedScene?.id) return msg;
    
    // At this point, selectedScene.id is guaranteed to exist
    const sceneId = selectedScene.id;
    
    // If it's a likely edit command, auto-tag it
    if (isLikelyEdit(msg)) {
      const sceneNumber = getSceneNumber(sceneId);
      const sceneName = selectedScene.data?.name || `Scene ${sceneNumber || '?'}`;
      console.log(`[ChatPanelG] Auto-tagging edit command for ${sceneName} (${sceneId})`);
      return `@scene(${sceneId}) ${msg}`;
    }
    
    return msg;
  }, [selectedScene, isLikelyEdit, getSceneByNumber, getSceneNumber, scenes]);

  // Generate project name from first message
  const generateNameFromPrompt = useCallback((prompt: string): string => {
    // Simple fallback name generation from prompt
    const cleanPrompt = prompt.replace(/[^\w\s]/g, '').trim();
    const words = cleanPrompt.split(/\s+/).slice(0, 4);
    let name = words.join(' ');
    
    if (name.length > 30) {
      name = name.substring(0, 27) + '...';
    }
    
    return name || 'New Video Project';
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isGenerating) return;
    
    const trimmedMessage = message.trim();
    
    // Check if no scene is selected for edit commands
    if (isLikelyEdit(trimmedMessage) && !selectedScene) {
      toast.error('Please select a scene to edit first, or create a new scene with a descriptive prompt.');
      return;
    }
    
    // Generate project name from first message using AI
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
    
    setIsGenerating(true);
    
    // Auto-tag the message if it's an edit command and a scene is selected
    const processedMessage = autoTagMessage(trimmedMessage);
    
    console.log('Original message:', trimmedMessage);
    console.log('Processed message:', processedMessage);
    console.log('Selected scene:', selectedScene?.id);
    console.log('Is likely edit:', isLikelyEdit(trimmedMessage));
    
    // Clear the input immediately for better UX
    setMessage("");
    
    // Use the proper chat initiation flow for message persistence
    initiateChatMutation.mutate({
      projectId,
      message: processedMessage,
      sceneId: selectedScene?.id, // Pass the selected scene ID for edits
    });
    
    // Generate the scene directly as well (for now, until full streaming is implemented)
    try {
      // Determine if this should be an edit or new scene creation
      // Use auto-selected scene for edit detection to make editing the default
      const isEditOperation = processedMessage.startsWith('@scene(') || 
                             (selectedScene && isLikelyEdit(trimmedMessage));
      
      console.log('[ChatPanelG] Operation type:', isEditOperation ? 'EDIT' : 'NEW_SCENE');
      console.log('[ChatPanelG] Scene ID to pass:', isEditOperation ? selectedScene?.id : undefined);
      console.log('[ChatPanelG] Auto-tagged message:', processedMessage);
      
      const result = await generateSceneCodeMutation.mutateAsync({
        projectId,
        userPrompt: processedMessage,
        sceneId: isEditOperation ? selectedScene?.id : undefined, // Only pass sceneId for edits
      });
      
      console.log('Scene generation result:', result);
      
    } catch (error) {
      console.error('Error during scene generation:', error);
      // Error is already handled by the mutation onError callback
    }
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dbMessages]);

  // Format timestamp for display
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Type guard for database messages
  function isDbMessage(msg: any): msg is { id: string; projectId: string; content: string; role: 'user' | 'assistant'; createdAt: Date; status?: string } {
    return (
      typeof msg === 'object' && 
      msg !== null && 
      typeof msg.id === 'string' && 
      typeof msg.projectId === 'string' &&
      typeof msg.content === 'string' && 
      (msg.role === 'user' || msg.role === 'assistant')
    );
  }

  // Get welcome message for new projects
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

  // Status indicator component for tool messages
  const getStatusIndicator = (status?: string) => {
    if (!status) return null;
    
    switch (status) {
      case "tool_calling":
      case "building":
        return <Loader2Icon className="h-4 w-4 animate-spin text-primary mr-2" />;
      case "success":
        return <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />;
      case "error":
        return <XCircleIcon className="h-4 w-4 text-red-500 mr-2" />;
      default:
        return null;
    }
  };

  const hasDbMessages = dbMessages && dbMessages.length > 0;
  const isLoading = isLoadingMessages && !hasDbMessages;
  const showWelcome = !hasDbMessages && !isLoading;

  // Check if we have any existing messages on load to determine if this is a new project
  useEffect(() => {
    if (dbMessages && dbMessages.length > 0) {
      isFirstMessageRef.current = false;
    }
  }, [dbMessages]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-10">
            <Loader2Icon className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="ml-2 text-xs text-muted-foreground">Loading...</span>
          </div>
        ) : showWelcome ? (
          getWelcomeMessage()
        ) : (
          <>
            {/* Render database messages */}
            {hasDbMessages && dbMessages.map((msg) => {
              if (!isDbMessage(msg)) return null;
              
              return (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-[15px] px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground border'
                    }`}
                  >
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                    
                    {/* Show status indicator for assistant messages */}
                    {msg.role === 'assistant' && msg.status && (
                      <div className="flex items-center text-xs mt-2 opacity-70">
                        {getStatusIndicator(msg.status)}
                        <span>
                          {msg.status === 'tool_calling' && 'Generating scene...'}
                          {msg.status === 'building' && 'Building component...'}
                          {msg.status === 'success' && 'Completed'}
                          {msg.status === 'error' && 'Error occurred'}
                        </span>
                      </div>
                    )}
                    
                    <div className="text-[10px] opacity-50 mt-2">
                      {formatTimestamp(msg.createdAt.getTime())}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
        
        {/* Show generating indicator */}
        {isGenerating && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-[15px] px-4 py-3 bg-muted text-muted-foreground border">
              <div className="flex items-center">
                <Loader2Icon className="h-4 w-4 animate-spin mr-2" />
                <span>Generating scene...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input form */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200">
        {/* Context indicator */}
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
        
        {/* Helper text */}
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