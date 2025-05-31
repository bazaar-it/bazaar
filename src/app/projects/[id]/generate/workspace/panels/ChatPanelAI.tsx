"use client";

import React from 'react';
import { useChat } from 'ai/react';
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent } from "~/components/ui/card";
import { Loader2, Send, Plus, Trash2, Edit } from 'lucide-react';

interface ChatPanelAIProps {
  projectId: string;
  selectedSceneId: string | null;
  onSceneGenerated?: (sceneId: string) => void;
  onProjectRename?: (newName: string) => void;
}

export default function ChatPanelAI({
  projectId,
  selectedSceneId,
  onSceneGenerated,
  onProjectRename,
}: ChatPanelAIProps) {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: '/api/chat',
    body: {
      projectId,
      selectedSceneId,
    },
    onFinish: async (message) => {
      console.log('[ChatPanelAI] 🎉 AI response finished:', message.content);
      
      // ✅ EXTRACT: Real scene ID from AI response
      const sceneIdMatch = message.content.match(/\[SCENE_ID:\s*([^\]]+)\]/);
      const sceneId = sceneIdMatch?.[1]?.trim() || null;
      
      console.log('[ChatPanelAI] Extracted scene ID:', sceneId);
      
      // ✅ TRIGGER: Scene generation callback with real scene ID
      if (onSceneGenerated && sceneId && (message.content.includes('created') || message.content.includes('updated'))) {
        console.log('[ChatPanelAI] 🎯 Scene generation detected, triggering onSceneGenerated with ID:', sceneId);
        onSceneGenerated(sceneId);
      }
    },
    onError: (error) => {
      console.error('[ChatPanelAI] Chat error:', error);
    },
  });

  // Beautiful welcome UI for new projects
  const WelcomeUI = () => (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div className="max-w-lg w-full space-y-6">
        <div className="text-center">
          <h3 className="text-xl font-semibold mb-2">Welcome to your new project</h3>
          <p className="text-muted-foreground text-sm">
            Create, edit or delete scenes — all with simple prompts.
          </p>
        </div>

        <div className="space-y-4">
          <div className="text-sm font-medium text-muted-foreground">Examples</div>

          {/* Create Example */}
          <Card className="p-3 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleInputChange({ target: { value: "Animate a hero section for Finance.ai. Use white text on a black background. Add a heading that says 'Smarter Finance. Powered by AI.' The subheading is 'Automate reports, optimize decisions, and forecast in real-time.' Use blue and white colors similar to Facebook's branding. At the bottom center, add a neon blue 'Try Now' button with a gentle pulsing animation." } } as any)}>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Plus className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-green-800">Create</span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">New Scene</span>
                </div>
                <p className="text-xs text-green-700 leading-relaxed">
                  "Animate a hero section for Finance.ai. Use white text on a black background. Add a heading that says 'Smarter Finance. Powered by AI.' The subheading is 'Automate reports, optimize decisions, and forecast in real-time.' Use blue and white colors similar to Facebook's branding. At the bottom center, add a neon blue 'Try Now' button with a gentle pulsing animation."
                </p>
              </div>
            </div>
          </Card>

          {/* Edit Example */}
          <Card className="p-3 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleInputChange({ target: { value: "Make the header bold and increase font size to 120px." } } as any)}>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Edit className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-blue-800">Edit</span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Modify Scene</span>
                </div>
                <p className="text-xs text-blue-700">
                  "Make the header bold and increase font size to 120px."
                </p>
              </div>
            </div>
          </Card>

          {/* Delete Example */}
          <Card className="p-3 bg-gradient-to-br from-red-50 to-rose-50 border-red-200 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleInputChange({ target: { value: "Delete the CTA scene." } } as any)}>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-4 h-4 text-red-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-red-800">Delete</span>
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Remove Scene</span>
                </div>
                <p className="text-xs text-red-700">
                  "Delete the CTA scene."
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );

  // Format timestamp for display
  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <WelcomeUI />
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? "justify-end" : "justify-start"} mb-4`}
            >
              <Card
                className={`max-w-[80%] ${
                  message.role === 'user'
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <CardContent className="p-3">
                  <div className="space-y-2">
                    <div className="whitespace-pre-wrap text-sm">
                      {message.content}
                    </div>
                    
                    <div className="flex items-center justify-between text-xs opacity-70">
                      <span>{formatTimestamp(message.createdAt || new Date())}</span>
                      {isLoading && message.role === 'assistant' && messages[messages.length - 1]?.id === message.id && (
                        <span className="flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Thinking...
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="p-4 bg-red-50 border-t border-red-200">
          <div className="text-sm text-red-600">
            Error: {error.message}
          </div>
        </div>
      )}

      {/* Input form */}
      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder={
              selectedSceneId
                ? "Describe changes to the selected scene..."
                : "Describe your video or add a new scene..."
            }
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={!input.trim() || isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
        {selectedSceneId && (
          <p className="text-xs text-muted-foreground mt-2">
            Editing scene: {selectedSceneId}
          </p>
        )}
      </div>
    </div>
  );
} 