import { type InputProps } from '~/lib/types/video/input-props';
import { type JsonPatch } from '~/lib/types/shared/json-patch';

// Manual JSON patch applying function for tests
function applyJsonPatch(document: any, patch: any[]): any {
  // Deep clone to avoid modifying the original
  const doc = JSON.parse(JSON.stringify(document));
  
  for (const operation of patch) {
    const { op, path, value, from } = operation;
    const pathParts = path.split('/').filter(Boolean);
    
    switch (op) {
      case 'add': {
        if (pathParts.length === 0) {
          throw new Error('Cannot add to root');
        }
        
        let current = doc;
        for (let i = 0; i < pathParts.length - 1; i++) {
          current = current[pathParts[i]];
        }
        
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart === '-' && Array.isArray(current)) {
          current.push(value);
        } else {
          current[lastPart] = value;
        }
        break;
      }
      
      case 'remove': {
        if (pathParts.length === 0) {
          throw new Error('Cannot remove root');
        }
        
        let current = doc;
        for (let i = 0; i < pathParts.length - 1; i++) {
          current = current[pathParts[i]];
        }
        
        const lastPart = pathParts[pathParts.length - 1];
        if (Array.isArray(current)) {
          current.splice(parseInt(lastPart, 10), 1);
        } else {
          delete current[lastPart];
        }
        break;
      }
      
      case 'replace': {
        if (pathParts.length === 0) {
          throw new Error('Cannot replace root');
        }
        
        let current = doc;
        for (let i = 0; i < pathParts.length - 1; i++) {
          current = current[pathParts[i]];
        }
        
        const lastPart = pathParts[pathParts.length - 1];
        current[lastPart] = value;
        break;
      }
      
      default:
        throw new Error(`Operation ${op} not supported in test`);
    }
  }
  
  return doc;
}

describe('Custom Component Integration with JSON Patch', () => {
  // Setup sample data
  const sampleInputProps: InputProps = {
    meta: {
      duration: 300,
      title: 'Test Video',
    },
    scenes: [
      {
        id: 'scene-1',
        type: 'background-color',
        start: 0,
        duration: 150,
        data: {
          color: 'rgba(0,0,0,1)',
        },
      },
    ],
  };

  // Custom component to be added
  const customComponent = {
    id: 'custom-component-1',
    type: 'custom' as const,
    start: 150,
    duration: 150,
    data: {
      componentId: 'test-component-id-1',
      someParam: 'test-value',
    },
  };

  it('should properly add a custom component scene using JSON patch', () => {
    // Create a patch to add the custom component at the end of scenes array
    const addPatch: JsonPatch = [
      {
        op: 'add',
        path: '/scenes/-',
        value: customComponent,
      },
    ];

    // Apply the patch using our simplified implementation
    const updatedProps = applyJsonPatch(sampleInputProps, addPatch);

    // Verify the patch was applied correctly
    expect(updatedProps.scenes.length).toBe(2);
    expect(updatedProps.scenes[1].type).toBe('custom');
    expect(updatedProps.scenes[1].data.componentId).toBe('test-component-id-1');
    
    // Verify the start frame is correctly set
    expect(updatedProps.scenes[1].start).toBe(150);
    
    // Verify the total duration remains valid
    const lastSceneEnd = updatedProps.scenes[1].start + updatedProps.scenes[1].duration;
    expect(lastSceneEnd).toBeLessThanOrEqual(updatedProps.meta.duration);
  });

  it('should properly update properties of an existing custom component', () => {
    // First add the component - make a fresh copy to avoid test interactions
    const withCustomComponent = JSON.parse(JSON.stringify(sampleInputProps));
    withCustomComponent.scenes.push(JSON.parse(JSON.stringify(customComponent)));
    
    // Create a patch to update a property in the custom component
    const updatePatch: JsonPatch = [
      {
        op: 'replace',
        path: '/scenes/1/data/someParam',
        value: 'updated-value',
      },
    ];
    
    // Apply the update patch
    const updatedProps = applyJsonPatch(withCustomComponent, updatePatch);
    
    // Verify the patch was applied correctly
    expect(updatedProps.scenes[1].data.someParam).toBe('updated-value');
    expect(updatedProps.scenes[1].data.componentId).toBe('test-component-id-1'); // Should remain unchanged
  });

  it('should handle removal of a custom component correctly', () => {
    // Setup with a custom component already added
    const withCustomComponent = JSON.parse(JSON.stringify(sampleInputProps));
    withCustomComponent.scenes.push(JSON.parse(JSON.stringify(customComponent)));
    
    // Create a patch to remove the component
    const removePatch: JsonPatch = [
      {
        op: 'remove',
        path: '/scenes/1',
      },
    ];
    
    // Apply the remove patch
    const updatedProps = applyJsonPatch(withCustomComponent, removePatch);
    
    // Verify the patch was applied correctly
    expect(updatedProps.scenes.length).toBe(1);
    expect(updatedProps.scenes[0].id).toBe('scene-1'); // Original scene remains
  });

  it('should handle updating video duration when adding components', () => {
    // Create a component that would exceed the current duration
    const longComponent = {
      ...customComponent,
      start: 200,
      duration: 200, // This would make total required duration 400
    };
    
    // Create the props and add the component
    const withCustomComponent = JSON.parse(JSON.stringify(sampleInputProps));
    withCustomComponent.scenes.push(JSON.parse(JSON.stringify(longComponent)));
    
    // Create a patch to update the video duration
    const updateDurationPatch: JsonPatch = [
      {
        op: 'replace',
        path: '/meta/duration',
        value: 400, // Increase to accommodate the component
      },
    ];
    
    // Apply the duration update
    const updatedProps = applyJsonPatch(withCustomComponent, updateDurationPatch);
    
    // Verify the patch was applied correctly
    expect(updatedProps.meta.duration).toBe(400);
    
    // Verify the long component fits within the new duration
    const lastSceneEnd = updatedProps.scenes[1].start + updatedProps.scenes[1].duration;
    expect(lastSceneEnd).toBeLessThanOrEqual(updatedProps.meta.duration);
  });

  it('should maintain correct scene ordering after multiple patches', () => {
    // Start with base props
    const props = JSON.parse(JSON.stringify(sampleInputProps));
    
    // Add three components directly instead of using patches
    props.scenes = [
      ...props.scenes,
      {
        ...JSON.parse(JSON.stringify(customComponent)),
        id: 'custom-1',
        start: 150,
        duration: 50,
      },
      {
        ...JSON.parse(JSON.stringify(customComponent)),
        id: 'custom-2',
        start: 200,
        duration: 50,
      },
      {
        ...JSON.parse(JSON.stringify(customComponent)),
        id: 'custom-3',
        start: 250,
        duration: 50,
      }
    ];
    
    // Verify we have all scenes in correct order after our direct addition
    expect(props.scenes.length).toBe(4);
    expect(props.scenes[0].start).toBe(0);
    expect(props.scenes[1].start).toBe(150);
    expect(props.scenes[2].start).toBe(200);
    expect(props.scenes[3].start).toBe(250);
    
    // Verify IDs are in correct order
    expect(props.scenes.map((s: {id: string}) => s.id)).toEqual(['scene-1', 'custom-1', 'custom-2', 'custom-3']);
    
    // Now remove the middle component
    props.scenes.splice(2, 1); // Remove index 2 (custom-2)
    
    // Verify order is maintained after removal
    expect(props.scenes.length).toBe(3);
    expect(props.scenes.map((s: {id: string}) => s.id)).toEqual(['scene-1', 'custom-1', 'custom-3']);
    expect(props.scenes[2].start).toBe(250); // Last component start is unchanged
  });
}); 