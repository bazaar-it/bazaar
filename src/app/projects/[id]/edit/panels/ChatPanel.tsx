// src/app/projects/[id]/edit/panels/ChatPanel.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import { SendHorizontalIcon, Loader2Icon } from "lucide-react";
import { api } from "~/trpc/react";
import { useVideoState } from "~/stores/videoState";
import type { Operation } from "fast-json-patch";

interface Message {
  id: string;
  message: string;
  isUser: boolean;
}

export default function ChatPanel({ projectId }: { projectId: string }) {
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<Message[]>([
    {
      id: "system-welcome",
      message: "Hello! How can I help you create animations today?",
      isUser: false,
    },
  ]);
  
  const { inputProps, applyPatch } = useVideoState();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);
  
  const sendMessage = api.chat.sendMessage.useMutation({
    onMutate: () => {
      // Add user message to chat history immediately
      const newId = `user-${Date.now()}`;
      setChatHistory(prev => [
        ...prev,
        { 
          id: newId, 
          message, 
          isUser: true,
        }
      ]);
      
      // Clear input field
      setMessage("");
    },
    onSuccess: ({ patch }) => {
      // Apply the patch to the local state
      applyPatch(patch as unknown as Operation[]);
      
      // Add system response to chat history
      const responseId = `system-${Date.now()}`;
      setChatHistory(prev => [
        ...prev,
        { 
          id: responseId,
          message: "Changes applied to your video preview.",
          isUser: false,
        }
      ]);
    },
    onError: (error) => {
      const errorId = `error-${Date.now()}`;
      setChatHistory(prev => [
        ...prev,
        { 
          id: errorId,
          message: `Error: ${error.message}`,
          isUser: false,
        }
      ]);
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

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b">
        <h2 className="text-lg font-medium">Chat</h2>
        <p className="text-sm text-muted-foreground">Describe changes to your video</p>
      </div>
      
      {/* Messages container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatHistory.map((chat) => (
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
            </div>
          </div>
        ))}
        
        {sendMessage.isPending && (
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
            disabled={sendMessage.isPending}
          />
          <Button 
            type="submit"
            disabled={sendMessage.isPending || !message.trim()}
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