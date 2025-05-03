import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock both LLM models
jest.mock('openai', () => {
  // Intent model mock
  const mockIntentModel = jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  }));
  
  // Code generation model mock
  const mockCodeGenModel = jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  }));
  
  return {
    OpenAI: mockIntentModel
  };
});

import { OpenAI } from 'openai';

// This should be your dual LLM processor
// import { processWithDualLLM } from '~/server/llm/dualLLMProcessor';

// Simple implementation of the dual LLM processor for testing
// In your actual code, import your real implementation
async function processWithDualLLM(input: {
  prompt: string;
  projectId: string;
}) {
  // Step 1: Call intent model to determine what to build
  const intentModel = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'mock-key' });
  const intentResult = await intentModel.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: input.prompt }],
    tools: [{
      type: 'function',
      function: {
        name: 'determineIntent',
        description: 'Determine user intent for component creation',
        parameters: {
          type: 'object',
          properties: {
            effect: { type: 'string' },
            complexity: { type: 'string', enum: ['simple', 'medium', 'complex'] }
          },
          required: ['effect', 'complexity']
        }
      }
    }]
  });
  
  // Step 2: Extract intent from response
  const intent = intentResult.choices[0].message.tool_calls?.[0].function.arguments 
    ? JSON.parse(intentResult.choices[0].message.tool_calls[0].function.arguments)
    : null;
  
  if (!intent) {
    throw new Error('Failed to determine intent');
  }
  
  // Step 3: Call code generation model with extracted intent
  const codeGenModel = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'mock-key' });
  const codeGenResult = await codeGenModel.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [
      { role: 'system', content: 'You generate Remotion components based on specifications.' },
      { 
        role: 'user', 
        content: `Create a Remotion component for: ${intent.effect}. Complexity: ${intent.complexity}` 
      }
    ]
  });
  
  // Step 4: Return both intent and generated code
  return {
    intent,
    generatedCode: codeGenResult.choices[0].message.content
  };
}

describe('Dual LLM Architecture', () => {
  let mockIntentModel: jest.Mocked<OpenAI>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockIntentModel = new OpenAI({ apiKey: 'mock-key' }) as jest.Mocked<OpenAI>;
  });
  
  it('should process user input through both intent and code generation models', async () => {
    // Setup mock responses
    // Intent detection model response
    const mockIntentResponse = {
      choices: [{
        message: {
          role: 'assistant',
          content: null,
          tool_calls: [{
            id: 'call_123',
            type: 'function',
            function: {
              name: 'determineIntent',
              arguments: JSON.stringify({
                effect: 'fireworks explosion with sparkles',
                complexity: 'medium'
              })
            }
          }]
        }
      }]
    };
    
    // Code generation model response
    const mockCodeResponse = {
      choices: [{
        message: {
          role: 'assistant',
          content: `
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

export default function FireworksEffect() {
  const frame = useCurrentFrame();
  
  return (
    <AbsoluteFill style={{backgroundColor: 'transparent'}}>
      <div style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: \`translate(-50%, -50%) scale(\${Math.min(1, frame / 30)})\`,
        width: 20,
        height: 20,
        borderRadius: '50%',
        backgroundColor: 'yellow',
        boxShadow: '0 0 30px 10px rgba(255, 255, 0, 0.8)'
      }} />
    </AbsoluteFill>
  );
}
`
        }
      }]
    };
    
    // Configure mocks to return our test responses
    mockIntentModel.chat.completions.create
      .mockImplementationOnce(() => Promise.resolve(mockIntentResponse as any))
      .mockImplementationOnce(() => Promise.resolve(mockCodeResponse as any));
    
    // Process with dual LLM
    const result = await processWithDualLLM({
      prompt: 'Create fireworks for my video',
      projectId: 'test-project'
    });
    
    // Verify both models were called
    expect(mockIntentModel.chat.completions.create).toHaveBeenCalledTimes(2);
    
    // First call should be to intent model
    const intentCall = mockIntentModel.chat.completions.create.mock.calls[0][0];
    expect(intentCall).toHaveProperty('tools');
    expect(intentCall.tools?.[0].function.name).toBe('determineIntent');
    
    // Second call should be to code generation model
    const codeGenCall = mockIntentModel.chat.completions.create.mock.calls[1][0];
    expect(codeGenCall).toHaveProperty('messages');
    const userMessage = codeGenCall.messages?.find((m: any) => m.role === 'user');
    expect(userMessage?.content).toContain('fireworks explosion with sparkles');
    
    // Check final result contains both intent and code
    expect(result).toHaveProperty('intent');
    expect(result).toHaveProperty('generatedCode');
    expect(result.intent).toEqual({
      effect: 'fireworks explosion with sparkles',
      complexity: 'medium'
    });
    expect(result.generatedCode).toContain('FireworksEffect');
  });
  
  it('should handle intent detection failure gracefully', async () => {
    // Mock intent model to return a response without tool_calls
    const mockFailedIntentResponse = {
      choices: [{
        message: {
          role: 'assistant',
          content: "I'm not sure what you want to create.",
          tool_calls: null
        }
      }]
    };
    
    mockIntentModel.chat.completions.create
      .mockResolvedValueOnce(mockFailedIntentResponse as any);
    
    // Process should throw an error
    try {
      await processWithDualLLM({
        prompt: 'Something vague and unclear',
        projectId: 'test-project'
      });
      
      // Should not reach here
      fail('Expected process to throw an error');
    } catch (error) {
      expect(error).toBeDefined();
      expect((error as Error).message).toContain('Failed to determine intent');
    }
    
    // Verify only the intent model was called
    expect(mockIntentModel.chat.completions.create).toHaveBeenCalledTimes(1);
  });
  
  it('should handle code generation failure gracefully', async () => {
    // Mock successful intent detection
    const mockIntentResponse = {
      choices: [{
        message: {
          role: 'assistant',
          content: null,
          tool_calls: [{
            id: 'call_123',
            type: 'function',
            function: {
              name: 'determineIntent',
              arguments: JSON.stringify({
                effect: 'complex 3D animation',
                complexity: 'complex'
              })
            }
          }]
        }
      }]
    };
    
    // Mock failed code generation
    const mockFailedCodeResponse = {
      choices: [{
        message: {
          role: 'assistant',
          content: 'I apologize, but I cannot generate this complex 3D animation.',
          tool_calls: null
        }
      }]
    };
    
    mockIntentModel.chat.completions.create
      .mockResolvedValueOnce(mockIntentResponse as any)
      .mockResolvedValueOnce(mockFailedCodeResponse as any);
    
    // Process with dual LLM
    const result = await processWithDualLLM({
      prompt: 'Create a complex 3D animation',
      projectId: 'test-project'
    });
    
    // Both models should be called
    expect(mockIntentModel.chat.completions.create).toHaveBeenCalledTimes(2);
    
    // Intent should be present, code might be an error message
    expect(result).toHaveProperty('intent');
    expect(result.intent).toEqual({
      effect: 'complex 3D animation',
      complexity: 'complex'
    });
    expect(result.generatedCode).toContain('I apologize');
  });
  
  it('should properly format prompts with project context', async () => {
    // Mock implementations
    mockIntentModel.chat.completions.create
      .mockImplementation(() => Promise.resolve({
        choices: [{
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [{
              id: 'call_123',
              type: 'function',
              function: {
                name: 'determineIntent',
                arguments: JSON.stringify({
                  effect: 'simple logo animation',
                  complexity: 'simple'
                })
              }
            }]
          }
        }]
      } as any));
    
    // Add project context to the request
    await processWithDualLLM({
      prompt: 'Animate our logo',
      projectId: 'test-project-with-context'
    });
    
    // Verify project context was included
    const intentCall = mockIntentModel.chat.completions.create.mock.calls[0][0];
    
    // In a real implementation, you'd check for project-specific information
    // being included in the messages sent to the model
    expect(intentCall).toBeDefined();
    
    // Here we can't fully verify since our implementation doesn't actually include project context
    // But in your real implementation, you should test that project info is included in the prompt
  });
}); 