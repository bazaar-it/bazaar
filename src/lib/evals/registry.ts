import { basicPromptsSuite, codeGenerationSuite, visionTestSuite, remotionSceneSuite } from './suites/basic-prompts';
import { bazaarVidPipelineSuite } from './suites/bazaar-vid-pipeline';
import { 
  modelPackPerformanceSuite, 
  promptOptimizationSuite, 
  imageToCodePipelineSuite,
  performanceBenchmarkSuite 
} from './suites/model-pack-performance';
import { imageFlowGuardrailsSuite } from './suites/image-flow-guardrails';
import { mediaMetadataSuite } from './suites/media-metadata-test';
import type { EvalSuite } from './types';

export const evalRegistry: Record<string, EvalSuite> = {
  // 🎯 Core evaluation suites
  'basic-prompts': basicPromptsSuite,
  'bazaar-vid-pipeline': bazaarVidPipelineSuite,
  'code-generation': codeGenerationSuite,
  'vision-analysis': visionTestSuite,
  'remotion-scenes': remotionSceneSuite,
  
  // 🚀 Performance evaluation suites
  'model-pack-performance': modelPackPerformanceSuite,
  'prompt-optimization': promptOptimizationSuite,
  'image-to-code-pipeline': imageToCodePipelineSuite,
  'performance-benchmark': performanceBenchmarkSuite,
  'image-flow-guardrails': imageFlowGuardrailsSuite,
  'media-metadata-test': mediaMetadataSuite,
  
  // 📊 Legacy placeholder suites (replaced by performance suites above)
  'model-comparison': {
    id: 'model-comparison',
    name: 'Model Performance Comparison (Legacy)',
    description: 'Use "model-pack-performance" suite instead',
    prompts: [],
    modelPacks: ['claude-pack', 'performance-pack', 'starter-pack-1'],
    services: ['brain', 'codeGenerator']
  },
  
  'vision-testing': {
    id: 'vision-testing', 
    name: 'Vision Analysis Testing (Legacy)',
    description: 'Use "image-to-code-pipeline" suite instead',
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
