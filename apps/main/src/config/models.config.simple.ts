// Simplified Model Configuration for 3-Tool Architecture
// Only what we actually use: Brain, Add, Edit, Delete, Trim

import { z } from 'zod';

// =============================================================================
// SCHEMAS
// =============================================================================

export const ModelProviderSchema = z.enum(['openai', 'anthropic']);

export const ModelConfigSchema = z.object({
  provider: ModelProviderSchema,
  model: z.string().min(1),
  temperature: z.number().gte(0).lte(2).optional(),
  maxTokens: z.number().int().positive().optional(),
});

export const SimpleModelPackSchema = z.object({
  name: z.string(),
  description: z.string(),
  models: z.object({
    // Core Tools
    brain: ModelConfigSchema,           // Orchestrator decision making
    addScene: ModelConfigSchema,        // Code generation for new scenes
    editScene: ModelConfigSchema,       // Code editing existing scenes
    deleteScene: ModelConfigSchema,     // Simple deletion
    trimScene: ModelConfigSchema,       // Duration adjustment
    
    // Supporting Services
    codeGenerator: ModelConfigSchema,   // Used by add tool
    titleGenerator: ModelConfigSchema,  // Generate project titles
  }),
});

// =============================================================================
// TYPES
// =============================================================================

export type ModelProvider = z.infer<typeof ModelProviderSchema>;
export type ModelConfig = z.infer<typeof ModelConfigSchema>;
export type SimpleModelPack = z.infer<typeof SimpleModelPackSchema>;

// =============================================================================
// MODEL PACKS
// =============================================================================

// Production Pack - What we actually use
const productionPack: SimpleModelPack = {
  name: 'Optimal Pack',
  description: 'Claude Sonnet 4 for code, GPT-4 for reasoning',
  models: {
    // Brain uses GPT-4 for reasoning
    brain: { 
      provider: 'openai', 
      model: 'gpt-4.1-mini', 
      temperature: 0.7 
    },
    
    // All code generation uses Claude Sonnet 4
    addScene: { 
      provider: 'anthropic', 
      model: 'claude-sonnet-4-20250514', 
      temperature: 0.5,
      maxTokens: 16000  // Important for complex scenes
    },
    editScene: { 
      provider: 'anthropic', 
      model: 'claude-sonnet-4-20250514', 
      temperature: 0.3,
      maxTokens: 16000  // Important for edits
    },
    
    // Simple operations can use cheaper models
    deleteScene: { 
      provider: 'openai', 
      model: 'gpt-4.1-nano', 
      temperature: 0.5 
    },
    trimScene: { 
      provider: 'openai', 
      model: 'gpt-4.1-nano', 
      temperature: 0.3 
    },
    
    // Supporting services
    codeGenerator: { 
      provider: 'anthropic', 
      model: 'claude-sonnet-4-20250514', 
      temperature: 0.3,
      maxTokens: 16000
    },
    titleGenerator: { 
      provider: 'openai', 
      model: 'gpt-4o-mini', 
      temperature: 0.5, 
      maxTokens: 100 
    },
  }
};

// Development Pack - Cheaper for testing
const developmentPack: SimpleModelPack = {
  name: 'Development Pack',
  description: 'Cheaper models for development',
  models: {
    brain: { 
      provider: 'openai', 
      model: 'gpt-4o-mini', 
      temperature: 0.7 
    },
    addScene: { 
      provider: 'anthropic', 
      model: 'claude-3-5-haiku-20241022', 
      temperature: 0.5,
      maxTokens: 16000
    },
    editScene: { 
      provider: 'anthropic', 
      model: 'claude-3-5-haiku-20241022', 
      temperature: 0.3,
      maxTokens: 16000
    },
    deleteScene: { 
      provider: 'openai', 
      model: 'gpt-4o-mini', 
      temperature: 0.5 
    },
    trimScene: { 
      provider: 'openai', 
      model: 'gpt-4o-mini', 
      temperature: 0.3 
    },
    codeGenerator: { 
      provider: 'anthropic', 
      model: 'claude-3-5-haiku-20241022', 
      temperature: 0.3,
      maxTokens: 16000
    },
    titleGenerator: { 
      provider: 'openai', 
      model: 'gpt-4o-mini', 
      temperature: 0.5, 
      maxTokens: 100 
    },
  }
};

// All Claude Pack - When you want consistency
const claudePack: SimpleModelPack = {
  name: 'Claude Pack',
  description: 'All Claude Sonnet 4 for consistency',
  models: {
    brain: { 
      provider: 'anthropic', 
      model: 'claude-sonnet-4-20250514', 
      temperature: 0.7 
    },
    addScene: { 
      provider: 'anthropic', 
      model: 'claude-sonnet-4-20250514', 
      temperature: 0.5,
      maxTokens: 16000
    },
    editScene: { 
      provider: 'anthropic', 
      model: 'claude-sonnet-4-20250514', 
      temperature: 0.3,
      maxTokens: 16000
    },
    deleteScene: { 
      provider: 'anthropic', 
      model: 'claude-sonnet-4-20250514', 
      temperature: 0.5 
    },
    trimScene: { 
      provider: 'anthropic', 
      model: 'claude-sonnet-4-20250514', 
      temperature: 0.3 
    },
    codeGenerator: { 
      provider: 'anthropic', 
      model: 'claude-sonnet-4-20250514', 
      temperature: 0.3,
      maxTokens: 16000
    },
    titleGenerator: { 
      provider: 'anthropic', 
      model: 'claude-sonnet-4-20250514', 
      temperature: 0.5, 
      maxTokens: 100 
    },
  }
};

// =============================================================================
// REGISTRY
// =============================================================================

export const SIMPLE_MODEL_PACKS: Record<string, SimpleModelPack> = {
  'production': SimpleModelPackSchema.parse(productionPack),
  'development': SimpleModelPackSchema.parse(developmentPack),
  'claude': SimpleModelPackSchema.parse(claudePack),
};

// =============================================================================
// ACTIVE PACK
// =============================================================================

export const ACTIVE_PACK = process.env.MODEL_PACK || 'production';

export function getActiveModelPack(): SimpleModelPack {
  const pack = SIMPLE_MODEL_PACKS[ACTIVE_PACK];
  if (!pack) {
    console.warn(`Model pack "${ACTIVE_PACK}" not found, falling back to production`);
    return SIMPLE_MODEL_PACKS.production!;
  }
  return pack;
}

// =============================================================================
// MODEL GETTERS
// =============================================================================

export type ModelKey = keyof SimpleModelPack['models'];

export function getModel<K extends ModelKey>(key: K): SimpleModelPack['models'][K] {
  const pack = getActiveModelPack();
  const model = pack.models[key];
  if (!model) {
    throw new Error(`Model "${String(key)}" not found in pack "${ACTIVE_PACK}"`);
  }
  return model;
}

// =============================================================================
// CLIENT MANAGEMENT
// =============================================================================

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
// LOGGING
// =============================================================================

export function logModelConfiguration() {
  const pack = getActiveModelPack();
  console.log('🤖 Simplified Model Configuration');
  console.log('📦 Active Pack:', ACTIVE_PACK);
  console.log('📝 Description:', pack.description);
  console.log('🧠 Brain:', `${pack.models.brain.provider}/${pack.models.brain.model}`);
  console.log('➕ Add/Edit:', `${pack.models.addScene.provider}/${pack.models.addScene.model}`);
  console.log('🗑️ Delete/Trim:', `${pack.models.deleteScene.provider}/${pack.models.deleteScene.model}`);
}