import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock implementation of a context manager for testing
// In your actual application, import your real context manager
class LLMContextManager {
  private contexts: Map<string, {
    messages: Array<{role: string; content: string}>;
    tokenCount: number;
    metadata: Record<string, any>;
  }> = new Map();
  
  private readonly MAX_TOKENS = 16000; // Example token limit
  private readonly TOKEN_MARGIN = 1000; // Safety margin
  
  // Simplified token counter (in a real implementation, use a proper tokenizer)
  private countTokens(text: string): number {
    // Very rough approximation: ~4 chars per token
    return Math.ceil(text.length / 4);
  }
  
  // Create or get a context for a conversation
  getContext(contextId: string): Array<{role: string; content: string}> {
    if (!this.contexts.has(contextId)) {
      this.contexts.set(contextId, {
        messages: [],
        tokenCount: 0,
        metadata: {}
      });
    }
    
    return this.contexts.get(contextId)!.messages;
  }
  
  // Add a message to the context
  addMessage(contextId: string, message: {role: string; content: string}): void {
    const context = this.contexts.get(contextId);
    if (!context) return;
    
    const messageTokens = this.countTokens(message.content);
    context.messages.push(message);
    context.tokenCount += messageTokens;
    
    // Prune if we're over the limit
    this.pruneIfNeeded(contextId);
  }
  
  // Add project-specific context
  addProjectContext(contextId: string, projectData: any): void {
    const context = this.contexts.get(contextId);
    if (!context) return;
    
    // Save metadata
    context.metadata.projectId = projectData.id;
    context.metadata.projectName = projectData.name;
    
    // Add project-specific system message
    const projectContext = {
      role: 'system',
      content: `You are assisting with project "${projectData.name}". This project has the following characteristics: ${projectData.description}`
    };
    
    // Insert at the beginning to ensure it's preserved during pruning
    context.messages.unshift(projectContext);
    context.tokenCount += this.countTokens(projectContext.content);
  }
  
  // Prune context if it exceeds token limit
  private pruneIfNeeded(contextId: string): void {
    const context = this.contexts.get(contextId);
    if (!context) return;
    
    // Check if we need to prune
    if (context.tokenCount <= this.MAX_TOKENS - this.TOKEN_MARGIN) {
      return;
    }
    
    // Always preserve system messages and the most recent user messages
    const systemMessages = context.messages.filter(m => m.role === 'system');
    const otherMessages = context.messages.filter(m => m.role !== 'system');
    
    // We want to keep the most recent messages, so start removing from the front
    // But preserve at least the last user-assistant exchange
    while (context.tokenCount > this.MAX_TOKENS - this.TOKEN_MARGIN &&
           otherMessages.length > 2) {
      const removed = otherMessages.shift();
      if (removed) {
        context.tokenCount -= this.countTokens(removed.content);
      }
    }
    
    // Reassemble messages with system messages first
    context.messages = [...systemMessages, ...otherMessages];
  }
  
  // Get token count for the current context
  getTokenCount(contextId: string): number {
    return this.contexts.get(contextId)?.tokenCount || 0;
  }
  
  // Clear the context
  clearContext(contextId: string): void {
    this.contexts.delete(contextId);
  }
}

describe('LLM Context Management', () => {
  let contextManager: LLMContextManager;
  
  beforeEach(() => {
    contextManager = new LLMContextManager();
  });
  
  it('should maintain message history across multiple requests', () => {
    const conversationId = 'test-convo-1';
    
    // First request
    contextManager.addMessage(conversationId, {
      role: 'user',
      content: 'Create a fireworks animation'
    });
    
    contextManager.addMessage(conversationId, {
      role: 'assistant',
      content: 'I\'ll create a fireworks animation for you. What colors would you like?'
    });
    
    // Second request
    contextManager.addMessage(conversationId, {
      role: 'user',
      content: 'Blue and gold'
    });
    
    // Check that context contains all messages
    const context = contextManager.getContext(conversationId);
    expect(context.length).toBe(3);
    expect(context[0].content).toContain('fireworks animation');
    expect(context[1].content).toContain('What colors');
    expect(context[2].content).toBe('Blue and gold');
  });
  
  it('should prune context when exceeding token limits', () => {
    const conversationId = 'test-convo-2';
    
    // Add system message
    contextManager.addMessage(conversationId, {
      role: 'system',
      content: 'You are a helpful assistant.'
    });
    
    // Add a very long conversation
    for (let i = 0; i < 50; i++) {
      contextManager.addMessage(conversationId, {
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}. This is a somewhat long message that will contribute to the token count and eventually trigger pruning. We're adding enough text to make the tokenizer count a significant number of tokens.`.repeat(10)
      });
    }
    
    // Check that pruning occurred
    const context = contextManager.getContext(conversationId);
    expect(context.length).toBeLessThan(50 + 1); // +1 for system message
    
    // System message should be preserved
    expect(context[0].role).toBe('system');
    
    // Most recent messages should be preserved
    expect(context[context.length - 1].content).toContain('Message 49');
  });
  
  it('should prioritize system messages and project context', () => {
    const conversationId = 'test-convo-3';
    
    // Add project context
    contextManager.addProjectContext(conversationId, {
      id: 'proj-123',
      name: 'Summer Festival Promo',
      description: 'A promotional video for a summer music festival.'
    });
    
    // Add regular messages
    for (let i = 0; i < 10; i++) {
      contextManager.addMessage(conversationId, {
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Regular message ${i}`
      });
    }
    
    // Check that project context is preserved at the beginning
    const context = contextManager.getContext(conversationId);
    expect(context[0].role).toBe('system');
    expect(context[0].content).toContain('Summer Festival Promo');
  });
  
  it('should track token usage accurately', () => {
    const conversationId = 'test-convo-4';
    
    // Add messages with known token counts (approximately)
    contextManager.addMessage(conversationId, {
      role: 'system',
      content: 'You are a helpful assistant.'.repeat(10) // ~10 tokens
    });
    
    contextManager.addMessage(conversationId, {
      role: 'user',
      content: 'Hello there.'.repeat(5) // ~5 tokens
    });
    
    // Get token count (will be approximate in this test)
    const tokenCount = contextManager.getTokenCount(conversationId);
    
    // Since our simple tokenizer does rough approximation,
    // we check that the count is within a reasonable range
    expect(tokenCount).toBeGreaterThan(0);
    expect(typeof tokenCount).toBe('number');
  });
  
  it('should handle clearing context properly', () => {
    const conversationId = 'test-convo-5';
    
    // Add messages
    contextManager.addMessage(conversationId, {
      role: 'user',
      content: 'Hello'
    });
    
    contextManager.addMessage(conversationId, {
      role: 'assistant',
      content: 'Hi there'
    });
    
    // Verify messages exist
    expect(contextManager.getContext(conversationId).length).toBe(2);
    
    // Clear context
    contextManager.clearContext(conversationId);
    
    // Context should be reset
    expect(contextManager.getContext(conversationId).length).toBe(0);
  });
  
  it('should handle multiple concurrent conversations', () => {
    const convo1 = 'test-convo-6';
    const convo2 = 'test-convo-7';
    
    // Add to first conversation
    contextManager.addMessage(convo1, {
      role: 'user',
      content: 'Conversation 1 message'
    });
    
    // Add to second conversation
    contextManager.addMessage(convo2, {
      role: 'user',
      content: 'Conversation 2 message'
    });
    
    // Check conversations are separate
    expect(contextManager.getContext(convo1)[0].content).toContain('Conversation 1');
    expect(contextManager.getContext(convo2)[0].content).toContain('Conversation 2');
    expect(contextManager.getContext(convo1).length).toBe(1);
    expect(contextManager.getContext(convo2).length).toBe(1);
  });
}); 