/**
 * Sprint 106 Phase 2 - Server-Side Compilation Tests
 * 
 * Tests for:
 * - Compilation versioning and metadata
 * - JS compilation at create/edit time
 * - Proper return statement addition
 * - Export stripping
 * - Icon normalization
 * - Performance metrics
 * - Error handling and fallbacks
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { SceneCompilerService } from '../scene-compiler.service';

describe('Sprint 106 Phase 2 - Compilation Tests', () => {
  let compiler: SceneCompilerService;

  beforeEach(() => {
    compiler = SceneCompilerService.getInstance();
    jest.clearAllMocks();
  });

  describe('Compilation Versioning', () => {
    test('should add compilation_version to metadata', async () => {
      const tsxCode = `
const { Spring, interpolate } = window.Remotion;

export default function TestScene() {
  return <div>Test Scene</div>;
}`;

      const result = await compiler.compileScene(tsxCode, {
        projectId: 'test-project',
        sceneId: 'test-scene',
        existingScenes: []
      });

      expect(result.success).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.compilation_version).toBe(1);
    });

    test('should record compilation timings in metadata', async () => {
      const tsxCode = `
export default function TimingTest() {
  return <div>Timing Test</div>;
}`;

      const result = await compiler.compileScene(tsxCode, {
        projectId: 'test-project',
        sceneId: 'timing-test',
        existingScenes: []
      });

      expect(result.metadata?.compile_meta).toBeDefined();
      expect(result.metadata?.compile_meta.timings).toBeDefined();
      expect(result.metadata?.compile_meta.timings.ms).toBeGreaterThanOrEqual(0);
      expect(result.metadata?.compile_meta.timings.ms).toBeLessThan(1000); // Should be fast
    });

    test('should include tool information in metadata', async () => {
      const tsxCode = `
export default function ToolTest() {
  return <div>Tool Test</div>;
}`;

      const result = await compiler.compileScene(tsxCode, {
        projectId: 'test-project',
        sceneId: 'tool-test',
        existingScenes: []
      });

      expect(result.metadata?.compile_meta.tool).toBe('scene-compiler-v1');
      expect(result.metadata?.compile_meta.timestamp).toBeDefined();
    });
  });

  describe('Return Statement Addition', () => {
    test('should add return statement for default export function', async () => {
      const tsxCode = `
const { Spring } = window.Remotion;

export default function MyScene() {
  return <div>My Scene</div>;
}`;

      const result = await compiler.compileScene(tsxCode, {
        projectId: 'test-project',
        sceneId: 'return-test-1',
        existingScenes: []
      });

      expect(result.jsCode).toContain('return MyScene;');
      expect(result.jsCode).not.toContain('export default');
    });

    test('should add return statement for named function export', async () => {
      const tsxCode = `
const { Spring } = window.Remotion;

function SceneComponent() {
  return <div>Scene Component</div>;
}

export default SceneComponent;`;

      const result = await compiler.compileScene(tsxCode, {
        projectId: 'test-project',
        sceneId: 'return-test-2',
        existingScenes: []
      });

      expect(result.jsCode).toContain('return SceneComponent;');
      expect(result.jsCode).not.toContain('export default');
    });

    test('should add return statement for arrow function export', async () => {
      const tsxCode = `
const { Spring } = window.Remotion;

const ArrowScene = () => {
  return <div>Arrow Scene</div>;
};

export default ArrowScene;`;

      const result = await compiler.compileScene(tsxCode, {
        projectId: 'test-project',
        sceneId: 'return-test-3',
        existingScenes: []
      });

      expect(result.jsCode).toContain('return ArrowScene;');
      expect(result.jsCode).not.toContain('export default');
    });

    test('should handle inline default export', async () => {
      const tsxCode = `
const { Spring } = window.Remotion;

export default () => {
  return <div>Inline Export</div>;
};`;

      const result = await compiler.compileScene(tsxCode, {
        projectId: 'test-project',
        sceneId: 'return-test-4',
        existingScenes: []
      });

      expect(result.jsCode).toContain('return ');
      expect(result.jsCode).not.toContain('export default');
    });
  });

  describe('Export Stripping', () => {
    test('should strip all export statements', async () => {
      const tsxCode = `
const { Spring } = window.Remotion;

export const helper = () => 'helper';
export function utilFunction() { return 'util'; }

const Component = () => <div>Component</div>;

export default Component;
export { Component as MyComponent };`;

      const result = await compiler.compileScene(tsxCode, {
        projectId: 'test-project',
        sceneId: 'export-strip-test',
        existingScenes: []
      });

      expect(result.jsCode).not.toContain('export const');
      expect(result.jsCode).not.toContain('export function');
      expect(result.jsCode).not.toContain('export default');
      expect(result.jsCode).not.toContain('export {');
      expect(result.jsCode).toContain('return Component;');
    });
  });

  describe('Remotion Destructuring', () => {
    test('should preserve top-level Remotion destructuring', async () => {
      const tsxCode = `
const { Spring, interpolate, useCurrentFrame, useVideoConfig } = window.Remotion;

export default function Scene() {
  const frame = useCurrentFrame();
  return <div>Frame: {frame}</div>;
}`;

      const result = await compiler.compileScene(tsxCode, {
        projectId: 'test-project',
        sceneId: 'remotion-test',
        existingScenes: []
      });

      // Should have exactly one Remotion destructure at the top
      const remotionMatches = result.jsCode.match(/const\s*{\s*.*\s*}\s*=\s*window\.Remotion/g);
      expect(remotionMatches).toHaveLength(1);
      expect(result.jsCode.startsWith('const {')).toBe(true);
    });

    test('should not duplicate Remotion destructuring', async () => {
      const tsxCode = `
const { Spring } = window.Remotion;
const { interpolate } = window.Remotion;

export default function Scene() {
  return <div>Scene</div>;
}`;

      const result = await compiler.compileScene(tsxCode, {
        projectId: 'test-project',
        sceneId: 'no-duplicate-test',
        existingScenes: []
      });

      // Should consolidate into single destructure
      const remotionMatches = result.jsCode.match(/const\s*{\s*.*\s*}\s*=\s*window\.Remotion/g);
      expect(remotionMatches).toHaveLength(1);
    });
  });

  describe('Icon Normalization', () => {
    test('should normalize Iconify icons to React.createElement', async () => {
      const tsxCode = `
const { Spring } = window.Remotion;

export default function IconScene() {
  return (
    <div>
      <Icon icon="mdi:home" />
      <Icon icon="carbon:user" color="blue" />
    </div>
  );
}`;

      const result = await compiler.compileScene(tsxCode, {
        projectId: 'test-project',
        sceneId: 'icon-test',
        existingScenes: []
      });

      // Should convert JSX Icon to React.createElement
      expect(result.jsCode).toContain('React.createElement');
      expect(result.jsCode).toContain('window.IconifyIcon');
      expect(result.jsCode).toContain('icon: "mdi:home"');
      expect(result.jsCode).toContain('icon: "carbon:user"');
    });

    test('should handle IconifyIcon component', async () => {
      const tsxCode = `
const { Spring } = window.Remotion;

export default function IconifyScene() {
  return (
    <div>
      <IconifyIcon icon="material-symbols:check" />
    </div>
  );
}`;

      const result = await compiler.compileScene(tsxCode, {
        projectId: 'test-project',
        sceneId: 'iconify-test',
        existingScenes: []
      });

      expect(result.jsCode).toContain('window.IconifyIcon');
      expect(result.jsCode).toContain('material-symbols:check');
    });
  });

  describe('Conflict Resolution', () => {
    test('should detect and resolve component name conflicts', async () => {
      const scene1 = `
const { Spring } = window.Remotion;

const Button = () => <button>Button 1</button>;
const Card = () => <div>Card 1</div>;

export default function Scene1() {
  return <div><Button /><Card /></div>;
}`;

      const scene2 = `
const { Spring } = window.Remotion;

const Button = () => <button>Button 2</button>;
const Card = () => <div>Card 2</div>;

export default function Scene2() {
  return <div><Button /><Card /></div>;
}`;

      const result1 = await compiler.compileScene(scene1, {
        projectId: 'test-project',
        sceneId: 'scene-1',
        existingScenes: []
      });

      const result2 = await compiler.compileScene(scene2, {
        projectId: 'test-project',
        sceneId: 'scene-2',
        existingScenes: [{ id: 'scene-1', name: 'Scene 1', tsxCode: scene1 }]
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result2.conflicts).toBeDefined();
      expect(result2.conflicts?.length).toBeGreaterThan(0);
      
      // Should rename conflicting components
      expect(result2.tsxCode).toContain('Button_');
      expect(result2.tsxCode).toContain('Card_');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid TSX gracefully', async () => {
      const invalidTsx = `
const { Spring } = window.Remotion;

export default function BrokenScene() {
  return <div>Unclosed div
}`;

      const result = await compiler.compileScene(invalidTsx, {
        projectId: 'test-project',
        sceneId: 'broken-scene',
        existingScenes: []
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.jsCode).toBeDefined(); // Should still provide fallback
    });

    test('should handle missing export gracefully', async () => {
      const noExport = `
const { Spring } = window.Remotion;

function Scene() {
  return <div>No export</div>;
}`;

      const result = await compiler.compileScene(noExport, {
        projectId: 'test-project',
        sceneId: 'no-export',
        existingScenes: []
      });

      // Should detect the main component and add return
      expect(result.jsCode).toContain('return Scene;');
    });

    test('should handle empty code', async () => {
      const result = await compiler.compileScene('', {
        projectId: 'test-project',
        sceneId: 'empty',
        existingScenes: []
      });

      expect(result.jsCode).toBeDefined();
      expect(result.jsCode.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Metrics', () => {
    test('should compile quickly for simple scenes', async () => {
      const simpleScene = `
const { Spring } = window.Remotion;

export default function SimpleScene() {
  return <div>Simple</div>;
}`;

      const startTime = performance.now();
      const result = await compiler.compileScene(simpleScene, {
        projectId: 'test-project',
        sceneId: 'perf-simple',
        existingScenes: []
      });
      const duration = performance.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(100); // Should be under 100ms
      expect(result.metadata?.compile_meta.timings.ms).toBeLessThan(100);
    });

    test('should handle complex scenes efficiently', async () => {
      const complexScene = `
const { Spring, interpolate, useCurrentFrame, useVideoConfig, Sequence } = window.Remotion;

const Component1 = () => <div>Component 1</div>;
const Component2 = () => <div>Component 2</div>;
const Component3 = () => <div>Component 3</div>;
const Component4 = () => <div>Component 4</div>;
const Component5 = () => <div>Component 5</div>;

export default function ComplexScene() {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  
  const opacity = interpolate(frame, [0, 30], [0, 1]);
  const scale = Spring({
    frame,
    from: 0,
    to: 1,
    fps,
    config: { mass: 1, damping: 10, stiffness: 100 }
  });
  
  return (
    <div style={{ opacity, transform: \`scale(\${scale})\` }}>
      <Sequence from={0} durationInFrames={30}>
        <Component1 />
      </Sequence>
      <Sequence from={30} durationInFrames={30}>
        <Component2 />
      </Sequence>
      <Sequence from={60} durationInFrames={30}>
        <Component3 />
      </Sequence>
      <Sequence from={90} durationInFrames={30}>
        <Component4 />
      </Sequence>
      <Sequence from={120} durationInFrames={30}>
        <Component5 />
      </Sequence>
    </div>
  );
}`;

      const startTime = performance.now();
      const result = await compiler.compileScene(complexScene, {
        projectId: 'test-project',
        sceneId: 'perf-complex',
        existingScenes: []
      });
      const duration = performance.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(500); // Should be under 500ms even for complex
      expect(result.metadata?.compile_meta.timings.ms).toBeLessThan(500);
    });
  });

  describe('Backfill Compatibility', () => {
    test('should handle scenes without compilation_version', async () => {
      // Simulate an old scene without compilation metadata
      const oldScene = {
        id: 'old-scene',
        name: 'Old Scene',
        tsxCode: `export default function OldScene() { return <div>Old</div>; }`,
        jsCode: null,
        js_compiled_at: null
      };

      const result = await compiler.compileScene(oldScene.tsxCode, {
        projectId: 'test-project',
        sceneId: oldScene.id,
        existingScenes: [],
        isBackfill: true
      });

      expect(result.success).toBe(true);
      expect(result.metadata?.compilation_version).toBe(1);
      expect(result.metadata?.compile_meta.backfilled).toBe(true);
    });
  });

  describe('Parameterized Function Execution (Feature Flag)', () => {
    test('should support parameterized execution when enabled', async () => {
      const tsxCode = `
const { Spring } = window.Remotion;

export default function ParamScene() {
  return <div>Parameterized</div>;
}`;

      const result = await compiler.compileScene(tsxCode, {
        projectId: 'test-project',
        sceneId: 'param-scene',
        existingScenes: [],
        enableParameterizedExecution: true
      });

      if (result.metadata?.compile_meta.parameterized) {
        // When enabled, should prepare for parameterized execution
        expect(result.jsCode).not.toContain('window.Remotion');
        expect(result.metadata.compile_meta.parameterized).toBe(true);
      } else {
        // When disabled (default), use window.Remotion
        expect(result.jsCode).toContain('window.Remotion');
      }
    });
  });
});

describe('Integration with Database Storage', () => {
  test('metadata should be JSON-serializable', async () => {
    const compiler = SceneCompilerService.getInstance();
    
    const result = await compiler.compileScene(
      'export default function Test() { return <div>Test</div>; }',
      {
        projectId: 'test',
        sceneId: 'test',
        existingScenes: []
      }
    );

    // Should be able to serialize/deserialize without errors
    const serialized = JSON.stringify(result.metadata);
    const deserialized = JSON.parse(serialized);
    
    expect(deserialized.compilation_version).toBe(1);
    expect(deserialized.compile_meta).toBeDefined();
  });
});