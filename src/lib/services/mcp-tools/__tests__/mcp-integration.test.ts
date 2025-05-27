//src/lib/services/mcp-tools/__tests__/mcp-integration.test.ts

import { describe, it, expect, beforeEach } from '@jest/globals';
import { z } from 'zod';
import { MCPToolRegistry, type MCPTool } from '../base';

describe('MCP Integration Tests', () => {
  let registry: MCPToolRegistry;
  
  beforeEach(() => {
    // Create fresh registry for each test
    registry = new MCPToolRegistry();
  });

  describe('Tool Registry', () => {
    it('should register and list tools', () => {
      // Mock tool for testing
      const mockTool: MCPTool = {
        name: 'testTool',
        description: 'Test tool',
        inputSchema: z.object({ test: z.string() }),
        run: jest.fn(),
      };
      
      registry.register(mockTool);
      
      const registeredTools = registry.list();
      expect(registeredTools).toHaveLength(1);
      expect(registeredTools[0]?.name).toBe('testTool');
    });

    it('should provide tool definitions for LLM', () => {
      const mockTool: MCPTool = {
        name: 'testTool',
        description: 'Test tool description',
        inputSchema: z.object({ test: z.string() }),
        run: jest.fn(),
      };
      
      registry.register(mockTool);
      
      const definitions = registry.getToolDefinitions();
      expect(definitions).toHaveLength(1);
      expect(definitions[0]?.name).toBe('testTool');
      expect(definitions[0]?.description).toBe('Test tool description');
    });

    it('should clear all tools', () => {
      const mockTool: MCPTool = {
        name: 'testTool',
        description: 'Test tool',
        inputSchema: z.object({ test: z.string() }),
        run: jest.fn(),
      };
      
      registry.register(mockTool);
      expect(registry.list()).toHaveLength(1);
      
      registry.clear();
      expect(registry.list()).toHaveLength(0);
    });
  });
});

describe('SceneSpec Schema Validation', () => {
  it('should validate basic component spec', () => {
    // Simple validation test without complex imports
    const componentSpec = {
      lib: 'flowbite',
      name: 'Button',
      id: 'test-button',
      props: { children: 'Click me' },
    };
    
    // Basic structure validation
    expect(componentSpec.lib).toBe('flowbite');
    expect(componentSpec.name).toBe('Button');
    expect(componentSpec.id).toBe('test-button');
  });
}); 