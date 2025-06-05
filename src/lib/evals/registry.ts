import { basicPromptsSuite, codeGenerationSuite, visionTestSuite, remotionSceneSuite } from './suites/basic-prompts';
import { bazaarVidPipelineSuite } from './suites/bazaar-vid-pipeline';
import type { EvalSuite } from './types';

export const evalRegistry: Record<string, EvalSuite> = {
  'basic-prompts': basicPromptsSuite,
  'bazaar-vid-pipeline': bazaarVidPipelineSuite,
  'code-generation': codeGenerationSuite,
  'vision-analysis': visionTestSuite,
  'remotion-scenes': remotionSceneSuite,
  
  // Placeholder suites (not implemented yet)
  'model-comparison': {
    id: 'model-comparison',
    name: 'Model Performance Comparison',
    description: 'Compare different model packs across various tasks',
    prompts: [],
    modelPacks: ['claude-pack', 'performance-pack', 'starter-pack-1'],
    services: ['brain', 'codeGenerator']
  },
  
  'vision-testing': {
    id: 'vision-testing', 
    name: 'Vision Analysis Testing',
    description: 'Test image analysis and scene creation from images',
    prompts: [],
    modelPacks: ['claude-pack', 'performance-pack'],
    services: ['analyzeImage', 'createSceneFromImage', 'editSceneWithImage']
  },
  
  'chat-context': {
    id: 'chat-context',
    name: 'Chat Context Handling',
    description: 'Test context awareness and multi-turn conversations',
    prompts: [],
    modelPacks: ['claude-pack', 'performance-pack'],
    services: ['brain']
  }
};

export function getSuite(suiteId: string): EvalSuite | undefined {
  return evalRegistry[suiteId];
}

export function listSuites(): EvalSuite[] {
  return Object.values(evalRegistry);
} 