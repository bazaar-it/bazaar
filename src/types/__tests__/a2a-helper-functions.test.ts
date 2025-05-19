// src/types/__tests__/a2a-helper-functions.test.ts
import { describe, it, expect } from '@jest/globals';
import {
  createTextMessage,
  createFileArtifact,
  createStructuredAgentMessage,
  createStatusUpdateEvent,
  createArtifactUpdateEvent,
  mapInternalToA2AState,
  mapA2AToInternalState,
  requiresUserInput,
} from '../a2a';

describe('A2A helper functions', () => {
  it('createTextMessage returns properly structured text message', () => {
    const msg = createTextMessage('hello');
    expect(msg.parts[0]).toEqual({ type: 'text', text: 'hello' });
    expect(msg.id).toBeDefined();
    expect(msg.createdAt).toBeDefined();
  });

  it('createFileArtifact returns artifact with defaults', () => {
    const art = createFileArtifact('id1', 'url');
    expect(art).toMatchObject({ id: 'id1', url: 'url', type: 'file', mimeType: 'application/javascript' });
    expect(art.createdAt).toBeDefined();
  });

  it('createStructuredAgentMessage includes message and artifacts', () => {
    const msg = createTextMessage('hi');
    const art = createFileArtifact('id2', 'url2');
    const sam = createStructuredAgentMessage('TEST', 'task1', 'A', 'B', msg, [art]);
    expect(sam).toMatchObject({ type: 'TEST', taskId: 'task1', sender: 'A', recipient: 'B' });
    expect(sam.message).toEqual(msg);
    expect(sam.artifacts).toEqual([art]);
    expect(sam.id).toBeDefined();
  });

  it('createStatusUpdateEvent wraps task status', () => {
    const status = { id: 't', state: 'working', updatedAt: 'now' };
    const evt = createStatusUpdateEvent(status as any);
    expect(evt.event).toBe('status');
    expect(JSON.parse(evt.data)).toEqual(status);
  });

  it('createArtifactUpdateEvent wraps artifact', () => {
    const art = createFileArtifact('id3', 'url3');
    const evt = createArtifactUpdateEvent(art);
    expect(evt.event).toBe('artifact');
    expect(JSON.parse(evt.data)).toEqual(art);
  });

  it('mapInternalToA2AState maps correctly', () => {
    expect(mapInternalToA2AState('pending')).toBe('submitted');
    expect(mapInternalToA2AState('generating')).toBe('working');
    expect(mapInternalToA2AState('complete')).toBe('completed');
    expect(mapInternalToA2AState('failed')).toBe('failed');
  });

  it('mapA2AToInternalState maps correctly', () => {
    expect(mapA2AToInternalState('submitted')).toBe('pending');
    expect(mapA2AToInternalState('working')).toBe('generating');
    expect(mapA2AToInternalState('completed')).toBe('complete');
    expect(mapA2AToInternalState('failed')).toBe('failed');
  });

  it('requiresUserInput identifies input-required state', () => {
    expect(requiresUserInput('input-required')).toBe(true);
    expect(requiresUserInput('working')).toBe(false);
  });
});
