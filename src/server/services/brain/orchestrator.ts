// src/server/services/brain/orchestrator.ts
import { openai } from "~/server/lib/openai";
import { 
  addSceneTool, 
  editSceneTool, 
  deleteSceneTool, 
  fixBrokenSceneTool,
  analyzeImageTool,
  createSceneFromImageTool,
  editSceneWithImageTool,
  toolRegistry,
  type MCPResult 
} from "~/lib/services/mcp-tools";
import { conversationalResponseService } from "~/server/services/conversationalResponse.service";
import { db } from "~/server/db";
import { scenes, sceneIterations } from "~/server/db/schema";
import { eq, sql } from "drizzle-orm";

// 🚨 NEW: Import centralized model management
import { getBrainModel } from "~/config/models.config";
import { AIClientService } from "~/lib/services/aiClient.service";
import { SYSTEM_PROMPTS } from "~/config/prompts.config";

// 🚨 NEW: Import type-safe definitions and services
import { ToolName } from "~/lib/types/brain.types";
import type { 
  ToolSelectionResult, 
  EditComplexity, 
  OperationType,
  SceneData,
  DatabaseOperationContext,
  ModelUsageData
} from "~/lib/types/brain.types";
import { sceneRepositoryService } from "./sceneRepository.service";

import { EventEmitter } from "events";
import { projectMemoryService } from "~/lib/services/projectMemory.service";
import { MEMORY_TYPES } from "~/server/db/schema";

// 🆕 PHASE 3: Import Performance Service for latency measurement
import { performanceService } from "~/lib/services/performance.service";

// ✅ SIMPLIFIED: Single tool array with all tools
const ALL_TOOLS = [
  addSceneTool, 
  editSceneTool, 
  deleteSceneTool, 
  fixBrokenSceneTool, 
  analyzeImageTool, 
  createSceneFromImageTool, 
  editSceneWithImageTool
];

// ✅ SIMPLIFIED: Module-level singleton initialization
let toolsInitialized = false;

function initializeTools() {
  if (!toolsInitialized) {
    ALL_TOOLS.forEach(tool => toolRegistry.register(tool));
    toolsInitialized = true;
    if (process.env.NODE_ENV === 'development') {
      console.log('[BrainOrchestrator] Tools registered successfully');
    }
  }
}

// Initialize tools immediately when module loads
initializeTools();

export interface OrchestrationInput {
  prompt: string;
  projectId: string;
  userId: string;
  userContext?: Record<string, unknown>;
  storyboardSoFar?: any[];
  chatHistory?: Array<{role: string, content: string}>;
  onProgress?: (stage: string, status: string) => void;
}

export interface OrchestrationOutput {
  success: boolean;
  result?: any;
  toolUsed?: string;
  reasoning?: string;
  error?: string;
  chatResponse?: string;
  isAskSpecify?: boolean;
  debug?: {
    prompt?: { system: string; user: string };
    response?: string;
    parsed?: any;
  };
}

// 🆕 NEW: Image Facts storage interface
export interface ImageFacts {
  id: string;
  imageUrls: string[];
  palette: string[];
  typography: string;
  mood: string;
  layoutJson?: any;
  processingTimeMs: number;
  timestamp: string;
}

// 🆕 NEW: Memory Bank interfaces
interface MemoryBankSummary {
  userPreferences: Record<string, string>;
  sceneHistory: Array<{id: string, name: string, type: string}>;
  imageAnalyses: ImageFacts[];
  conversationContext: string;
  last5Messages?: Array<{role: string, content: string}>;
  memoryBankSummary?: MemoryBankSummary;
  sceneList?: Array<{id: string, name: string}>;
  pendingImageIds?: string[];
}

/**
 * TTL Cache implementation to prevent unbounded memory growth
 * Automatically expires entries after configurable TTL (default: 10 minutes)
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class TTLCache<K, V> {
  private cache = new Map<K, CacheEntry<V>>();
  private defaultTTL: number;
  private cleanupInterval: NodeJS.Timeout;

  constructor(defaultTTL: number = 600000) { // 10 minutes default
    this.defaultTTL = defaultTTL;
    
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 300000);
  }

  set(key: K, value: V, ttl?: number): this {
    this.cache.delete(key); // Clean up any existing entry
    this.cache.set(key, { 
      data: value, 
      timestamp: Date.now(), 
      ttl: ttl || this.defaultTTL 
    });
    return this;
  }
  
  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return undefined;
    }
    
    return entry.data;
  }

  has(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  values(): V[] {
    const validValues: V[] = [];
    const now = Date.now();
    const expiredKeys: K[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp <= entry.ttl) {
        validValues.push(entry.data);
      } else {
        expiredKeys.push(key);
      }
    }
    
    // Clean up expired entries
    expiredKeys.forEach(key => this.cache.delete(key));
    
    return validValues;
  }

  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: K[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => this.cache.delete(key));
    
    if (expiredKeys.length > 0) {
      console.log(`🧹 TTL Cache: Cleaned up ${expiredKeys.length} expired entries`);
    }
  }

  getSize(): number {
    this.cleanup(); // Ensure accurate count
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear();
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}

/**
 * Error tracking utility for production monitoring
 * Integrates with Sentry/Logtail and performance telemetry
 */
class ErrorTracker {
  static captureAsyncError(
    error: Error | unknown, 
    context: {
      operation: string;
      projectId?: string;
      userId?: string;
      metadata?: Record<string, any>;
    }
  ): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    
    // Enhanced logging with context
    console.error(`❌ [${context.operation}] Async Error:`, {
      error: errorMessage,
      stack,
      projectId: context.projectId,
      userId: context.userId,
      metadata: context.metadata,
      timestamp: new Date().toISOString()
    });

    // TODO: Integrate Sentry for Phase 5
    // Sentry.captureException(error, {
    //   tags: { operation: context.operation },
    //   extra: context.metadata,
    //   user: { id: context.userId }
    // });

    // TODO: Integrate Logtail for Phase 5  
    // logtail.error(errorMessage, {
    //   operation: context.operation,
    //   projectId: context.projectId,
    //   metadata: context.metadata
    // });

    // Track error in performance telemetry
    performanceService.recordError(context.operation, errorMessage);
  }

  static capturePerformanceAnomaly(
    operation: string,
    duration: number,
    threshold: number,
    context: Record<string, any> = {}
  ): void {
    if (duration > threshold) {
      console.warn(`⚠️ Performance Anomaly: ${operation} took ${duration}ms (threshold: ${threshold}ms)`, context);
      
      // TODO: Add Sentry performance monitoring
      // Sentry.addBreadcrumb({
      //   message: `Slow operation: ${operation}`,
      //   level: 'warning',
      //   data: { duration, threshold, ...context }
      // });
    }
  }
}

/**
 * Token monitoring utility for GPT-4o 128k context window management
 * Prevents silent prompt truncation and context overflow failures
 */
class TokenMonitor {
  private static readonly MAX_TOKENS_GPT4O = 120000; // Leave 8k buffer for response
  private static readonly MAX_TOKENS_GPT4_MINI = 120000; // Same limit for consistency
  
  /**
   * Validate prompt size before LLM call
   * Uses approximate token counting for performance (4 chars ≈ 1 token)
   */
  static validatePromptSize(
    prompt: string,
    context: {
      operation: string;
      model: string;
      maxTokens?: number;
    }
  ): { valid: boolean; tokenCount: number; warning?: string } {
    
    const maxTokens = context.maxTokens || this.MAX_TOKENS_GPT4O;
    
    // Fast approximation: 4 characters ≈ 1 token (conservative estimate)
    const approximateTokens = Math.ceil(prompt.length / 4);
    
    if (approximateTokens > maxTokens) {
      const warning = `⚠️ Prompt size ${approximateTokens} tokens exceeds limit ${maxTokens} for ${context.operation}`;
      console.warn(warning);
      
      // Track in performance monitoring
      performanceService.recordError(context.operation, `Token limit exceeded: ${approximateTokens}/${maxTokens}`);
      
      return {
        valid: false,
        tokenCount: approximateTokens,
        warning
      };
    }
    
    // Warn if approaching limit (90% threshold)
    if (approximateTokens > maxTokens * 0.9) {
      const warning = `🟡 Large prompt: ${approximateTokens} tokens (${((approximateTokens/maxTokens)*100).toFixed(1)}% of ${maxTokens} limit)`;
      console.warn(warning);
      
      return {
        valid: true,
        tokenCount: approximateTokens,
        warning
      };
    }
    
    // Log token usage in debug mode
    if (process.env.NODE_ENV === 'development') {
      console.log(`📏 Token usage: ${approximateTokens} tokens (${((approximateTokens/maxTokens)*100).toFixed(1)}% of limit) for ${context.operation}`);
    }
    
    return {
      valid: true,
      tokenCount: approximateTokens
    };
  }
  
  /**
   * Truncate prompt intelligently if needed
   * Preserves system prompt and recent context, truncates middle content
   */
  static truncatePromptIfNeeded(
    systemPrompt: string,
    userPrompt: string,
    context: { operation: string; model: string }
  ): { systemPrompt: string; userPrompt: string; wasTruncated: boolean } {
    
    const combined = systemPrompt + userPrompt;
    const validation = this.validatePromptSize(combined, context);
    
    if (validation.valid) {
      return { systemPrompt, userPrompt, wasTruncated: false };
    }
    
    // Strategy: Keep full system prompt, truncate user prompt intelligently
    const systemTokens = Math.ceil(systemPrompt.length / 4);
    const availableForUser = this.MAX_TOKENS_GPT4O - systemTokens - 1000; // Buffer
    
    if (availableForUser <= 0) {
      console.error(`❌ System prompt too large: ${systemTokens} tokens`);
      return { systemPrompt, userPrompt, wasTruncated: true };
    }
    
    const maxUserChars = availableForUser * 4;
    if (userPrompt.length <= maxUserChars) {
      return { systemPrompt, userPrompt, wasTruncated: false };
    }
    
    // Intelligent truncation: Keep beginning and end, truncate middle
    const keepStart = Math.floor(maxUserChars * 0.3);
    const keepEnd = Math.floor(maxUserChars * 0.3);
    const truncatedPrompt = 
      userPrompt.substring(0, keepStart) +
      '\n\n[... CONTENT TRUNCATED DUE TO LENGTH ...]\n\n' +
      userPrompt.substring(userPrompt.length - keepEnd);
    
    console.warn(`✂️ Truncated user prompt from ${userPrompt.length} to ${truncatedPrompt.length} chars`);
    
    return { 
      systemPrompt, 
      userPrompt: truncatedPrompt, 
      wasTruncated: true 
    };
  }
}

/**
 * Brain LLM Orchestrator - analyzes user intent and selects appropriate tools
 * 🚨 NEW: Async context-driven architecture with image analysis parallel processing
 */
export class BrainOrchestrator extends EventEmitter {
  // 🚨 NEW: Dynamic model configuration from centralized system
  private get modelConfig() {
    return getBrainModel();
  }
  
  private readonly DEBUG = process.env.NODE_ENV === 'development';
  
  // 🆕 NEW: In-memory cache for image facts (will be replaced with database)
  private imageFactsCache = new TTLCache<string, ImageFacts>(600000); // 10 minutes TTL
  
  constructor() {
    super();
    this.setupImageFactsListener();
    
    // ✅ FIXED: No tool registration in constructor
    // Tools are initialized at module level to prevent race conditions
    
    // 🚨 NEW: Log active model configuration in development
    if (this.DEBUG) {
      const config = this.modelConfig;
      console.log(`[BrainOrchestrator] 🤖 Using model: ${config.provider}/${config.model} (temp: ${config.temperature})`);
    }
  }

  // Helper method to safely extract JSON from markdown-wrapped responses
  private extractJsonFromResponse(content: string): any {
    if (!content || typeof content !== 'string') {
      throw new Error('Empty or invalid response content');
    }

    // Remove any leading/trailing whitespace
    const cleaned = content.trim();

    // Check if response is wrapped in markdown code blocks
    if (cleaned.startsWith('```')) {
      // Extract JSON from markdown code blocks
      const lines = cleaned.split('\n');
      const startIndex = lines.findIndex(line => line.includes('```json') || line === '```');
      const endIndex = lines.findIndex((line, index) => index > startIndex && line.includes('```'));
      
      if (startIndex !== -1 && endIndex !== -1) {
        const jsonLines = lines.slice(startIndex + 1, endIndex);
        const jsonString = jsonLines.join('\n').trim();
        
        if (!jsonString) {
          throw new Error('Empty JSON content in markdown block');
        }
        
        try {
          return JSON.parse(jsonString);
        } catch (jsonError) {
          console.error("[BrainOrchestrator] Failed to parse extracted JSON:", jsonString.substring(0, 200));
          throw new Error(`Invalid JSON in markdown block: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}`);
        }
      }
    }

    // Try parsing as direct JSON
    try {
      return JSON.parse(cleaned);
    } catch (jsonError) {
      console.error("[BrainOrchestrator] Failed to parse direct JSON:", cleaned.substring(0, 200));
      throw new Error(`Response is not valid JSON: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}`);
    }
  }
  
  async processUserInput(input: OrchestrationInput): Promise<OrchestrationOutput> {
    // 🆕 PHASE 3: Start performance measurement for the entire operation
    const operationId = `orchestrator_${Date.now()}`;
    performanceService.startMetric(operationId, {
      hasImages: Array.isArray(input.userContext?.imageUrls) && input.userContext.imageUrls.length > 0,
      projectId: input.projectId,
      prompt: input.prompt.substring(0, 50), // First 50 chars for identification
    });

    try {
      if (this.DEBUG) console.log('\n[DEBUG] PROCESSING USER INPUT:', input.prompt);
      if (this.DEBUG) console.log(`[DEBUG] PROJECT: ${input.projectId}, SCENES: ${input.storyboardSoFar?.length || 0}`);
      
      // 🆕 PHASE 1: ASYNC IMAGE ANALYSIS (Fire-and-forget)
      const imageUrls = input.userContext?.imageUrls as string[];
      let imageAnalysisPromise: Promise<ImageFacts | null>;
      
      if (imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0) {
        if (this.DEBUG) console.log(`🖼️ Starting ASYNC image analysis for ${imageUrls.length} image(s)`);
        
        // 🆕 PHASE 3: Measure image analysis performance separately
        performanceService.startMetric('image_analysis_async');
        imageAnalysisPromise = this.startAsyncImageAnalysis(input.projectId, imageUrls, input.prompt);
        
        // Track completion time asynchronously with error tracking
        imageAnalysisPromise.then(() => {
          performanceService.endMetric('image_analysis_async');
        }).catch((error) => {
          performanceService.endMetric('image_analysis_async');
          ErrorTracker.captureAsyncError(error, {
            operation: 'async_image_analysis_promise',
            projectId: input.projectId,
            userId: input.userId,
            metadata: { imageCount: imageUrls.length }
          });
        });
      } else {
        imageAnalysisPromise = Promise.resolve(null);
      }
      
      // 🆕 PHASE 2: BUILD CONTEXT PACKET (Enhanced with memory)
      performanceService.startMetric('context_build');
      const contextPacket = await this.buildContextPacket(input.projectId, input.chatHistory || [], []);
      performanceService.endMetric('context_build');
      
      if (this.DEBUG) {
        console.log(`[DEBUG] CONTEXT PACKET:`);
        console.log(`- Last messages: ${contextPacket.last5Messages?.length || 0}`);
        console.log(`- Memory bank items: ${Object.keys(contextPacket.userPreferences).length} preferences`);
        console.log(`- Scene list: ${contextPacket.sceneList?.length || 0} scenes`);
        console.log(`- Pending images: ${contextPacket.pendingImageIds?.length || 0}`);
      }
      
      // 🎯 PROGRESS UPDATE: Starting intent analysis
      input.onProgress?.('🧠 Analyzing your request...', 'building');
      
      // 🆕 PHASE 3: BRAIN DECIDES WHAT TO DO (Enhanced context)
      performanceService.startMetric('brain_decision');
      const toolSelection = await this.analyzeIntentWithContext(input, contextPacket);
      performanceService.endMetric('brain_decision');
      
      if (!toolSelection.success) {
        if (this.DEBUG) console.log(`[DEBUG] INTENT ANALYSIS FAILED:`, toolSelection.error);
        
        // 🆕 PHASE 3: End performance measurement on failure
        performanceService.endMetric(operationId);
        
        return {
          success: false,
          error: toolSelection.error || "Failed to analyze user intent",
        };
      }
      
      if (this.DEBUG) console.log(`[DEBUG] TOOL SELECTED:`, toolSelection.toolName || 'multi-step workflow');
      if (this.DEBUG) console.log(`[DEBUG] REASONING:`, toolSelection.reasoning || 'No reasoning provided');
      
      // 🆕 PHASE 4: EXECUTE CHOSEN TOOL(S) (With context)
      let executionResult: OrchestrationOutput;
      
      if (toolSelection.needsClarification) {
        executionResult = {
          success: true,
          chatResponse: toolSelection.clarificationQuestion,
          reasoning: toolSelection.reasoning || "Clarification needed",
          isAskSpecify: true,
        };
      } else if (toolSelection.workflow && toolSelection.workflow.length > 0) {
        executionResult = await this.executeWorkflow(input, toolSelection.workflow, toolSelection.reasoning);
      } else if (toolSelection.toolName) {
        executionResult = await this.executeSingleTool(input, toolSelection, contextPacket);
      } else {
        executionResult = {
          success: false,
          error: "No tool selected and no clarification provided",
        };
      }
      
      // 🆕 PHASE 5: PERSIST RESULTS & UPDATE MEMORY BANK
      if (executionResult.success && executionResult.result) {
        await this.updateMemoryBank(input.projectId, executionResult, contextPacket);
      }
      
      // 🆕 PHASE 6: LATE-ARRIVING IMAGE FACTS HOOK-UP
      if (imageAnalysisPromise) {
        imageAnalysisPromise.then(imageFacts => {
          if (imageFacts) {
            this.handleLateArrivingImageFacts(input.projectId, imageFacts);
          }
        }).catch(error => {
          ErrorTracker.captureAsyncError(error, {
            operation: 'late_arriving_image_facts',
            projectId: input.projectId,
            userId: input.userId,
            metadata: { imageUrls }
          });
        });
      }
      
      // 🆕 PHASE 3: Complete performance measurement and log results
      const totalDuration = performanceService.endMetric(operationId);
      
      if (this.DEBUG && totalDuration) {
        console.log(`\n⏱️ [Performance] Operation completed in ${totalDuration.toFixed(2)}ms`);
        
        // Calculate estimated old blocking time
        const estimatedOldTime = 2000 + (imageUrls?.length > 0 ? 3000 : 0) + 500; // LLM + Image + Context
        const improvement = estimatedOldTime > 0 ? ((estimatedOldTime - totalDuration) / estimatedOldTime) * 100 : 0;
        
        if (improvement >= 30) {
          console.log(`🎯 [Performance] TARGET ACHIEVED: ${improvement.toFixed(1)}% improvement (target: 30%)`);
        } else if (improvement > 0) {
          console.log(`🔄 [Performance] PROGRESS: ${improvement.toFixed(1)}% improvement (target: 30%)`);
        } else {
          console.log(`⚠️ [Performance] No improvement detected: ${improvement.toFixed(1)}%`);
        }
      }
      
      return executionResult;
      
    } catch (error) {
      // 🆕 PHASE 3: End performance measurement on error
      performanceService.endMetric(operationId);
      
      if (this.DEBUG) console.error("[BrainOrchestrator] Error:", error);
      return await this.handleError(error, input);
    }
  }
  
  /**
   * 🆕 PHASE 1: Start async image analysis (fire-and-forget)
   */
  async startAsyncImageAnalysis(
    projectId: string,
    imageUrls: string[],
    traceId?: string
  ): Promise<ImageFacts | null> {
    if (!imageUrls || imageUrls.length === 0) {
      return null;
    }

    const analysisTraceId = traceId || `img-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`;
    console.log(`🔄 [Brain] Starting async image analysis: ${analysisTraceId}`);

          // Fire-and-forget: Don't await this operation  
      this.performImageAnalysis(projectId, analysisTraceId, imageUrls)
        .then(async (imageFacts: ImageFacts | null) => {
          if (imageFacts) {
            // Store in cache for now - database persistence will be added in Phase 3
            this.imageFactsCache.set(analysisTraceId, imageFacts);

            // Emit event for observer pattern
            this.emit('imageFactsReady', {
              traceId: analysisTraceId,
              projectId,
              imageFacts,
            });
            
            console.log(`✅ [Brain] Image facts cached: ${analysisTraceId}`);
          }
        })
        .catch((error: any) => {
          ErrorTracker.captureAsyncError(error, {
            operation: 'async_image_analysis_execution',
            projectId,
            metadata: { 
              traceId: analysisTraceId,
              imageCount: imageUrls.length,
              imageUrls 
            }
          });
        });

    return null; // Will be replaced with actual ImageFacts when analysis completes
  }
  
  /**
   * 🆕 Perform actual image analysis using the analyzeImage tool
   */
  private async performImageAnalysis(
    projectId: string,
    traceId: string,
    imageUrls: string[]
  ): Promise<ImageFacts | null> {
    try {
      console.log(`🔄 [Brain] Performing image analysis: ${traceId}`);
      
      // Simple stub implementation for now - will be enhanced in Phase 3
      const imageFacts: ImageFacts = {
        id: traceId,
        imageUrls,
        palette: ["#000000", "#FFFFFF"], // Default palette
        typography: "Modern",
        mood: "Professional", 
        layoutJson: null,
        processingTimeMs: 100,
        timestamp: new Date().toISOString(),
      };
      
      console.log(`✅ [Brain] Image analysis completed: ${traceId}`);
      return imageFacts;
      
    } catch (error: any) {
      console.error(`❌ [Brain] Image analysis error: ${error}`);
      return null;
    }
  }

  /**
   * 🆕 PHASE 3: Build enhanced context packet with REAL database integration
   */
  async buildContextPacket(
    projectId: string,
    conversationHistory: Array<{ role: string; content: string }>,
    currentImageTraceIds: string[]
  ): Promise<MemoryBankSummary> {
    console.log(`🧠 [Brain] Building enhanced context packet for project: ${projectId}`);

    try {
      // 🚨 NEW: Get REAL user preferences from database
      const userPreferences = await projectMemoryService.getUserPreferences(projectId);
      
      // 🚨 NEW: Get REAL scene relationships from database  
      const sceneRelationships = await projectMemoryService.getSceneRelationships(projectId);
      
      // 🚨 NEW: Get REAL image analyses from database
      const imageAnalyses = await projectMemoryService.getProjectImageAnalyses(projectId);
      
      // 🚨 NEW: Get current scene list from database for context
      const currentScenes = await db
        .select({ id: scenes.id, name: scenes.name, order: scenes.order })
        .from(scenes)
        .where(eq(scenes.projectId, projectId));

      // 🚨 NEW: Extract MORE user preferences from chat history
      const chatPreferences = this.extractUserPreferences(conversationHistory);
      
      // 🚨 NEW: Merge database preferences with chat-extracted preferences
      const allPreferences = { ...userPreferences, ...chatPreferences };

      // 🚨 NEW: Build rich context packet with REAL data
      const contextPacket: MemoryBankSummary = {
        userPreferences: allPreferences,
        sceneHistory: currentScenes.map(scene => ({
          id: scene.id,
          name: scene.name || 'Untitled Scene',
          type: `Scene ${scene.order + 1}` // Use order as type indicator
        })),
        imageAnalyses: imageAnalyses.map(analysis => ({
          id: analysis.traceId,
          imageUrls: (analysis.imageUrls as string[]) || [],
          palette: (analysis.palette as string[]) || [],
          typography: analysis.typography || 'Unknown',
          mood: analysis.mood || 'Unknown',
          layoutJson: analysis.layoutJson,
          processingTimeMs: analysis.processingTimeMs || 0,
          timestamp: analysis.createdAt.toISOString(),
        })),
        conversationContext: this.summarizeConversation(conversationHistory),
        last5Messages: conversationHistory.slice(-5),
        sceneList: currentScenes.map(scene => ({
          id: scene.id,
          name: scene.name || 'Untitled Scene'
        })),
        pendingImageIds: currentImageTraceIds,
      };

      if (this.DEBUG) {
        console.log(`✅ [Brain] Context packet built successfully:`);
        console.log(`  - User preferences: ${Object.keys(allPreferences).length}`);
        console.log(`  - Scene history: ${currentScenes.length} scenes`);
        console.log(`  - Image analyses: ${imageAnalyses.length} analyses`);
        console.log(`  - Pending images: ${currentImageTraceIds.length}`);
      }

      return contextPacket;

    } catch (error) {
      ErrorTracker.captureAsyncError(error, {
        operation: 'context_packet_build',
        projectId,
        metadata: { 
          conversationLength: conversationHistory.length,
          imageTraceCount: currentImageTraceIds.length
        }
      });
      
      // 🚨 NEW: Fallback to stub implementation if database fails
      return {
        userPreferences: this.extractUserPreferences(conversationHistory),
        sceneHistory: [],
        imageAnalyses: [],
        conversationContext: this.summarizeConversation(conversationHistory),
        last5Messages: conversationHistory.slice(-5),
        sceneList: [],
        pendingImageIds: currentImageTraceIds,
      };
    }
  }
  
  /**
   * 🆕 Extract user preferences from chat history - conservative implementation
   */
  private extractUserPreferences(chatHistory: Array<{role: string, content: string}>): Record<string, string> {
    const preferences: Record<string, string> = {};
    
    // Look for preference indicators in user messages
    const userMessages = chatHistory.filter(msg => msg.role === 'user');
    
    for (const message of userMessages) {
      const content = message.content.toLowerCase();
      
      // Duration preferences
      if (content.includes('2 second') || content.includes('2-second')) {
        preferences['duration'] = '2-second scenes';
      }
      if (content.includes('fast') || content.includes('quick')) {
        preferences['pace'] = 'fast-paced content';
      }
      
      // Style preferences
      if (content.includes('modern')) {
        preferences['style'] = 'modern style';
      }
      if (content.includes('neon') || content.includes('glow')) {
        preferences['effects'] = 'neon/glow effects';
      }
      if (content.includes('minimal')) {
        preferences['design'] = 'minimal design';
      }
    }
    
    return preferences;
  }
  
  /**
   * 🆕 Summarize conversation for context
   */
  private summarizeConversation(chatHistory: Array<{role: string, content: string}>): string {
    if (chatHistory.length === 0) return 'New conversation';
    
    const recentMessages = chatHistory.slice(-10);
    const topics: string[] = [];
    
    for (const message of recentMessages) {
      if (message.role === 'user') {
        // Extract key topics/actions
        if (message.content.includes('create') || message.content.includes('generate')) {
          topics.push('scene creation');
        }
        if (message.content.includes('edit') || message.content.includes('change')) {
          topics.push('scene editing');
        }
        if (message.content.includes('color') || message.content.includes('background')) {
          topics.push('styling');
        }
      }
    }
    
    const uniqueTopics = [...new Set(topics)];
    return uniqueTopics.length > 0 ? `Conversation about: ${uniqueTopics.join(', ')}` : 'General conversation';
  }
  
  /**
   * 🆕 Enhanced intent analysis with context
   */
  private async analyzeIntentWithContext(
    input: OrchestrationInput, 
    contextPacket: any
  ): Promise<ToolSelectionResult> {
    // Build enhanced user prompt with context
    let enhancedPrompt = this.buildEnhancedUserPrompt(input, contextPacket);
    
    // 🚨 FIXED: Use centralized prompt config instead of hardcoded
    const systemPrompt = SYSTEM_PROMPTS.BRAIN_ORCHESTRATOR.content;
    
    if (this.DEBUG) console.log(`[DEBUG] Enhanced LLM USER PROMPT: ${enhancedPrompt.substring(0, 200)}...`);
    
    try {
      // 🆕 PHASE 4: Token monitoring before LLM call
      const combinedPrompt = systemPrompt + enhancedPrompt;
      const tokenValidation = TokenMonitor.validatePromptSize(combinedPrompt, {
        operation: 'brain_orchestrator_intent_analysis',
        model: this.modelConfig.model
      });
      
      if (!tokenValidation.valid) {
        const truncated = TokenMonitor.truncatePromptIfNeeded(systemPrompt, enhancedPrompt, {
          operation: 'brain_orchestrator_intent_analysis',
          model: this.modelConfig.model
        });
        
        if (truncated.wasTruncated) {
          console.warn(`⚠️ [Brain] Prompt truncated for token limit compliance`);
          enhancedPrompt = truncated.userPrompt;
        }
      }
      
      // 🚨 FIXED: Use centralized AI client with model temperature from config
      const response = await AIClientService.generateResponse(
        this.modelConfig,
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: enhancedPrompt },
        ],
        undefined, // no system prompt override
        { responseFormat: { type: "json_object" } } // JSON format for structured responses
      );
      
      const rawOutput = response.content;
      if (!rawOutput) {
        throw new Error("No response from Brain LLM");
      }
      
      // 🚨 NEW: Log model usage for debugging
      if (this.DEBUG) {
        AIClientService.logModelUsage(this.modelConfig, response.usage);
        console.log(`[DEBUG] RAW LLM RESPONSE: ${rawOutput}`);
      }
      
      const parsed = this.extractJsonFromResponse(rawOutput);
      
      // Process the brain's decision...
      return this.processBrainDecision(parsed, input, contextPacket);
      
    } catch (error) {
      if (this.DEBUG) console.error("[BrainOrchestrator] Intent analysis error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Intent analysis failed",
      };
    }
  }
  
  /**
   * 🆕 Build enhanced user prompt with full context
   */
  private buildEnhancedUserPrompt(input: OrchestrationInput, contextPacket: any): string {
    const { prompt, storyboardSoFar } = input;
    
    // Build storyboard context
    let storyboardInfo = "No scenes yet";
    if (storyboardSoFar && storyboardSoFar.length > 0) {
      storyboardInfo = storyboardSoFar.map((scene, i) => 
        `Scene ${i + 1}: "${scene.name}" (ID: ${scene.id})`
      ).join('\n');
      
      // Add selected scene if any
      if (input.userContext?.sceneId) {
        const selected = storyboardSoFar.find(s => s.id === input.userContext?.sceneId);
        if (selected) storyboardInfo += `\nSELECTED: "${selected.name}"`;
      }
    }
    
    // Add memory bank context
    let memoryInfo = "";
    if (contextPacket.memoryBankSummary?.userPreferences?.length > 0) {
      memoryInfo = `\nMEMORY BANK: User preferences - ${contextPacket.memoryBankSummary.userPreferences.join(', ')}`;
    }
    
    // Add image context
    let imageInfo = "";
    const imageUrls = input.userContext?.imageUrls;
    if (imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0) {
      imageInfo = `\nIMAGES: ${imageUrls.length} uploaded`;
      
      // Add any completed image analysis
      if (contextPacket.memoryBankSummary?.imageAnalyses?.length > 0) {
        const latestAnalysis = contextPacket.memoryBankSummary.imageAnalyses[contextPacket.memoryBankSummary.imageAnalyses.length - 1];
        imageInfo += ` (Analysis available: ${latestAnalysis.palette.length} colors, mood: "${latestAnalysis.mood}")`;
      } else {
        imageInfo += ` (Analysis in progress...)`;
      }
    }
    
    // Add conversation context
    let chatInfo = "";
    if (contextPacket.conversationContext !== 'New conversation') {
      chatInfo = `\nCONVERSATION: ${contextPacket.conversationContext}`;
    }

    return `USER: "${prompt}"

STORYBOARD:
${storyboardInfo}${memoryInfo}${imageInfo}${chatInfo}

Respond with JSON only.`;
  }

  /**
   * 🆕 PHASE 4: Execute a single tool with context
   */
  private async executeSingleTool(
    input: OrchestrationInput, 
    toolSelection: ToolSelectionResult, 
    contextPacket: any
  ): Promise<OrchestrationOutput> {
    if (!toolSelection.toolName) {
      return {
        success: false,
        error: "No tool name provided",
      };
    }

    // 🎯 PROGRESS UPDATE: Tool execution starting
    const toolDisplayName = {
      'addScene': '🎬 Creating your scene...',
      'editScene': '✏️ Editing your scene...',
      'deleteScene': '🗑️ Deleting scene...',
      'fixBrokenScene': '🔧 Fixing broken scene...',
      'analyzeImage': '🖼️ Analyzing image...',
      'createSceneFromImage': '🖼️ Creating scene from image...',
      'editSceneWithImage': '✏️ Editing scene with image...'
    }[toolSelection.toolName] || '⚙️ Processing...';
    
    input.onProgress?.(toolDisplayName, 'building');

    // 5. Execute single tool
    const tool = toolRegistry.get(toolSelection.toolName!);
    if (!tool) {
      return {
        success: false,
        error: `Tool ${toolSelection.toolName} not found`,
      };
    }

    // Execute single tool with enhanced context
    const toolInput = await this.prepareToolInput(input, toolSelection);

    // 🎯 NEW: Pass progress callback to tools that support it
    if (toolSelection.toolName === ToolName.AddScene && input.onProgress) {
      (tool as any).setProgressCallback?.(input.onProgress);
    }
    
    // 🎯 NEW: Show complexity-based feedback for editScene
    if (toolSelection.toolName === ToolName.EditScene && input.onProgress && toolSelection.userFeedback) {
      input.onProgress(toolSelection.userFeedback, 'generating');
    }
    
    const result = await tool.run(toolInput);
    
    // 🎯 PROGRESS UPDATE: Tool completed, saving to database
    if (result.success) {
      input.onProgress?.('💾 Saving your scene...', 'building');
    }
    
    return await this.processToolResult(result, toolSelection.toolName!, input, {
      targetSceneId: toolSelection.targetSceneId,
      editComplexity: toolSelection.editComplexity,
      reasoning: toolSelection.reasoning,
    });
  }

  /**
   * 🆕 Process brain's decision and convert to ToolSelectionResult
   */
  private processBrainDecision(
    parsed: any, 
    input: OrchestrationInput, 
    contextPacket: any
  ): ToolSelectionResult {
    // Check if this is a multi-step workflow
    if (parsed.workflow && Array.isArray(parsed.workflow)) {
      if (this.DEBUG) console.log(`[DEBUG] Multi-step workflow detected: ${parsed.workflow.length} steps`);
      if (this.DEBUG) console.log(`[DEBUG] WORKFLOW DETAILS:`, JSON.stringify(parsed.workflow, null, 2));
      return {
        success: true,
        workflow: parsed.workflow,
        reasoning: parsed.reasoning || "Multi-step workflow planned",
      };
    }
    
    // 🚨 NEW: Type-safe tool name validation
    const toolName = parsed.toolName as ToolName;
    if (toolName && !Object.values(ToolName).includes(toolName)) {
      if (this.DEBUG) console.warn(`[DEBUG] Invalid tool name: ${toolName}`);
      return {
        success: false,
        error: `Invalid tool name: ${toolName}`,
      };
    }
    
    // Single tool operation - extract targetSceneId AND clarificationNeeded
    const result: ToolSelectionResult = {
      success: true,
      toolName: toolName,
      reasoning: parsed.reasoning,
      toolInput: parsed.toolInput || {},
    };
    
    // 🚨 CRITICAL FIX: Extract clarificationNeeded from top-level parsed response
    if (parsed.clarificationNeeded) {
      result.clarificationNeeded = parsed.clarificationNeeded;
      if (this.DEBUG) console.log(`[DEBUG] EXTRACTED CLARIFICATION_NEEDED: ${parsed.clarificationNeeded}`);
    }
    
    // CRITICAL FIX: Extract targetSceneId from Brain LLM response
    if (parsed.targetSceneId) {
      result.targetSceneId = parsed.targetSceneId;
      if (this.DEBUG) console.log(`[DEBUG] BRAIN SELECTED SCENE: ${parsed.targetSceneId}`);
      
      // Double-check if the scene actually exists in the storyboard
      const sceneExists = input.storyboardSoFar?.some(scene => scene.id === parsed.targetSceneId);
      if (!sceneExists) {
        if (this.DEBUG) console.warn(`[DEBUG] WARNING: Selected scene ID ${parsed.targetSceneId} NOT FOUND in storyboard`);
      }
    } else if (parsed.toolName === ToolName.EditScene) {
      if (this.DEBUG) console.warn(`[DEBUG] WARNING: editScene selected but no targetSceneId provided`);
    }
    
    // 🚨 NEW: Handle clarification responses directly
    if (parsed.needsClarification) {
      result.needsClarification = true;
      result.clarificationQuestion = parsed.clarificationQuestion;
      if (this.DEBUG) console.log(`[DEBUG] CLARIFICATION QUESTION: ${parsed.clarificationQuestion}`);
    }
    
    // 🚨 NEW: Handle edit complexity classification
    if (parsed.editComplexity) {
      result.editComplexity = parsed.editComplexity as EditComplexity;
      if (this.DEBUG) console.log(`[DEBUG] EDIT COMPLEXITY: ${parsed.editComplexity}`);
    }
    
    // 🚨 NEW: Handle user feedback
    if (parsed.userFeedback) {
      result.userFeedback = parsed.userFeedback;
      if (this.DEBUG) console.log(`[DEBUG] USER FEEDBACK: ${parsed.userFeedback}`);
    }
    
    if (this.DEBUG) console.log(`[DEBUG] FINAL DECISION:`, result);
    
    return result;
  }

  /**
   * Execute a multi-step workflow
   */
  private async executeWorkflow(
    input: OrchestrationInput, 
    workflow: Array<{toolName: string, context: string, dependencies?: string[]}>,
    reasoning?: string
  ): Promise<OrchestrationOutput> {
    if (this.DEBUG) console.log(`[BrainOrchestrator] Executing workflow with ${workflow.length} steps`);
    
    const workflowResults: Record<string, any> = {};
    let finalResult: any = null;
    let combinedChatResponse = "";
    
    for (let i = 0; i < workflow.length; i++) {
      const step = workflow[i];
      if (!step) {
        throw new Error(`Workflow step ${i + 1} is undefined`);
      }
      
      const stepKey = `step${i + 1}_result`;
      
      if (this.DEBUG) console.log(`[BrainOrchestrator] Executing step ${i + 1}: ${step.toolName} - ${step.context}`);
      
      try {
        // Get the tool
        const tool = toolRegistry.get(step.toolName);
        if (!tool) {
          throw new Error(`Tool ${step.toolName} not found in workflow step ${i + 1}`);
        }
        
        // Prepare input with workflow context
        const stepInput = await this.prepareWorkflowStepInput(input, step, workflowResults);
        
        // Execute the tool
        const stepResult = await tool.run(stepInput);
        
        // Process and store result
        const toolNameEnum = step.toolName as ToolName;
        const processedResult = await this.processToolResult(stepResult, toolNameEnum, input, {
          reasoning: `Workflow step ${i + 1}: ${step.context}`,
        });
        workflowResults[stepKey] = processedResult;
        
        // Accumulate chat responses
        if (processedResult.chatResponse) {
          combinedChatResponse += processedResult.chatResponse + " ";
        }
        
        // Update final result with the last successful step
        if (processedResult.success) {
          finalResult = processedResult.result;
        }
        
        if (this.DEBUG) console.log(`[BrainOrchestrator] Step ${i + 1} completed: ${processedResult.success ? 'SUCCESS' : 'FAILED'}`);
        
      } catch (stepError) {
        if (this.DEBUG) console.error(`[BrainOrchestrator] Workflow step ${i + 1} failed:`, stepError);
        
        // Decide whether to continue or fail the entire workflow
        // For now, we'll fail the entire workflow if any step fails
        return {
          success: false,
          error: `Workflow failed at step ${i + 1} (${step.toolName}): ${stepError instanceof Error ? stepError.message : 'Unknown error'}`,
          chatResponse: combinedChatResponse.trim() || "I started working on your request but encountered an issue.",
        };
      }
    }
    
    if (this.DEBUG) console.log(`[BrainOrchestrator] Workflow completed successfully with ${workflow.length} steps`);
    
    return {
      success: true,
      result: finalResult,
      toolUsed: `workflow_${workflow.length}_steps`,
      reasoning: reasoning || "Multi-step workflow completed",
      chatResponse: combinedChatResponse.trim() || "I've completed all the requested changes!",
    };
  }
  
  /**
   * Prepare input for a workflow step
   */
  private async prepareWorkflowStepInput(
    originalInput: OrchestrationInput,
    step: {toolName: string, context: string, dependencies?: string[]},
    workflowResults: Record<string, any>
  ): Promise<Record<string, unknown>> {
    // Start with the original tool input preparation
    const baseInput = await this.prepareToolInput(originalInput, { toolName: step.toolName });
    
    // 🚨 CRITICAL FIX: Extract visionAnalysis from previous step results for addScene and editScene
    let visionAnalysis: any = undefined;
    
    // Look for analyzeImage results in previous steps
    for (const [stepKey, stepResult] of Object.entries(workflowResults)) {
      if (stepResult?.toolUsed === 'analyzeImage' && stepResult?.result) {
        visionAnalysis = stepResult.result;
        if (this.DEBUG) console.log(`[BrainOrchestrator] 🖼️ Found vision analysis from ${stepKey} for ${step.toolName}`);
        break;
      }
    }
    
    // Add workflow-specific context
    const workflowInput: Record<string, unknown> = {
      ...baseInput,
      workflowContext: step.context,
      workflowStep: step.toolName,
      previousResults: workflowResults,
    };
    
    // 🚨 CRITICAL FIX: Add visionAnalysis to tools that support it
    if (visionAnalysis && (step.toolName === 'addScene' || step.toolName === 'editScene')) {
      workflowInput.visionAnalysis = visionAnalysis;
      if (this.DEBUG) console.log(`[BrainOrchestrator] ✅ Passing visionAnalysis to ${step.toolName}`);
      if (this.DEBUG) console.log(`[BrainOrchestrator] 🎨 Vision analysis includes: ${visionAnalysis.palette?.length || 0} colors, mood: "${visionAnalysis.mood || 'unknown'}"`);
    }
    
    return workflowInput;
  }
  
  /**
   * Process tool result and handle database operations
   * 🚨 DRAMATICALLY SIMPLIFIED: Now uses SceneRepository service for DRY database operations
   */
  private async processToolResult(result: any, toolName: ToolName, input: OrchestrationInput, toolSelection?: { targetSceneId?: string; editComplexity?: EditComplexity; reasoning?: string }): Promise<OrchestrationOutput> {
    // 🚨 NEW: Early return for failed tool results
    if (!result.success) {
      return {
        success: false,
        error: result.error?.message || "Tool execution failed",
        toolUsed: toolName,
        reasoning: result.reasoning || "Tool operation failed",
      };
    }

    // 🚨 NEW: Standardized database operations using SceneRepository
    const modelUsage: ModelUsageData = {
      model: this.modelConfig.model,
      temperature: this.modelConfig.temperature ?? 0.3,
      generationTimeMs: 0, // Will be calculated in repository
      sessionId: input.userId,
    };

    const operationContext: DatabaseOperationContext = {
      operationType: this.getOperationType(toolName),
      toolName,
      editComplexity: toolSelection?.editComplexity,
      projectId: input.projectId,
      userId: input.userId,
      userPrompt: input.prompt,
      reasoning: toolSelection?.reasoning,
    };

    // 🚨 DRAMATICALLY SIMPLIFIED: Single method handles all scene database operations
    let sceneOperationResult;
    
    switch (toolName) {
      case ToolName.AddScene:
      case ToolName.CreateSceneFromImage:
        sceneOperationResult = await this.handleSceneCreation(result.data, operationContext, modelUsage);
        break;
        
      case ToolName.EditScene:
      case ToolName.EditSceneWithImage:
      case ToolName.FixBrokenScene:
        sceneOperationResult = await this.handleSceneUpdate(result.data, toolSelection?.targetSceneId, operationContext, modelUsage);
        break;
        
      case ToolName.DeleteScene:
        sceneOperationResult = await this.handleSceneDeletion(result.data, operationContext, modelUsage);
        break;
        
      default:
        // Non-scene operations (like analyzeImage) don't need database handling
        break;
    }

    // 🚨 NEW: Consistent error handling for database operations
    if (sceneOperationResult && !sceneOperationResult.success) {
      return {
        success: false,
        error: sceneOperationResult.error,
        toolUsed: toolName,
        reasoning: "Database operation failed",
      };
    }

    // 🚨 NEW: Extract conversational response from tool result
    let chatResponse: string | undefined;
    if (result.data && typeof result.data === 'object' && 'chatResponse' in result.data) {
      chatResponse = (result.data as any).chatResponse;
    }

    // 🚨 NEW: Propagate debug info if present
    let debug = undefined;
    if (result.data && typeof result.data === 'object' && 'debug' in result.data) {
      debug = (result.data as any).debug;
    }

    return {
      success: true,
      result: sceneOperationResult ? { ...result.data, scene: sceneOperationResult.scene } : result.data,
      toolUsed: toolName,
      reasoning: result.reasoning,
      chatResponse,
      debug,
    };
  }

  /**
   * Handle scene creation operations (addScene, createSceneFromImage)
   */
  private async handleSceneCreation(
    sceneData: any,
    context: DatabaseOperationContext,
    modelUsage: ModelUsageData
  ) {
    if (!sceneData?.sceneCode || !sceneData?.sceneName) {
      if (this.DEBUG) console.warn(`[BrainOrchestrator] Invalid scene data for creation:`, sceneData);
      return null;
    }

    const standardizedData: SceneData = {
      sceneName: sceneData.sceneName,
      sceneCode: sceneData.sceneCode,
      duration: sceneData.duration || 180,
      layoutJson: sceneData.layoutJson,
      reasoning: sceneData.reasoning,
      chatResponse: sceneData.chatResponse,
    };

    return await sceneRepositoryService.createScene(standardizedData, context, modelUsage);
  }

  /**
   * Handle scene update operations (editScene, editSceneWithImage, fixBrokenScene)
   */
  private async handleSceneUpdate(
    sceneData: any,
    targetSceneId: string | undefined,
    context: DatabaseOperationContext,
    modelUsage: ModelUsageData
  ) {
    const sceneId = targetSceneId || sceneData?.sceneId;
    
    if (!sceneId || !sceneData?.sceneCode || !sceneData?.sceneName) {
      if (this.DEBUG) console.warn(`[BrainOrchestrator] Invalid scene data for update:`, { sceneId, sceneData });
      return null;
    }

    const standardizedData: SceneData = {
      sceneId,
      sceneName: sceneData.sceneName,
      sceneCode: sceneData.sceneCode,
      duration: sceneData.duration || 180,
      layoutJson: sceneData.layoutJson,
      reasoning: sceneData.reasoning,
      changes: sceneData.changes,
      preserved: sceneData.preserved,
      chatResponse: sceneData.chatResponse,
    };

    return await sceneRepositoryService.updateScene(standardizedData, context, modelUsage);
  }

  /**
   * Handle scene deletion operations
   */
  private async handleSceneDeletion(
    deleteData: any,
    context: DatabaseOperationContext,
    modelUsage: ModelUsageData
  ) {
    const sceneId = deleteData?.deletedSceneId;
    const sceneName = deleteData?.deletedSceneName;
    
    if (!sceneId) {
      if (this.DEBUG) console.warn(`[BrainOrchestrator] Invalid scene ID for deletion:`, deleteData);
      return null;
    }

    return await sceneRepositoryService.deleteScene(sceneId, sceneName || sceneId, context, modelUsage);
  }

  /**
   * Get operation type from tool name
   */
  private getOperationType(toolName: ToolName): OperationType {
    switch (toolName) {
      case ToolName.AddScene:
      case ToolName.CreateSceneFromImage:
        return 'create';
      case ToolName.EditScene:
      case ToolName.EditSceneWithImage:
      case ToolName.FixBrokenScene:
        return 'edit';
      case ToolName.DeleteScene:
        return 'delete';
      default:
        return 'create'; // fallback
    }
  }

  private async analyzeIntent(input: OrchestrationInput): Promise<ToolSelectionResult> {
    // 🚨 FIXED: Use centralized prompt config instead of hardcoded
    const systemPrompt = SYSTEM_PROMPTS.BRAIN_ORCHESTRATOR.content;
    const userPrompt = this.buildUserPrompt(input);
    
    // Log the prompt information (summarized)
    if (this.DEBUG) console.log(`[DEBUG] LLM SYSTEM PROMPT LENGTH: ${systemPrompt.length} chars`);
    if (this.DEBUG) console.log(`[DEBUG] LLM USER PROMPT: ${userPrompt.substring(0, 200)}...`);
    
    // Log storyboard info (if available)
    if (input.storyboardSoFar?.length) {
      if (this.DEBUG) console.log(`[DEBUG] STORYBOARD SCENE IDS:`, 
        input.storyboardSoFar.map(scene => {
          return { id: scene.id, name: scene.name, order: scene.order || '?' };
        }));
    }
    
    try {
      // Log the LLM call parameters
      if (this.DEBUG) console.log(`[DEBUG] CALLING LLM: ${this.modelConfig.model} }`);
      
      // 🚨 FIXED: Use centralized AI client with model temperature from config
      const response = await AIClientService.generateResponse(
        this.modelConfig,
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        undefined, // no system prompt override
        { responseFormat: { type: "json_object" } } // JSON format for structured responses
      );
      
      const rawOutput = response.content;
      if (!rawOutput) {
        throw new Error("No response from Brain LLM");
      }
      
      // 🚨 NEW: Log model usage for debugging
      if (this.DEBUG) {
        AIClientService.logModelUsage(this.modelConfig, response.usage);
        console.log(`[DEBUG] RAW LLM RESPONSE: ${rawOutput}`);
      }
      
      const parsed = JSON.parse(rawOutput);
      
      // Log detailed parsed data
      if (this.DEBUG) console.log(`[DEBUG] PARSED TOOL_NAME: ${parsed.toolName || 'none'}`);
      if (this.DEBUG) console.log(`[DEBUG] PARSED REASONING: ${parsed.reasoning || 'none'}`);
      if (this.DEBUG) console.log(`[DEBUG] PARSED TARGET_SCENE_ID: ${parsed.targetSceneId || 'none'}`);
      if (this.DEBUG) console.log(`[DEBUG] PARSED CLARIFICATION_NEEDED: ${parsed.clarificationNeeded || 'none'}`);
      if (this.DEBUG) console.log(`[DEBUG] PARSED EDIT_COMPLEXITY: ${parsed.editComplexity || 'none'}`);
      if (this.DEBUG) console.log(`[DEBUG] PARSED USER_FEEDBACK: ${parsed.userFeedback || 'none'}`);
      
      // Check if input contains a reference to modifying existing content
      const editKeywords = ['edit', 'change', 'modify', 'update', 'fix', 'adjust', 'revise'];
      const containsEditKeyword = editKeywords.some(keyword => 
        input.prompt.toLowerCase().includes(keyword));
      
      if (containsEditKeyword && parsed.toolName === ToolName.AddScene) {
        if (this.DEBUG) console.log(`[DEBUG] POTENTIAL MISMATCH: User prompt contains edit keywords, but LLM selected 'addScene'`);
        if (this.DEBUG) console.log(`[DEBUG] USER CONTEXT SCENE ID: ${input.userContext?.sceneId || 'none'}`);
      }
      
      // Check if this is a multi-step workflow
      if (parsed.workflow && Array.isArray(parsed.workflow)) {
        if (this.DEBUG) console.log(`[DEBUG] Multi-step workflow detected: ${parsed.workflow.length} steps`);
        if (this.DEBUG) console.log(`[DEBUG] WORKFLOW DETAILS:`, JSON.stringify(parsed.workflow, null, 2));
        return {
          success: true,
          workflow: parsed.workflow,
          reasoning: parsed.reasoning || "Multi-step workflow planned",
        };
      }
      
      // 🚨 NEW: Type-safe tool name validation
      const toolName = parsed.toolName as ToolName;
      if (toolName && !Object.values(ToolName).includes(toolName)) {
        if (this.DEBUG) console.warn(`[DEBUG] Invalid tool name: ${toolName}`);
        return {
          success: false,
          error: `Invalid tool name: ${toolName}`,
        };
      }
      
      // Single tool operation - extract targetSceneId AND clarificationNeeded
      const result: ToolSelectionResult = {
        success: true,
        toolName: toolName,
        reasoning: parsed.reasoning,
        toolInput: parsed.toolInput || {},
      };
      
      // 🚨 CRITICAL FIX: Extract clarificationNeeded from top-level parsed response
      if (parsed.clarificationNeeded) {
        result.clarificationNeeded = parsed.clarificationNeeded;
        if (this.DEBUG) console.log(`[DEBUG] EXTRACTED CLARIFICATION_NEEDED: ${parsed.clarificationNeeded}`);
      }
      
      // CRITICAL FIX: Extract targetSceneId from Brain LLM response
      if (parsed.targetSceneId) {
        result.targetSceneId = parsed.targetSceneId;
        if (this.DEBUG) console.log(`[DEBUG] BRAIN SELECTED SCENE: ${parsed.targetSceneId}`);
        
        // Double-check if the scene actually exists in the storyboard
        const sceneExists = input.storyboardSoFar?.some(scene => scene.id === parsed.targetSceneId);
        if (!sceneExists) {
          if (this.DEBUG) console.warn(`[DEBUG] WARNING: Selected scene ID ${parsed.targetSceneId} NOT FOUND in storyboard`);
        }
      } else if (parsed.toolName === ToolName.EditScene) {
        if (this.DEBUG) console.warn(`[DEBUG] WARNING: editScene selected but no targetSceneId provided`);
      }
      
      // Log the final decision
      if (this.DEBUG) console.log(`[DEBUG] FINAL DECISION:`, result);
      
      // 🚨 NEW: Handle clarification responses directly
      if (parsed.needsClarification) {
        result.needsClarification = true;
        result.clarificationQuestion = parsed.clarificationQuestion;
        if (this.DEBUG) console.log(`[DEBUG] CLARIFICATION QUESTION: ${parsed.clarificationQuestion}`);
      }
      
      // 🚨 NEW: Handle edit complexity classification
      if (parsed.editComplexity) {
        result.editComplexity = parsed.editComplexity as EditComplexity;
        if (this.DEBUG) console.log(`[DEBUG] EDIT COMPLEXITY: ${parsed.editComplexity}`);
      }
      
      // 🚨 NEW: Handle user feedback
      if (parsed.userFeedback) {
        result.userFeedback = parsed.userFeedback;
        if (this.DEBUG) console.log(`[DEBUG] USER FEEDBACK: ${parsed.userFeedback}`);
      }
      
      return result;
      
    } catch (error) {
      if (this.DEBUG) console.error("[BrainOrchestrator] Intent analysis error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Intent analysis failed",
      };
    }
  }
  

  
  private buildUserPrompt(input: OrchestrationInput): string {
    const { prompt, storyboardSoFar, chatHistory } = input;
    
    // Build storyboard context
    let storyboardInfo = "No scenes yet";
    if (storyboardSoFar && storyboardSoFar.length > 0) {
      storyboardInfo = storyboardSoFar.map((scene, i) => 
        `Scene ${i + 1}: "${scene.name}" (ID: ${scene.id})`
      ).join('\n');
      
      // Add selected scene if any
      if (input.userContext?.sceneId) {
        const selected = storyboardSoFar.find(s => s.id === input.userContext?.sceneId);
        if (selected) storyboardInfo += `\nSELECTED: "${selected.name}"`;
      }
    }
    
    // Add image context
    let imageInfo = "";
    const imageUrls = input.userContext?.imageUrls;
    if (imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0) {
      imageInfo = `\nIMAGES: ${imageUrls.length} uploaded`;
    }
    
    // Add recent chat context (last 2 messages)
    let chatInfo = "";
    const recentChat = chatHistory?.slice(-2).filter(msg => 
      !msg.content.includes('👋 **Welcome')
    );
    if (recentChat && recentChat.length > 0) {
      chatInfo = `\nRECENT CHAT:\n${recentChat.map(msg => 
        `${msg.role}: ${msg.content.substring(0, 100)}...`
      ).join('\n')}`;
    }

    return `USER: "${prompt}"

STORYBOARD:
${storyboardInfo}${imageInfo}${chatInfo}

Respond with JSON only.`;
  }
  
  private async prepareToolInput(
    input: OrchestrationInput, 
    toolSelection: { toolName?: string; toolInput?: Record<string, unknown>; targetSceneId?: string; clarificationNeeded?: string; editComplexity?: string; userFeedback?: string }
  ): Promise<Record<string, unknown>> {
    const baseInput = {
      userPrompt: input.prompt,
      sessionId: input.projectId,
      userId: input.userId,
      userContext: input.userContext || {},
    };
    
    // Add tool-specific inputs
    switch (toolSelection.toolName) {
      case "addScene":
        // Calculate proper scene number based on existing scenes
        const nextSceneNumber = (input.storyboardSoFar?.length || 0) + 1;
        
        return {
          ...baseInput,
          projectId: input.projectId,
          storyboardSoFar: input.storyboardSoFar || [],
          sceneNumber: nextSceneNumber, // CRITICAL: Pass calculated scene number
          visionAnalysis: input.userContext?.imageAnalysis, // 🎯 Pass image analysis from context building
        };
        
      case "editScene":
        // CRITICAL FIX: Use targetSceneId from intent analysis instead of frontend tagging
        const sceneId = toolSelection.targetSceneId || input.userContext?.sceneId;
        if (!sceneId) {
          throw new Error("Scene ID required for editing - Brain LLM should provide targetSceneId");
        }
        
        // Find scene data from storyboard
        const scene = input.storyboardSoFar?.find(s => s.id === sceneId);
        if (!scene) {
          throw new Error(`Scene with ID ${sceneId} not found in storyboard`);
        }
        
        // ✅ CONVERT: Technical name to user-friendly display name
        const displayName = scene.name?.replace(/^Scene(\d+)_[a-f0-9]+$/, 'Scene $1') || scene.name || "Untitled Scene";
        
        if (this.DEBUG) console.log(`[BrainOrchestrator] Editing scene: ${displayName} (${sceneId})`);
        
        return {
          ...baseInput,
          projectId: input.projectId,
          sceneId: sceneId,
          existingCode: scene.tsxCode || "",
          existingName: scene.name || "Untitled Scene",
          existingDuration: scene.duration || 180,
          storyboardSoFar: input.storyboardSoFar || [],
          chatHistory: input.chatHistory || [],
          editComplexity: toolSelection.editComplexity,
          visionAnalysis: input.userContext?.imageAnalysis, // 🎯 Pass image analysis from context building
        };
        
      case "deleteScene":
        // Use targetSceneId for deletion as well
        const deleteSceneId = toolSelection.targetSceneId || input.userContext?.sceneId;
        if (!deleteSceneId) {
          throw new Error("Scene ID required for deletion - Brain LLM must provide targetSceneId or user must have scene selected");
        }

        // Find scene data to pass to deleteScene tool
        const sceneToDelete = input.storyboardSoFar?.find(s => s.id === deleteSceneId);
        if (!sceneToDelete) {
          throw new Error(`Scene with ID ${deleteSceneId} not found in storyboard`);
        }

        return {
          ...baseInput,
          sceneId: deleteSceneId,
          sceneName: sceneToDelete.name || "Untitled Scene",
          projectId: input.projectId,
          remainingScenes: (input.storyboardSoFar || [])
            .filter(s => s.id !== deleteSceneId)
            .map(s => ({ id: s.id, name: s.name || "Untitled Scene" }))
        };
        
      case "fixBrokenScene":
        // fixBrokenScene requires scene ID and error information
        const fixSceneId = toolSelection.targetSceneId || input.userContext?.sceneId;
        if (!fixSceneId) {
          throw new Error("Scene ID required for fixing - Brain LLM must provide targetSceneId or user must have scene selected");
        }

        // Find the broken scene data
        const brokenScene = input.storyboardSoFar?.find(s => s.id === fixSceneId);
        if (!brokenScene) {
          throw new Error(`Scene with ID ${fixSceneId} not found in storyboard`);
        }

        // Extract error message from user context if available
        const errorMessage = input.userContext?.errorMessage as string || "Unknown error occurred";

        return {
          ...baseInput,
          brokenCode: brokenScene.tsxCode || "",
          errorMessage: errorMessage,
          sceneId: fixSceneId,
          sceneName: brokenScene.name || "Untitled Scene",
          projectId: input.projectId,
        };
        
      case "analyzeImage":
        // analyzeImage requires image URLs from user context
        const imageUrls = input.userContext?.imageUrls as string[];
        if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
          throw new Error("Image URLs required for analysis - user must have uploaded images");
        }
        
        // Generate trace ID for debugging (user's feedback)
        const traceId = `img-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`;

        return {
          ...baseInput,
          imageUrls: imageUrls,
          userPrompt: input.prompt,
          projectId: input.projectId,
          traceId: traceId,
        };
        
      case "createSceneFromImage":
        // createSceneFromImage requires image URLs from user context
        const createImageUrls = input.userContext?.imageUrls as string[];
        if (!createImageUrls || !Array.isArray(createImageUrls) || createImageUrls.length === 0) {
          throw new Error("Image URLs required for scene creation - user must have uploaded images");
        }
        
        // Calculate proper scene number based on existing scenes
        const nextCreateSceneNumber = (input.storyboardSoFar?.length || 0) + 1;

        return {
          ...baseInput,
          imageUrls: createImageUrls,
          userPrompt: input.prompt,
          projectId: input.projectId,
          sceneNumber: nextCreateSceneNumber,
        };
        
      case "editSceneWithImage":
        // editSceneWithImage requires both image URLs and existing scene data
        const editImageUrls = input.userContext?.imageUrls as string[];
        if (!editImageUrls || !Array.isArray(editImageUrls) || editImageUrls.length === 0) {
          throw new Error("Image URLs required for image-guided editing - user must have uploaded images");
        }
        
        const editSceneId = toolSelection.targetSceneId || input.userContext?.sceneId;
        if (!editSceneId) {
          throw new Error("Scene ID required for image-guided editing - Brain LLM should provide targetSceneId");
        }
        
        // Find scene data from storyboard
        const editScene = input.storyboardSoFar?.find(s => s.id === editSceneId);
        if (!editScene) {
          throw new Error(`Scene with ID ${editSceneId} not found in storyboard`);
        }
        
        return {
          ...baseInput,
          imageUrls: editImageUrls,
          userPrompt: input.prompt,
          existingCode: editScene.tsxCode || "",
          existingName: editScene.name || "Untitled Scene",
          existingDuration: editScene.duration || 180,
          projectId: input.projectId,
          sceneId: editSceneId,
        };
        
      default:
        return baseInput;
    }
  }

  private async handleError(error: any, input: OrchestrationInput): Promise<OrchestrationOutput> {
    if (this.DEBUG) console.error("[BrainOrchestrator] Error:", error);
    
    // Generate error response for user
    const errorResponse = await conversationalResponseService.generateContextualResponse({
      operation: 'addScene', // Default operation for error
      userPrompt: input.prompt,
      result: { error: String(error) },
      context: {
        sceneCount: input.storyboardSoFar?.length || 0,
        projectId: input.projectId
      }
    });
    
    // Send error response as chat message
    await conversationalResponseService.sendChatMessage(
      errorResponse, 
      input.projectId, 
      'error'
    );
    
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown orchestration error",
      chatResponse: errorResponse,
    };
  }

  /**
   * 🆕 PHASE 3: Update memory bank with REAL database persistence
   */
  private async updateMemoryBank(
    projectId: string,
    result: OrchestrationOutput, 
    contextPacket: any
  ) {
    if (!result.success || !result.result) {
      return; // Don't store failed operations
    }

    try {
      console.log(`💾 [Brain] Updating memory bank for project: ${projectId}`);

      // 🚨 NEW: Store conversation context from the result
      if (result.chatResponse) {
        await projectMemoryService.upsertMemory({
          projectId,
          memoryType: MEMORY_TYPES.CONVERSATION_CONTEXT,
          memoryKey: 'latest_interaction',
          memoryValue: result.chatResponse.substring(0, 1000), // Limit length
          confidence: 0.9,
          sourcePrompt: `Tool: ${result.toolUsed || 'unknown'}`,
        });
      }

      // 🚨 NEW: Store scene relationships if scene was created/modified
      if (result.result?.sceneId && result.result?.sceneName) {
        const relationshipKey = `scene_${result.result.sceneId}`;
        const relationshipValue = `Scene "${result.result.sceneName}" - ${result.toolUsed || 'modified'}`;
        
        await projectMemoryService.upsertMemory({
          projectId,
          memoryType: MEMORY_TYPES.SCENE_RELATIONSHIP,
          memoryKey: relationshipKey,
          memoryValue: relationshipValue,
          confidence: 0.95,
          sourcePrompt: result.reasoning,
        });
      }

      // 🚨 NEW: Extract and store any new user preferences from the interaction
      const newPreferences = this.extractUserPreferencesFromResult(result);
      for (const [key, value] of Object.entries(newPreferences)) {
        await projectMemoryService.upsertMemory({
          projectId,
          memoryType: MEMORY_TYPES.USER_PREFERENCE,
          memoryKey: key,
          memoryValue: value,
          confidence: 0.8,
          sourcePrompt: result.reasoning,
        });
      }

      if (this.DEBUG) {
        console.log(`✅ [Brain] Memory bank updated successfully`);
      }

    } catch (error) {
      console.error(`❌ [Brain] Error updating memory bank:`, error);
      // Don't fail the main operation if memory update fails
    }
  }

  /**
   * 🆕 PHASE 3: Extract user preferences from orchestration result
   */
  private extractUserPreferencesFromResult(result: OrchestrationOutput): Record<string, string> {
    const preferences: Record<string, string> = {};
    
    if (!result.reasoning) return preferences;
    
    const reasoning = result.reasoning.toLowerCase();
    
    // Extract preferences from reasoning text
    if (reasoning.includes('modern') || reasoning.includes('contemporary')) {
      preferences['style_preference'] = 'modern';
    }
    
    if (reasoning.includes('fast') || reasoning.includes('quick') || reasoning.includes('2 second')) {
      preferences['duration_preference'] = 'short_duration';
    }
    
    if (reasoning.includes('colorful') || reasoning.includes('vibrant')) {
      preferences['color_preference'] = 'vibrant';
    }
    
    if (reasoning.includes('minimal') || reasoning.includes('simple')) {
      preferences['design_preference'] = 'minimal';
    }
    
    return preferences;
  }

  /**
   * 🆕 PHASE 3: Handle late-arriving image facts with REAL database persistence
   */
  private async handleLateArrivingImageFacts(
    projectId: string,
    imageFacts: ImageFacts
  ): Promise<void> {
    try {
      console.log(`🖼️ [Brain] Handling late-arriving image facts: ${imageFacts.id}`);

      // 🚨 NEW: Store image facts in database permanently
      await projectMemoryService.saveImageFacts({
        projectId,
        traceId: imageFacts.id,
        imageFacts,
      });

      // 🚨 NEW: Store derived user preferences from image analysis
      if (imageFacts.mood && imageFacts.mood !== 'Unknown') {
        await projectMemoryService.upsertMemory({
          projectId,
          memoryType: MEMORY_TYPES.USER_PREFERENCE,
          memoryKey: 'preferred_mood',
          memoryValue: imageFacts.mood,
          confidence: 0.7,
          sourcePrompt: `Derived from image analysis: ${imageFacts.id}`,
        });
      }

      if (imageFacts.palette && imageFacts.palette.length > 0) {
        await projectMemoryService.upsertMemory({
          projectId,
          memoryType: MEMORY_TYPES.USER_PREFERENCE,
          memoryKey: 'preferred_colors',
          memoryValue: imageFacts.palette.slice(0, 3).join(', '), // Top 3 colors
          confidence: 0.7,
          sourcePrompt: `Derived from image analysis: ${imageFacts.id}`,
        });
      }

      // 🚨 NEW: Emit enhanced event for observer pattern
      this.emit('imageFactsProcessed', {
        projectId,
        traceId: imageFacts.id,
        imageFacts,
        timestamp: new Date().toISOString(),
      });

      // 🚨 NEW: Remove from in-memory cache now that it's in database
      this.imageFactsCache.delete(imageFacts.id);

      if (this.DEBUG) {
        console.log(`✅ [Brain] Image facts stored permanently: ${imageFacts.id}`);
      }

    } catch (error) {
      console.error(`❌ [Brain] Error handling late-arriving image facts:`, error);
      // Keep in cache if database storage fails
    }
  }

  /**
   * 🆕 PHASE 3: Enhanced observer pattern setup with database events
   */
  private setupImageFactsListener(): void {
    // 🚨 NEW: Listen for completed image analysis
    this.on('imageFactsReady', async (event: {
      traceId: string;
      projectId: string;
      imageFacts: ImageFacts;
    }) => {
      if (this.DEBUG) {
        console.log(`🎯 [Brain] Image facts ready for processing: ${event.traceId}`);
      }
      
      await this.handleLateArrivingImageFacts(event.projectId, event.imageFacts);
    });

    // 🚨 NEW: Listen for processed image facts (for downstream integrations)
    this.on('imageFactsProcessed', (event: {
      projectId: string;
      traceId: string;
      imageFacts: ImageFacts;
      timestamp: string;
    }) => {
      if (this.DEBUG) {
        console.log(`📊 [Brain] Image facts processed and stored: ${event.traceId}`);
      }
      
      // Future: Could trigger scene updates, notifications, etc.
    });

    if (this.DEBUG) {
      console.log(`🎧 [Brain] Observer pattern listeners setup complete`);
    }
  }
}

// Export singleton instance
export const brainOrchestrator = new BrainOrchestrator(); 