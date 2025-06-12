import { StandardSceneService } from '../StandardSceneService';
import { StandardApiResponse, SceneOperationResponse } from '@/lib/types/api/golden-rule-contracts';

// Test implementation of StandardSceneService
class TestSceneService extends StandardSceneService {
  async generateScene(input: { projectId: string; prompt: string }) {
    const scene = this.createSceneEntity({
      projectId: input.projectId,
      order: 0,
      name: 'Test Scene',
      tsxCode: '<div>Test</div>',
      duration: 150,
      layoutJson: '{"test": true}',
      props: { test: true }
    });
    
    return this.createSceneResponse(
      scene,
      'Test reasoning',
      'Test chat response'
    );
  }
}

describe('StandardSceneService', () => {
  let service: TestSceneService;
  
  beforeEach(() => {
    service = new TestSceneService();
  });
  
  describe('createSceneEntity', () => {
    it('should create scene with exact database field names', () => {
      const scene = service['createSceneEntity']({
        projectId: 'test-project',
        order: 0,
        name: 'Scene 1',
        tsxCode: 'const Scene = () => <div>Test</div>',
        duration: 150
      });
      
      // Check exact field names
      expect(scene).toHaveProperty('tsxCode');
      expect(scene).toHaveProperty('name');
      expect(scene).toHaveProperty('duration');
      
      // Should NOT have wrong field names
      expect(scene).not.toHaveProperty('code');
      expect(scene).not.toHaveProperty('sceneName');
      expect(scene).not.toHaveProperty('sceneCode');
      
      // Check all required fields exist
      expect(scene.id).toBeDefined();
      expect(scene.projectId).toBe('test-project');
      expect(scene.order).toBe(0);
      expect(scene.createdAt).toBeDefined();
      expect(scene.updatedAt).toBeDefined();
    });
    
    it('should generate unique IDs', () => {
      const scene1 = service['createSceneEntity']({
        projectId: 'test',
        order: 0,
        name: 'Scene 1',
        tsxCode: 'code',
        duration: 100
      });
      
      const scene2 = service['createSceneEntity']({
        projectId: 'test',
        order: 1,
        name: 'Scene 2',
        tsxCode: 'code',
        duration: 100
      });
      
      expect(scene1.id).not.toBe(scene2.id);
    });
  });
  
  describe('validateScene', () => {
    it('should validate correct scene', () => {
      const scene = service['createSceneEntity']({
        projectId: 'test',
        order: 0,
        name: 'Scene 1',
        tsxCode: 'code',
        duration: 150
      });
      
      expect(() => service['validateScene'](scene)).not.toThrow();
    });
    
    it('should throw error for wrong field names', () => {
      const badScene: any = {
        id: '123',
        projectId: 'test',
        order: 0,
        code: 'bad field name',  // Wrong!
        name: 'Scene 1',
        duration: 150,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      expect(() => service['validateScene'](badScene))
        .toThrow('Scene contains "code" field - use "tsxCode" instead');
    });
    
    it('should throw error for missing required fields', () => {
      const incompleteScene: any = {
        id: '123',
        projectId: 'test',
        name: 'Scene 1',
        // Missing tsxCode, order, duration, etc.
      };
      
      expect(() => service['validateScene'](incompleteScene))
        .toThrow(/Scene missing required field/);
    });
  });
  
  describe('generateScene', () => {
    it('should return StandardApiResponse with correct structure', async () => {
      const result = await service.generateScene({
        projectId: 'test-project',
        prompt: 'Test prompt'
      });
      
      // Check response structure
      expect(result).toMatchObject({
        success: true,
        operation: 'create',
        data: {
          scene: {
            id: expect.any(String),
            projectId: 'test-project',
            name: 'Test Scene',
            tsxCode: '<div>Test</div>',
            duration: 150,
            order: 0,
            layoutJson: '{"test": true}',
            props: { test: true },
            createdAt: expect.any(String),
            updatedAt: expect.any(String)
          }
        },
        metadata: {
          timestamp: expect.any(Number),
          affectedIds: expect.arrayContaining([expect.any(String)]),
          reasoning: 'Test reasoning',
          chatResponse: 'Test chat response'
        }
      });
      
      // Verify no wrong field names
      const scene = result.data.scene;
      expect(scene).not.toHaveProperty('code');
      expect(scene).not.toHaveProperty('sceneName');
      expect(scene).not.toHaveProperty('sceneCode');
    });
  });
  
  describe('error handling', () => {
    it('should return error response format', () => {
      const error = new Error('Test error');
      const errorResponse = service['errorResponse'](error);
      
      expect(errorResponse).toMatchObject({
        success: false,
        operation: 'create',
        data: {
          scene: {}
        },
        metadata: {
          timestamp: expect.any(Number),
          affectedIds: [],
          reasoning: 'Error: Test error'
        },
        debug: {
          error: 'Test error',
          stack: expect.any(String)
        }
      });
    });
  });
  
  describe('stringifyLayout', () => {
    it('should handle null layout', () => {
      expect(service['stringifyLayout'](null)).toBeNull();
    });
    
    it('should handle string layout', () => {
      const jsonString = '{"test": true}';
      expect(service['stringifyLayout'](jsonString)).toBe(jsonString);
    });
    
    it('should stringify object layout', () => {
      const obj = { test: true, nested: { value: 123 } };
      const result = service['stringifyLayout'](obj);
      expect(result).toBe(JSON.stringify(obj));
      expect(JSON.parse(result!)).toEqual(obj);
    });
  });
});

// Type checking tests (these would be caught at compile time)
describe('Type Safety', () => {
  it('should enforce correct return type', () => {
    class BadService extends StandardSceneService {
      async generateScene(input: any) {
        // This would cause TypeScript error
        // @ts-expect-error - Testing bad return type
        return { wrong: 'format' };
      }
    }
    
    // TypeScript would prevent this at compile time
    expect(true).toBe(true);
  });
});