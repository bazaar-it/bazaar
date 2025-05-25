"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { api } from "~/trpc/react";
import { useVideoState } from '~/stores/videoState';
import { Loader2Icon, CheckCircleIcon, XCircleIcon, SendIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Scene {
  id: string;
  name: string;
  template?: string;
  start?: number;
  duration: number;
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
  const [generationComplete, setGenerationComplete] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState<string>(''); // Track the current prompt being processed
  const [localMessages, setLocalMessages] = useState<Array<{
    id: string;
    content: string;
    role: 'user' | 'assistant';
    timestamp: number;
    status?: 'generating' | 'success' | 'error';
    isLocal?: boolean;
  }>>([]);
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
  
  // Debug logging to trace scene selection issues
  console.log('[ChatPanelG] selectedSceneId prop:', selectedSceneId);
  console.log('[ChatPanelG] scenes available:', scenes.map(s => ({ id: s.id, name: s.data?.name || s.type })));
  console.log('[ChatPanelG] effectiveSelectedSceneId (auto-selected):', effectiveSelectedSceneId);
  console.log('[ChatPanelG] selectedScene resolved:', selectedScene ? { id: selectedScene.id, name: selectedScene.data?.name || selectedScene.type } : 'none');
  
  // Auto-scroll function
  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, []);
  
  // Function to create contextual summary from user prompt
  const summarizePrompt = useCallback((prompt: string): string => {
    const cleanPrompt = prompt.replace(/@scene\([^)]+\)\s*/, '').trim();
    
    if (!cleanPrompt) return 'Custom scene';
    
    // Remove common action words and keep meaningful content
    const words = cleanPrompt.split(/\s+/);
    const meaningfulWords = words.filter(word => {
      const lowerWord = word.toLowerCase();
      return word.length > 2 && 
             !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'she', 'use', 'her', 'way', 'many', 'then', 'them', 'well', 'were'].includes(lowerWord) &&
             !['make', 'create', 'add', 'show', 'with', 'that', 'this', 'have', 'will', 'want', 'need', 'lets', 'please'].includes(lowerWord);
    });
    
    if (meaningfulWords.length === 0) {
      // Fallback to first few words if no meaningful words found
      return words.slice(0, 3).join(' ').toLowerCase();
    }
    
    // Take up to 4 meaningful words and capitalize properly
    const selectedWords = meaningfulWords.slice(0, 4);
    const title = selectedWords.map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
    
    // Limit length to prevent overly long titles
    return title.length > 40 ? title.substring(0, 37) + '...' : title;
  }, []);
  
  // Scene generation mutation using the BAZAAR-302 approach
  const generateSceneCodeMutation = api.generation.generateSceneCode.useMutation({
    onSuccess: (result: any) => {
      console.log("✅ Scene generation completed:", result);
      setIsGenerating(false);
      setGenerationComplete(true);
      
      // Create appropriate completion message based on operation type
      let completionMessage: string;
      
      if (result.isEdit) {
        // For edits, just show "Scene updated ✅" without changing the title
        completionMessage = 'Scene updated ✅';
      } else {
        // For new scenes, show "Scene generated: [title] ✅"
        const promptSummary = summarizePrompt(currentPrompt);
        completionMessage = `Scene generated: ${promptSummary} ✅`;
      }
      
      // Add persistent completion message to local messages
      setLocalMessages(prev => prev.map(msg => 
        msg.status === 'generating' 
          ? { ...msg, content: completionMessage, status: 'success' as const }
          : msg
      ));
      
      // Auto-scroll is now handled by the dedicated useEffect for completion
      // (Removed manual scrollToBottom call to prevent duplicate scrolling)
      
      // Notify parent component about the generated scene
      if (onSceneGenerated) {
        console.log('[ChatPanelG] Calling onSceneGenerated callback');
        onSceneGenerated(result.sceneId, result.code);
      }
      
      // Force a refresh of the preview
      const { forceRefresh } = useVideoState.getState();
      forceRefresh(projectId);
    },
    onError: (error: any) => {
      console.error("❌ Scene generation failed:", error);
      setIsGenerating(false);
      
      // Update local message with error status
      setLocalMessages(prev => prev.map(msg => 
        msg.status === 'generating' 
          ? { ...msg, content: `Scene generation failed: ${error.message} ❌`, status: 'error' as const }
          : msg
      ));
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

  // Helper function to detect if a message is likely an edit command
  const isLikelyEdit = useCallback((msg: string): boolean => {
    const trimmed = msg.trim().toLowerCase();
    if (!trimmed) return false;
    
    // If no scenes exist, it can't be an edit
    if (scenes.length === 0) return false;
    
    // If no scene is selected, it's likely a new scene request
    if (!selectedScene) return false;
    
    // EXPLICIT NEW SCENE INDICATORS - these always create new scenes
    const newSceneIndicators = [
      'create', 'new scene', 'add scene', 'make a scene', 'generate', 
      'build', 'design', 'show me', 'i want', 'can you create'
    ];
    
    const hasNewSceneIndicator = newSceneIndicators.some(indicator => 
      trimmed.includes(indicator)
    );
    
    if (hasNewSceneIndicator) {
      return false; // This is a new scene request
    }
    
    // EXPLICIT EDIT INDICATORS - these modify existing scenes
    const editIndicators = [
      'make it', 'change', 'set', 'turn', 'modify', 'update', 'fix', 
      'adjust', 'improve', 'move', 'put', 'place', 'hide', 'show',
      'bigger', 'smaller', 'faster', 'slower', 'brighter', 'darker',
      'add to', 'remove from', 'replace', 'swap'
    ];
    
    const hasEditIndicator = editIndicators.some(indicator => 
      trimmed.includes(indicator)
    );
    
    if (hasEditIndicator) {
      return true; // This is an edit request
    }
    
    // For ambiguous cases, use word count and context
    const words = trimmed.split(/\s+/).filter(word => word.length > 0);
    
    // Very short messages (1-3 words) with a selected scene are likely edits
    if (words.length <= 3 && selectedScene) {
      return true;
    }
    
    // Default to new scene for longer, descriptive prompts
    return false;
  }, [scenes, selectedScene]);

  // Helper function to auto-tag messages with @scene(id) when appropriate
  const autoTagMessage = useCallback((msg: string): string => {
    // If already tagged, return as-is
    if (msg.startsWith('@scene(')) return msg;
    
    // If no scene available (neither selected nor auto-selected), return as-is
    if (!selectedScene?.id) return msg;
    
    // If it's a likely edit command, auto-tag it
    if (isLikelyEdit(msg)) {
      return `@scene(${selectedScene.id}) ${msg}`;
    }
    
    return msg;
  }, [selectedScene, isLikelyEdit]);

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
      return;
    }
    
    // Generate project name from first message using AI
    if (isFirstMessageRef.current && localMessages.length === 0) {
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
    
    // Reset completion status only when starting a new generation
    setGenerationComplete(false);
    
    // Auto-tag the message if it's an edit command and a scene is selected
    const processedMessage = autoTagMessage(trimmedMessage);
    
    console.log('Original message:', trimmedMessage);
    console.log('Processed message:', processedMessage);
    console.log('Selected scene:', selectedScene?.id);
    console.log('Is likely edit:', isLikelyEdit(trimmedMessage));
    
    // Clear the input immediately for better UX
    setMessage("");
    
    // Store the current prompt for the completion message
    setCurrentPrompt(trimmedMessage);
    
    // Determine if this is an edit operation for proper labeling
    const isEditOperation = processedMessage.startsWith('@scene(') || 
                           (selectedScene && isLikelyEdit(trimmedMessage));
    
    // Immediately add user message to local state for instant display
    const userMessageId = `user-${Date.now()}`;
    const assistantMessageId = `assistant-${Date.now()}`;
    
    setLocalMessages(prev => [
      ...prev,
      {
        id: userMessageId,
        content: trimmedMessage, // Show only the original message without scene reference
        role: 'user' as const,
        timestamp: Date.now(),
        isLocal: true
      },
      {
        id: assistantMessageId,
        content: isEditOperation ? 'Updating scene...' : 'Generating scene...',
        role: 'assistant' as const,
        timestamp: Date.now(),
        status: 'generating' as const,
        isLocal: true
      }
    ]);
    
    // Use the proper chat initiation flow for message persistence
    generateSceneCodeMutation.mutate({
      projectId,
      userPrompt: processedMessage,
      sceneId: selectedScene?.id, // Pass the selected scene ID for edits
    });
  };

  // Use only local messages to prevent duplicates
  const allMessages = useMemo(() => {
    return localMessages.sort((a, b) => a.timestamp - b.timestamp);
  }, [localMessages]);
  
  // Auto-scroll to bottom when messages change (but stop when generation completes)
  useEffect(() => {
    if (!generationComplete) {
      scrollToBottom();
    }
  }, [allMessages, scrollToBottom, generationComplete]);

  // Separate effect for completion scroll - only scrolls once when generation completes
  useEffect(() => {
    if (generationComplete) {
      scrollToBottom();
    }
  }, [generationComplete, scrollToBottom]);

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

  const showWelcome = localMessages.length === 0;
  
  // Check if we have any existing messages on load to determine if this is a new project
  useEffect(() => {
    if (localMessages.length > 0) {
      isFirstMessageRef.current = false;
    }
  }, [localMessages]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages container */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {showWelcome ? (
          getWelcomeMessage()
        ) : (
          <>
            {/* Render all messages in chronological order */}
            {allMessages.map((msg) => {
              const isUser = msg.role === 'user';
              const isError = msg.status === 'error';
              const isSuccess = msg.status === 'success';
              const isGenerating = msg.status === 'generating';
              
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
                    }`}
                  >
                    <div className="flex items-center">
                      {isGenerating && <Loader2Icon className="h-4 w-4 animate-spin mr-2" />}
                      {isSuccess && <CheckCircleIcon className="h-4 w-4 mr-2" />}
                      {isError && <XCircleIcon className="h-4 w-4 mr-2" />}
                      
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        {isUser || isGenerating || isSuccess || isError ? (
                          <span>{msg.content}</span>
                        ) : (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-[10px] opacity-50 mt-2">
                      {formatTimestamp(msg.timestamp)}
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
        <form onSubmit={handleSubmit} className="flex gap-2 items-center">
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
      </div>
    </div>
  );
} 