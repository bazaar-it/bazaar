// src/app/projects/[id]/generate/workspace/panels/ChatPanelG.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { api } from "~/trpc/react";
import { useVideoState } from '~/stores/videoState';
import { Loader2, CheckCircleIcon, XCircleIcon, Send, Mic, StopCircle, MicIcon, Plus, Edit, Trash2 } from 'lucide-react';

import { useVoiceToText } from '~/hooks/useVoiceToText';
import { Card, CardContent } from "~/components/ui/card";

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
  const [activeAssistantMessageId, setActiveAssistantMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isFirstMessageRef = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [progressStage, setProgressStage] = useState<string | null>(null);
  const [editComplexityFeedback, setEditComplexityFeedback] = useState<string | null>(null);
  
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
  const { getCurrentProps } = useVideoState();
  const currentProps = getCurrentProps();
  const scenes = currentProps?.scenes || [];
  
  // 🚨 SIMPLIFIED: Scene context logic - let Brain LLM handle scene targeting
  const selectedScene = selectedSceneId ? scenes.find(s => s.id === selectedSceneId) : null;
  
  // ✅ SINGLE SOURCE OF TRUTH: Use only VideoState for messages
  const { 
    getProjectChatHistory, 
    addUserMessage, 
    addAssistantMessage, 
    updateMessage 
  } = useVideoState();

  // ✅ SINGLE SOURCE: Get messages from VideoState only
  const messages = getProjectChatHistory(projectId);
  
  // Convert VideoState messages to component format for rendering
  const componentMessages: ComponentMessage[] = messages.map(msg => ({
    id: msg.id,
    content: msg.message,
    isUser: msg.isUser,
    timestamp: new Date(msg.timestamp),
    status: msg.status,
    kind: msg.kind,
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
  
  // Query to get current project details
  const { data: currentProject, refetch: refetchProject } = api.project.getById.useQuery({ id: projectId });

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
        if (activeAssistantMessageId) {
          updateMessage(projectId, activeAssistantMessageId, {
            content: editComplexityFeedback,
            status: 'building'
          });
        }
        
        // After 3 seconds, switch to regular progress messages
        setTimeout(() => {
          const firstMessage = progressMessages[0];
          if (firstMessage) {
            setProgressStage(firstMessage);
            if (activeAssistantMessageId) {
              updateMessage(projectId, activeAssistantMessageId, {
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
          if (activeAssistantMessageId) {
            updateMessage(projectId, activeAssistantMessageId, {
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
  }, [isGenerating, activeAssistantMessageId, projectId, updateMessage, editComplexityFeedback]);

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
    
    // ✅ SIMPLE: Add user message to VideoState
    addUserMessage(projectId, trimmedMessage);
    
    // ✅ SIMPLE: Add assistant loading message with progress simulation
    const assistantMessageId = `assistant-${Date.now()}`;
    setActiveAssistantMessageId(assistantMessageId);
    addAssistantMessage(projectId, assistantMessageId, '🧠 Analyzing your request...');
    
    setMessage("");
    setIsGenerating(true);

    try {
      const result = await generateSceneMutation.mutateAsync({
        projectId,
        userMessage: trimmedMessage,
        sceneId: selectedSceneId || undefined,
      });
      
      // 🎯 NEW: Check for edit complexity feedback in result
      // TODO: Implement editComplexity in mutation result when Brain LLM actually returns this data
      // For now, we use honest progress messages instead of fake complexity feedback
      
      // if (result.editComplexity) {
      //   handleEditComplexityDetected(result.editComplexity);
      // }
      
      // ✅ FIXED: Use correct interface for updateMessage
      updateMessage(projectId, assistantMessageId, {
        content: result.chatResponse || 'Scene operation completed ✅',
        status: 'success'
      });

      // Handle callbacks
      if (result.scene?.id && onSceneGenerated) {
        onSceneGenerated(result.scene.id);
      }

    } catch (error) {
      console.error("Error in chat generation:", error);
      
      // ✅ FIXED: Use correct interface for updateMessage
      updateMessage(projectId, assistantMessageId, {
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        status: 'error'
      });
    }

    setIsGenerating(false);
    setActiveAssistantMessageId(null);
  };

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

  // Reset component state when projectId changes (for new projects)
  useEffect(() => {
    // Clear optimistic messages when switching projects
    setOptimisticMessages([]);
    setMessage("");
    setIsGenerating(false);
    setGenerationComplete(false);
    setCurrentPrompt('');
    setEditComplexityFeedback(null);
    
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

      {/* Input form */}
      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              selectedSceneId
                ? "Describe changes to the selected scene..."
                : "Describe your video or add a new scene..."
            }
            disabled={isGenerating}
            className="flex-1"
          />
          <Button type="submit" disabled={!message.trim() || isGenerating}>
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