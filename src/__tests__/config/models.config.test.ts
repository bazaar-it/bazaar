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

// Mock environment variables
const originalEnv = process.env;

describe('Model Management System', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      OPENAI_API_KEY: 'test-openai-key',
      ANTHROPIC_API_KEY: 'test-anthropic-key',
      MODEL_PACK: 'claude-pack',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

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
      const validPack = MODEL_PACKS['claude-pack'];
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
    test('getActiveModelPack returns correct pack from environment', () => {
      const pack = getActiveModelPack();
      expect(pack.name).toBe('Claude Pack');
      expect(pack.models.brain.provider).toBe('anthropic');
    });

    test('getActiveModelPack falls back to claude-pack when MODEL_PACK is invalid', () => {
      process.env.MODEL_PACK = 'non-existent-pack';
      
      // Need to reload the module to pick up new env var
      jest.resetModules();
      const { getActiveModelPack: newGetActiveModelPack } = require('../../config/models.config');
      
      const pack = newGetActiveModelPack();
      expect(pack.name).toBe('Claude Pack');
    });
  });

  describe('Model Getters', () => {
    test('getModel returns correct model configuration', () => {
      const brainModel = getModel('brain');
      expect(brainModel.provider).toBe('anthropic');
      expect(brainModel.model).toBe('claude-3-5-sonnet-20241022');
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
      expect(manifest).toHaveProperty('keyModels');
      expect(manifest).toHaveProperty('availablePacks');
      
      expect(manifest.activePack).toBe('claude-pack');
      expect(manifest.availablePacks).toEqual(Object.keys(MODEL_PACKS));
      expect(manifest.keyModels).toHaveProperty('brain');
      expect(manifest.keyModels).toHaveProperty('codeGenerator');
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
