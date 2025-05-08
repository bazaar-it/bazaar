/**
 * Mock implementation of the OpenAI client for testing
 */

const mockCreate = jest.fn();

const mockClient = {
  chat: {
    completions: {
      create: mockCreate
    }
  }
};

// Export both named and default exports to match original module
export const openaiClient = mockClient;
export default mockClient; 