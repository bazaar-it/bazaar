// src/client/hooks/a2a/useAgentMessages.ts

import { useCallback, useEffect, useState } from 'react';
import { useSSE } from '~/client/hooks/sse/useSSE';
import type { AgentMessageData } from '~/types/a2a';

interface UseAgentMessagesOptions {
  taskId: string;
  onMessage?: (message: AgentMessageData) => void;
}

export function useAgentMessages({ taskId, onMessage }: UseAgentMessagesOptions) {
  const [messages, setMessages] = useState<AgentMessageData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const handleAgentMessage = useCallback((event: { type: 'agent_message'; data: AgentMessageData }) => {
    const message = event.data;
    setMessages(prev => [...prev, message]);
    onMessage?.(message);
  }, [onMessage]);

  const { connect, disconnect } = useSSE({
    onAgentMessage: handleAgentMessage,
    onOpen: () => setIsConnected(true),
    onClose: () => setIsConnected(false),
    onError: (errorEvent) => {
      setError(new Error(`SSE Error: ${errorEvent.data.message}`));
      setIsConnected(false);
    }
  });

  useEffect(() => {
    if (taskId) {
      connect(taskId);
      return () => {
        disconnect();
      };
    }
  }, [taskId, connect, disconnect]);

  return {
    messages,
    isConnected,
    error,
    clearMessages: () => setMessages([])
  };
}
