//src/__tests__/config/models.config.test.ts

import {
  ModelProviderSchema,
  ModelConfigSchema,
  ModelPackSchema,
  getActiveModelPack,
  getModel,
  resolveModel,
  getClient,
  getModelManifest,
  MODEL_PACKS,
  type ModelProvider,
  type ModelConfig,
} from '../../config/models.config';

describe('Model Management System', () => {
  // Note: These tests verify the structure and behavior of the model system
  // without relying on specific environment variables

  describe('Zod Schemas', () => {
    test('ModelProviderSchema validates only allowed providers', () => {
      expect(ModelProviderSchema.parse('openai')).toBe('openai');
      expect(ModelProviderSchema.parse('anthropic')).toBe('anthropic');
      
      expect(() => ModelProviderSchema.parse('google')).toThrow();
      expect(() => ModelProviderSchema.parse('azure')).toThrow();
      expect(() => ModelProviderSchema.parse('invalid')).toThrow();
    });

    test('ModelConfigSchema validates model configuration', () => {
      const validConfig = {
        provider: 'openai' as ModelProvider,
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 2000,
      };

      expect(() => ModelConfigSchema.parse(validConfig)).not.toThrow();

      // Test invalid temperature
      expect(() => 
        ModelConfigSchema.parse({ ...validConfig, temperature: 3 })
      ).toThrow();

      // Test negative maxTokens
      expect(() => 
        ModelConfigSchema.parse({ ...validConfig, maxTokens: -100 })
      ).toThrow();

      // Test empty model name
      expect(() => 
        ModelConfigSchema.parse({ ...validConfig, model: '' })
      ).toThrow();
    });

    test('ModelPackSchema validates complete model pack structure', () => {
      const validPack = MODEL_PACKS['anthropic-pack'];
      expect(() => ModelPackSchema.parse(validPack)).not.toThrow();

      // Test missing required model
      const invalidPack = {
        ...validPack,
        models: {
          ...validPack.models,
          brain: undefined,
        },
      };
      expect(() => ModelPackSchema.parse(invalidPack)).toThrow();
    });
  });

  describe('Active Model Pack', () => {
    test('getActiveModelPack returns a valid pack', () => {
      const pack = getActiveModelPack();
      // Test structure rather than specific values
      expect(pack).toHaveProperty('name');
      expect(pack).toHaveProperty('description');
      expect(pack).toHaveProperty('models');
      expect(pack.models).toHaveProperty('brain');
      expect(pack.models).toHaveProperty('codeGenerator');
      expect(pack.models).toHaveProperty('editScene');
      expect(pack.models).toHaveProperty('titleGenerator');
    });

    test('all model packs have consistent structure', () => {
      Object.values(MODEL_PACKS).forEach(pack => {
        expect(pack.models.brain).toHaveProperty('provider');
        expect(pack.models.brain).toHaveProperty('model');
        expect(['openai', 'anthropic']).toContain(pack.models.brain.provider);
      });
    });
  });

  describe('Model Getters', () => {
    test('getModel returns valid model configuration', () => {
      const brainModel = getModel('brain');
      expect(['openai', 'anthropic']).toContain(brainModel.provider);
      expect(brainModel.model).toBeTruthy();
      expect(typeof brainModel.model).toBe('string');
    });

    test('resolveModel applies overrides correctly', () => {
      const baseModel = getModel('brain');
      const overriddenModel = resolveModel('brain', {
        temperature: 0.9,
        maxTokens: 1000,
      });

      expect(overriddenModel.provider).toBe(baseModel.provider);
      expect(overriddenModel.model).toBe(baseModel.model);
      expect(overriddenModel.temperature).toBe(0.9);
      expect(overriddenModel.maxTokens).toBe(1000);
    });
  });

  describe('Client Registry', () => {
    test('getClient throws for unsupported providers', () => {
      expect(() => getClient('google' as ModelProvider)).toThrow();
    });
  });

  describe('Model Manifest', () => {
    test('getModelManifest returns correct structure', () => {
      const manifest = getModelManifest();
      
      expect(manifest).toHaveProperty('environment');
      expect(manifest).toHaveProperty('activePack');
      expect(manifest).toHaveProperty('models');
      expect(manifest).toHaveProperty('availablePacks');
      
      expect(typeof manifest.activePack).toBe('string');
      expect(manifest.availablePacks).toEqual(expect.arrayContaining(['optimal-pack', 'anthropic-pack', 'openai-pack']));
      expect(manifest.models).toHaveProperty('brain');
      expect(manifest.models).toHaveProperty('codeGenerator');
    });
  });

  describe('Pack Validation', () => {
    test('all predefined packs are valid', () => {
      Object.entries(MODEL_PACKS).forEach(([packName, pack]) => {
        expect(() => ModelPackSchema.parse(pack)).not.toThrow();
      });
    });

    test('all predefined packs use only allowed providers', () => {
      Object.entries(MODEL_PACKS).forEach(([packName, pack]) => {
        const providers = new Set<string>();
        
        // Collect all providers used in the pack
        Object.values(pack.models).forEach(model => {
          if (typeof model === 'object' && 'provider' in model) {
            providers.add(model.provider);
          } else {
            // Handle nested models like directCodeEditor
            Object.values(model).forEach(nestedModel => {
              if ('provider' in nestedModel) {
                providers.add(nestedModel.provider);
              }
            });
          }
        });

        providers.forEach(provider => {
          expect(['openai', 'anthropic']).toContain(provider);
        });
      });
    });
  });
});
