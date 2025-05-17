//src/client/components/test-harness/evaluation/ChatPanel.tsx
'use client';

import { useRef, useEffect } from 'react';
import type { Artifact } from "~/types/a2a";

// Define StateTransition interface here to avoid import issues
interface StateTransition {
  state: string;
  timestamp: string | Date;
  agent?: string;
  message?: string;
  error?: string;
}

interface ChatMessage {
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Date;
  agentName?: string;
  error?: boolean;
}

interface ChatPanelProps {
  stateTransitions?: StateTransition[];
  artifacts?: Artifact[];
  selectedTaskId?: string;
}

export function ChatPanel({ stateTransitions = [], artifacts = [] }: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // If no transitions or artifacts, show a placeholder message
  if (!stateTransitions.length && !artifacts.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <p className="text-center mb-2">Select a task to view its communication</p>
        <p className="text-xs text-center">The chat will show messages between agents and the user</p>
      </div>
    );
  }

  // Parse the state transitions and artifacts into chat messages
  const messages: ChatMessage[] = [];
  
  // Find the initial user prompt in artifacts (if available)
  const userPromptArtifact = artifacts.find(a => 
    (a.name?.toLowerCase().includes('prompt') || a.description?.toLowerCase().includes('user prompt')) && 
    typeof a.data === 'string'
  );
  
  if (userPromptArtifact && typeof userPromptArtifact.data === 'string') {
    messages.push({
      role: 'user',
      content: userPromptArtifact.data,
      timestamp: userPromptArtifact.createdAt ? new Date(userPromptArtifact.createdAt) : new Date()
    });
  }
  
  // Get actual agent messages from state transitions
  stateTransitions.forEach(transition => {
    if (!transition.message) return;
    
    // Skip purely technical messages
    if (transition.message.includes('Task picked up') || 
        transition.message.includes('internal status')) {
      return;
    }
    
    messages.push({
      role: transition.agent ? 'agent' : 'system',
      content: transition.message,
      timestamp: new Date(transition.timestamp),
      agentName: transition.agent,
      error: !!transition.error
    });
    
    // If there's an error, add it as a separate message
    if (transition.error) {
      messages.push({
        role: 'system',
        content: `Error: ${transition.error}`,
        timestamp: new Date(transition.timestamp),
        error: true
      });
    }
  });
  
  // Sort messages by timestamp
  messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);
  
  return (
    <div className="border rounded-md h-full flex flex-col">
      <div className="p-3 border-b">
        <h3 className="text-sm font-medium">Task Communication</h3>
      </div>
      
      <div className="flex-grow p-4 overflow-auto" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              No messages for this task
            </p>
          ) : (
            messages.map((message, index) => (
              <div 
                key={index} 
                className={`flex items-start gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar for the message sender */}
                <div className="h-8 w-8 flex-shrink-0">
                  <div className={`h-full w-full rounded-full flex items-center justify-center
                    ${message.role === 'user' ? 'bg-primary/10' : 
                      message.role === 'system' ? 'bg-muted' : 
                      message.error ? 'bg-destructive/10' : 'bg-blue-100'}`}
                  >
                    <span className="text-xs font-semibold">
                      {message.role === 'user' ? 'U' : 
                       message.role === 'system' ? 'S' : 
                       message.agentName ? message.agentName.substring(0, 1) : 'A'}
                    </span>
                  </div>
                </div>
                
                {/* Message bubble */}
                <div 
                  className={`px-3 py-2 rounded-lg max-w-[75%]
                    ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 
                      message.role === 'system' ? 'bg-muted text-muted-foreground' : 
                      message.error ? 'bg-destructive/10 text-destructive border border-destructive/20' : 
                      'bg-blue-50 border border-blue-200'}`}
                >
                  {/* Show agent name if available */}
                  {message.agentName && (
                    <div className="text-xs font-medium mb-1 text-blue-700">
                      {message.agentName}
                    </div>
                  )}
                  
                  {/* Message content */}
                  <div className="text-sm whitespace-pre-wrap">
                    {message.content}
                  </div>
                  
                  {/* Message timestamp */}
                  <div className="text-[10px] text-muted-foreground mt-1 text-right">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
