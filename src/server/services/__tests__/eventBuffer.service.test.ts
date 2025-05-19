// src/server/services/__tests__/eventBuffer.service.test.ts
import { describe, it, expect } from '@jest/globals';
import { EventBufferService } from '../eventBuffer.service';
import { StreamEventType } from '~/types/chat';

// Simplified event helper
const createDelta = (content: string) => ({ type: 'delta' as const, content });

describe('EventBufferService', () => {
  it('replays missed events on reconnect', () => {
    const service = new EventBufferService({ maxBufferSize: 10, bufferExpiryMs: 60000, reconnectWindowMs: 60000 });
    service.registerClient('client1', 'msg1');

    service.bufferEvent('msg1', createDelta('a'));
    service.bufferEvent('msg1', createDelta('b'));
    service.markDisconnected('client1');

    const result = service.handleReconnection('client1');
    expect(result).not.toBeNull();
    expect(result!.events.length).toBe(2);
    expect(result!.reconnectEvent.type).toBe('reconnected');
    expect(result!.reconnectEvent.missedEvents).toBe(2);
  });

  it('drops old events when buffer is full', () => {
    const service = new EventBufferService({ maxBufferSize: 2, bufferExpiryMs: 60000, reconnectWindowMs: 60000 });
    service.registerClient('client2', 'msg2');

    service.bufferEvent('msg2', createDelta('1'));
    service.bufferEvent('msg2', createDelta('2'));
    service.bufferEvent('msg2', createDelta('3')); // should remove the first event

    service.markDisconnected('client2');
    const result = service.handleReconnection('client2');
    expect(result).not.toBeNull();
    expect(result!.events.length).toBe(2);
    expect(result!.events[0].event).toEqual(createDelta('2'));
    expect(result!.events[1].event).toEqual(createDelta('3'));
  });
});
