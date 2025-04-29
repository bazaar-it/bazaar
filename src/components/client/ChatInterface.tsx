// src/components/client/ChatInterface.tsx
"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { useVideoState } from "~/stores/videoState";
import type { Operation } from "fast-json-patch";

export function ChatInterface({ projectId }: { projectId: string }) {
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ message: string; isUser: boolean }>>([
    {
      message: "What do you want?",
      isUser: false,
    },
  ]);
  const { inputProps, applyPatch } = useVideoState();
  
  const sendMessage = api.chat.sendMessage.useMutation({
    onMutate: () => {
      // Add user message to chat history immediately
      setChatHistory(prev => [
        ...prev,
        { message, isUser: true }
      ]);
      
      // Clear input field
      setMessage("");
    },
    onSuccess: ({ patch }) => {
      // Apply the patch to the local state
      applyPatch(patch as unknown as Operation[]);
      
      // Add system response to chat history
      setChatHistory(prev => [
        ...prev,
        { 
          message: "✅ Changes applied to the video preview.",
          isUser: false 
        }
      ]);
    },
    onError: (error) => {
      setChatHistory(prev => [
        ...prev,
        { 
          message: `❌ Error: ${error.message}`,
          isUser: false 
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
      <h2 className="text-xl font-semibold mb-4">Chat</h2>
      
      {/* Message history */}
      <div className="flex-1 bg-gray-100 rounded-lg p-4 mb-4 overflow-auto">
        {chatHistory.map((chat, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg mb-3 max-w-[80%] ${
              chat.isUser 
                ? "bg-blue-500 text-white ml-auto" 
                : "bg-gray-200"
            }`}
          >
            <p className="text-sm">{chat.message}</p>
          </div>
        ))}
        
        {sendMessage.isPending && (
          <div className="bg-gray-200 p-3 rounded-lg mb-3 max-w-[80%]">
            <p className="text-sm">Processing your request...</p>
          </div>
        )}
      </div>
      
      {/* Message input */}
      <form onSubmit={handleSubmit} className="border rounded-lg p-2">
        <div className="flex items-center">
          <textarea 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe changes to your video..."
            className="flex-1 resize-none p-2 bg-transparent"
            rows={2}
            disabled={sendMessage.isPending}
          />
          <button 
            type="submit"
            className={`text-white rounded-md px-4 py-2 ml-2 ${
              sendMessage.isPending || !message.trim()
                ? "bg-blue-300 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600"
            }`}
            disabled={sendMessage.isPending || !message.trim()}
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
} 