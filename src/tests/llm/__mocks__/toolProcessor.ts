import { jest } from '@jest/globals';

// Mock types that would normally be defined in the actual module
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ProcessedToolCall {
  id: string;
  functionName: string;
  args: Record<string, any>;
  result: any;
}

// Mock implementation of processToolCalls function
export const processToolCalls = jest.fn(
  async (toolCalls?: ToolCall[]): Promise<ProcessedToolCall[]> => {
    if (!toolCalls || toolCalls.length === 0) {
      return [];
    }

    const results = toolCalls.map(toolCall => {
      const functionName = toolCall.function.name;
      let args: Record<string, any> = {};
      
      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error('Error parsing tool call arguments:', e);
      }
      
      // Return different mock results based on the function name
      let result: any;
      
      switch (functionName) {
        case 'generateRemotionComponent':
          result = {
            success: true,
            componentCode: `
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';

export default function MockComponent() {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      <div>Mock Component Frame: {frame}</div>
    </AbsoluteFill>
  );
}`,
            message: 'Component generated successfully'
          };
          break;
          
        case 'updateVideoProperty':
          result = {
            success: true,
            property: args.property,
            value: args.value,
            message: `Updated ${args.property} to ${args.value}`
          };
          break;
          
        case 'addScene':
          result = {
            success: true,
            sceneId: 'scene-' + Math.random().toString(36).substr(2, 9),
            sceneType: args.type || 'default',
            message: 'Scene added successfully'
          };
          break;
          
        default:
          result = {
            success: true,
            message: `Processed ${functionName} successfully`,
            mockResult: true
          };
      }
      
      return {
        id: toolCall.id,
        functionName,
        args,
        result
      };
    });

    return results;
  }
); 