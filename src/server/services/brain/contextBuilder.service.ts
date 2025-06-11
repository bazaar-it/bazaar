// OPTIMIZED VERSION - Use this to replace contextBuilder.service.ts

import { getAllPrompts } from '~/config/prompts.config';
import { getActiveModelPack } from '~/config/models.config';
import { projectMemoryService } from '../data/projectMemory.service';
import { preferenceExtractor } from './preferenceExtractor.service';
import type { InputProps } from '~/lib/types/video/input-props';

// Simple TTL cache implementation
class TTLCache<K, V> {
  private cache = new Map<K, { value: V; expiry: number }>();
  
  constructor(private ttl: number) {}
  
  set(key: K, value: V): void {
    this.cache.set(key, {
      value,
      expiry: Date.now() + this.ttl
    });
  }
  
  get(key: K): V | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return undefined;
    }
    
    return item.value;
  }
  
  clear(): void {
    this.cache.clear();
  }
}

export interface UserPreferences {
  [key: string]: string | number | boolean;
}

type SceneData = InputProps['scenes'][number];

export interface SceneHistory {
  previousScenes: SceneData[];
  commonElements: string[];
  stylePatterns: string[];
  userFeedbackHistory: string[];
}

export interface MemoryBankContent {
  systemPrompts: ReturnType<typeof getAllPrompts>;
  modelConfigs: ReturnType<typeof getActiveModelPack>;
  recentContext: any[];
  imageFacts: any[];
}

export interface BuiltContext {
  memoryBank: MemoryBankContent;
  userPreferences: UserPreferences;
  sceneHistory: SceneHistory;
  projectContext: {
    projectId: string;
    userId: string;
    isFirstScene: boolean;
    totalScenes: number;
    realSceneCount: number;
  };
  enhancedPrompts: {
    sceneBuilder: string;
    codeGenerator: string;
    editScene: string;
  };
}

/**
 * OPTIMIZED Context Builder - Uses persistent memory and caching
 */
export class ContextBuilderService {
  private static instance: ContextBuilderService;
  
  // Cache contexts for 5 minutes
  private contextCache = new TTLCache<string, BuiltContext>(5 * 60 * 1000);
  
  // Cache expensive computations
  private sceneAnalysisCache = new TTLCache<string, { 
    commonElements: string[]; 
    stylePatterns: string[] 
  }>(10 * 60 * 1000);

  static getInstance(): ContextBuilderService {
    if (!this.instance) {
      this.instance = new ContextBuilderService();
    }
    return this.instance;
  }

  /**
   * OPTIMIZED: Build context with caching and persistent memory
   */
  async buildContext({
    projectId,
    userId,
    storyboardSoFar = [],
    userMessage,
    imageUrls = [],
    isFirstScene = false
  }: {
    projectId: string;
    userId: string;
    storyboardSoFar?: SceneData[];
    userMessage?: string;
    imageUrls?: string[];
    isFirstScene?: boolean;
  }): Promise<BuiltContext> {

    console.log('[ContextBuilder-Optimized] 🏗️ Building context for project:', projectId);
    
    // Check cache first
    const cacheKey = `${projectId}-${userId}-${storyboardSoFar.length}`;
    const cached = this.contextCache.get(cacheKey);
    
    if (cached && !userMessage) {
      console.log('[ContextBuilder-Optimized] ✨ Using cached context (5min TTL)');
      return cached;
    }
    
    // Filter real scenes
    const realScenes = storyboardSoFar.filter(scene => !this.isWelcomeScene(scene));
    const realSceneCount = realScenes.length;
    const actuallyFirstScene = realSceneCount === 0;
    
    // Build components in parallel
    const [memoryBank, userPreferences, sceneHistory] = await Promise.all([
      this.buildMemoryBank(),
      this.getUserPreferencesOptimized(projectId, userId),
      this.buildSceneHistoryOptimized(projectId, realScenes)
    ]);
    
    // Project context
    const projectContext = {
      projectId,
      userId,
      isFirstScene: actuallyFirstScene,
      totalScenes: storyboardSoFar.length,
      realSceneCount
    };
    
    // Extract preferences from current message if provided
    if (userMessage) {
      const extractedPrefs = this.quickExtractPreferences(userMessage);
      Object.assign(userPreferences, extractedPrefs);
      
      // Store learned preferences asynchronously
      this.storeLearnedPreferences(projectId, extractedPrefs);
    }
    
    // Enhanced prompts
    const enhancedPrompts = this.enhancePrompts({
      memoryBank,
      userPreferences,
      sceneHistory,
      projectContext,
      userMessage,
      imageUrls
    });
    
    const context: BuiltContext = {
      memoryBank,
      userPreferences,
      sceneHistory,
      projectContext,
      enhancedPrompts
    };
    
    // Cache the built context
    this.contextCache.set(cacheKey, context);
    
    console.log('[ContextBuilder-Optimized] ✅ Context built (and cached)');
    
    // Fire-and-forget AI preference learning
    if (userMessage && realScenes.length >= 2) {
      this.triggerAsyncPreferenceLearning(projectId, userId, userMessage, realScenes)
        .catch(error => {
          console.error('[ContextBuilder-Optimized] Preference learning failed:', error);
        });
    }
    
    return context;
  }
  
  /**
   * OPTIMIZED: Get user preferences from persistent storage
   */
  private async getUserPreferencesOptimized(
    projectId: string, 
    userId: string
  ): Promise<UserPreferences> {
    try {
      // Get from persistent storage
      const dbPreferences = await projectMemoryService.getUserPreferences(projectId);
      
      // Convert to object format
      const preferences: UserPreferences = {};
      dbPreferences.forEach(pref => {
        preferences[pref.key] = pref.value;
      });
      
      console.log('[ContextBuilder-Optimized] 📚 Loaded', Object.keys(preferences).length, 'preferences from memory');
      
      return preferences;
    } catch (error) {
      console.warn('[ContextBuilder-Optimized] Failed to load preferences:', error);
      return {};
    }
  }
  
  /**
   * OPTIMIZED: Build scene history with caching
   */
  private async buildSceneHistoryOptimized(
    projectId: string,
    realScenes: SceneData[]
  ): Promise<SceneHistory> {
    // Check cache for expensive analysis
    const analysisKey = `${projectId}-${realScenes.length}`;
    const cachedAnalysis = this.sceneAnalysisCache.get(analysisKey);
    
    if (cachedAnalysis) {
      console.log('[ContextBuilder-Optimized] ✨ Using cached scene analysis');
      return {
        previousScenes: realScenes,
        commonElements: cachedAnalysis.commonElements,
        stylePatterns: cachedAnalysis.stylePatterns,
        userFeedbackHistory: []
      };
    }
    
    // Only analyze if we have scenes
    if (realScenes.length === 0) {
      return {
        previousScenes: [],
        commonElements: [],
        stylePatterns: [],
        userFeedbackHistory: []
      };
    }
    
    // Analyze only last 3 scenes for performance
    const recentScenes = realScenes.slice(-3);
    const commonElements = this.extractCommonElements(recentScenes);
    const stylePatterns = this.extractStylePatterns(recentScenes);
    
    // Cache the analysis
    this.sceneAnalysisCache.set(analysisKey, {
      commonElements,
      stylePatterns
    });
    
    return {
      previousScenes: realScenes,
      commonElements,
      stylePatterns,
      userFeedbackHistory: []
    };
  }
  
  /**
   * @deprecated Basic keyword extraction - AI preference learning is now used
   * This method is kept for immediate extraction during context building,
   * but the real preference learning happens asynchronously via preferenceExtractor
   */
  private quickExtractPreferences(userMessage: string): Partial<UserPreferences> {
    const prefs: Partial<UserPreferences> = {};
    const msg = userMessage.toLowerCase();
    
    // Speed preferences
    if (msg.match(/\b(fast|quick|rapid|snappy)\b/)) {
      prefs['animation_speed'] = 'fast';
    } else if (msg.match(/\b(slow|smooth|gentle|gradual)\b/)) {
      prefs['animation_speed'] = 'slow';
    }
    
    // Style preferences
    if (msg.match(/\b(minimal|clean|simple)\b/)) {
      prefs['style'] = 'minimal';
    } else if (msg.match(/\b(complex|detailed|elaborate)\b/)) {
      prefs['style'] = 'detailed';
    }
    
    // Duration preferences
    const durationMatch = msg.match(/(\d+)\s*seconds?/);
    if (durationMatch) {
      prefs['preferred_duration'] = parseInt(durationMatch[1]);
    }
    
    return prefs;
  }
  
  /**
   * Store learned preferences asynchronously (fire-and-forget)
   */
  private async storeLearnedPreferences(
    projectId: string, 
    preferences: Partial<UserPreferences>
  ): Promise<void> {
    try {
      for (const [key, value] of Object.entries(preferences)) {
        await projectMemoryService.storeUserPreference(
          projectId,
          key,
          String(value),
          0.8 // confidence
        );
      }
    } catch (error) {
      console.warn('[ContextBuilder-Optimized] Failed to store preferences:', error);
    }
  }
  
  // Keep other methods the same but optimized...
  private isWelcomeScene(scene: SceneData): boolean {
    return scene.type === 'welcome' || 
           scene.data?.isWelcomeScene === true ||
           (scene.data?.name && typeof scene.data.name === 'string' && 
            scene.data.name.toLowerCase().includes('welcome')) ||
           false;
  }
  
  private buildMemoryBank(): MemoryBankContent {
    return {
      systemPrompts: getAllPrompts(),
      modelConfigs: getActiveModelPack(),
      recentContext: [],
      imageFacts: []
    };
  }
  
  private extractCommonElements(scenes: SceneData[]): string[] {
    const elements = new Set<string>();
    
    // Only check first and last scene for performance
    const checkScenes = scenes.length > 2 
      ? [scenes[0], scenes[scenes.length - 1]] 
      : scenes;
    
    checkScenes.forEach(scene => {
      const code = scene.data?.code || '';
      if (code.includes('AbsoluteFill')) elements.add('Background');
      if (code.match(/\b(text|h1|h2|p)\b/i)) elements.add('Text');
      if (code.includes('interpolate')) elements.add('Animations');
    });
    
    return Array.from(elements);
  }
  
  private extractStylePatterns(scenes: SceneData[]): string[] {
    const patterns = new Set<string>();
    
    // Only check last scene for performance
    const lastScene = scenes[scenes.length - 1];
    if (lastScene?.data?.code) {
      const code = lastScene.data.code;
      if (code.includes('spring')) patterns.add('spring-animations');
      if (code.includes('fade')) patterns.add('fade-effects');
      if (code.match(/#[0-9a-fA-F]{6}/)) patterns.add('custom-colors');
    }
    
    return Array.from(patterns);
  }
  
  // Keep enhance prompts methods the same
  private enhancePrompts(params: any) {
    const basePrompts = params.memoryBank.systemPrompts;
    
    return {
      sceneBuilder: this.enhanceSceneBuilderPrompt({
        basePrompt: basePrompts.SCENE_BUILDER.content,
        userPreferences: params.userPreferences,
        sceneHistory: params.sceneHistory,
        isFirstScene: params.projectContext.isFirstScene,
        imageUrls: params.imageUrls
      }),
      codeGenerator: basePrompts.CODE_GENERATOR.content,
      editScene: basePrompts.EDIT_SCENE.content
    };
  }
  
  private enhanceSceneBuilderPrompt(params: any): string {
    let enhanced = params.basePrompt;
    
    if (params.isFirstScene) {
      enhanced += "\n\n🏗️ FIRST SCENE - CREATE FROM SCRATCH";
    } else if (params.sceneHistory.stylePatterns.length > 0) {
      enhanced += `\n\n📋 MAINTAIN CONSISTENCY:\n`;
      enhanced += `- Style: ${params.sceneHistory.stylePatterns.join(', ')}`;
    }
    
    if (Object.keys(params.userPreferences).length > 0) {
      enhanced += `\n\n👤 USER PREFERENCES:\n`;
      Object.entries(params.userPreferences).forEach(([k, v]) => {
        enhanced += `- ${k}: ${v}\n`;
      });
    }
    
    return enhanced;
  }
  
  clearCache(): void {
    this.contextCache.clear();
    this.sceneAnalysisCache.clear();
  }
  
  /**
   * Trigger AI preference learning asynchronously
   * This runs in the background and doesn't block the main request
   */
  private async triggerAsyncPreferenceLearning(
    projectId: string,
    userId: string,
    userMessage: string,
    realScenes: SceneData[]
  ): Promise<void> {
    try {
      console.log('[ContextBuilder-Optimized] 🧠 Starting async preference learning...');
      
      // Build conversation history (simplified for now)
      const conversationHistory = [
        { role: 'user', content: userMessage }
      ];
      
      // Extract scene patterns for analysis
      const scenePatterns = realScenes.map(scene => {
        const elements = this.extractElementsFromScene(scene);
        return `Scene "${scene.name}": ${elements.join(', ')}`;
      });
      
      // Use the AI preference extractor
      const result = await preferenceExtractor.extractPreferences({
        conversationHistory,
        currentRequest: userMessage,
        projectId,
        scenePatterns
      });
      
      console.log('[ContextBuilder-Optimized] 🧠 AI extracted', result.preferences.length, 'preferences');
      
      // The preferenceExtractor already stores high-confidence preferences
      // So we don't need to do anything else here
      
    } catch (error) {
      // This is async, so just log the error
      console.error('[ContextBuilder-Optimized] AI preference extraction failed:', error);
    }
  }
  
  /**
   * Helper to extract elements from a scene for pattern analysis
   */
  private extractElementsFromScene(scene: SceneData): string[] {
    const elements: string[] = [];
    
    if (scene.data?.layoutJson) {
      const layout = scene.data.layoutJson;
      if (layout.sceneType) elements.push(layout.sceneType);
      if (layout.background?.type) elements.push(`${layout.background.type} background`);
      if (layout.elements?.length) {
        layout.elements.forEach((el: any) => {
          if (el.type) elements.push(el.type);
        });
      }
    }
    
    return elements;
  }
}