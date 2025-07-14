//src/config/models.config.ts

import { z } from 'zod';

// =============================================================================
// RUNTIME VALIDATION SCHEMAS
// =============================================================================

export const ModelProviderSchema = z.enum(['openai', 'anthropic']);

export const ModelConfigSchema = z.object({
  provider: ModelProviderSchema,
  model: z.string().min(1),
  temperature: z.number().gte(0).lte(2).optional(),
  maxTokens: z.number().int().positive().optional(),
  apiKey: z.string().optional(),
});

// Simplified schema for only the models we actually use
export const ModelPackSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  models: z.object({
    // Core orchestration
    brain: ModelConfigSchema,
    
    // Code generation
    codeGenerator: ModelConfigSchema,
    editScene: ModelConfigSchema,
    
    // Simple utilities
    titleGenerator: ModelConfigSchema,
  }),
});

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type ModelProvider = z.infer<typeof ModelProviderSchema>;
export type ModelConfig = z.infer<typeof ModelConfigSchema>;
export type ModelPack = z.infer<typeof ModelPackSchema>;

// =============================================================================
// MODEL PACKS (Only what we actually use)
// =============================================================================

// 🎯 OPTIMAL PACK: Best balance of speed, cost, and quality
const optimalPack: ModelPack = {
  name: 'Optimal Pack',
  description: 'Best balance of speed, cost, and quality',
  models: {
    brain: { provider: 'openai', model: 'gpt-4.1-mini', temperature: 0.4 },
    codeGenerator: { provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.3, maxTokens: 16000 },
    editScene: { provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.3, maxTokens: 16000 },
    titleGenerator: { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.5, maxTokens: 400 }
  }
};

// 🤖 ANTHROPIC PACK: All Claude models
const anthropicPack: ModelPack = {
  name: 'Anthropic Pack',
  description: 'Claude models only - excellent for code generation',
  models: {
    brain: { provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.6 },
    codeGenerator: { provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.3, maxTokens: 16000 },
    editScene: { provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.3, maxTokens: 16000 },
    titleGenerator: { provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.5, maxTokens: 100 }
  }
};

// 🚀 OPENAI PACK: All OpenAI models
const openaiPack: ModelPack = {
  name: 'OpenAI Pack',
  description: 'OpenAI models only - GPT-4.1 for intelligence, GPT-4o-mini for speed',
  models: {
    brain: { provider: 'openai', model: 'gpt-4.1', temperature: 0.6 },
    codeGenerator: { provider: 'openai', model: 'gpt-4.1', temperature: 0.3, maxTokens: 16000 },
    editScene: { provider: 'openai', model: 'gpt-4.1', temperature: 0.3, maxTokens: 16000 },
    titleGenerator: { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.5, maxTokens: 100 }
  }
};

// Validate all packs at runtime
export const MODEL_PACKS: Record<string, ModelPack> = {
  'optimal-pack': ModelPackSchema.parse(optimalPack),
  'anthropic-pack': ModelPackSchema.parse(anthropicPack),
  'openai-pack': ModelPackSchema.parse(openaiPack),
};

// =============================================================================
// ENVIRONMENT-DRIVEN ACTIVE PACK
// =============================================================================

export const ACTIVE_MODEL_PACK = process.env.MODEL_PACK ?? 'optimal-pack';

// Get the currently active model configuration
export function getActiveModelPack(): ModelPack {
  const pack = MODEL_PACKS[ACTIVE_MODEL_PACK];
  if (!pack) {
    throw new Error(`Model pack "${ACTIVE_MODEL_PACK}" not found. Available packs: ${Object.keys(MODEL_PACKS).join(', ')}`);
  }
  return pack;
}

// =============================================================================
// GENERIC MODEL GETTER WITH TYPE SAFETY
// =============================================================================

export type ModelKey = keyof ModelPack['models'];

export function getModel<K extends ModelKey>(key: K): ModelPack['models'][K] {
  const model = getActiveModelPack().models[key];
  if (!model) {
    throw new Error(`Model "${String(key)}" missing in active pack "${ACTIVE_MODEL_PACK}"`);
  }
  return model;
}

// =============================================================================
// PER-REQUEST OVERRIDE HOOK
// =============================================================================

export function resolveModel(
  key: ModelKey,
  overrides?: Partial<ModelConfig>,
): ModelConfig {
  const base = getModel(key) as ModelConfig;
  return { ...base, ...overrides };
}

// =============================================================================
// INDIVIDUAL MODEL CONFIGURATIONS
// =============================================================================

// Map of available models that can be selected for overrides
export const INDIVIDUAL_MODELS: Record<string, ModelConfig> = {
  // Anthropic models
  'claude-3-5-haiku-20241022': {
    provider: 'anthropic',
    model: 'claude-3-5-haiku-20241022',
    temperature: 0.3,
    maxTokens: 8000
  },
  'claude-sonnet-4-20250514': {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    temperature: 0.3,
    maxTokens: 16000
  },
  
  // OpenAI models
  'gpt-4o-mini': {
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.3,
    maxTokens: 4000
  },
  'gpt-4.1': {
    provider: 'openai',
    model: 'gpt-4.1',
    temperature: 0.3,
    maxTokens: 16000
  }
};

// Helper to get a specific model configuration by ID
export function getIndividualModel(modelId: string): ModelConfig | null {
  return INDIVIDUAL_MODELS[modelId] || null;
}

// =============================================================================
// PROVIDER CLIENT REGISTRY
// =============================================================================

import "openai/shims/node";
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

type LLMClient = OpenAI | Anthropic;

const clientCache = new Map<ModelProvider, LLMClient>();

function createClient(provider: ModelProvider): LLMClient {
  switch (provider) {
    case 'openai':
      return new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    case 'anthropic':
      return new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

export function getClient(provider: ModelProvider): LLMClient {
  if (!clientCache.has(provider)) {
    clientCache.set(provider, createClient(provider));
  }
  return clientCache.get(provider)!;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function listAvailablePacks(): string[] {
  return Object.keys(MODEL_PACKS);
}

export function getPackDescription(packName: string): string {
  const pack = MODEL_PACKS[packName];
  return pack ? pack.description : 'Pack not found';
}

// =============================================================================
// OBSERVABILITY & HEALTH CHECK
// =============================================================================

export function getModelManifest() {
  const pack = getActiveModelPack();
  return {
    environment: process.env.NODE_ENV || 'development',
    activePack: ACTIVE_MODEL_PACK,
    packName: pack.name,
    packDescription: pack.description,
    models: {
      brain: `${pack.models.brain.provider}/${pack.models.brain.model}`,
      codeGenerator: `${pack.models.codeGenerator.provider}/${pack.models.codeGenerator.model}`,
      editScene: `${pack.models.editScene.provider}/${pack.models.editScene.model}`,
      titleGenerator: `${pack.models.titleGenerator.provider}/${pack.models.titleGenerator.model}`,
    },
    availablePacks: listAvailablePacks(),
  };
}

// Development helper to log current configuration
export function logCurrentModelConfiguration() {
  if (process.env.NODE_ENV === 'development') {
    const manifest = getModelManifest();
    console.log('🤖 Model Management System');
    console.log('📦 Active Pack:', manifest.activePack);
    console.log('📝 Description:', manifest.packDescription);
    console.log('🔧 Models:', manifest.models);
    console.log('🌍 Environment:', manifest.environment);
  }
}