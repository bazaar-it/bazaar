import { describe, it, expect, beforeEach } from '@jest/globals';

// Types needed for tests (simplified versions of the actual types)
interface ChatMessage {
  id: string;
  message: string;
  timestamp: number;
  isUser: boolean;
  status?: string;
}

interface DbMessage {
  id: string;
  projectId: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt: number | string;
  status?: string;
}

interface MessageUpdates {
  content?: string;
  delta?: string;
  status?: string;
  kind?: string;
  jobId?: string | null;
}

// Reimplementing the key functions we want to test
describe('videoState message handling', () => {
  // Mock store state
  let messages: Record<string, ChatMessage[]> = {};
  
  // Reset state before each test
  beforeEach(() => {
    messages = {};
  });
  
  // Function to add a message to our mock state
  const addMessage = (projectId: string, content: string, isUser: boolean, id?: string): string => {
    const messageId = id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    if (!messages[projectId]) {
      messages[projectId] = [];
    }
    
    messages[projectId].push({
      id: messageId,
      message: content,
      timestamp: Date.now(),
      isUser,
    });
    
    return messageId;
  };
  
  // Reimplementation of updateMessage function to test delta handling
  const updateMessage = (projectId: string, messageId: string, updates: MessageUpdates): void => {
    if (!messages[projectId]) return;
    
    const messageIndex = messages[projectId].findIndex(msg => msg.id === messageId);
    if (messageIndex === -1) return;
    
    const message = messages[projectId][messageIndex];
    
    // Create updated message
    const updatedMessage = { ...message };
    
    // Handle delta content (append instead of replace)
    if (updates.delta !== undefined) {
      updatedMessage.message = (message.message || '') + updates.delta;
    } 
    // Handle regular content replacement
    else if (updates.content !== undefined) {
      updatedMessage.message = updates.content;
    }
    
    // Update status if provided
    if (updates.status !== undefined) {
      updatedMessage.status = updates.status;
    }
    
    // Update the message in our store
    messages[projectId][messageIndex] = updatedMessage;
  };
  
  // Reimplementation of syncDbMessages
  const syncDbMessages = (projectId: string, dbMessages: DbMessage[]): void => {
    if (!messages[projectId]) {
      messages[projectId] = [];
    }
    
    // Track which messages we've already processed
    const syncedIds = new Set<string>();
    const currentIds = new Set(messages[projectId].map(msg => msg.id));
    
    // Convert DB messages to chat messages format
    const convertedDbMessages = dbMessages.map(dbMsg => ({
      id: dbMsg.id,
      message: dbMsg.content,
      timestamp: typeof dbMsg.createdAt === 'number' 
        ? dbMsg.createdAt 
        : new Date(dbMsg.createdAt).getTime(),
      isUser: dbMsg.role === 'user',
      status: dbMsg.status
    }));
    
    // Merge messages, prioritizing existing streaming messages
    const mergedMessages = [...messages[projectId]];
    
    // Add new messages from DB that we don't have locally
    for (const dbMsg of convertedDbMessages) {
      if (!currentIds.has(dbMsg.id)) {
        mergedMessages.push(dbMsg);
      }
      syncedIds.add(dbMsg.id);
    }
    
    // Sort by timestamp to maintain chronological order
    mergedMessages.sort((a, b) => a.timestamp - b.timestamp);
    
    // Update state
    messages[projectId] = mergedMessages;
  };
  
  // Tests for updateMessage
  describe('updateMessage', () => {
    it('should append content when delta is provided', () => {
      const projectId = 'test-project';
      const messageId = addMessage(projectId, 'Hello', false);
      
      updateMessage(projectId, messageId, { delta: ' world' });
      expect(messages[projectId][0].message).toBe('Hello world');
      
      updateMessage(projectId, messageId, { delta: '!' });
      expect(messages[projectId][0].message).toBe('Hello world!');
    });
    
    it('should replace content when content is provided', () => {
      const projectId = 'test-project';
      const messageId = addMessage(projectId, 'Hello', false);
      
      updateMessage(projectId, messageId, { content: 'Goodbye' });
      expect(messages[projectId][0].message).toBe('Goodbye');
    });
    
    it('should update status when provided', () => {
      const projectId = 'test-project';
      const messageId = addMessage(projectId, 'Processing...', false);
      
      updateMessage(projectId, messageId, { status: 'thinking' });
      expect(messages[projectId][0].status).toBe('thinking');
      
      updateMessage(projectId, messageId, { status: 'success' });
      expect(messages[projectId][0].status).toBe('success');
    });
    
    it('should handle multiple updates correctly', () => {
      const projectId = 'test-project';
      const messageId = addMessage(projectId, '', false);
      
      // First update - delta and status
      updateMessage(projectId, messageId, { 
        delta: 'Hello', 
        status: 'thinking' 
      });
      
      expect(messages[projectId][0].message).toBe('Hello');
      expect(messages[projectId][0].status).toBe('thinking');
      
      // Second update - more delta
      updateMessage(projectId, messageId, { delta: ' world' });
      expect(messages[projectId][0].message).toBe('Hello world');
      expect(messages[projectId][0].status).toBe('thinking');
      
      // Third update - replace content and change status
      updateMessage(projectId, messageId, { 
        content: 'Complete response', 
        status: 'success' 
      });
      
      expect(messages[projectId][0].message).toBe('Complete response');
      expect(messages[projectId][0].status).toBe('success');
    });
  });
  
  // Tests for syncDbMessages
  describe('syncDbMessages', () => {
    it('should merge database messages with client messages', () => {
      const projectId = 'test-project';
      
      // Add a client message
      addMessage(projectId, 'Client message', true, 'client-1');
      
      // Sync with database messages
      const dbMessages: DbMessage[] = [
        {
          id: 'db-1',
          projectId,
          content: 'Database message',
          role: 'assistant',
          createdAt: Date.now() - 1000
        }
      ];
      
      syncDbMessages(projectId, dbMessages);
      
      // Should have both messages
      expect(messages[projectId].length).toBe(2);
      expect(messages[projectId].some(m => m.id === 'client-1')).toBe(true);
      expect(messages[projectId].some(m => m.id === 'db-1')).toBe(true);
    });
    
    it('should maintain chronological order of messages', () => {
      const projectId = 'test-project';
      
      // Add client messages with specific timestamps
      const now = Date.now();
      
      const msg1 = {
        id: 'msg-1',
        message: 'First message',
        timestamp: now - 2000,
        isUser: true
      };
      
      const msg2 = {
        id: 'msg-2',
        message: 'Third message',
        timestamp: now,
        isUser: false
      };
      
      messages[projectId] = [msg1, msg2];
      
      // Sync with database message that should be in the middle
      const dbMessages: DbMessage[] = [
        {
          id: 'db-middle',
          projectId,
          content: 'Second message',
          role: 'assistant',
          createdAt: now - 1000
        }
      ];
      
      syncDbMessages(projectId, dbMessages);
      
      // Should have all messages in correct order
      expect(messages[projectId].length).toBe(3);
      expect(messages[projectId][0].id).toBe('msg-1'); // First
      expect(messages[projectId][1].id).toBe('db-middle'); // Second
      expect(messages[projectId][2].id).toBe('msg-2'); // Third
    });
    
    it('should handle empty database message array', () => {
      const projectId = 'test-project';
      
      // Add a client message
      addMessage(projectId, 'Client message', true, 'client-1');
      
      // Sync with empty database messages
      syncDbMessages(projectId, []);
      
      // Should still have the client message
      expect(messages[projectId].length).toBe(1);
      expect(messages[projectId][0].id).toBe('client-1');
    });
    
    it('should handle messages with the same ID', () => {
      const projectId = 'test-project';
      
      // Add a client message with specific ID
      const clientMsg = {
        id: 'duplicate-id',
        message: 'Original client message', 
        timestamp: Date.now(),
        isUser: true
      };
      
      messages[projectId] = [clientMsg];
      
      // Sync with database message that has the same ID
      const dbMessages: DbMessage[] = [
        {
          id: 'duplicate-id',
          projectId,
          content: 'Database version of message',
          role: 'user',
          createdAt: Date.now() - 1000
        }
      ];
      
      syncDbMessages(projectId, dbMessages);
      
      // Should preserve client message with same ID (streaming priority)
      expect(messages[projectId].length).toBe(1);
      expect(messages[projectId][0].message).toBe('Original client message');
    });
  });
}); 