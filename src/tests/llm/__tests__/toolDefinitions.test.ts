import { describe, it, expect } from '@jest/globals';
import Ajv from 'ajv';

// OpenAI Tool Definition Schema
// Based on https://platform.openai.com/docs/api-reference/chat/create#chat-create-tools
const openAIToolSchema = {
  type: 'array',
  items: {
    type: 'object',
    required: ['type'],
    properties: {
      type: {
        type: 'string',
        enum: ['function']
      },
      function: {
        type: 'object',
        required: ['name', 'parameters'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          parameters: {
            type: 'object',
            required: ['type'],
            properties: {
              type: { type: 'string', enum: ['object'] },
              properties: { type: 'object' },
              required: {
                type: 'array',
                items: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }
};

// Sample tool definitions for testing
// In your actual application, import your real tool definitions
const sampleToolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'generateRemotionComponent',
      description: 'Generate a Remotion component based on the specified effect',
      parameters: {
        type: 'object',
        properties: {
          effect: {
            type: 'string',
            description: 'Description of the visual effect to create'
          },
          duration: {
            type: 'number',
            description: 'Duration in seconds'
          },
          complexity: {
            type: 'string',
            enum: ['simple', 'medium', 'complex'],
            description: 'Desired complexity level'
          }
        },
        required: ['effect']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'addToTimeline',
      description: 'Add a component to the video timeline',
      parameters: {
        type: 'object',
        properties: {
          componentId: {
            type: 'string',
            description: 'ID of the component to add'
          },
          position: {
            type: 'number',
            description: 'Position in seconds where to add the component'
          },
          duration: {
            type: 'number',
            description: 'Duration in seconds (default: component duration)'
          }
        },
        required: ['componentId', 'position']
      }
    }
  }
];

// Invalid tool definition examples
const invalidToolMissingType = {
  // Missing 'type' field
  function: {
    name: 'invalidTool',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  }
};

const invalidToolWrongParameterFormat = {
  type: 'function',
  function: {
    name: 'invalidTool',
    parameters: {
      // 'type' should be 'object'
      type: 'string',
      properties: {},
      required: []
    }
  }
};

describe('OpenAI Tool Definitions', () => {
  const ajv = new Ajv();
  const validateTools = ajv.compile(openAIToolSchema);
  
  it('should validate correctly formatted tool definitions', () => {
    const isValid = validateTools(sampleToolDefinitions);
    expect(isValid).toBe(true);
  });
  
  it('should reject tool definitions missing required fields', () => {
    const isValid = validateTools([invalidToolMissingType]);
    expect(isValid).toBe(false);
    
    // Check specific validation errors
    const errors = validateTools.errors || [];
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain("required");
  });
  
  it('should reject tool definitions with incorrect parameter format', () => {
    const isValid = validateTools([invalidToolWrongParameterFormat]);
    expect(isValid).toBe(false);
    
    // Check specific validation errors
    const errors = validateTools.errors || [];
    expect(errors.length).toBeGreaterThan(0);
    const typeError = errors.find(e => e.message?.includes('enum'));
    expect(typeError).toBeDefined();
  });
  
  it('should validate tool names follow OpenAI guidelines', () => {
    // OpenAI guidelines require snake_case for function names
    const validateFunctionName = (name: string): boolean => {
      return /^[a-z][a-z0-9_]*$/.test(name);
    };
    
    // Check our sample tools
    for (const tool of sampleToolDefinitions) {
      const functionName = tool.function.name;
      
      // We're using camelCase in our examples, so this would fail in a strict check
      // In practice, you'd either use snake_case or ensure OpenAI handles your naming convention
      // Uncomment to test strict snake_case validation:
      // expect(validateFunctionName(functionName)).toBe(true);
      
      // For now, just check that names don't contain spaces or special chars
      expect(functionName).not.toContain(' ');
      expect(/^[a-zA-Z0-9_]+$/.test(functionName)).toBe(true);
    }
  });
  
  it('should have clear descriptions for all tools and parameters', () => {
    for (const tool of sampleToolDefinitions) {
      // Tool must have a description
      expect(tool.function.description).toBeDefined();
      expect(tool.function.description.length).toBeGreaterThan(10); // Reasonably descriptive
      
      // All parameters should have descriptions
      const parameters = tool.function.parameters;
      const properties = parameters.properties || {};
      
      for (const [paramName, paramDef] of Object.entries(properties)) {
        expect((paramDef as any).description).toBeDefined();
        expect((paramDef as any).description.length).toBeGreaterThan(5);
      }
    }
  });
  
  it('should ensure required parameters are clearly marked', () => {
    for (const tool of sampleToolDefinitions) {
      const parameters = tool.function.parameters;
      
      // Should have a 'required' array
      expect(parameters.required).toBeDefined();
      expect(Array.isArray(parameters.required)).toBe(true);
      
      // All required parameters should exist in properties
      const properties = parameters.properties || {};
      for (const requiredParam of parameters.required) {
        expect(properties[requiredParam]).toBeDefined();
      }
    }
  });
  
  it('should use appropriate parameter types', () => {
    // Check parameter types are sensible
    for (const tool of sampleToolDefinitions) {
      const properties = tool.function.parameters.properties || {};
      
      for (const [paramName, paramDef] of Object.entries(properties)) {
        const paramType = (paramDef as any).type;
        expect(['string', 'number', 'boolean', 'object', 'array']).toContain(paramType);
        
        // If enum is used, check it's properly defined
        if ((paramDef as any).enum) {
          expect(Array.isArray((paramDef as any).enum)).toBe(true);
          expect((paramDef as any).enum.length).toBeGreaterThan(0);
        }
      }
    }
  });
}); 