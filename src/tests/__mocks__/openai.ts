// src/tests/__mocks__/openai.ts
// Mock implementation of OpenAI API for tests

export class OpenAI {
  constructor(public config: any) {}

  chat = {
    completions: {
      create: jest.fn().mockResolvedValue({
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'This is a mock response from the OpenAI API',
            },
          },
        ],
      }),
    },
  };
}

// Mock specific responses for different models or prompts
export const mockSpecificResponses = (instance: OpenAI) => {
  instance.chat.completions.create
    // Match on specific model+prompt combinations
    .mockImplementation(async (options: any) => {
      const model = options.model;
      const prompt = options.messages?.find((m: any) => m.role === 'user')?.content || '';
      
      // Code generation for fireworks
      if (prompt.toLowerCase().includes('firework') && model === 'gpt-4-turbo') {
        return {
          id: 'chatcmpl-mock-fireworks',
          object: 'chat.completion',
          created: Date.now(),
          model: options.model,
          choices: [{
            index: 0,
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
            },
            finish_reason: 'stop'
          }]
        };
      }
      
      // Intent detection response
      if (model === 'gpt-4o' && options.tools) {
        return {
          id: 'chatcmpl-mock-intent',
          object: 'chat.completion',
          created: Date.now(),
          model: options.model,
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [{
                id: 'call_intent123',
                type: 'function',
                function: {
                  name: 'determineIntent',
                  arguments: JSON.stringify({
                    effect: extractEffectFromPrompt(prompt),
                    complexity: 'medium'
                  })
                }
              }]
            },
            finish_reason: 'tool_calls'
          }]
        };
      }
      
      // Default to the standard mock implementation
      const defaultImplementation = jest.requireActual('./openai').OpenAI.prototype.chat.completions.create;
      return defaultImplementation(options);
    });
  
  return instance;
};

// Helper to extract effect description from prompt
function extractEffectFromPrompt(prompt: string): string {
  if (prompt.toLowerCase().includes('firework')) {
    return 'fireworks explosion animation';
  } else if (prompt.toLowerCase().includes('snow')) {
    return 'snowfall animation';
  } else if (prompt.toLowerCase().includes('rain')) {
    return 'rainfall animation';
  } else {
    return 'visual effect animation';
  }
} 