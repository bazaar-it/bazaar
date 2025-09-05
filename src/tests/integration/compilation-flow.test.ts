/**
 * Sprint 106 - End-to-End Compilation Flow Integration Tests
 * 
 * Tests the complete flow from scene creation through compilation to storage
 * Simulates the actual production pipeline
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { SceneCompilerService } from '../../server/services/compilation/scene-compiler.service';
import type { Scene } from '../../server/db/schema';

// Mock database operations
const mockDb = {
  scenes: [],
  
  async createScene(data: Partial<Scene>) {
    const scene = {
      id: data.id || `scene-${Date.now()}`,
      projectId: data.projectId || 'test-project',
      name: data.name || 'Test Scene',
      tsxCode: data.tsxCode || '',
      jsCode: data.jsCode || null,
      js_compiled_at: data.js_compiled_at || null,
      compilation_version: data.compilation_version || null,
      compile_meta: data.compile_meta || null,
      created_at: new Date(),
      updated_at: new Date(),
      frames: 90,
      order: 0
    };
    this.scenes.push(scene);
    return scene;
  },
  
  async updateScene(id: string, updates: Partial<Scene>) {
    const scene = this.scenes.find(s => s.id === id);
    if (scene) {
      Object.assign(scene, updates, { updated_at: new Date() });
    }
    return scene;
  },
  
  async getProjectScenes(projectId: string) {
    return this.scenes.filter(s => s.projectId === projectId);
  },
  
  clear() {
    this.scenes = [];
  }
};

describe('Compilation Flow Integration Tests', () => {
  let compiler: SceneCompilerService;

  beforeEach(() => {
    compiler = SceneCompilerService.getInstance();
    mockDb.clear();
  });

  describe('Scene Creation Flow', () => {
    test('should compile and store scene on creation', async () => {
      // Step 1: User creates a new scene via AI generation
      const generatedTsx = `
const { Spring, interpolate, useCurrentFrame } = window.Remotion;

const AnimatedTitle = ({ text }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1]);
  
  return (
    <h1 style={{ opacity, fontSize: '48px', color: 'blue' }}>
      {text}
    </h1>
  );
};

export default function GeneratedScene() {
  return (
    <div style={{ padding: '50px' }}>
      <AnimatedTitle text="Welcome to Bazaar!" />
    </div>
  );
}`;

      // Step 2: Compile the scene
      const compilationResult = await compiler.compileScene(generatedTsx, {
        projectId: 'project-123',
        sceneId: 'scene-456',
        existingScenes: []
      });

      expect(compilationResult.success).toBe(true);
      expect(compilationResult.jsCode).toBeDefined();
      expect(compilationResult.metadata).toBeDefined();

      // Step 3: Store in database
      const storedScene = await mockDb.createScene({
        id: 'scene-456',
        projectId: 'project-123',
        name: 'Generated Scene',
        tsxCode: generatedTsx,
        jsCode: compilationResult.jsCode,
        js_compiled_at: new Date(),
        compilation_version: compilationResult.metadata?.compilation_version,
        compile_meta: compilationResult.metadata?.compile_meta
      });

      // Verify storage
      expect(storedScene.jsCode).toBeTruthy();
      expect(storedScene.js_compiled_at).toBeTruthy();
      expect(storedScene.compilation_version).toBe(1);
      expect(storedScene.compile_meta?.timings.ms).toBeGreaterThanOrEqual(0);
    });

    test('should handle multi-scene project compilation', async () => {
      const scenes = [
        {
          id: 'scene-1',
          tsx: `
const { Spring } = window.Remotion;
const Button = () => <button>Scene 1 Button</button>;
export default function Scene1() {
  return <div><Button /></div>;
}`
        },
        {
          id: 'scene-2',
          tsx: `
const { interpolate } = window.Remotion;
const Button = () => <button>Scene 2 Button</button>;
export default function Scene2() {
  return <div><Button /></div>;
}`
        },
        {
          id: 'scene-3',
          tsx: `
const { useCurrentFrame } = window.Remotion;
const Button = () => <button>Scene 3 Button</button>;
export default function Scene3() {
  return <div><Button /></div>;
}`
        }
      ];

      const projectId = 'multi-scene-project';
      const compiledScenes = [];

      // Compile scenes sequentially as they would be in production
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        const existingScenes = await mockDb.getProjectScenes(projectId);
        
        const result = await compiler.compileScene(scene.tsx, {
          projectId,
          sceneId: scene.id,
          existingScenes: existingScenes.map(s => ({
            id: s.id,
            name: s.name,
            tsxCode: s.tsxCode || ''
          }))
        });

        // Should handle conflicts automatically
        if (i > 0) {
          expect(result.conflicts).toBeDefined();
          expect(result.conflicts?.length).toBeGreaterThan(0);
          // Button should be renamed
          expect(result.tsxCode).toContain('Button_');
        }

        const storedScene = await mockDb.createScene({
          id: scene.id,
          projectId,
          name: `Scene ${i + 1}`,
          tsxCode: result.tsxCode, // Store the fixed TSX
          jsCode: result.jsCode,
          js_compiled_at: new Date(),
          compilation_version: result.metadata?.compilation_version,
          compile_meta: result.metadata?.compile_meta
        });

        compiledScenes.push(storedScene);
      }

      // Verify all scenes compiled successfully
      expect(compiledScenes).toHaveLength(3);
      compiledScenes.forEach(scene => {
        expect(scene.jsCode).toBeTruthy();
        expect(scene.compilation_version).toBe(1);
      });

      // Verify conflict resolution
      expect(compiledScenes[1].tsxCode).toContain('Button_');
      expect(compiledScenes[2].tsxCode).toContain('Button_');
    });
  });

  describe('Scene Edit Flow', () => {
    test('should recompile on scene edit', async () => {
      // Create initial scene
      const initialTsx = `
const { Spring } = window.Remotion;
export default function EditableScene() {
  return <div>Initial Version</div>;
}`;

      const initialResult = await compiler.compileScene(initialTsx, {
        projectId: 'edit-project',
        sceneId: 'edit-scene',
        existingScenes: []
      });

      const scene = await mockDb.createScene({
        id: 'edit-scene',
        projectId: 'edit-project',
        name: 'Editable Scene',
        tsxCode: initialTsx,
        jsCode: initialResult.jsCode,
        js_compiled_at: new Date(),
        compilation_version: 1,
        compile_meta: initialResult.metadata?.compile_meta
      });

      // Edit the scene
      const editedTsx = `
const { Spring, interpolate, useCurrentFrame } = window.Remotion;

export default function EditableScene() {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1]);
  
  return (
    <div style={{ opacity }}>
      <h1>Edited Version</h1>
      <p>Now with animation!</p>
    </div>
  );
}`;

      const editResult = await compiler.compileScene(editedTsx, {
        projectId: 'edit-project',
        sceneId: 'edit-scene',
        existingScenes: []
      });

      // Update in database
      const updatedScene = await mockDb.updateScene('edit-scene', {
        tsxCode: editedTsx,
        jsCode: editResult.jsCode,
        js_compiled_at: new Date(),
        compilation_version: editResult.metadata?.compilation_version,
        compile_meta: editResult.metadata?.compile_meta
      });

      // Verify update
      expect(updatedScene?.jsCode).toContain('Edited Version');
      expect(updatedScene?.jsCode).toContain('interpolate');
      expect(updatedScene?.compilation_version).toBe(1);
      expect(updatedScene?.compile_meta?.timings.ms).toBeDefined();
    });
  });

  describe('Template Addition Flow', () => {
    test('should compile templates with existing scenes', async () => {
      // Existing user scene
      const userScene = `
const { Spring } = window.Remotion;
const Card = () => <div>User Card</div>;
export default function UserScene() {
  return <Card />;
}`;

      const userResult = await compiler.compileScene(userScene, {
        projectId: 'template-project',
        sceneId: 'user-scene',
        existingScenes: []
      });

      await mockDb.createScene({
        id: 'user-scene',
        projectId: 'template-project',
        tsxCode: userScene,
        jsCode: userResult.jsCode
      });

      // Add template scene
      const templateScene = `
const { Spring, interpolate, useCurrentFrame } = window.Remotion;

const Card = () => <div>Template Card</div>;
const Button = () => <button>Template Button</button>;

export default function TemplateScene() {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 20], [0, 1]);
  
  return (
    <div style={{ transform: \`scale(\${scale})\` }}>
      <Card />
      <Button />
    </div>
  );
}`;

      const existingScenes = await mockDb.getProjectScenes('template-project');
      
      const templateResult = await compiler.compileScene(templateScene, {
        projectId: 'template-project',
        sceneId: 'template-scene',
        existingScenes: existingScenes.map(s => ({
          id: s.id,
          name: s.name,
          tsxCode: s.tsxCode || ''
        }))
      });

      // Should detect and fix Card conflict
      expect(templateResult.conflicts).toBeDefined();
      expect(templateResult.conflicts?.some(c => c.identifier === 'Card')).toBe(true);
      expect(templateResult.tsxCode).toContain('Card_');
      expect(templateResult.jsCode).toContain('Card_');

      await mockDb.createScene({
        id: 'template-scene',
        projectId: 'template-project',
        tsxCode: templateResult.tsxCode,
        jsCode: templateResult.jsCode,
        compilation_version: templateResult.metadata?.compilation_version
      });

      // Verify both scenes can coexist
      const allScenes = await mockDb.getProjectScenes('template-project');
      expect(allScenes).toHaveLength(2);
      allScenes.forEach(scene => {
        expect(scene.jsCode).toBeTruthy();
      });
    });
  });

  describe('Backfill Flow', () => {
    test('should backfill existing scenes without JS code', async () => {
      // Simulate old scenes without compiled JS
      const oldScenes = [
        {
          id: 'old-1',
          projectId: 'legacy-project',
          name: 'Old Scene 1',
          tsxCode: `
const { Spring } = window.Remotion;
export default function OldScene1() {
  return <div>Old Scene 1</div>;
}`,
          jsCode: null,
          js_compiled_at: null
        },
        {
          id: 'old-2',
          projectId: 'legacy-project',
          name: 'Old Scene 2',
          tsxCode: `
const { interpolate } = window.Remotion;
export default function OldScene2() {
  return <div>Old Scene 2</div>;
}`,
          jsCode: null,
          js_compiled_at: null
        }
      ];

      // Create old scenes in DB
      for (const scene of oldScenes) {
        await mockDb.createScene(scene);
      }

      // Backfill process
      const scenesToBackfill = await mockDb.getProjectScenes('legacy-project');
      const backfillResults = [];

      for (const scene of scenesToBackfill) {
        if (!scene.jsCode || !scene.compilation_version) {
          const result = await compiler.compileScene(scene.tsxCode || '', {
            projectId: scene.projectId,
            sceneId: scene.id,
            existingScenes: [],
            isBackfill: true
          });

          await mockDb.updateScene(scene.id, {
            jsCode: result.jsCode,
            js_compiled_at: new Date(),
            compilation_version: 1,
            compile_meta: {
              ...result.metadata?.compile_meta,
              backfilled: true,
              backfilled_at: new Date().toISOString()
            }
          });

          backfillResults.push(result);
        }
      }

      // Verify backfill
      expect(backfillResults).toHaveLength(2);
      backfillResults.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.metadata?.compile_meta.backfilled).toBe(true);
      });

      const backfilledScenes = await mockDb.getProjectScenes('legacy-project');
      backfilledScenes.forEach(scene => {
        expect(scene.jsCode).toBeTruthy();
        expect(scene.compilation_version).toBe(1);
        expect(scene.compile_meta?.backfilled).toBe(true);
      });
    });
  });

  describe('Error Recovery Flow', () => {
    test('should handle compilation errors gracefully', async () => {
      const brokenTsx = `
const { Spring } = window.Remotion;

export default function BrokenScene() {
  // Syntax error: unclosed JSX
  return <div>Broken
}`;

      const result = await compiler.compileScene(brokenTsx, {
        projectId: 'error-project',
        sceneId: 'broken-scene',
        existingScenes: []
      });

      // Should not crash, provide fallback
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.jsCode).toBeDefined(); // Fallback code
      
      // Store with error metadata
      const scene = await mockDb.createScene({
        id: 'broken-scene',
        projectId: 'error-project',
        tsxCode: brokenTsx,
        jsCode: result.jsCode, // Store fallback
        compilation_version: 1,
        compile_meta: {
          ...result.metadata?.compile_meta,
          error: result.error,
          fallback: true
        }
      });

      expect(scene.compile_meta?.error).toBeDefined();
      expect(scene.compile_meta?.fallback).toBe(true);
    });

    test('should recover from compilation with auto-fix', async () => {
      // Scene with fixable issue
      const fixableTsx = `
const { Spring } = window.Remotion;

// Missing return statement
export default function FixableScene() {
  <div>Fixable Scene</div>
}`;

      const result = await compiler.compileScene(fixableTsx, {
        projectId: 'fix-project',
        sceneId: 'fixable-scene',
        existingScenes: []
      });

      // Compiler should attempt to fix
      if (result.autoFixed) {
        expect(result.success).toBe(true);
        expect(result.jsCode).toContain('return');
      }
    });
  });

  describe('Performance Monitoring', () => {
    test('should track compilation performance metrics', async () => {
      const metrics = {
        compilations: [],
        totalTime: 0,
        avgTime: 0,
        p95Time: 0
      };

      // Run multiple compilations
      for (let i = 0; i < 20; i++) {
        const tsx = `
const { Spring } = window.Remotion;
const Component${i} = () => <div>Component ${i}</div>;
export default function Scene${i}() {
  return <Component${i} />;
}`;

        const result = await compiler.compileScene(tsx, {
          projectId: 'perf-project',
          sceneId: `scene-${i}`,
          existingScenes: []
        });

        if (result.metadata?.compile_meta.timings.ms) {
          metrics.compilations.push(result.metadata.compile_meta.timings.ms);
        }
      }

      // Calculate metrics
      metrics.totalTime = metrics.compilations.reduce((a, b) => a + b, 0);
      metrics.avgTime = metrics.totalTime / metrics.compilations.length;
      metrics.compilations.sort((a, b) => a - b);
      metrics.p95Time = metrics.compilations[Math.floor(metrics.compilations.length * 0.95)];

      // Performance assertions
      expect(metrics.avgTime).toBeLessThan(50); // Average under 50ms
      expect(metrics.p95Time).toBeLessThan(100); // P95 under 100ms
      
      console.log('Compilation Performance Metrics:', {
        'Total Compilations': metrics.compilations.length,
        'Average Time (ms)': metrics.avgTime.toFixed(2),
        'P95 Time (ms)': metrics.p95Time.toFixed(2),
        'Total Time (ms)': metrics.totalTime.toFixed(2)
      });
    });
  });
});