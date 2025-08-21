//src/lib/evals/runner.ts

import crypto from 'crypto';
import type { EvalSuite, EvalPrompt, EvalResult, ServiceType } from './types';
import { getActiveModelPack, MODEL_PACKS, listAvailablePacks } from '../../config/models.config';
import type { ModelPack } from '../../config/models.config';
import { AIClientService } from '~/server/services/ai/aiClient.service';
import { db } from "~/server/db";
import { scenes, projects, users } from "~/server/db/schema";
import { eq } from "drizzle-orm";
// TODO: Update eval runner to use new tool architecture

export interface EvalRunConfig {
  suiteId: string;
  modelPacks?: string[];
  showOutputs?: boolean;
  comparison?: boolean;
  verbose?: boolean;
  maxPrompts?: number;
}

export interface DetailedEvalResult extends EvalResult {
  prompt: EvalPrompt;
  actualOutput: string;
  codeOutput?: string;
  imageAnalysis?: string;
  toolsUsed?: string[];
  reasoning?: string;
  success: boolean;
  error?: string;
}

export interface ModelComparisonResult {
  promptId: string;
  promptName: string;
  results: Record<string, DetailedEvalResult>;
  winner?: {
    modelPack: string;
    reason: string;
    scores: {
      speed: number;
      cost: number;
      quality: number;
      accuracy: number;
    };
  };
  analysis: {
    speedRanking: string[];
    costEfficiency: string[];
    codeQuality: string[];
    overallRanking: string[];
  };
}

interface ProjectData {
  id: string;
  name: string;
  description?: string;
  userId: string;
}

interface SceneData {
  id: string;
  projectId: string;
  name: string;
  type: string;
  code: string;
  isTemplate: boolean;
  order: number;
  durationFrames: number;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface EvaluationContext {
  projectId: string;
  storyboard: SceneData[];
  chatHistory: ChatMessage[];
}

export class EvaluationRunner {
  private aiClient: AIClientService;
  private currentModelPack: string = 'claude-pack';

  constructor() {
    this.aiClient = new AIClientService();
  }

  async runSuite(config: EvalRunConfig): Promise<{
    results: DetailedEvalResult[];
    comparison?: ModelComparisonResult[];
    summary: {
      totalTests: number;
      averageLatency: number;
      totalCost: number;
      errorRate: number;
      modelPackPerformance?: Record<string, { 
        speed: number; 
        cost: number; 
        errors: number; 
        successRate: number;
      }>;
    };
  }> {
    console.log(`🚀 Running evaluation suite: ${config.suiteId}`);
    
    const modelPacks = config.modelPacks || ['claude-pack'];
    console.log(`🎯 Using model pack${modelPacks.length > 1 ? 's' : ''}: ${modelPacks.join(', ')}`);

    const suite = await this.loadSuite(config.suiteId);
    const prompts = config.maxPrompts ? suite.prompts.slice(0, config.maxPrompts) : suite.prompts;
    
    const allResults: DetailedEvalResult[] = [];
    const comparisonResults: ModelComparisonResult[] = [];

    console.log(`\n🧪 Running suite "${suite.name}" with model pack${modelPacks.length > 1 ? 's' : ''}: ${modelPacks.join(', ')}`);

    // Run tests
    for (const prompt of prompts) {
      const promptResults: Record<string, DetailedEvalResult> = {};

      for (const modelPackId of modelPacks) {
        try {
          const result = await this.runSinglePrompt(prompt, modelPackId, config.verbose);
          promptResults[modelPackId] = result;
          allResults.push(result);

          // Show output if requested
          if (config.showOutputs) {
            this.displayPromptOutput(result, modelPackId);
          }
        } catch (error) {
          console.log(`    ❌ ERROR: ${error}`);
          const errorResult: DetailedEvalResult = {
            promptId: prompt.id,
            prompt,
            modelPack: modelPackId,
            modelKey: 'error',
            provider: 'error',
            model: 'error',
            output: '',
            actualOutput: '',
            success: false,
            error: error instanceof Error ? error.message : String(error),
            metrics: {
              latency: 0,
              cost: 0,
              timestamp: new Date().toISOString()
            }
          };
          promptResults[modelPackId] = errorResult;
          allResults.push(errorResult);
        }
      }

      // Generate comparison if multiple model packs
      if (modelPacks.length > 1) {
        const comparison = this.generateComparison(prompt, promptResults);
        comparisonResults.push(comparison);
      }
    }

    // Generate summary
    const summary = this.generateSummary(allResults, modelPacks);
    
    if (config.comparison && comparisonResults.length > 0) {
      this.displayComparison(comparisonResults);
    }

    return {
      results: allResults,
      comparison: comparisonResults.length > 0 ? comparisonResults : undefined,
      summary
    };
  }

  private async runSinglePrompt(
    prompt: EvalPrompt, 
    modelPackId: string, 
    verbose: boolean = false
  ): Promise<DetailedEvalResult> {
    console.log(`  ⚡ Testing ${prompt.type === 'image' ? '🖼️' : '🧠'} brain with prompt: ${prompt.name}`);
    
    const startTime = Date.now();
    const modelPack = MODEL_PACKS[modelPackId];
    
    if (!modelPack) {
      throw new Error(`Model pack ${modelPackId} not found`);
    }

    // Set the active model pack for this test
    process.env.ACTIVE_MODEL_PACK = modelPackId;

    try {
      let response: any;
      let toolsUsed: string[] = [];
      let codeOutput = '';
      let imageAnalysis = '';

      // Prepare context based on prompt type
      const context = this.prepareContext(prompt);

      // 🚨 FIXED: Generate proper UUIDs for evaluation instead of invalid strings
      const projectId = crypto.randomUUID();
      const userId = crypto.randomUUID();

      // 🚨 CRITICAL FIX: Create user first, then project to satisfy foreign key constraints
      try {
        // Step 1: Create user record first
        await db.insert(users).values({
          id: userId,
          name: `Eval User`,
          email: `eval-${userId}@test.local`,
          emailVerified: null,
          image: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }).onConflictDoNothing();
        
        console.log(`[EvaluationRunner] Created user: ${userId}`);
        
        // Step 2: Create project record  
        await db.insert(projects).values({
          id: projectId,
          title: `Eval Project - ${prompt.name}`,
          props: {
            meta: {
              title: `Eval Project - ${prompt.name}`,
              duration: 300,
              backgroundColor: "#1a1a1a"
            },
            scenes: []
          },
          userId: userId,
          isWelcome: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }).onConflictDoNothing();
        
        console.log(`[EvaluationRunner] Created project: ${projectId}`);
      } catch (dbError) {
        console.error(`[EvaluationRunner] Failed to create evaluation records:`, dbError);
        // Continue anyway - the brain orchestrator might handle missing projects gracefully
      }

      // 🚨 CRITICAL FIX: Create any existing scenes in the database
      if (context.storyboardSoFar && context.storyboardSoFar.length > 0) {
        try {
          for (const scene of context.storyboardSoFar) {
            await db.insert(scenes).values({
              id: scene.id,
              projectId: projectId,
              name: scene.name,
              tsxCode: scene.tsxCode,
              order: scene.order || 0,
              duration: scene.duration || 180,
              props: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            }).onConflictDoNothing();
          }
          console.log(`[EvaluationRunner] Created ${context.storyboardSoFar.length} scenes for project: ${projectId}`);
        } catch (dbError) {
          console.error(`[EvaluationRunner] Failed to create scenes:`, dbError);
          // Continue anyway
        }
      }

      if (prompt.type === 'image' && prompt.input.image) {
        // ✅ FIXED: Handle image prompts with proper URL format
        const imageUrl = prompt.input.image;
        console.log(`    🖼️  Processing image: ${imageUrl.substring(0, 50)}...`);
        
        // TODO: Update to use new orchestratorNEW and generation.ts
        throw new Error("Eval runner needs to be updated to use new architecture");
        /*
        response = await brainOrchestrator.processUserInput({
          prompt: prompt.input.text || '',
          projectId,
          userId,
          userContext: {
            ...context,
            imageUrls: [imageUrl] // Pass image as URL in userContext
          },
          storyboardSoFar: context.storyboardSoFar || [],
          chatHistory: context.chatHistory || []
        });

        if (response.result?.imageAnalysis) {
          imageAnalysis = response.result.imageAnalysis;
        }
        */
      } else {
        // Text-based prompts
        // TODO: Update to use new orchestratorNEW and generation.ts
        throw new Error("Eval runner needs to be updated to use new architecture");
        /*
        response = await brainOrchestrator.processUserInput({
          prompt: prompt.input.text || '',
          projectId,
          userId,
          userContext: context,
          storyboardSoFar: context.storyboardSoFar || [],
          chatHistory: context.chatHistory || []
        });
        */
      }

      if (response.toolUsed) {
        toolsUsed = [response.toolUsed];
      }

      if (response.result?.sceneCode) {
        codeOutput = response.result.sceneCode;
      }

      const latency = Date.now() - startTime;
      const model = modelPack.models.brain;
      
      console.log(`    ⏱️  ${latency}ms | ${model.provider}/${model.model}`);
      
      if (verbose && response.reasoning) {
        console.log(`    🤔 Reasoning: ${response.reasoning.substring(0, 100)}...`);
      }

      const cost = this.estimateCost(response.chatResponse || '', model.provider, model.model);

      // 🚨 CLEANUP: Remove the test records after evaluation (in proper order)
      try {
        await db.delete(scenes).where(eq(scenes.projectId, projectId));
        await db.delete(projects).where(eq(projects.id, projectId));
        await db.delete(users).where(eq(users.id, userId));
        console.log(`[EvaluationRunner] Cleaned up project: ${projectId} and user: ${userId}`);
      } catch (cleanupError) {
        console.warn(`[EvaluationRunner] Failed to cleanup records:`, cleanupError);
        // Non-critical error, continue
      }

      return {
        promptId: prompt.id,
        prompt,
        modelPack: modelPackId,
        modelKey: 'brain',
        provider: model.provider,
        model: model.model,
        output: response.chatResponse || '',
        actualOutput: response.chatResponse || '',
        codeOutput,
        imageAnalysis,
        toolsUsed,
        reasoning: response.reasoning,
        success: response.success,
        error: response.error,
        metrics: {
          latency,
          cost,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      throw new Error(`${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private prepareContext(prompt: EvalPrompt): any {
    const context: any = {};
    
    if (prompt.input.context) {
      Object.assign(context, prompt.input.context);
    }

    // 🚨 FIXED: Add scene context that matches production (with proper UUIDs)
    if (context.existingCode) {
      const sceneId = crypto.randomUUID(); // Generate proper UUID
      
      context.storyboardSoFar = [{
        id: sceneId,
        name: context.sceneName || 'Test Scene',
        tsxCode: context.existingCode,
        duration: context.duration || 180,
        order: 1
      }];
      
      // Set the current scene ID for editing
      context.sceneId = sceneId;
    }

    // 🚨 ENHANCED: Add chat history that matches production format
    if (!context.chatHistory && prompt.expectedBehavior?.editType) {
      context.chatHistory = [
        {
          role: 'assistant',
          content: '👋 **Welcome to Bazaar!** I can help you create amazing motion graphics videos. What would you like to create today?'
        },
        {
          role: 'user', 
          content: prompt.input.text || 'Previous interaction context'
        }
      ];
    }

    // 🚨 ENHANCED: Add complexity classification for editScene operations
    if (prompt.expectedBehavior?.editType) {
      context.editComplexity = prompt.expectedBehavior.editType; // surgical, creative, structural
    }

    // 🚨 ENHANCED: Add expected behavior for validation
    if (prompt.expectedBehavior) {
      context.expectedBehavior = prompt.expectedBehavior;
    }

    return context;
  }

  private displayPromptOutput(result: DetailedEvalResult, modelPack: string): void {
    console.log(`\n📋 ${result.prompt.name} (${modelPack})`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    if (result.success) {
      console.log(`✅ Success: ${result.metrics.latency}ms, $${result.metrics.cost?.toFixed(4)}`);
      
      if (result.toolsUsed && result.toolsUsed.length > 0) {
        console.log(`🛠️  Tools: ${result.toolsUsed.join(', ')}`);
      }

      if (result.imageAnalysis) {
        console.log(`🖼️  Image Analysis: ${result.imageAnalysis.substring(0, 200)}...`);
      }

      if (result.codeOutput) {
        console.log(`💻 Generated Code:`);
        console.log(result.codeOutput.substring(0, 500) + (result.codeOutput.length > 500 ? '...' : ''));
      }

      if (result.reasoning) {
        console.log(`🤔 Reasoning: ${result.reasoning.substring(0, 300)}...`);
      }
    } else {
      console.log(`❌ Failed: ${result.error}`);
    }
    console.log('');
  }

  private generateComparison(prompt: EvalPrompt, results: Record<string, DetailedEvalResult>): ModelComparisonResult {
    const analysis = {
      speedRanking: Object.entries(results)
        .filter(([, r]) => r.success)
        .sort(([, a], [, b]) => a.metrics.latency - b.metrics.latency)
        .map(([pack]) => pack),
      
      costEfficiency: Object.entries(results)
        .filter(([, r]) => r.success && r.metrics.cost)
        .sort(([, a], [, b]) => (a.metrics.cost || 0) - (b.metrics.cost || 0))
        .map(([pack]) => pack),
      
      codeQuality: Object.entries(results)
        .filter(([, r]) => r.success && r.codeOutput)
        .map(([pack]) => pack), // Could add quality scoring later
      
      overallRanking: [] as string[]
    };

    // Simple overall ranking based on success, speed, and cost
    analysis.overallRanking = Object.entries(results)
      .map(([pack, result]) => ({
        pack,
        score: result.success ? 
          (100 - result.metrics.latency / 100) + (result.metrics.cost ? 50 - result.metrics.cost * 1000 : 0) : 0
      }))
      .sort((a, b) => b.score - a.score)
      .map(item => item.pack);

    const winner = analysis.overallRanking[0] ? {
      modelPack: analysis.overallRanking[0],
      reason: 'Best overall performance',
      scores: {
        speed: analysis.speedRanking.indexOf(analysis.overallRanking[0]) + 1,
        cost: analysis.costEfficiency.indexOf(analysis.overallRanking[0]) + 1,
        quality: 1, // Placeholder
        accuracy: results[analysis.overallRanking[0]]?.success ? 1 : 0
      }
    } : undefined;

    return {
      promptId: prompt.id,
      promptName: prompt.name,
      results,
      winner,
      analysis
    };
  }

  private displayComparison(comparisons: ModelComparisonResult[]): void {
    console.log(`\n🏆 MODEL COMPARISON RESULTS`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    for (const comp of comparisons) {
      console.log(`\n📊 ${comp.promptName}`);
      
      if (comp.winner) {
        console.log(`   🥇 Winner: ${comp.winner.modelPack} (${comp.winner.reason})`);
      }

      console.log(`   ⚡ Speed ranking: ${comp.analysis.speedRanking.join(' > ')}`);
      console.log(`   💰 Cost efficiency: ${comp.analysis.costEfficiency.join(' > ')}`);
      console.log(`   🎯 Overall: ${comp.analysis.overallRanking.join(' > ')}`);
    }
  }

  private generateSummary(results: DetailedEvalResult[], modelPacks: string[]) {
    const totalTests = results.length;
    const successfulTests = results.filter(r => r.success);
    const averageLatency = successfulTests.reduce((sum, r) => sum + r.metrics.latency, 0) / successfulTests.length;
    const totalCost = results.reduce((sum, r) => sum + (r.metrics.cost || 0), 0);
    const errorRate = ((totalTests - successfulTests.length) / totalTests) * 100;

    let modelPackPerformance: Record<string, any> | undefined;
    
    if (modelPacks.length > 1) {
      modelPackPerformance = {};
      for (const pack of modelPacks) {
        const packResults = results.filter(r => r.modelPack === pack);
        const packSuccesses = packResults.filter(r => r.success);
        
        modelPackPerformance[pack] = {
          speed: packSuccesses.reduce((sum, r) => sum + r.metrics.latency, 0) / packSuccesses.length,
          cost: packResults.reduce((sum, r) => sum + (r.metrics.cost || 0), 0),
          errors: packResults.filter(r => !r.success).length,
          successRate: (packSuccesses.length / packResults.length) * 100
        };
      }
    }

    return {
      totalTests,
      averageLatency: Math.round(averageLatency),
      totalCost,
      errorRate: Math.round(errorRate),
      modelPackPerformance
    };
  }

  private async loadSuite(suiteId: string): Promise<EvalSuite> {
    try {
      const { getSuite } = await import('./registry');
      const suite = getSuite(suiteId);
      if (!suite) {
        throw new Error(`Suite ${suiteId} not found`);
      }
      return suite;
    } catch (error) {
      throw new Error(`Failed to load suite ${suiteId}: ${error}`);
    }
  }

  private estimateCost(text: string, provider: string, model: string): number {
    const inputTokens = Math.ceil(text.length / 4);
    const outputTokens = Math.ceil(text.length / 4);

    if (provider === 'anthropic') {
      if (model.includes('claude-3-5-sonnet')) {
        return (inputTokens * 0.003 + outputTokens * 0.015) / 1000;
      }
      if (model.includes('claude-3-haiku')) {
        return (inputTokens * 0.00025 + outputTokens * 0.00125) / 1000;
      }
    }
    
    if (provider === 'openai') {
      if (model.includes('gpt-4o-mini')) {
        return (inputTokens * 0.00015 + outputTokens * 0.0006) / 1000;
      }
      if (model.includes('gpt-4')) {
        return (inputTokens * 0.03 + outputTokens * 0.06) / 1000;
      }
    }

    return 0.001; // Default fallback
  }
}

export const evaluationRunner = new EvaluationRunner();

/**
 * Improved JSON parsing that handles markdown-wrapped responses
 */
function parseJSONResponse(content: string): any {
  // Clean up the content - remove markdown code blocks if present
  let cleanContent = content.trim();
  
  // Remove markdown code block syntax if present
  if (cleanContent.startsWith('```json')) {
    cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleanContent.startsWith('```')) {
    cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  
  // Remove any leading/trailing whitespace or newlines
  cleanContent = cleanContent.trim();
  
  try {
    return JSON.parse(cleanContent);
  } catch (error) {
    console.error('[EvaluationRunner] JSON Parse Error:', {
      originalContent: content.substring(0, 200),
      cleanedContent: cleanContent.substring(0, 200),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    // Try to extract JSON from the content if it's mixed with other text
    const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (secondError) {
        console.error('[EvaluationRunner] Second JSON Parse attempt failed:', secondError);
      }
    }
    
    throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create a project in the database for evaluation
 */
async function createEvaluationProject(projectData: ProjectData): Promise<void> {
  try {
    console.log(`[EvaluationRunner] Creating project: ${projectData.id}`);
    
    await db.insert(projects).values({
      id: projectData.id,
      title: projectData.name, // Schema uses 'title' not 'name'
      props: { // Required field - basic props structure
        meta: {
          title: projectData.name,
          duration: 300, // 10 seconds default
          backgroundColor: "#1a1a1a"
        },
        scenes: []
      },
      userId: projectData.userId,
      isWelcome: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).onConflictDoNothing(); // Don't fail if project already exists
    
    console.log(`[EvaluationRunner] Project created successfully: ${projectData.id}`);
  } catch (error) {
    console.error(`[EvaluationRunner] Failed to create project:`, error);
    throw error;
  }
}

/**
 * Create scenes in the database for evaluation context
 */
async function createEvaluationScenes(scenesData: SceneData[]): Promise<void> {
  try {
    for (const sceneData of scenesData) {
      console.log(`[EvaluationRunner] Creating scene: ${sceneData.id}`);
      
      await db.insert(scenes).values({
        id: sceneData.id,
        projectId: sceneData.projectId,
        name: sceneData.name,
        tsxCode: sceneData.code, // Schema uses 'tsxCode' not 'code'
        order: sceneData.order,
        duration: sceneData.durationFrames, // Schema uses 'duration' not 'durationFrames'
        props: null, // Optional field
        createdAt: new Date(),
        updatedAt: new Date(),
      }).onConflictDoNothing(); // Don't fail if scene already exists
      
      console.log(`[EvaluationRunner] Scene created successfully: ${sceneData.id}`);
    }
  } catch (error) {
    console.error(`[EvaluationRunner] Failed to create scenes:`, error);
    throw error;
  }
}

/**
 * Enhanced context preparation that creates DB records
 */
async function prepareEvaluationContext(scenario: any): Promise<EvaluationContext> {
  // Generate proper UUIDs
  const projectId = crypto.randomUUID();
  const sceneId = crypto.randomUUID();
  
  console.log(`[EvaluationRunner] Preparing context with projectId: ${projectId}, sceneId: ${sceneId}`);
  
  // Create project data
  const projectData: ProjectData = {
    id: projectId,
    name: `Evaluation Project - ${Date.now()}`,
    description: 'Auto-generated project for evaluation testing',
    userId: 'eval-user-' + crypto.randomUUID()
  };
  
  // Create initial scene data if needed
  const storyboard: SceneData[] = scenario.includeScenes ? [
    {
      id: sceneId,
      projectId: projectId,
      name: 'Welcome Scene',
      type: 'TextScene',
      code: `const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;

export default function WelcomeScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const opacity = interpolate(frame, [0, fps * 0.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  
  return (
    <AbsoluteFill style={{ backgroundColor: "#1a1a1a" }}>
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        textAlign: "center",
        opacity
      }}>
        <h1 style={{
          fontSize: "4rem",
          fontWeight: "700",
          color: "#ffffff",
          margin: "0"
        }}>
          Welcome
        </h1>
      </div>
    </AbsoluteFill>
  );
}`,
      isTemplate: false,
      order: 0,
      durationFrames: 180
    }
  ] : [];
  
  // Create database records
  await createEvaluationProject(projectData);
  if (storyboard.length > 0) {
    await createEvaluationScenes(storyboard);
  }
  
  // Create chat history in production format
  const chatHistory: ChatMessage[] = scenario.chatHistory?.map((msg: any, index: number) => ({
    role: msg.role,
    content: msg.content,
    timestamp: Date.now() - (1000 * (scenario.chatHistory.length - index))
  })) || [];
  
  return {
    projectId,
    storyboard,
    chatHistory
  };
}

/**
 * Cleanup evaluation data from database
 */
async function cleanupEvaluationData(projectId: string): Promise<void> {
  try {
    console.log(`[EvaluationRunner] Cleaning up evaluation data for project: ${projectId}`);
    
    // Delete scenes first (due to FK constraint)
    await db.delete(scenes).where(eq(scenes.projectId, projectId));
    console.log(`[EvaluationRunner] Deleted scenes for project: ${projectId}`);
    
    // Delete project
    await db.delete(projects).where(eq(projects.id, projectId));
    console.log(`[EvaluationRunner] Deleted project: ${projectId}`);
  } catch (error) {
    console.error(`[EvaluationRunner] Failed to cleanup evaluation data:`, error);
    // Don't throw - cleanup failures shouldn't fail the evaluation
  }
}

/**
 * Run evaluation with proper context and enhanced error handling
 */
export async function runEvaluation(scenario: any): Promise<any> {
  let context: EvaluationContext | null = null;
  
  try {
    console.log(`[EvaluationRunner] Starting evaluation: ${scenario.name}`);
    
    // Prepare evaluation context with DB records
    context = await prepareEvaluationContext(scenario);
    
    // Create orchestrator instance
    // TODO: Update to use new orchestratorNEW
    // const orchestrator = new BrainOrchestrator();
    throw new Error("Eval runner needs to be updated to use new architecture");
    
    // Execute the brain orchestrator
    const response = await orchestrator.processUserInput({
      prompt: scenario.input.userPrompt,
      storyboardSoFar: context.storyboard,
      chatHistory: context.chatHistory,
      projectId: context.projectId,
      userId: 'eval-user-' + crypto.randomUUID()
    });
    
    console.log(`[EvaluationRunner] Raw orchestrator response:`, response);
    
    // Handle OrchestrationOutput format
    if (!response.success) {
      return {
        success: false,
        error: response.error || 'Orchestrator execution failed',
        rawResponse: response,
        scenario: scenario.name
      };
    }
    
    // Return evaluation result with orchestrator output
    return {
      success: true,
      response: response, // Return the full OrchestrationOutput
      context: {
        projectId: context.projectId,
        storyboardLength: context.storyboard.length,
        chatHistoryLength: context.chatHistory.length
      },
      scenario: scenario.name,
      toolUsed: response.toolUsed,
      reasoning: response.reasoning,
      chatResponse: response.chatResponse
    };
    
  } catch (error) {
    console.error(`[EvaluationRunner] Evaluation failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      scenario: scenario.name,
      context: context ? {
        projectId: context.projectId,
        storyboardLength: context.storyboard.length,
        chatHistoryLength: context.chatHistory.length
      } : null
    };
  } finally {
    // Always cleanup evaluation data
    if (context) {
      await cleanupEvaluationData(context.projectId);
    }
  }
}
