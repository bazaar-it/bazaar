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

export const ModelPackSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  models: z.object({
    // Brain Orchestrator
    brain: ModelConfigSchema,
    
    // MCP Tools
    addScene: ModelConfigSchema,
    editScene: ModelConfigSchema,
    deleteScene: ModelConfigSchema,
    analyzeImage: ModelConfigSchema,
    createSceneFromImage: ModelConfigSchema,
    editSceneWithImage: ModelConfigSchema,
    fixBrokenScene: ModelConfigSchema,
    
    // Core Services
    codeGenerator: ModelConfigSchema,
    directCodeEditor: z.object({
      surgical: ModelConfigSchema,
      creative: ModelConfigSchema,
      structural: ModelConfigSchema,
    }),
    sceneBuilder: ModelConfigSchema,
    layoutGenerator: ModelConfigSchema,
    
    // Vision/Image Analysis
    visionAnalysis: ModelConfigSchema,
    imageDescription: ModelConfigSchema,
  }),
});

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type ModelProvider = z.infer<typeof ModelProviderSchema>;
export type ModelConfig = z.infer<typeof ModelConfigSchema>;
export type ModelPack = z.infer<typeof ModelPackSchema>;

// =============================================================================
// PREDEFINED MODEL PACKS (Runtime Validated)
// =============================================================================

const starterPack: ModelPack = {
  name: 'Starter Pack 1',
  description: 'GPT-4o-mini for everything - fast and cost-effective',
  models: {
    brain: { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.7 },
    addScene: { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.5 },
    editScene: { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.3 },
    deleteScene: { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.5 },
    analyzeImage: { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.3 },
    createSceneFromImage: { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.5 },
    editSceneWithImage: { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.3 },
    fixBrokenScene: { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.2 },
    codeGenerator: { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.3 },
    directCodeEditor: {
      surgical: { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.25, maxTokens: 16000 },
      creative: { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.4, maxTokens: 16000 },
      structural: { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.3, maxTokens: 16000 }
    },
    sceneBuilder: { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.5 },
    layoutGenerator: { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.3 },
    visionAnalysis: { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.3 },
    imageDescription: { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.3 }
  }
};

const performancePack: ModelPack = {
  name: 'Performance Pack',
  description: 'GPT-4o for core functions, optimized for quality',
  models: {
    brain: { provider: 'openai', model: 'gpt-4o', temperature: 0.7 },
    addScene: { provider: 'openai', model: 'gpt-4o', temperature: 0.5 },
    editScene: { provider: 'openai', model: 'gpt-4o', temperature: 0.3 },
    deleteScene: { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.5 },
    analyzeImage: { provider: 'openai', model: 'gpt-4o', temperature: 0.3 },
    createSceneFromImage: { provider: 'openai', model: 'gpt-4o', temperature: 0.5 },
    editSceneWithImage: { provider: 'openai', model: 'gpt-4o', temperature: 0.3 },
    fixBrokenScene: { provider: 'openai', model: 'gpt-4o', temperature: 0.2 },
    codeGenerator: { provider: 'openai', model: 'gpt-4o', temperature: 0.3 },
    directCodeEditor: {
      surgical: { provider: 'openai', model: 'gpt-4o', temperature: 0.25, maxTokens: 16000 },
      creative: { provider: 'openai', model: 'gpt-4o', temperature: 0.4, maxTokens: 16000 },
      structural: { provider: 'openai', model: 'gpt-4o', temperature: 0.3, maxTokens: 16000 }
    },
    sceneBuilder: { provider: 'openai', model: 'gpt-4o', temperature: 0.5 },
    layoutGenerator: { provider: 'openai', model: 'gpt-4o', temperature: 0.3 },
    visionAnalysis: { provider: 'openai', model: 'gpt-4o', temperature: 0.3 },
    imageDescription: { provider: 'openai', model: 'gpt-4o', temperature: 0.3 }
  }
};

const mixedPack: ModelPack = {
  name: 'Mixed Pack',
  description: 'O1-mini for brain, GPT-4o for vision, Claude for code',
  models: {
    brain: { provider: 'openai', model: 'o1-mini', temperature: 1 }, // O1 doesn't use temperature
    addScene: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', temperature: 0.5 },
    editScene: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', temperature: 0.3 },
    deleteScene: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', temperature: 0.5 },
    analyzeImage: { provider: 'openai', model: 'gpt-4o', temperature: 0.3 },
    createSceneFromImage: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', temperature: 0.5 },
    editSceneWithImage: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', temperature: 0.3 },
    fixBrokenScene: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', temperature: 0.2 },
    codeGenerator: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', temperature: 0.3 },
    directCodeEditor: {
      surgical: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', temperature: 0.25, maxTokens: 16000 },
      creative: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', temperature: 0.4, maxTokens: 16000 },
      structural: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', temperature: 0.3, maxTokens: 16000 }
    },
    sceneBuilder: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', temperature: 0.5 },
    layoutGenerator: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', temperature: 0.3 },
    visionAnalysis: { provider: 'openai', model: 'gpt-4o', temperature: 0.3 },
    imageDescription: { provider: 'openai', model: 'gpt-4o', temperature: 0.3 }
  }
};

const claudePack: ModelPack = {
  name: 'Claude Pack',
  description: 'Claude 3.5 Sonnet for everything - excellent for code',
  models: {
    brain: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', temperature: 0.7 },
    addScene: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', temperature: 0.5 },
    editScene: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', temperature: 0.3 },
    deleteScene: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', temperature: 0.5 },
    analyzeImage: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', temperature: 0.3 },
    createSceneFromImage: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', temperature: 0.5 },
    editSceneWithImage: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', temperature: 0.3 },
    fixBrokenScene: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', temperature: 0.2 },
    codeGenerator: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', temperature: 0.3 },
    directCodeEditor: {
      surgical: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', temperature: 0.25, maxTokens: 16000 },
      creative: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', temperature: 0.4, maxTokens: 16000 },
      structural: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', temperature: 0.3, maxTokens: 16000 }
    },
    sceneBuilder: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', temperature: 0.5 },
    layoutGenerator: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', temperature: 0.3 },
    visionAnalysis: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', temperature: 0.3 },
    imageDescription: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', temperature: 0.3 }
  }
};

const haikuPack: ModelPack = {
  name: 'Haiku Pack',
  description: 'Claude 3.5 Haiku for speed and cost efficiency',
  models: {
    brain: { provider: 'anthropic', model: 'claude-3-5-haiku-20241022', temperature: 0.7 },
    addScene: { provider: 'anthropic', model: 'claude-3-5-haiku-20241022', temperature: 0.5 },
    editScene: { provider: 'anthropic', model: 'claude-3-5-haiku-20241022', temperature: 0.3 },
    deleteScene: { provider: 'anthropic', model: 'claude-3-5-haiku-20241022', temperature: 0.5 },
    analyzeImage: { provider: 'anthropic', model: 'claude-3-5-haiku-20241022', temperature: 0.3 },
    createSceneFromImage: { provider: 'anthropic', model: 'claude-3-5-haiku-20241022', temperature: 0.5 },
    editSceneWithImage: { provider: 'anthropic', model: 'claude-3-5-haiku-20241022', temperature: 0.3 },
    fixBrokenScene: { provider: 'anthropic', model: 'claude-3-5-haiku-20241022', temperature: 0.2 },
    codeGenerator: { provider: 'anthropic', model: 'claude-3-5-haiku-20241022', temperature: 0.3 },
    directCodeEditor: {
      surgical: { provider: 'anthropic', model: 'claude-3-5-haiku-20241022', temperature: 0.25, maxTokens: 16000 },
      creative: { provider: 'anthropic', model: 'claude-3-5-haiku-20241022', temperature: 0.4, maxTokens: 16000 },
      structural: { provider: 'anthropic', model: 'claude-3-5-haiku-20241022', temperature: 0.3, maxTokens: 16000 }
    },
    sceneBuilder: { provider: 'anthropic', model: 'claude-3-5-haiku-20241022', temperature: 0.5 },
    layoutGenerator: { provider: 'anthropic', model: 'claude-3-5-haiku-20241022', temperature: 0.3 },
    visionAnalysis: { provider: 'anthropic', model: 'claude-3-5-haiku-20241022', temperature: 0.3 },
    imageDescription: { provider: 'anthropic', model: 'claude-3-5-haiku-20241022', temperature: 0.3 }
  }
};

// Validate all packs at runtime
export const MODEL_PACKS: Record<string, ModelPack> = {
  'starter-pack-1': ModelPackSchema.parse(starterPack),
  'performance-pack': ModelPackSchema.parse(performancePack),
  'mixed-pack': ModelPackSchema.parse(mixedPack),
  'claude-pack': ModelPackSchema.parse(claudePack),
  'haiku-pack': ModelPackSchema.parse(haikuPack),
};

// =============================================================================
// ENVIRONMENT-DRIVEN ACTIVE PACK
// =============================================================================

export const ACTIVE_MODEL_PACK = process.env.MODEL_PACK ?? 'claude-pack';

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

// Specific resolver for directCodeEditor nested structure
export function resolveDirectCodeEditorModel(
  editType: 'surgical' | 'creative' | 'structural',
  overrides?: Partial<ModelConfig>,
): ModelConfig {
  const base = getModel('directCodeEditor')[editType];
  return { ...base, ...overrides };
}

// =============================================================================
// PROVIDER CLIENT REGISTRY
// =============================================================================

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

type LLMClient = OpenAI | Anthropic;

const clientCache = new Map<ModelProvider, LLMClient>();

function createClient(provider: ModelProvider): LLMClient {
  switch (provider) {
    case 'openai':
      return new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY,
      });
    case 'anthropic':
      return new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY,
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

export function createCustomPack(name: string, description: string, models: ModelPack['models']): ModelPack {
  const pack = { name, description, models };
  return ModelPackSchema.parse(pack); // Validate custom packs too
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
    keyModels: {
      brain: `${pack.models.brain.provider}/${pack.models.brain.model}`,
      codeGenerator: `${pack.models.codeGenerator.provider}/${pack.models.codeGenerator.model}`,
      vision: `${pack.models.visionAnalysis.provider}/${pack.models.visionAnalysis.model}`,
      editingSurgical: `${pack.models.directCodeEditor.surgical.provider}/${pack.models.directCodeEditor.surgical.model}`,
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
    console.log('🔧 Key Models:', manifest.keyModels);
    console.log('🌍 Environment:', manifest.environment);
  }
}

// =============================================================================
// BACKWARD COMPATIBILITY HELPERS (DEPRECATED)
// =============================================================================

/** @deprecated Use getModel('brain') instead */
export function getBrainModel(): ModelConfig {
  return getModel('brain') as ModelConfig;
}

/** @deprecated Use getModel('addScene') instead */
export function getAddSceneModel(): ModelConfig {
  return getModel('addScene') as ModelConfig;
}

/** @deprecated Use getModel('editScene') instead */
export function getEditSceneModel(): ModelConfig {
  return getModel('editScene') as ModelConfig;
}

/** @deprecated Use getModel('deleteScene') instead */
export function getDeleteSceneModel(): ModelConfig {
  return getModel('deleteScene') as ModelConfig;
}

/** @deprecated Use getModel('analyzeImage') instead */
export function getAnalyzeImageModel(): ModelConfig {
  return getModel('analyzeImage') as ModelConfig;
}

/** @deprecated Use getModel('createSceneFromImage') instead */
export function getCreateSceneFromImageModel(): ModelConfig {
  return getModel('createSceneFromImage') as ModelConfig;
}

/** @deprecated Use getModel('editSceneWithImage') instead */
export function getEditSceneWithImageModel(): ModelConfig {
  return getModel('editSceneWithImage') as ModelConfig;
}

/** @deprecated Use getModel('fixBrokenScene') instead */
export function getFixBrokenSceneModel(): ModelConfig {
  return getModel('fixBrokenScene') as ModelConfig;
}

/** @deprecated Use getModel('codeGenerator') instead */
export function getCodeGeneratorModel(): ModelConfig {
  return getModel('codeGenerator') as ModelConfig;
}

/** @deprecated Use resolveDirectCodeEditorModel(editType) instead */
export function getDirectCodeEditorModel(editType: 'surgical' | 'creative' | 'structural'): ModelConfig {
  return resolveDirectCodeEditorModel(editType);
}

/** @deprecated Use getModel('sceneBuilder') instead */
export function getSceneBuilderModel(): ModelConfig {
  return getModel('sceneBuilder') as ModelConfig;
}

/** @deprecated Use getModel('layoutGenerator') instead */
export function getLayoutGeneratorModel(): ModelConfig {
  return getModel('layoutGenerator') as ModelConfig;
}

/** @deprecated Use getModel('visionAnalysis') instead */
export function getVisionAnalysisModel(): ModelConfig {
  return getModel('visionAnalysis') as ModelConfig;
}

/** @deprecated Use getModel('imageDescription') instead */
export function getImageDescriptionModel(): ModelConfig {
  return getModel('imageDescription') as ModelConfig;
}
