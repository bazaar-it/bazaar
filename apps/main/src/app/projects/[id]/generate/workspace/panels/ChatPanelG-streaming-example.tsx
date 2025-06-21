/**
 * Example of ChatPanelG with streaming support
 * This shows how to integrate the useGenerationStream hook
 */

import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@bazaar/ui";
import { Input } from "@bazaar/ui";
import { useGenerationStream } from '~/hooks/useGenerationStream';
import { Progress } from "@bazaar/ui";
import { Card, CardContent } from "@bazaar/ui";
import { Loader2, Send, XCircle } from 'lucide-react';
import { cn } from "@bazaar/ui";

interface ChatPanelGStreamingProps {
  projectId: string;
  selectedSceneId: string | null;
  onSceneGenerated?: (sceneId: string) => void;
}

export default function ChatPanelGStreaming({
  projectId,
  selectedSceneId,
  onSceneGenerated,
}: ChatPanelGStreamingProps) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Array<{
    id: string;
    content: string;
    role: 'user' | 'assistant';
    timestamp: Date;
  }>>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Use the streaming hook
  const {
    generateScene,
    cancel,
    isGenerating,
    progress,
    error,
  } = useGenerationStream({
    onSceneCreated: (scene) => {
      console.log('Scene created:', scene);
      onSceneGenerated?.(scene.id);
    },
    onComplete: (scene, chatResponse) => {
      // Add assistant response to messages
      setMessages(prev => [...prev, {
        id: `assistant-${Date.now()}`,
        content: chatResponse || 'Scene created successfully!',
        role: 'assistant',
        timestamp: new Date(),
      }]);
    },
    onError: (error) => {
      // Add error message
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        content: `Error: ${error}`,
        role: 'assistant',
        timestamp: new Date(),
      }]);
    },
  });
  
  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isGenerating) return;
    
    const userMessage = message.trim();
    
    // Add user message
    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      content: userMessage,
      role: 'user',
      timestamp: new Date(),
    }]);
    
    // Clear input
    setMessage("");
    
    // Start streaming generation
    await generateScene(projectId, userMessage);
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex",
              msg.role === 'user' ? "justify-end" : "justify-start"
            )}
          >
            <Card className={cn(
              "max-w-[80%]",
              msg.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted"
            )}>
              <CardContent className="p-3">
                <p className="text-sm">{msg.content}</p>
              </CardContent>
            </Card>
          </div>
        ))}
        
        {/* Progress indicator during generation */}
        {isGenerating && (
          <Card className="bg-muted">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm font-medium">{progress.stage}</span>
                </div>
                
                <p className="text-sm text-muted-foreground">{progress.message}</p>
                
                {progress.percentage > 0 && (
                  <Progress value={progress.percentage} className="h-2" />
                )}
                
                {progress.toolName && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Tool: {progress.toolName}</p>
                    {progress.reasoning && (
                      <p className="italic">Reasoning: {progress.reasoning}</p>
                    )}
                  </div>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={cancel}
                  className="mt-2"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Error display */}
        {error && !isGenerating && (
          <Card className="bg-destructive/10 border-destructive">
            <CardContent className="p-3">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input form */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your scene..."
            disabled={isGenerating}
            className="flex-1"
          />
          <Button type="submit" disabled={isGenerating || !message.trim()}>
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}