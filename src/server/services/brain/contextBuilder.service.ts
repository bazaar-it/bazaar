//src/server/services/brain/contextBuilder.service.ts

import { getAllPrompts } from '~/config/prompts.config';
import { getActiveModelPack } from '~/config/models.config';
import type { InputProps } from '~/lib/types/video/input-props';

/**
 * 🧠 Context Builder Service
 * 
 * Centralized context orchestrator matching the architecture diagram.
 * Coordinates Memory Bank, User Preferences, and Scene History.
 */

export interface UserPreferences {
  // 🚨 NEW: Dynamic preferences - no hardcoded types
  [key: string]: string | number | boolean;
}

// Type alias for scene data
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
    realSceneCount: number; // 🚨 NEW: Count excluding welcome scenes
  };
  enhancedPrompts: {
    sceneBuilder: string;
    codeGenerator: string;
    editScene: string;
  };
}

/**
 * 🧠 Context Builder - Matches Architecture Diagram
 * 
 * This is the "Context Builder" component from the system architecture.
 * It orchestrates Memory Bank, User Preferences, and Scene History.
 */
export class ContextBuilderService {
  private static instance: ContextBuilderService;
  private memoryCache = new Map<string, any>();
  private preferencesCache = new Map<string, UserPreferences>();

  static getInstance(): ContextBuilderService {
    if (!this.instance) {
      this.instance = new ContextBuilderService();
    }
    return this.instance;
  }

  /**
   * 🏗️ Build Complete Context (Main Entry Point)
   * 
   * This matches the "Context Builder" node in the architecture diagram.
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

    console.log('[ContextBuilder] 🏗️ Building context for project:', projectId);
    
    // 🚨 FIXED: Filter out welcome scenes for real scene count
    const realScenes = storyboardSoFar.filter(scene => !this.isWelcomeScene(scene));
    const realSceneCount = realScenes.length;
    const actuallyFirstScene = realSceneCount === 0; // 🚨 FIXED: Based on real scenes only
    
    console.log(`[ContextBuilder] 📊 Scene analysis: ${storyboardSoFar.length} total, ${realSceneCount} real, first scene: ${actuallyFirstScene}`);

    // 🧠 Memory Bank: Pull from centralized prompts and configs
    const memoryBank = this.buildMemoryBank();

    // 👤 User Preferences: Get or create user preferences
    const userPreferences = await this.getUserPreferences(userId);

    // 📚 Scene History: Analyze previous scenes for patterns
    const sceneHistory = this.buildSceneHistory(realScenes);

    // 🎯 Project Context: Current project state
    const projectContext = {
      projectId,
      userId,
      isFirstScene: actuallyFirstScene,
      totalScenes: storyboardSoFar.length,
      realSceneCount
    };

    // 🚨 NEW: Extract dynamic preferences from user message
    if (userMessage) {
      const extractedPrefs = await this.extractDynamicPreferences(userMessage, userPreferences);
      // Update preferences cache with new dynamic preferences - filter out undefined values
      const filteredPrefs = Object.fromEntries(
        Object.entries(extractedPrefs).filter(([_, value]) => value !== undefined)
      );
      Object.assign(userPreferences, filteredPrefs);
      this.preferencesCache.set(userId, userPreferences);
    }

    // ✨ Enhanced Prompts: Apply context to prompts
    const enhancedPrompts = this.enhancePrompts({
      memoryBank,
      userPreferences,
      sceneHistory,
      projectContext,
      userMessage,
      imageUrls
    });

    console.log('[ContextBuilder] ✅ Context built successfully');
    
    return {
      memoryBank,
      userPreferences,
      sceneHistory,
      projectContext,
      enhancedPrompts
    };
  }

  /**
   * 🚨 NEW: Check if a scene is a welcome scene
   */
  private isWelcomeScene(scene: SceneData): boolean {
    return scene.type === 'welcome' || 
           scene.data?.isWelcomeScene === true ||
           (scene.data?.name && typeof scene.data.name === 'string' && scene.data.name.toLowerCase().includes('welcome')) ||
           false;
  }

  /**
   * 🧠 Memory Bank Builder
   * 
   * Implements the "Memory Bank (30+ prompts)" from architecture diagram.
   */
  private buildMemoryBank(): MemoryBankContent {
    console.log('[ContextBuilder] 📚 Building Memory Bank with system prompts and model configs');
    
    return {
      systemPrompts: SYSTEM_PROMPTS,
      modelConfigs: MODEL_PACKS,
      recentContext: [], // TODO: Add recent context from database
      imageFacts: [], // TODO: Add image facts from cache
    };
  }

  /**
   * 👤 User Preferences Manager
   * 
   * Implements the "User Preferences" component from architecture diagram.
   */
  private async getUserPreferences(userId: string): Promise<UserPreferences> {
    // Check cache first
    if (this.preferencesCache.has(userId)) {
      return this.preferencesCache.get(userId)!;
    }

    // TODO: Load from database
    // For now, return empty object for dynamic preferences
    const defaultPreferences: UserPreferences = {};
    
    this.preferencesCache.set(userId, defaultPreferences);
    return defaultPreferences;
  }

  /**
   * 🚨 NEW: Extract dynamic user preferences from user input using AI
   */
  private async extractDynamicPreferences(userMessage: string, existingPreferences: UserPreferences): Promise<Partial<UserPreferences>> {
    // Simple keyword-based extraction for now
    // TODO: Use AI/LLM to extract more sophisticated preferences
    
    const newPreferences: Partial<UserPreferences> = {};
    const message = userMessage.toLowerCase();
    
    // Animation speed preferences
    if (message.includes('fast') || message.includes('quick') || message.includes('rapid')) {
      newPreferences['animation_speed_preference'] = 'fast';
    }
    if (message.includes('slow') || message.includes('smooth') || message.includes('gentle')) {
      newPreferences['animation_speed_preference'] = 'slow';
    }
    
    // Style preferences
    if (message.includes('minimal') || message.includes('clean') || message.includes('simple')) {
      newPreferences['style_preference'] = 'minimal';
    }
    if (message.includes('complex') || message.includes('detailed') || message.includes('elaborate')) {
      newPreferences['style_preference'] = 'detailed';
    }
    
    // Color preferences
    const colorMatches = message.match(/\b(blue|red|green|purple|pink|orange|yellow|black|white|gray|grey)\b/g);
    if (colorMatches && colorMatches.length > 0) {
      newPreferences['preferred_colors'] = colorMatches.join(', ');
    }
    
    // Animation type preferences
    if (message.includes('bounce') || message.includes('bouncy')) {
      newPreferences['animation_style'] = 'bouncy';
    }
    if (message.includes('fade') || message.includes('smooth')) {
      newPreferences['animation_style'] = 'smooth';
    }
    
    // Duration preferences
    if (message.includes('2 second') || message.includes('2-second')) {
      newPreferences['preferred_duration'] = '2_seconds';
    }
    if (message.includes('short') || message.includes('brief')) {
      newPreferences['content_length'] = 'short';
    }
    if (message.includes('long') || message.includes('detailed')) {
      newPreferences['content_length'] = 'long';
    }
    
    // Motion graphics preferences
    if (message.includes('neon') || message.includes('glow')) {
      newPreferences['visual_effects'] = 'neon_glow';
    }
    if (message.includes('particle') || message.includes('particles')) {
      newPreferences['visual_effects'] = 'particles';
    }
    
    // Only return preferences that are different from existing ones
    const filteredPreferences: Partial<UserPreferences> = {};
    for (const [key, value] of Object.entries(newPreferences)) {
      if (existingPreferences[key] !== value) {
        filteredPreferences[key] = value;
        console.log(`[ContextBuilder] 🎯 New preference detected: ${key} = ${value}`);
      }
    }
    
    return filteredPreferences;
  }

  /**
   * 📚 Scene History Analyzer
   * 
   * Implements the "Scene History" component from architecture diagram.
   */
  private buildSceneHistory(realScenes: SceneData[]): SceneHistory {
    console.log(`[ContextBuilder] 🎬 Building scene history from ${realScenes.length} real scenes`);
    
    return {
      previousScenes: realScenes,
      commonElements: this.extractCommonElements(realScenes),
      stylePatterns: this.extractStylePatterns(realScenes),
      userFeedbackHistory: [], // TODO: Extract from chat history
    };
  }

  /**
   * ✨ Prompt Enhancement Engine
   * 
   * Takes base prompts and enhances them with context.
   */
  private enhancePrompts({
    memoryBank,
    userPreferences,
    sceneHistory,
    projectContext,
    userMessage,
    imageUrls
  }: {
    memoryBank: MemoryBankContent;
    userPreferences: UserPreferences;
    sceneHistory: SceneHistory;
    projectContext: any;
    userMessage?: string;
    imageUrls?: string[];
  }) {
    console.log('[ContextBuilder] ✨ Enhancing prompts with context');
    
    const basePrompts = memoryBank.systemPrompts;

    // 🏗️ Enhanced Scene Builder Prompt
    const sceneBuilderPrompt = this.enhanceSceneBuilderPrompt({
      basePrompt: basePrompts.SCENE_BUILDER.content,
      userPreferences,
      sceneHistory,
      isFirstScene: projectContext.isFirstScene,
      imageUrls
    });

    // 💻 Enhanced Code Generator Prompt  
    const codeGeneratorPrompt = this.enhanceCodeGeneratorPrompt({
      basePrompt: basePrompts.CODE_GENERATOR.content,
      userPreferences,
      sceneHistory
    });

    // ✏️ Enhanced Edit Scene Prompt
    const editScenePrompt = this.enhanceEditScenePrompt({
      basePrompt: basePrompts.EDIT_SCENE.content,
      userPreferences,
      sceneHistory
    });

    return {
      sceneBuilder: sceneBuilderPrompt,
      codeGenerator: codeGeneratorPrompt,
      editScene: editScenePrompt
    };
  }

  /**
   * 🏗️ Scene Builder Prompt Enhancement
   * 
   * Matches the architecture flow: Scene Builder gets preferences and history.
   */
  private enhanceSceneBuilderPrompt({
    basePrompt,
    userPreferences,
    sceneHistory,
    isFirstScene,
    imageUrls
  }: {
    basePrompt: string;
    userPreferences: UserPreferences;
    sceneHistory: SceneHistory;
    isFirstScene: boolean;
    imageUrls?: string[];
  }): string {
    let enhanced = basePrompt;

    // 🎯 First Scene Logic (matching architecture diagram)
    if (isFirstScene) {
      enhanced += "\n\n🏗️ FIRST SCENE - CREATE FROM SCRATCH:\n";
      enhanced += "- This is the first real scene in the project\n";
      enhanced += "- No existing style patterns to follow\n";
      enhanced += "- Establish the visual foundation for the project\n";
    } else {
      enhanced += "\n\n📋 SCENE WITH PALETTE - USE CONTEXT:\n";
      enhanced += `- Previous scenes: ${sceneHistory.previousScenes.length}\n`;
      enhanced += `- Common elements: ${sceneHistory.commonElements.join(', ')}\n`;
      enhanced += `- Style patterns: ${sceneHistory.stylePatterns.join(', ')}\n`;
      enhanced += "- Maintain visual consistency with previous scenes\n";
    }

    // 👤 User Preferences Enhancement
    enhanced += `\n\n👤 USER PREFERENCES:\n`;
    Object.entries(userPreferences).forEach(([key, value]) => {
      enhanced += `- ${key.replace(/_/g, ' ')}: ${value}\n`;
    });

    // 🖼️ Image Context (if available)
    if (imageUrls && imageUrls.length > 0) {
      enhanced += `\n\n🖼️ IMAGE ANALYSIS AVAILABLE:\n`;
      enhanced += `- ${imageUrls.length} image(s) provided\n`;
      enhanced += "- Use image analysis results when available\n";
      enhanced += "- Translate visual elements into Remotion components\n";
    }

    return enhanced;
  }

  /**
   * 💻 Code Generator Prompt Enhancement
   */
  private enhanceCodeGeneratorPrompt({
    basePrompt,
    userPreferences,
    sceneHistory
  }: {
    basePrompt: string;
    userPreferences: UserPreferences;
    sceneHistory: SceneHistory;
  }): string {
    let enhanced = basePrompt;

    enhanced += `\n\n👤 USER STYLE PREFERENCES:\n`;
    Object.entries(userPreferences).forEach(([key, value]) => {
      enhanced += `- ${key.replace(/_/g, ' ')}: ${value}\n`;
    });

    if (sceneHistory.stylePatterns.length > 0) {
      enhanced += `\n\n📚 MAINTAIN CONSISTENCY:\n`;
      enhanced += `- Style patterns: ${sceneHistory.stylePatterns.join(', ')}\n`;
    }

    return enhanced;
  }

  /**
   * ✏️ Edit Scene Prompt Enhancement
   */
  private enhanceEditScenePrompt({
    basePrompt,
    userPreferences,
    sceneHistory
  }: {
    basePrompt: string;
    userPreferences: UserPreferences;
    sceneHistory: SceneHistory;
  }): string {
    let enhanced = basePrompt;

    enhanced += `\n\n👤 EDIT PREFERENCES:\n`;
    Object.entries(userPreferences).forEach(([key, value]) => {
      enhanced += `- ${key.replace(/_/g, ' ')}: ${value}\n`;
    });

    return enhanced;
  }

  /**
   * 🔍 Extract Common Elements from Scene History
   */
  private extractCommonElements(scenes: SceneData[]): string[] {
    const elements = new Set<string>();
    
    scenes.forEach(scene => {
      // 🚨 FIXED: Use scene.data.code with proper type checking
      const sceneCode = (scene.data?.code && typeof scene.data.code === 'string') ? scene.data.code : '';
      
      // Extract common components, colors, patterns from code
      if (sceneCode.includes('AbsoluteFill')) elements.add('Background');
      if (sceneCode.includes('div') || sceneCode.includes('text')) elements.add('Text');
      if (sceneCode.includes('circle') || sceneCode.includes('Circle')) elements.add('Circles');
      if (sceneCode.includes('interpolate') || sceneCode.includes('spring')) elements.add('Animations');
      if (sceneCode.includes('gradient')) elements.add('Gradients');
      if (sceneCode.includes('particle')) elements.add('Particles');
      // TODO: More sophisticated pattern detection using AST parsing
    });

    return Array.from(elements);
  }

  /**
   * 🎨 Extract Style Patterns from Scene History
   */
  private extractStylePatterns(scenes: SceneData[]): string[] {
    const patterns = new Set<string>();
    
    scenes.forEach(scene => {
      // 🚨 FIXED: Use scene.data.code with proper type checking
      const sceneCode = (scene.data?.code && typeof scene.data.code === 'string') ? scene.data.code : '';
      
      // Extract color schemes, animation styles, layouts from code
      if (sceneCode.includes('#') && sceneCode.includes('blue')) patterns.add('blue-theme');
      if (sceneCode.includes('spring')) patterns.add('spring-animations');
      if (sceneCode.includes('center') || sceneCode.includes('justify-center')) patterns.add('center-layout');
      if (sceneCode.includes('opacity')) patterns.add('fade-effects');
      if (sceneCode.includes('transform') || sceneCode.includes('translate')) patterns.add('transform-animations');
      // TODO: More sophisticated pattern detection using AST parsing
    });

    return Array.from(patterns);
  }

  /**
   * 💾 Update User Preferences
   * 
   * Allows updating user preferences based on interactions.
   */
  async updateUserPreferences(userId: string, updates: Partial<UserPreferences>): Promise<void> {
    const current = await this.getUserPreferences(userId);
    const updated = { ...current, ...updates };
    
    this.preferencesCache.set(userId, updated);
    console.log(`[ContextBuilder] 💾 Updated preferences for user ${userId}:`, updates);
    // TODO: Save to database
  }

  /**
   * 🧹 Clear Context Cache
   */
  clearCache(): void {
    this.memoryCache.clear();
    this.preferencesCache.clear();
  }
} 