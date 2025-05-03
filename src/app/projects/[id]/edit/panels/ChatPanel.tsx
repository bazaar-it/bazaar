// src/app/projects/[id]/edit/panels/ChatPanel.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { Loader2Icon, SendHorizontalIcon } from "lucide-react";
import { useVideoState, type DbMessage, type ChatMessage, type MessageUpdates } from "~/stores/videoState";
import { type StreamEvent } from "~/server/api/routers/chat";
import { skipToken } from "@tanstack/react-query";
import type { Operation } from "fast-json-patch";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
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
  
  // STEP 1: Initiate the chat with user message (returns assistantMessageId for streaming)
  const initiateChat = api.chat.initiateChat.useMutation({
    onMutate: () => {
      // Add user message to optimistic chat history immediately
      addMessage(projectId, message, true);
      
      // Clear input field
      setMessage("");
      
      // Set streaming state
      setIsStreaming(true);
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
      
      // Update message based on event type
      switch (event.type) {
        case "status":
          // Update status (thinking, tool_calling, building)
          updateMessage(projectId, activeMessageId, {
            status: event.status
          });
          break;
          
        case "delta":
          // Append content delta to message
          updateMessage(projectId, activeMessageId, {
            delta: event.content // Use delta instead of content for streaming chunks
          });
          break;
          
        case "tool_start":
          // Tool execution started
          updateMessage(projectId, event.name, {
            status: "tool_calling",
            content: `Using tool: ${event.name}...`
          });
          break;
          
        case "tool_result":
          // Tool executed with result
          if (event.finalContent) {
            updateMessage(projectId, event.name, {
              status: event.success ? "success" : "error",
              kind: "tool_result",
              content: event.finalContent,
              jobId: event.jobId || null
            });
          }
          break;
          
        case "complete":
          // Response complete
          updateMessage(projectId, event.finalContent, {
            status: "success",
            kind: "text",
            content: event.finalContent
          });
          break;
          
        case "error":
          // Error occurred
          updateMessage(projectId, event.error, {
            status: "error",
            kind: "error",
            content: event.finalContent || `Error: ${event.error}`
          });
          break;
          
        case "finalized":
          // Stream completed
          setIsStreaming(false);
          setStreamingMessageId(null);  // Stop subscription
          // Refetch messages to ensure we have the latest state
          void refetchMessages();
          break;
      }
      
      // Scroll to bottom on each update
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      console.error("Error processing stream event:", err, event);
    }
  };
  


  // Set up the stream response subscription
  // This will automatically activate when streamingMessageId is set
  api.chat.streamResponse.useSubscription(
    // Only subscribe if we have a streaming message ID
    streamingMessageId ? { assistantMessageId: streamingMessageId, projectId } : skipToken,
    {
      onData: handleStreamEvents,
      onError: (err) => {
        console.error("Stream subscription error:", err);
        setIsStreaming(false);
        setStreamingMessageId(null);
        addMessage(projectId, `Stream error: ${err.message}`, false);
      }
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || !projectId) return;
    
    initiateChat.mutate({
      projectId,
      message: message.trim(),
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
      <div className="bg-muted rounded-lg p-4 mx-auto max-w-md">
        <h3 className="font-medium text-base mb-2">Welcome to your new project!</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Describe what kind of video you want to create. For example:
        </p>
        <div className="text-left bg-primary/10 rounded p-3 text-sm">
          <p className="mb-1">• "Create a gradient background in blue and purple"</p>
          <p className="mb-1">• "Add a title that says Hello World in the center"</p>
          <p className="mb-1">• "Make the title fade in and add a subtle animation"</p>
        </div>
      </div>
    </div>
  );

  const hasDbMessages = dbMessages && dbMessages.length > 0;
  const hasOptimisticMessages = optimisticChatHistory && optimisticChatHistory.length > 0;
  const isLoading = isLoadingMessages && !hasDbMessages && !hasOptimisticMessages;
  const showWelcome = !hasDbMessages && !hasOptimisticMessages && !isLoading;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b">
        <h2 className="text-lg font-medium">Chat</h2>
        <p className="text-sm text-muted-foreground">Describe changes to your video</p>
      </div>
      
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
                    className={`rounded-lg px-4 py-2 max-w-[80%] ${
                      msg.role === 'user' 
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <p className="text-xs opacity-70 text-right mt-1">
                      {formatTimestamp(typeof msg.createdAt === 'number' ? msg.createdAt : new Date(msg.createdAt).getTime())}
                    </p>
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
                    className={`rounded-lg px-4 py-2 max-w-[80%] ${
                      chat.isUser 
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm">{chat.message}</p>
                    <p className="text-xs opacity-70 text-right mt-1">
                      {formatTimestamp(chat.timestamp)}
                    </p>
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
                    className={`rounded-lg px-4 py-2 max-w-[80%] ${
                      chat.isUser 
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm">{chat.message}</p>
                    <p className="text-xs opacity-70 text-right mt-1">
                      {formatTimestamp(chat.timestamp)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </>
        )}
        
        {isStreaming && !hasOptimisticMessages && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-4 py-2 flex items-center gap-2">
              <Loader2Icon className="h-4 w-4 animate-spin" />
              <p className="text-sm">Processing your request...</p>
            </div>
          </div>
        )}
        
        {/* Empty div for scrolling to bottom */}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message input */}
      <div className="p-4 border-t">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe changes to your video..."
            className="flex-1"
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