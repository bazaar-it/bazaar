// src/app/projects/[id]/edit/panels/ChatPanel.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { Loader2Icon, SendHorizontalIcon, AlertTriangleIcon, CheckCircleIcon, XCircleIcon } from "lucide-react";
import { useVideoState, type DbMessage, type ChatMessage, type MessageUpdates } from "~/stores/videoState";
import { type StreamEvent } from "~/types/chat";
import { skipToken } from "@tanstack/react-query";
import type { Operation } from "fast-json-patch";
import { useSelectedScene } from "~/components/client/Timeline/SelectedSceneContext";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateNameFromPrompt } from "~/lib/nameGenerator";

export default function ChatPanel({ projectId }: { projectId: string }) {
  const [message, setMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  // Store current streaming message ID
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const { 
    applyPatch, 
    getChatHistory, 
    addMessage,
    addAssistantMessage,
    updateMessage, 
    syncDbMessages, 
    clearOptimisticMessages 
  } = useVideoState();
  
  // Add ref to track if this is the first user message
  const isFirstMessageRef = useRef(true);
  
  // Get the currently selected scene from context
  const { selectedSceneId } = useSelectedScene();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Set up rename mutation
  const renameMutation = api.project.rename.useMutation({
    onSuccess: (data) => {
      console.log("Project renamed successfully:", data);
    },
    onError: (error) => {
      console.error("Failed to rename project:", error);
      
      // Check for duplicate title error
      if (error instanceof Error && error.message.includes("A project with this title already exists")) {
        // Show a user-friendly error message
        alert("Error: A project with this title already exists. Please choose a different title.");
      } else {
        // Generic error handling for other errors
        alert(`Error renaming project: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  });
  
  // Set up AI title generation mutation
  const generateAITitleMutation = api.project.generateAITitle.useMutation({
    onError: (error) => {
      console.error("Failed to generate AI title:", error);
    }
  });
  
  // Get or create a persistent client ID for reconnection support
  const clientIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      clientIdRef.current = localStorage.getItem('chatClientId') || 
                     crypto.randomUUID();
      localStorage.setItem('chatClientId', clientIdRef.current);
    }
  }, []);
  
  // Fetch messages from database using tRPC
  const { 
    data: dbMessages, 
    isLoading: isLoadingMessages,
    refetch: refetchMessages
  } = api.chat.getMessages.useQuery(
    { projectId },
    {
      // Don't refetch on window focus to avoid potentially confusing UI updates
      refetchOnWindowFocus: false,
      // Only start fetching if we have a projectId
      enabled: !!projectId,
      // Don't show loading state for too long - treat errors as empty messages
      retry: 1,
      // No longer polling - streaming will update messages in real-time
      // refetchInterval: 1000,
      // Consider data stale quickly so re-renders happen as needed
      staleTime: 0,
    }
  );
  
  // When messages are loaded, sync them with our store
  useEffect(() => {
    if (dbMessages) {
      syncDbMessages(projectId, dbMessages as DbMessage[]);
    }
  }, [dbMessages, projectId, syncDbMessages]);
  
  // Get optimistic chat history from the store for immediate UI updates
  const optimisticChatHistory: ChatMessage[] = getChatHistory();
  
  // Effect to clear optimistic messages when changing projects
  useEffect(() => {
    return () => {
      // Clear optimistic messages when component unmounts
      if (projectId) {
        clearOptimisticMessages(projectId);
      }
    };
  }, [projectId, clearOptimisticMessages]);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dbMessages, optimisticChatHistory]);
  
  // Set up the stream response mutation
  const streamResponse = api.chat.streamResponse.useMutation({
    onSuccess: (response) => {
      let cancelled = false;

      const consumeStream = async () => {
        try {
          // Track if a component was generated to break early
          let componentGenerated = false;
          
          // httpBatchStreamLink converts Observable responses into an async
          // iterator at runtime, but the static type exposed by tRPC is still
          // Observable. Cast through `unknown` first to satisfy TS 2352.
          const asyncIterable = response as unknown as AsyncIterable<StreamEvent>;

          for await (const event of asyncIterable) {
            if (cancelled) break;
            
            // Check if this is a tool_result event with a jobId (component generation)
            if (event.type === "tool_result" && event.jobId) {
              // Mark that we've generated a component
              componentGenerated = true;
              console.log(`[ChatPanel] Component generation detected in stream, jobId: ${event.jobId}`);
            }
            
            // Check if this is a reconnection event
            if (event.type === "reconnected") {
              console.log(`[ChatPanel] Reconnected to stream, missed ${event.missedEvents} events`);
            }
            
            // Process the event
            handleStreamEvents(event);
            
            // Store the last event ID for reconnection support
            if (streamingMessageId && event.type !== "reconnected") {
              // Using an event-specific ID if available
              const eventId = 'eventId' in event && typeof event.eventId === 'string' 
                ? event.eventId 
                : Date.now().toString();
              localStorage.setItem(`lastEvent_${streamingMessageId}`, eventId);
            }
            
            // If we've already processed a component generation event, we can stop streaming
            if (componentGenerated) {
              console.log("[ChatPanel] Breaking stream early after component generation");
              break;
            }
          }
          console.log("Stream completed");
        } catch (err) {
          console.error("Stream error:", err);
          addMessage(projectId, `Stream error: ${err instanceof Error ? err.message : String(err)}`, false);
        } finally {
          setIsStreaming(false);
          setStreamingMessageId(null);
        }
      };

      void consumeStream();

      // Cleanup ‑ allow caller to cancel iteration
      return () => {
        cancelled = true;
      };
    },
    onError: (err) => {
      console.error("Stream mutation error:", err);
      setIsStreaming(false);
      setStreamingMessageId(null);
      addMessage(projectId, `Stream error: ${err.message}`, false);
    }
  });

  // Track processed messages to avoid duplicate streams
  const [processedMessageIds] = useState<Set<string>>(new Set());
  
  // Check for reconnection on page load or refresh
  useEffect(() => {
    // Function to check for possible reconnection
    const checkForReconnection = async () => {
      // Check if there's a message ID in localStorage that was being streamed
      const pendingMessageId = localStorage.getItem('pendingStreamMessageId');
      if (pendingMessageId && clientIdRef.current) {
        console.log(`[ChatPanel] Found pending stream for message ${pendingMessageId}, attempting reconnection`);
        
        // Get the last event ID if available
        const lastEventId = localStorage.getItem(`lastEvent_${pendingMessageId}`);
        
        let canReconnect = false;
        try {
          // Type assertion to handle the API call safely
          const reconnectApi = api.chat.reconnectToStream;
          // Check if the API is available and has the mutate method
          if (reconnectApi && typeof (reconnectApi as any).mutate === 'function') {
            const reconnectResult = await (reconnectApi as any).mutate({
              assistantMessageId: pendingMessageId,
              projectId,
              clientId: clientIdRef.current,
              lastEventId
            });
            canReconnect = reconnectResult.canReconnect;
          } else {
            // API not available, clean up
            localStorage.removeItem('pendingStreamMessageId');
            localStorage.removeItem(`lastEvent_${pendingMessageId}`);
            return;
          }
        } catch (error) {
          console.error(`[ChatPanel] Error checking reconnection:`, error);
          // Clean up if reconnection fails
          localStorage.removeItem('pendingStreamMessageId');
          localStorage.removeItem(`lastEvent_${pendingMessageId}`);
          return;
        }

        if (canReconnect) {
          console.log(`[ChatPanel] Reconnection possible, resuming stream`);
          setStreamingMessageId(pendingMessageId);
          setIsStreaming(true);
        } else {
          console.log(`[ChatPanel] Reconnection not possible, cleaning up`);
          localStorage.removeItem('pendingStreamMessageId');
          localStorage.removeItem(`lastEvent_${pendingMessageId}`);
        }
      }
    };
    
    // Only run this effect once on mount
    if (projectId) {
      void checkForReconnection();
    }
  }, [projectId]);
  
  // Trigger stream subscription when streamingMessageId changes
  useEffect(() => {
    // Only proceed if we have a valid streaming message ID and we're not already processing it
    if (!streamingMessageId || !projectId || !isStreaming) {
      return; // Exit early if we don't need to stream
    }
    
    // Check if we've already processed this message in this component lifecycle
    if (processedMessageIds.has(streamingMessageId)) {
      console.log(`Message ${streamingMessageId} already processed in this session, not restarting stream`);
      return;
    }

    // Check if this message is already in the database with a completed status
    const existingMessage = dbMessages?.find(msg => msg.id === streamingMessageId);
    
    // Prevent streaming for completed/processed messages
    if (existingMessage) {
      const isCompleted = (
        existingMessage.status === "success" || 
        existingMessage.status === "error" || 
        existingMessage.kind === "tool_result" ||
        // Check for jobId property (may not exist on all message types)
        ('jobId' in existingMessage && existingMessage.jobId !== null)
      );
      
      // Also check for messages that already have significant content
      const hasContent = existingMessage.content && 
        existingMessage.content.length > 10 && 
        existingMessage.content !== "...";
      
      if (isCompleted || hasContent) {
        console.log(`Message ${streamingMessageId} already processed, not starting stream`, existingMessage);
        // Mark as processed to prevent future attempts
        processedMessageIds.add(streamingMessageId);
        // Reset streaming state for completed messages
        setIsStreaming(false);
        setStreamingMessageId(null);
        return;
      }
    }
    
    // Mark as being processed to prevent duplicate streams
    processedMessageIds.add(streamingMessageId);
    
    // Store the streaming message ID for reconnection
    localStorage.setItem('pendingStreamMessageId', streamingMessageId);
    
    console.log(`Starting stream subscription for message ID: ${streamingMessageId}`);
    streamResponse.mutate({
      assistantMessageId: streamingMessageId,
      projectId,
      clientId: clientIdRef.current || undefined,
      lastEventId: localStorage.getItem(`lastEvent_${streamingMessageId}`) || undefined
    });
    
    // This effect doesn't need to depend on dbMessages directly -
    // it only needs to run when streamingMessageId changes
  }, [streamingMessageId, projectId, isStreaming, streamResponse, processedMessageIds, dbMessages]);
  
  // Reset streaming state on component mount only
  useEffect(() => {
    // Only reset if we have stale state from a previous session
    if (isStreaming || streamingMessageId) {
      console.log("Clearing stale streaming state on component mount");
      setIsStreaming(false);
      setStreamingMessageId(null);
    }
    // No cleanup function needed here - we don't want to reset on unmount
  }, []);
  
  // STEP 1: Initiate the chat with user message (returns assistantMessageId for streaming)
  const initiateChatMutation = api.chat.initiateChat.useMutation({
    onMutate: () => {
      // Track that we're streaming
      setIsStreaming(true);
      
      // Add the user message optimistically
      addMessage(projectId, message, true);
      
      // Clear the input
      setMessage("");
      
      // Log the selected scene for context if available
      if (selectedSceneId) {
        console.log(`[ChatPanel] Selected scene for context: ${selectedSceneId}`);
      }
    },
    onSuccess: (response) => {
      // Get the assistantMessageId and start the streaming subscription
      const { assistantMessageId } = response;
      
      // Add placeholder assistant message to the store
      addAssistantMessage(projectId, assistantMessageId, "...");
      
      // Set the streaming message ID to start the subscription
      setStreamingMessageId(assistantMessageId);
    },
    onError: (error) => {
      // Add error message to chat history
      addMessage(projectId, `Error: ${error.message}`, false);
      setIsStreaming(false);
    },
  });
  
  // Handle stream events from subscription
  const handleStreamEvents = (event: StreamEvent) => {
    try {
      // Use streaming message ID for updates - this is set when initiateChat succeeds
      const activeMessageId = streamingMessageId || "";
      
      console.log(`[ChatPanel] Handling stream event: ${event.type}`, event);
      
      // Update message based on event type
      switch (event.type) {
        case "status":
          // Update status (thinking, tool_calling, building)
          const newStatus = event.status === "thinking" ? "pending" : event.status;
          updateMessage(projectId, activeMessageId, {
            status: newStatus
          });
          break;
          
        case "delta":
          // Append content delta to message
          updateMessage(projectId, activeMessageId, {
            delta: event.content // Use delta instead of content for streaming chunks
          });
          break;
          
        case "tool_start":
          // Tool execution started - with timestamp for duration tracking
          updateMessage(projectId, activeMessageId, {
            status: "tool_calling",
            content: `Using tool: ${event.name}...`,
            toolName: event.name,
            toolStartTime: Date.now() // Add timestamp for tracking execution time
          });
          break;
          
        case "tool_result":
          // Get the message to check for toolStartTime
          const message = optimisticChatHistory.find(m => m.id === activeMessageId);
          const toolStartTime = message?.toolStartTime;
          
          // Calculate execution time if we have a start time
          const executionTime = toolStartTime
            ? Math.round((Date.now() - toolStartTime) / 100) / 10 // Convert to seconds with 1 decimal
            : null;
            
          // Tool executed with result
          if (event.finalContent) {
            // Important: If this is a component generation (has jobId), update message with all data
            // This ensures we can detect already processed messages on page refresh
            updateMessage(projectId, activeMessageId, {
              status: event.success ? "success" : "error",
              kind: "tool_result",
              content: event.finalContent,
              jobId: event.jobId || null,
              executionTimeSeconds: executionTime // Store the execution time
            });
            
            // Immediately log the completed tool result for debugging
            console.log(`[ChatPanel] Tool result received: ${event.success ? 'success' : 'error'}`, {
              messageId: activeMessageId,
              hasJobId: !!event.jobId,
              jobId: event.jobId,
              executionTime: executionTime
            });
            
            // CRITICAL: Force a refetch of video props when a component is generated
            // This ensures the component is added to the timeline
            if (event.jobId) {
              console.log(`[ChatPanel] Component ${event.jobId} generated, refreshing video props`);
              
              // Wait 1 second to allow other updates to complete
              setTimeout(() => {
                // This will trigger a video props refresh via the API
                // which will update the timeline
                void refetchMessages();
                
                // After a few more seconds, check again to ensure the component
                // is properly loaded
                setTimeout(() => {
                  void refetchMessages();
                }, 3000);
              }, 1000);
            }
          }
          
          // Immediately stop streaming if a component was generated (has jobId)
          if (event.jobId) {
            console.log(`[ChatPanel] Component generation complete with jobId: ${event.jobId}. Stopping stream.`);
            setIsStreaming(false);
            setStreamingMessageId(null); // Stop subscription
            
            // Clean up localStorage to prevent reconnection attempts
            localStorage.removeItem('pendingStreamMessageId');
            localStorage.removeItem(`lastEvent_${activeMessageId}`);
            
            // Force a refetch to sync with backend
            void refetchMessages();
          }
          break;
          
        case "complete":
          // Response complete
          updateMessage(projectId, activeMessageId, {
            status: "success",
            kind: "text",
            content: event.finalContent
          });
          
          // Always stop streaming when complete
          setIsStreaming(false);
          setStreamingMessageId(null);
          
          // Clean up localStorage to prevent reconnection attempts
          localStorage.removeItem('pendingStreamMessageId');
          localStorage.removeItem(`lastEvent_${activeMessageId}`);
          break;
          
        case "error":
          // Error occurred
          updateMessage(projectId, activeMessageId, {
            status: "error",
            kind: "error",
            content: event.finalContent || `Error: ${event.error}`
          });
          
          // Always stop streaming on error
          setIsStreaming(false);
          setStreamingMessageId(null);
          
          // Clean up localStorage to prevent reconnection attempts
          localStorage.removeItem('pendingStreamMessageId');
          localStorage.removeItem(`lastEvent_${activeMessageId}`);
          break;
          
        case "finalized":
          // Stream completed
          console.log(`[ChatPanel] Stream finalized with status: ${event.status}, jobId: ${event.jobId || 'none'}`);
          setIsStreaming(false);
          setStreamingMessageId(null);  // Stop subscription
          
          // Clean up localStorage to prevent reconnection attempts
          localStorage.removeItem('pendingStreamMessageId');
          localStorage.removeItem(`lastEvent_${activeMessageId}`);
          
          // Refetch messages to ensure we have the latest state
          void refetchMessages();
          break;
          
        case "reconnected":
          // Successfully reconnected to the stream
          console.log(`[ChatPanel] Successfully reconnected to stream. Missed ${event.missedEvents} events.`);
          // No need to update the UI here, the missed events will be replayed
          break;
      }
      
      // Scroll to bottom on each update
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      console.error("Error processing stream event:", err, event);
      // Ensure we clean up streaming state even on error
      setIsStreaming(false);
      setStreamingMessageId(null);
      
      // Clean up localStorage to prevent reconnection attempts
      if (streamingMessageId) {
        localStorage.removeItem('pendingStreamMessageId');
        localStorage.removeItem(`lastEvent_${streamingMessageId}`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isStreaming) return;
    
    // Generate project name from first message using AI
    if (isFirstMessageRef.current && optimisticChatHistory.length === 0 && dbMessages?.length === 0) {
      // Capture message in a variable for use in callback
      const firstMessage = message;
      
      // Use AI-based title generation via tRPC
      console.log("Generating AI-powered title from first message...");
      
      // Use the mutation with callbacks
      generateAITitleMutation.mutate(
        {
          prompt: firstMessage,
          contextId: projectId
        },
        {
          onSuccess: (result) => {
            const generatedTitle = result.title;
            console.log(`Generated AI project name: "${generatedTitle}"`);
            
            // Update project name
            renameMutation.mutate({
              id: projectId,
              title: generatedTitle,
            });
          },
          onError: (error) => {
            console.error("Error using AI title generation:", error);
            const fallbackName = generateNameFromPrompt(firstMessage);
            console.log(`Falling back to regex-based name: "${fallbackName}"`);
            
            renameMutation.mutate({
              id: projectId,
              title: fallbackName,
            });
          }
        }
      );
      
      // Update flag to prevent renaming on subsequent messages
      isFirstMessageRef.current = false;
    }
    
    // Start streaming response
    initiateChatMutation.mutate({
      projectId,
      message: message.trim(),
      sceneId: selectedSceneId, // Include the selected scene ID if available
    });
  };

  // Update the formatTimestamp function to ensure consistent output
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    
    // Use explicit format options that will be consistent on server and client
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    // Return just HH:MM without AM/PM to match server rendering
    return `${hours}:${minutes}`;
  };

  // Type guard to ensure message matches DbMessage type
  function isDbMessage(msg: any): msg is DbMessage {
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
          Describe what kind of video you want to create. For example:
        </p>
        <div className="text-left bg-primary/5 rounded-[15px] p-3 text-sm">
          <p className="mb-1">• "Create a gradient background in blue and purple"</p>
          <p className="mb-1">• "Add a title that says Hello World in the center"</p>
          <p className="mb-1">• "Make the title fade in and add a subtle animation"</p>
        </div>
      </div>
    </div>
  );
  
  // New component for tool messages with status indicator
  const ToolMessage = ({ message }: { message: ChatMessage }) => {
    // Only render for assistant messages that are tool-related
    if (message.isUser || !message.status) return null;
    
    // Get the appropriate status icon/indicator
    const getStatusIndicator = () => {
      if (!message.status) return null;
      
      switch (message.status) {
        case "tool_calling":
          return <Loader2Icon className="h-4 w-4 animate-spin text-primary mr-2" />;
        case "building":
          return <Loader2Icon className="h-4 w-4 animate-spin text-amber-500 mr-2" />;
        case "success":
          return <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />;
        case "error":
          return <XCircleIcon className="h-4 w-4 text-red-500 mr-2" />;
        default:
          return null;
      }
    };
    
    return (
      <div className="flex items-center text-xs text-muted-foreground mt-1">
        {getStatusIndicator()}
        <span>{message.toolName && `Tool: ${message.toolName}`}</span>
        {message.executionTimeSeconds && (
          <span className="ml-2">Completed in {message.executionTimeSeconds}s</span>
        )}
      </div>
    );
  };

  const hasDbMessages = dbMessages && dbMessages.length > 0;
  const hasOptimisticMessages = optimisticChatHistory && optimisticChatHistory.length > 0;
  const isLoading = isLoadingMessages && !hasDbMessages && !hasOptimisticMessages;
  const showWelcome = !hasDbMessages && !hasOptimisticMessages && !isLoading;

  // Check if we have any existing messages on load to determine if this is a new project
  useEffect(() => {
    if (dbMessages && dbMessages.length > 0) {
      // If we already have messages, this isn't a new project
      isFirstMessageRef.current = false;
    }
  }, [dbMessages]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoadingMessages ? (
          <div className="flex justify-center items-center h-10">
            <Loader2Icon className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="ml-2 text-xs text-muted-foreground">Loading...</span>
          </div>
        ) : showWelcome ? (
          getWelcomeMessage()
        ) : (
          <>
            {/* First render database messages */}
            {hasDbMessages && dbMessages.map((msg) => {
              // Ensure msg matches our expected type
              if (!isDbMessage(msg)) {
                // Skip messages that don't match our expected format
                return null;
              }
              
              return (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`rounded-[15px] shadow-sm px-4 py-2 max-w-[80%] break-words ${
                      msg.role === 'user' 
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/80'
                    }`}
                  >
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                    <p className="text-xs opacity-70 text-right mt-1">
                      {formatTimestamp(typeof msg.createdAt === 'number' ? msg.createdAt : new Date(msg.createdAt).getTime())}
                    </p>
                    
                    {/* Show tool status for assistant messages */}
                    {msg.role === 'assistant' && msg.status && (
                      <div className="flex items-center text-xs text-muted-foreground mt-1">
                        {(msg.status as string) === 'tool_calling' && <Loader2Icon className="h-4 w-4 animate-spin text-primary mr-2" />}
                        {msg.status === 'building' && <Loader2Icon className="h-4 w-4 animate-spin text-amber-500 mr-2" />}
                        {msg.status === 'success' && <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />}
                        {msg.status === 'error' && <XCircleIcon className="h-4 w-4 text-red-500 mr-2" />}
                        <span>{msg.kind === 'tool_result' ? 'Tool execution' : msg.status}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            
            {/* Then render any optimistic updates that haven't been saved to the database yet */}
            {hasDbMessages ? (
              // Only show optimistic messages if there's a chance they're not in the database yet
              // For a more robust solution, you'd filter out messages that match database entries
              isStreaming && hasOptimisticMessages && optimisticChatHistory.map((chat) => (
                <div
                  key={chat.id}
                  className={`flex ${chat.isUser ? 'justify-end' : 'justify-start'} opacity-70`}
                >
                  <div 
                    className={`rounded-[15px] shadow-sm px-4 py-2 max-w-[80%] break-words ${
                      chat.isUser 
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/80'
                    }`}
                  >
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {chat.message}
                      </ReactMarkdown>
                    </div>
                    <p className="text-xs opacity-70 text-right mt-1">
                      {formatTimestamp(chat.timestamp)}
                    </p>
                    
                    {/* Show tool message status/progress */}
                    {!chat.isUser && <ToolMessage message={chat} />}
                  </div>
                </div>
              ))
            ) : (
              // If there are no database messages yet, show all optimistic messages
              hasOptimisticMessages && optimisticChatHistory.map((chat) => (
                <div
                  key={chat.id}
                  className={`flex ${chat.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`rounded-[15px] shadow-sm px-4 py-2 max-w-[80%] break-words ${
                      chat.isUser 
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/80'
                    }`}
                  >
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {chat.message}
                      </ReactMarkdown>
                    </div>
                    <p className="text-xs opacity-70 text-right mt-1">
                      {formatTimestamp(chat.timestamp)}
                    </p>
                    
                    {/* Show tool message status/progress */}
                    {!chat.isUser && <ToolMessage message={chat} />}
                  </div>
                </div>
              ))
            )}
          </>
        )}
        
        {isStreaming && !hasOptimisticMessages && (
          <div className="flex justify-start">
            <div className="bg-muted/80 rounded-[15px] shadow-sm px-4 py-2 flex items-center gap-2">
              <Loader2Icon className="h-4 w-4 animate-spin" />
              <p className="text-sm">Processing your request...</p>
            </div>
          </div>
        )}
        
        {/* Empty div for scrolling to bottom */}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Selected scene indicator */}
      {selectedSceneId && (
        <div className="px-4 py-2 bg-primary/5 border-t border-primary/10 flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary animate-pulse"></div>
          <p className="text-xs">Editing scene: {selectedSceneId}</p>
        </div>
      )}

      {/* Message input */}
      <div className="p-4 border-t border-gray-100">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={selectedSceneId 
              ? "Describe changes to this scene..." 
              : "Describe changes to your video..."}
            className="flex-1 text-foreground"
            style={{ color: "black" }}
            disabled={isStreaming || isLoadingMessages}
          />
          <Button 
            type="submit"
            disabled={isStreaming || isLoadingMessages || !message.trim()}
            size="icon"
          >
            {isStreaming ? (
              <Loader2Icon className="h-4 w-4 animate-spin" />
            ) : (
              <SendHorizontalIcon className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
} 