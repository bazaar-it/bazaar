// src/app/projects/[id]/edit/panels/ChatPanel.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import { SendHorizontalIcon, Loader2Icon } from "lucide-react";
import { api } from "~/trpc/react";
import { useVideoState, type DbMessage, type ChatMessage } from "~/stores/videoState";
import type { Operation } from "fast-json-patch";

export default function ChatPanel({ projectId }: { projectId: string }) {
  const [message, setMessage] = useState("");
  const { 
    applyPatch, 
    getChatHistory, 
    addMessage, 
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
      // Poll every second for new messages
      refetchInterval: 1000,
      // Consider data stale quickly so polling can re-render as soon as new messages come in
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
  
  const sendMessage = api.chat.sendMessage.useMutation({
    onMutate: () => {
      // Add user message to optimistic chat history immediately
      addMessage(projectId, message, true);
      
      // Clear input field
      setMessage("");
    },
    onSuccess: ({ patch }) => {
      // Apply the patch to the project
      applyPatch(projectId, patch as unknown as Operation[]);
      
      // Add system response to optimistic chat history
      addMessage(projectId, "Changes applied to your video preview.", false);
      
      // Refetch messages from database to sync with server
      // This ensures we have the actual database records
      void refetchMessages();
    },
    onError: (error) => {
      // Add error message to chat history
      addMessage(projectId, `Error: ${error.message}`, false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || !projectId) return;
    
    sendMessage.mutate({
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
              sendMessage.isPending && hasOptimisticMessages && optimisticChatHistory.map((chat) => (
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
        
        {sendMessage.isPending && !hasOptimisticMessages && (
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
            disabled={sendMessage.isPending || isLoadingMessages}
          />
          <Button 
            type="submit"
            disabled={sendMessage.isPending || isLoadingMessages || !message.trim()}
            size="icon"
          >
            {sendMessage.isPending ? (
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