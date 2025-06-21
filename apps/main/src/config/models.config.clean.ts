// Clean Model Configuration - Only What We Actually Need
// 3 Models: Brain (reasoning), Code Generation, Simple Tasks

import { z } from 'zod';

// =============================================================================
// SCHEMAS
// =============================================================================

export const ModelProviderSchema = z.enum(['openai', 'anthropic']);

export const ModelConfigSchema = z.object({
  provider: ModelProviderSchema,
  model: z.string(),
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
});

export const ModelPackSchema = z.object({
  name: z.string(),
  description: z.string(),
  models: z.object({
    // Essential AI Models (only 3!)
    brain: ModelConfigSchema,           // Orchestrator reasoning
    codeGenerator: ModelConfigSchema,   // All code generation (add/edit)
    simple: ModelConfigSchema,          // Simple tasks like title generation
  }),
});

// =============================================================================
// TYPES
// =============================================================================

export type ModelProvider = z.infer<typeof ModelProviderSchema>;
export type ModelConfig = z.infer<typeof ModelConfigSchema>;
export type ModelPack = z.infer<typeof ModelPackSchema>;

// =============================================================================
// MODEL PACKS (Only 3!)
// =============================================================================

// Pack 1: Optimal (Mixed)
const optimalPack: ModelPack = {
  name: 'Optimal Pack',
  description: 'Best models for each task',
  models: {
    brain: { 
      provider: 'openai', 
      model: 'gpt-4.1-mini',  // Good reasoning, fast
      temperature: 0.7 
    },
    codeGenerator: { 
      provider: 'anthropic', 
      model: 'claude-sonnet-4-20250514',  // Best for code
      temperature: 0.3,
      maxTokens: 16000 
    },
    simple: { 
      provider: 'openai', 
      model: 'gpt-4.1-nano',  // Cheapest for simple tasks
      temperature: 0.5,
      maxTokens: 200 
    },
  }
};

// Pack 2: Anthropic Only
const anthropicPack: ModelPack = {
  name: 'Anthropic Pack',
  description: 'All Claude all the time',
  models: {
    brain: { 
      provider: 'anthropic', 
      model: 'claude-sonnet-4-20250514',
      temperature: 0.7 
    },
    codeGenerator: { 
      provider: 'anthropic', 
      model: 'claude-sonnet-4-20250514',
      temperature: 0.3,
      maxTokens: 16000 
    },
    simple: { 
      provider: 'anthropic', 
      model: 'claude-3-5-haiku-20241022',  // Cheaper Claude for simple
      temperature: 0.5,
      maxTokens: 200 
    },
  }
};

// Pack 3: OpenAI Only
const openaiPack: ModelPack = {
  name: 'OpenAI Pack',
  description: 'All OpenAI models',
  models: {
    brain: { 
      provider: 'openai', 
      model: 'gpt-4.1',  // Best reasoning
      temperature: 0.7 
    },
    codeGenerator: { 
      provider: 'openai', 
      model: 'gpt-4.1',  // GPT-4 for code (not as good as Claude)
      temperature: 0.3,
      maxTokens: 16000 
    },
    simple: { 
      provider: 'openai', 
      model: 'gpt-4o-mini',  // Fast and cheap
      temperature: 0.5,
      maxTokens: 200 
    },
  }
};

// =============================================================================
// REGISTRY
// =============================================================================

export const MODEL_PACKS: Record<string, ModelPack> = {
  'optimal': ModelPackSchema.parse(optimalPack),
  'anthropic': ModelPackSchema.parse(anthropicPack),
  'openai': ModelPackSchema.parse(openaiPack),
};

// =============================================================================
// ACTIVE PACK
// =============================================================================

export const ACTIVE_MODEL_PACK = process.env.MODEL_PACK || 'optimal';

export function getActiveModelPack(): ModelPack {
  const pack = MODEL_PACKS[ACTIVE_MODEL_PACK];
  if (!pack) {
    console.warn(`Pack "${ACTIVE_MODEL_PACK}" not found, using optimal`);
    return MODEL_PACKS.optimal!;
  }
  return pack;
}

// =============================================================================
// MODEL GETTERS
// =============================================================================

export type ModelKey = keyof ModelPack['models'];

export function getModel(key: ModelKey): ModelConfig {
  return getActiveModelPack().models[key];
}

// =============================================================================
// LEGACY MAPPING (for backward compatibility)
// =============================================================================

export function getModelForTool(tool: string): ModelConfig | null {
  switch (tool) {
    // Brain operations
    case 'brain':
    case 'orchestrator':
      return getModel('brain');
    
    // Code generation operations
    case 'addScene':
    case 'editScene':
    case 'codeGenerator':
    case 'createSceneFromImage':
    case 'editSceneWithImage':
    case 'fixBrokenScene':
    case 'sceneBuilder':
    case 'layoutGenerator':
      return getModel('codeGenerator');
    
    // Simple operations
    case 'titleGenerator':
    case 'analyzeImage':
    case 'imageDescription':
      return getModel('simple');
    
    // No AI needed
    case 'deleteScene':
    case 'trimScene':
      return null;  // These are pure functions!
    
    default:
      console.warn(`Unknown tool: ${tool}`);
      return getModel('simple');  // Fallback to simple
  }
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
  console.log('🎯 Clean Model Configuration');
  console.log('📦 Active Pack:', ACTIVE_MODEL_PACK);
  console.log('🧠 Brain:', `${pack.models.brain.provider}/${pack.models.brain.model}`);
  console.log('💻 Code:', `${pack.models.codeGenerator.provider}/${pack.models.codeGenerator.model}`);
  console.log('✨ Simple:', `${pack.models.simple.provider}/${pack.models.simple.model}`);
  console.log('🚫 Delete/Trim: No AI needed (pure functions)');
}