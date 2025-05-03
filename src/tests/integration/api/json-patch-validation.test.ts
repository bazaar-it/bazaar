//src/tests/integration/api/json-patch-validation.test.ts
import { describe, it, expect, jest } from '@jest/globals';
import * as fastJsonPatch from 'fast-json-patch';

// Mock the actual schema and validation functions - adjust import paths as needed
jest.mock('~/types/schemas', () => ({
  jsonPatchSchema: {
    safeParse: (data: any) => {
      // Mock implementation of schema validation
      const isValid = data.every((op: any) => {
        if (!op.op || !op.path) return false;
        if (['add', 'replace'].includes(op.op) && op.value === undefined) return false;
        if (!['add', 'remove', 'replace', 'test', 'move', 'copy'].includes(op.op)) return false;
        if (!op.path.startsWith('/')) return false;
        return true;
      });
      
      return {
        success: isValid,
        data: isValid ? data : undefined,
        error: isValid ? undefined : new Error('Invalid patch format')
      };
    }
  }
}));

describe('JSON Patch Validation', () => {
  // Test valid RFC 6902 compliant patches
  it('validates compliant RFC 6902 patch operations', () => {
    // Valid patch operations
    const validPatches = [
      [{ op: 'add', path: '/scenes/0', value: { type: 'text', text: 'Hello' } }],
      [{ op: 'replace', path: '/scenes/0/text', value: 'Updated text' }],
      [{ op: 'remove', path: '/scenes/1' }],
      [
        { op: 'test', path: '/meta/version', value: 1 },
        { op: 'replace', path: '/meta/version', value: 2 }
      ]
    ];
    
    // Import the real schema to test
    const { jsonPatchSchema } = jest.requireActual('~/types/schemas');
    
    validPatches.forEach(patch => {
      const result = jsonPatchSchema.safeParse(patch);
      expect(result.success).toBe(true);
    });
  });
  
  // Test non-compliant patches
  it('rejects non-compliant patch operations', () => {
    // Invalid patch operations
    const invalidPatches = [
      [{ op: 'invalid', path: '/scenes/0', value: 'test' }], // Invalid op
      [{ op: 'add', path: 'scenes/0', value: 'test' }],      // Missing leading slash
      [{ op: 'remove' }],                                    // Missing path
      [{ op: 'add', path: '/scenes/0' }]                     // Missing value for add
    ];
    
    // Import the real schema to test
    const { jsonPatchSchema } = jest.requireActual('~/types/schemas');
    
    invalidPatches.forEach(patch => {
      const result = jsonPatchSchema.safeParse(patch);
      expect(result.success).toBe(false);
    });
  });
  
  // Test applying patches to actual data
  it('applies patch correctly to video state', () => {
    // Setup
    const initialState = {
      meta: { version: 1, duration: 300 },
      scenes: []
    };
    
    const patch = [
      { op: 'add', path: '/scenes/0', value: { type: 'text', text: 'Test Scene' } }
    ];
    
    // Apply patch using fast-json-patch
    const result = fastJsonPatch.applyPatch(initialState, patch);
    
    // Assertions
    expect(result.newDocument.scenes).toHaveLength(1);
    expect(result.newDocument.scenes[0].text).toBe('Test Scene');
    expect(result.newDocument.meta.version).toBe(1); // Unchanged
  });
  
  // Test multiple operations in a single patch
  it('handles complex patch operations correctly', () => {
    // Setup initial state
    const initialState = {
      meta: { version: 1, duration: 300 },
      scenes: [
        { id: 'scene1', type: 'text', text: 'Original text' },
        { id: 'scene2', type: 'image', url: 'image1.jpg' }
      ]
    };
    
    // Complex patch with multiple operations
    const complexPatch = [
      { op: 'replace', path: '/scenes/0/text', value: 'Updated text' },
      { op: 'remove', path: '/scenes/1' },
      { op: 'add', path: '/scenes/1', value: { id: 'scene3', type: 'video', url: 'video.mp4' } },
      { op: 'replace', path: '/meta/version', value: 2 }
    ];
    
    // Apply patch
    const result = fastJsonPatch.applyPatch(initialState, complexPatch);
    
    // Assertions
    expect(result.newDocument.scenes).toHaveLength(2);
    expect(result.newDocument.scenes[0].text).toBe('Updated text');
    expect(result.newDocument.scenes[1].type).toBe('video');
    expect(result.newDocument.meta.version).toBe(2);
  });
  
  // Test error handling in patch application
  it('handles errors when applying invalid patches', () => {
    const initialState = {
      meta: { version: 1 },
      scenes: []
    };
    
    // Invalid patch - tries to reference non-existent property
    const invalidPatch = [
      { op: 'replace', path: '/nonexistent/property', value: 'test' }
    ];
    
    // This should throw an error
    expect(() => {
      fastJsonPatch.applyPatch(initialState, invalidPatch, true, false);
    }).toThrow();
    
    // When not throwing (validateOperation: false), it should return errors
    const result = fastJsonPatch.applyPatch(initialState, invalidPatch, false, false);
    expect(result.newDocument).toEqual(initialState); // Document unchanged
    expect(result.results[0].name).toBe('ERROR'); // Error in result
  });
});
