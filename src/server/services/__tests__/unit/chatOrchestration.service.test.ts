// src/server/services/__tests__/unit/chatOrchestration.service.test.ts
import { describe, it, expect, beforeEach } from '@jest/globals';
import { Subject } from 'rxjs';
import { processUserMessage, handleClientReconnection } from '../../chatOrchestration.service';
import { StreamEventType } from '~/types/chat';
import { chatLogger } from '~/lib/logger';
import { eventBufferService } from '~/server/services/eventBuffer.service';
import { randomUUID } from 'crypto';

// Mock dependencies
jest.mock('~/lib/logger', () => ({
  chatLogger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('~/server/db', () => {
  const mockUpdate = jest.fn().mockReturnValue({
    set: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue(undefined),
    }),
  });
  
  const mockSelect = jest.fn().mockReturnValue({
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        orderBy: jest.fn().mockReturnValue([]),
      }),
    }),
  });

  return {
    db: {
      select: mockSelect,
      update: mockUpdate,
    },
  };
});

jest.mock('~/server/services/eventBuffer.service', () => ({
  eventBufferService: {
    addEvent: jest.fn(),
    getToolCallState: jest.fn(),
    handleReconnection: jest.fn(),
  },
}));

jest.mock('~/server/services/llm/LLMService', () => {
  const mockStreamChat = jest.fn().mockImplementation(() => {
    return {
      on: jest.fn(),
      controller: {
        abort: jest.fn(),
      },
    };
  });

  return {
    LLMService: jest.fn().mockImplementation(() => ({
      streamChat: mockStreamChat,
      parseToolCallArguments: jest.fn().mockImplementation((toolCall) => {
        return JSON.parse(toolCall.function.arguments);
      }),
    })),
  };
});

jest.mock('~/server/services/toolExecution.service', () => ({
  toolExecutionService: {
    executeTool: jest.fn().mockResolvedValue({
      message: 'Tool executed successfully',
      success: true,
    }),
  },
}));

jest.mock('crypto', () => ({
  randomUUID: jest.fn().mockReturnValue('mocked-uuid'),
}));

describe('chatOrchestration.service', () => {
  let mockOpenAI: any;
  let emitter: Subject<any>;
  const projectId = 'test-project-id';
  const userId = 'test-user-id';
  const userMessageId = 'test-user-message-id';
  const assistantMessageId = 'test-assistant-message-id';
  const clientId = 'test-client-id';
  const content = 'Test user message';
  const projectProps = { 
    id: projectId,
    name: 'Test Project',
    meta: {
      duration: 300,
      title: 'Test Project',
      backgroundColor: '#FFFFFF'
    },
    scenes: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: 'Test response',
                },
              },
            ],
          }),
        },
      },
    };
    
    // Initialize the subject for event emission
    emitter = new Subject<{
      type: StreamEventType;
      [key: string]: any;
    }>();
  });

  describe('processUserMessage', () => {
    it('sets up emitter and logs beginning of processing', async () => {
      // We're just testing setup and error handling since full stream testing is complex
      
      // Mock a quick rejection to avoid full processing
      mockOpenAI.chat.completions.create = jest.fn().mockRejectedValue(
        new Error('Test error')
      );
      
      // Spy on emitter.next to check event emissions
      const emitterSpy = jest.spyOn(emitter, 'next');

      await processUserMessage(
        projectId,
        userId,
        userMessageId,
        assistantMessageId,
        content,
        projectProps,
        mockOpenAI,
        emitter,
        clientId
      );

      // Verify logging
      expect(chatLogger.info).toHaveBeenCalledWith(
        assistantMessageId,
        expect.stringContaining('Starting stream processing'),
        expect.objectContaining({
          projectId,
          clientId,
          userMessageId
        })
      );

      // Check error handling and events
      expect(chatLogger.error).toHaveBeenCalled();
      expect(emitterSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: StreamEventType.ERROR,
          error: expect.any(String)
        })
      );
      expect(emitterSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: StreamEventType.DONE
        })
      );
    });

    it('attempts to resume from saved state if requested', async () => {
      // Mock rejection for quick test completion
      mockOpenAI.chat.completions.create = jest.fn().mockRejectedValue(
        new Error('Test error')
      );
      
      // Mock finding saved state
      (eventBufferService.getToolCallState as jest.Mock).mockReturnValue({
        status: 'executing',
        executedCalls: [{ id: 'tool1', result: 'success' }]
      });

      await processUserMessage(
        projectId,
        userId,
        userMessageId,
        assistantMessageId,
        content,
        projectProps,
        mockOpenAI,
        emitter,
        clientId,
        true // shouldResume = true
      );

      // Verify state lookup attempted
      expect(eventBufferService.getToolCallState).toHaveBeenCalledWith(assistantMessageId);
      expect(chatLogger.info).toHaveBeenCalledWith(
        assistantMessageId,
        `Found saved state`,
        expect.objectContaining({
          status: 'executing',
          executedCallsCount: 1
        })
      );
    });
  });

  describe('handleClientReconnection', () => {
    it('replays missed events on successful reconnection', async () => {
      const lastEventId = 'last-event-123';
      const emitterSpy = jest.spyOn(emitter, 'next');
      
      // Mock successful reconnection with events to replay
      (eventBufferService.handleReconnection as jest.Mock).mockReturnValue({
        reconnectEvent: { type: StreamEventType.RECONNECTED, count: 2 },
        events: [
          { id: 'event1', event: { type: StreamEventType.CHUNK, content: 'text1' } },
          { id: 'event2', event: { type: StreamEventType.CHUNK, content: 'text2' } }
        ]
      });
      
      // Mock tool call state - no resumption needed
      (eventBufferService.getToolCallState as jest.Mock).mockReturnValue({
        status: 'completed',
        executedCalls: []
      });

      const result = await handleClientReconnection(
        clientId,
        assistantMessageId,
        lastEventId,
        emitter
      );

      // Check success result
      expect(result).toBe(true);
      
      // Verify reconnection event was processed
      expect(eventBufferService.handleReconnection).toHaveBeenCalledWith(
        clientId,
        lastEventId
      );
      
      // Verify events were replayed
      expect(emitterSpy).toHaveBeenCalledTimes(3); // Reconnect + 2 events
      expect(emitterSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: StreamEventType.RECONNECTED,
          count: 2,
          eventId: 'mocked-uuid'
        })
      );
    });

    it('returns false when reconnection fails', async () => {
      // Mock failed reconnection
      (eventBufferService.handleReconnection as jest.Mock).mockReturnValue(null);

      const result = await handleClientReconnection(
        clientId,
        assistantMessageId,
        'last-event-id',
        emitter
      );

      expect(result).toBe(false);
      expect(chatLogger.error).toHaveBeenCalled();
    });

    it('returns true with resume flag when tool execution needs to be resumed', async () => {
      // Mock successful reconnection
      (eventBufferService.handleReconnection as jest.Mock).mockReturnValue({
        reconnectEvent: { type: StreamEventType.RECONNECTED, count: 0 },
        events: []
      });
      
      // Mock tool call state that needs resumption
      (eventBufferService.getToolCallState as jest.Mock).mockReturnValue({
        status: 'executing',
        executedCalls: []
      });

      const result = await handleClientReconnection(
        clientId,
        assistantMessageId,
        'last-event-id',
        emitter
      );

      expect(result).toBe(true);
      expect(chatLogger.info).toHaveBeenCalledWith(
        assistantMessageId,
        expect.stringContaining('Resuming tool call execution'),
        undefined
      );
    });
  });

  // For more complex functions like processToolCallDelta and executeToolCalls
  // we would need more sophisticated testing with mocked stream events
  // These could be implemented as integration tests rather than unit tests
});
