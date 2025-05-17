//src/tests/integration/api/json-patch-validation.test.ts
import { describe, it, expect, jest } from '@jest/globals';
import * as fastJsonPatch from 'fast-json-patch';
import type { JsonPatch, JsonPatchOperation } from '~/types/json-patch';

// Mock the actual schema and validation functions - adjust import paths as needed
jest.mock('~/types/json-patch', () => ({
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

interface Scene {
  id?: string;
  type: string;
  text?: string;
  url?: string;
  // Add other potential scene properties if needed
}

interface VideoState {
  meta: { version: number; duration?: number };
  scenes: Scene[];
}

describe('JSON Patch Validation', () => {
  // Test valid RFC 6902 compliant patches
  it('validates compliant RFC 6902 patch operations', () => {
    // Valid patch operations
    const validPatches: JsonPatch[] = [
      [{ op: 'add', path: '/scenes/0', value: { type: 'text', text: 'Hello' } } as JsonPatchOperation],
      [{ op: 'replace', path: '/scenes/0/text', value: 'Updated text' } as JsonPatchOperation],
      [{ op: 'remove', path: '/scenes/1' } as JsonPatchOperation],
      [
        { op: 'test', path: '/meta/version', value: 1 } as JsonPatchOperation,
        { op: 'replace', path: '/meta/version', value: 2 } as JsonPatchOperation
      ]
    ];
    
    // Import the real schema to test
    const { jsonPatchSchema } = jest.requireActual('~/types/json-patch') as { jsonPatchSchema: typeof import('~/types/json-patch').jsonPatchSchema };
    
    validPatches.forEach(patch => {
      const result = jsonPatchSchema.safeParse(patch);
      expect(result.success).toBe(true);
    });
  });
  
  // Test non-compliant patches
  it('rejects non-compliant patch operations', () => {
    // Invalid patch operations
    const invalidPatches: JsonPatch[] = [
      [{ op: 'invalid', path: '/scenes/0', value: 'test' } as unknown as JsonPatchOperation], // Invalid op
      [{ op: 'add', path: 'scenes/0', value: 'test' } as JsonPatchOperation],      // Missing leading slash
      [{ op: 'remove' } as unknown as JsonPatchOperation],                                    // Missing path
      [{ op: 'add', path: '/scenes/0' } as JsonPatchOperation]                     // Missing value for add
    ];
    
    // Import the real schema to test
    const { jsonPatchSchema } = jest.requireActual('~/types/json-patch') as { jsonPatchSchema: typeof import('~/types/json-patch').jsonPatchSchema };
    
    invalidPatches.forEach(patch => {
      const result = jsonPatchSchema.safeParse(patch);
      expect(result.success).toBe(false);
    });
  });
  
  // Test applying patches to actual data
  it('applies patch correctly to video state', () => {
    // Setup
    const initialState: VideoState = {
      meta: { version: 1, duration: 300 },
      scenes: []
    };
    
    const patch: JsonPatch = [
      { op: 'add', path: '/scenes/0', value: { type: 'text', text: 'Test Scene' } } as JsonPatchOperation
    ];
    
    // Apply patch using fast-json-patch
    const result = fastJsonPatch.applyPatch(initialState, patch as fastJsonPatch.Operation[]);
    
    // Assertions
    expect(result.newDocument!.scenes!).toHaveLength(1);
    expect(result.newDocument!.scenes![0]!.text).toBe('Test Scene');
    expect(result.newDocument!.meta.version).toBe(1); // Unchanged
  });
  
  // Test multiple operations in a single patch
  it('handles complex patch operations correctly', () => {
    // Setup initial state
    const initialState: VideoState = {
      meta: { version: 1, duration: 300 },
      scenes: [
        { id: 'scene1', type: 'text', text: 'Original text' },
        { id: 'scene2', type: 'image', url: 'image1.jpg' }
      ]
    };
    
    // Complex patch with multiple operations
    const complexPatch: JsonPatch = [
      { op: 'replace', path: '/scenes/0/text', value: 'Updated text' } as JsonPatchOperation,
      { op: 'remove', path: '/scenes/1' } as JsonPatchOperation,
      { op: 'add', path: '/scenes/1', value: { id: 'scene3', type: 'video', url: 'video.mp4' } } as JsonPatchOperation,
      { op: 'replace', path: '/meta/version', value: 2 } as JsonPatchOperation
    ];
    
    // Apply patch
    const result = fastJsonPatch.applyPatch(initialState, complexPatch as fastJsonPatch.Operation[]);
    
    // Assertions
    expect(result.newDocument!.scenes!).toHaveLength(2);
    expect(result.newDocument!.scenes![0]!.text).toBe('Updated text');
    expect(result.newDocument!.scenes![1]!.type).toBe('video');
    expect(result.newDocument!.meta.version).toBe(2);
  });
  
  // Test error handling in patch application
  it('handles errors when applying invalid patches', () => {
    const initialState = { // This initialState's scenes remain empty, might not need full VideoState typing if not accessing specific scene props
      meta: { version: 1 },
      scenes: []
    };
    
    // Invalid patch - tries to reference non-existent property
    const invalidPatch: JsonPatch = [
      { op: 'replace', path: '/nonexistent/property', value: 'test' } as JsonPatchOperation
    ];
    
    // This should throw an error
    expect(() => {
      fastJsonPatch.applyPatch(initialState, invalidPatch as fastJsonPatch.Operation[], true, false);
    }).toThrow();
    
    // When not throwing (validateOperation: false), it should return errors
    const result = fastJsonPatch.applyPatch(initialState, invalidPatch as fastJsonPatch.Operation[], false, false);
    expect(result.newDocument).toEqual(initialState); // Document unchanged
    // fast-json-patch adds an 'error' property to the operation in the input array if it fails
    expect((invalidPatch[0] as any).error.name).toBe('OPERATION_PATH_UNRESOLVABLE'); 
  });
});
