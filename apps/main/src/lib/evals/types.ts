//src/lib/evals/types.ts

export interface EvalPrompt {
  id: string;
  name: string;
  type: 'text' | 'image' | 'code' | 'scene';
  input: {
    text?: string;
    image?: string; // base64 or file path
    context?: Record<string, any>;
  };
  expectedOutput?: {
    type: 'exact' | 'contains' | 'pattern' | 'quality_score';
    value: string | RegExp | number;
  };
  // Extended behavior validation for pipeline testing
  expectedBehavior?: {
    toolCalled?: string;
    workflow?: Array<{ toolName: string; context?: string }>;
    editType?: 'surgical' | 'creative' | 'structural';
    shouldMention?: string[];
    shouldModify?: string[];
    shouldAnalyzeImage?: boolean;
    shouldUseContext?: boolean;
    shouldConfirm?: boolean;
    shouldAsk?: string[];
    needsClarification?: boolean;
    expectedDuration?: number;
    complexity: 'low' | 'medium' | 'high' | 'very-high';
  };
}

export interface EvalResult {
  promptId: string;
  modelPack: string;
  modelKey: string;
  provider: string;
  model: string;
  output: string;
  metrics: {
    latency: number; // milliseconds
    tokenCount?: number;
    cost?: number; // estimated cost in USD
    timestamp: string;
  };
  quality?: {
    score: number; // 1-10
    criteria: Record<string, number>;
    human_eval?: boolean;
  };
}

export interface EvalSuite {
  id: string;
  name: string;
  description: string;
  prompts: EvalPrompt[];
  modelPacks: string[];
  services: ServiceType[];
}

export type ServiceType = 
  | 'brain'
  | 'codeGenerator'
  | 'editScene'
  | 'titleGenerator';

export interface BatchEvalConfig {
  suites: string[];
  modelPacks: string[];
  concurrency: number;
  timeout: number; // milliseconds
  saveResults: boolean;
  compareMode: boolean;
}

export interface EvalComparison {
  suiteId: string;
  promptId: string;
  results: Record<string, EvalResult>; // keyed by modelPack
  winner?: {
    modelPack: string;
    reason: string;
    confidence: number;
  };
}