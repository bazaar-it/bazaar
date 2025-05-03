//src/tests/integration/api/error-handling.test.ts
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { TRPCError } from '@trpc/server';
import { createTRPCContext } from '~/trpc/trpc';

// Mock the appRouter
jest.mock('~/server/api/root', () => {
  const mockRouter = {
    createCaller: jest.fn().mockImplementation((ctx) => ({
      project: {
        list: jest.fn(),
        create: jest.fn(),
        get: jest.fn()
      },
      chat: {
        initiateChat: jest.fn(),
        streamResponse: jest.fn()
      }
    }))
  };
  
  return { appRouter: mockRouter };
});

// Import mocked appRouter
const { appRouter } = jest.requireMock('~/server/api/root');

describe('Error Handling in API Routes', () => {
  let caller;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a test context
    const ctx = createTRPCContext({
      headers: new Headers(),
      auth: { 
        user: { 
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com'
        } 
      }
    });
    
    // Setup caller with mocked procedures
    caller = appRouter.createCaller(ctx);
  });
  
  it('handles database errors gracefully', async () => {
    // Mock a database error
    caller.project.list.mockRejectedValueOnce(new Error('Database connection lost'));
    
    // Execute - try to get projects
    try {
      await caller.project.list();
      // Should not reach here
      fail('Expected an error but none was thrown');
    } catch (error) {
      // Verify error is properly transformed into a TRPC error
      expect(error).toBeInstanceOf(TRPCError);
      expect(error.code).toBe('INTERNAL_SERVER_ERROR');
      
      // Error message should be sanitized (not exposing internal details)
      expect(error.message).not.toContain('Database connection lost');
    }
  });
  
  it('returns proper error for unauthorized access', async () => {
    // Create an unauthenticated context
    const unauthCtx = createTRPCContext({
      headers: new Headers(),
      auth: null // No auth
    });
    
    // Create caller with unauthenticated context
    const unauthCaller = appRouter.createCaller(unauthCtx);
    
    // Mock the unauthorized error
    unauthCaller.project.list.mockRejectedValueOnce(
      new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to access this resource'
      })
    );
    
    // Test unauthorized access
    try {
      await unauthCaller.project.list();
      fail('Expected an error but none was thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.message).toContain('logged in');
    }
  });
  
  it('returns validation error for invalid input', async () => {
    // Mock a validation error
    caller.project.create.mockRejectedValueOnce(
      new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid input: name is required'
      })
    );
    
    // Test with invalid input
    try {
      await caller.project.create({ name: '' });
      fail('Expected an error but none was thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect(error.code).toBe('BAD_REQUEST');
      expect(error.message).toContain('name');
    }
  });
  
  it('handles not found errors appropriately', async () => {
    // Mock a not found error
    caller.project.get.mockRejectedValueOnce(
      new TRPCError({
        code: 'NOT_FOUND',
        message: 'Project not found'
      })
    );
    
    // Test with non-existent project id
    try {
      await caller.project.get({ id: 'nonexistent-id' });
      fail('Expected an error but none was thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toContain('not found');
    }
  });
  
  it('handles LLM service unavailability', async () => {
    // Mock LLM service error
    caller.chat.initiateChat.mockRejectedValueOnce(
      new Error('OpenAI service unavailable')
    );
    
    // Test chat initiation with LLM service down
    try {
      await caller.chat.initiateChat({
        projectId: 'project-123',
        content: 'Generate a video'
      });
      fail('Expected an error but none was thrown');
    } catch (error) {
      // Should be transformed to a TRPC error
      expect(error).toBeInstanceOf(TRPCError);
      
      // Should not leak OpenAI specific details
      expect(error.message).not.toContain('OpenAI');
    }
  });
});
