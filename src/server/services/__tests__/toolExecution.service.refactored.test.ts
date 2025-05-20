// src/server/services/__tests__/toolExecution.service.refactored.test.ts
import { describe, it, expect } from '@jest/globals';
import { ToolExecutionService, type ToolHandler } from '../toolExecution.service';

describe('ToolExecutionService', () => {
  it('registers and executes custom tools', async () => {
    const service = new ToolExecutionService();
    
    // Register a custom test tool
    const customToolHandler: ToolHandler = async () => ({
      message: 'Custom tool executed successfully'
    });
    
    service.registerTool('customTestTool', customToolHandler);
    
    // Execute the tool
    const result = await service.executeTool(
      'customTestTool',
      'test-project-id',
      'test-user-id',
      { param: 'test' },
      'test-message-id'
    );
    
    expect(result.message).toBe('Custom tool executed successfully');
    expect(result.success).toBe(true);
  });
  
  it('returns error for unknown tools', async () => {
    const service = new ToolExecutionService();
    
    const result = await service.executeTool(
      'nonExistentTool',
      'test-project-id',
      'test-user-id',
      {},
      'test-message-id'
    );
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown tool');
  });
  
  it('handles errors thrown by tool handlers', async () => {
    const service = new ToolExecutionService();
    
    // Register a tool that throws an error
    const errorToolHandler: ToolHandler = async () => {
      throw new Error('Test error from tool');
    };
    
    service.registerTool('errorTool', errorToolHandler);
    
    const result = await service.executeTool(
      'errorTool',
      'test-project-id',
      'test-user-id',
      {},
      'test-message-id'
    );
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Test error from tool');
  });
});
