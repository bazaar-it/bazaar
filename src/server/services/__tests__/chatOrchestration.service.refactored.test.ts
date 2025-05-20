// src/server/services/__tests__/chatOrchestration.service.refactored.test.ts
import { describe, it, expect } from '@jest/globals';
import { Subject } from 'rxjs';
import { handleClientReconnection } from '../chatOrchestration.service';
import { eventBufferService } from '../eventBuffer.service';
import { StreamEventType } from '~/types/chat';

// Manual mocking for eventBufferService
jest.mock('../eventBuffer.service', () => ({
  eventBufferService: {
    getToolCallState: jest.fn(),
    handleReconnection: jest.fn(),
  },
}));

describe('chatOrchestration.service', () => {
  describe('handleClientReconnection', () => {
    let emitter: Subject<any>;
    const clientId = 'test-client-id';
    const messageId = 'test-message-id';

    beforeEach(() => {
      emitter = new Subject();
      jest.clearAllMocks();
    });

    it('returns false when reconnection fails', async () => {
      // Mock handleReconnection to return null (failure)
      (eventBufferService.handleReconnection as jest.Mock).mockReturnValue(null);

      const result = await handleClientReconnection(
        clientId,
        messageId,
        'last-event-id',
        emitter
      );

      expect(result).toBe(false);
      expect(eventBufferService.handleReconnection).toHaveBeenCalledWith(
        clientId,
        'last-event-id'
      );
    });

    it('replays missed events on successful reconnection', async () => {
      // Track emitted events
      const emittedEvents: any[] = [];
      const subscription = emitter.subscribe(event => {
        emittedEvents.push(event);
      });

      // Mock successful reconnection with events to replay
      (eventBufferService.handleReconnection as jest.Mock).mockReturnValue({
        reconnectEvent: { type: StreamEventType.RECONNECTED, count: 2 },
        events: [
          { id: 'event1', event: { type: StreamEventType.CHUNK, content: 'text1' } },
          { id: 'event2', event: { type: StreamEventType.CHUNK, content: 'text2' } }
        ]
      });
      
      // Tool call state not requiring resumption
      (eventBufferService.getToolCallState as jest.Mock).mockReturnValue({
        status: 'completed',
        executedCalls: []
      });

      const result = await handleClientReconnection(
        clientId,
        messageId,
        'last-event-id',
        emitter
      );

      // Clean up subscription
      subscription.unsubscribe();

      expect(result).toBe(true);
      expect(emittedEvents.length).toBe(3); // reconnect event + 2 events
      expect(emittedEvents[0].type).toBe(StreamEventType.RECONNECTED);
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
        messageId,
        'last-event-id',
        emitter
      );

      expect(result).toBe(true);
      expect(eventBufferService.getToolCallState).toHaveBeenCalledWith(messageId);
    });
  });
});
