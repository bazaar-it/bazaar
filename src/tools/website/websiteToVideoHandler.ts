/**
 * Website to Video Tool Handler
 * Connects the Brain decision to the website pipeline
 */

// Tool execution result interface
interface ToolExecutionResult {
  success: boolean;
  toolName: string;
  data?: Record<string, any>;
  error?: { message: string; code: string };
  reasoning: string;
  chatResponse?: string;
}
import { db } from "~/server/db";
import { projects, scenes } from "~/server/db/schema";
import { eq, asc } from "drizzle-orm";
import { WebAnalysisAgentV4, type ExtractedBrandDataV4 } from "~/tools/webAnalysis/WebAnalysisAgentV4";
import { convertV4ToSimplified, createFallbackBrandData, type SimplifiedBrandData } from "~/tools/webAnalysis/brandDataAdapter";
import { HeroJourneyGenerator } from "~/tools/narrative/herosJourney";
import { HeroJourneyLLM } from "~/tools/narrative/herosJourneyLLM";
import { TemplateSelector } from "~/server/services/website/template-selector-v2";
import { TemplateCustomizerAI } from "~/server/services/website/template-customizer-ai";
import { saveBrandProfile, createBrandStyleFromExtraction } from "~/server/services/website/save-brand-profile";
import { toolsLogger } from '~/lib/utils/logger';

export interface WebsiteToVideoInput {
  userPrompt: string;
  projectId: string;
  userId: string;
  websiteUrl: string;
  style?: 'minimal' | 'dynamic' | 'bold';
  duration?: number; // Target duration in seconds
  sceneCount?: number; // Requested number of scenes
  webContext?: any; // Pass existing web analysis if available
  streamingCallback?: (event: StreamingEvent) => Promise<void>;
}

export interface StreamingEvent {
  type: 'scene_completed' | 'all_scenes_complete';
  data: {
    sceneIndex: number;
    sceneName: string;
    totalScenes: number;
    sceneId?: string;
    projectId: string;
  };
}


export class WebsiteToVideoHandler {
  static async execute(input: WebsiteToVideoInput): Promise<ToolExecutionResult> {
    toolsLogger.info('🌐 [WEBSITE HANDLER] Starting website-to-video generation', {
      url: input.websiteUrl,
      projectId: input.projectId,
      style: input.style || 'dynamic',
      duration: input.duration || 20
    });
    
    // Collect debug data for admin panel
    const debugData: any = {
      screenshots: [],
      brandExtraction: null,
      heroJourney: [],
      templateSelections: [],
      generatedPrompts: [],
      extractionPhases: [], // Track V4's multi-phase extraction
      aiAnalysis: null, // Store AI-powered insights
      psychologicalProfile: null, // Brand psychology insights
      competitorAnalysis: null // Competitive positioning
    };

    try {
      // 1. Use existing web context if available, otherwise analyze
      let websiteData: SimplifiedBrandData;
      let v4Data: ExtractedBrandDataV4 | null = null;
      const screenshotCollector: any[] = [];
      
      if (input.webContext) {
        toolsLogger.info('🌐 [WEBSITE HANDLER] Step 1: Using existing web analysis from context');
        // Handle both V1 format (from context) and V2 format
        if (input.webContext.pageData?.visualDesign?.extraction) {
          // V1 format with embedded V2 data
          websiteData = input.webContext.pageData.visualDesign.extraction;
          toolsLogger.debug('🌐 [WEBSITE HANDLER] Using V2 data from V1 wrapper');
        } else if (input.webContext.brand && input.webContext.product) {
          // Direct V2 format
          websiteData = input.webContext;
          toolsLogger.debug('🌐 [WEBSITE HANDLER] Using direct V2 data');
        } else {
          // Fallback to fresh analysis if format is unknown
          toolsLogger.warn('🌐 [WEBSITE HANDLER] Unknown format, running fresh analysis');
          const analyzer = new WebAnalysisAgentV4(input.projectId);
          v4Data = await analyzer.analyze(input.websiteUrl);
          websiteData = convertV4ToSimplified(v4Data);
          
          // Collect screenshots from V4 data
          if (v4Data.screenshots) {
            screenshotCollector.push(...v4Data.screenshots);
            toolsLogger.info(`🌐 [WEBSITE HANDLER] Found ${v4Data.screenshots.length} screenshots from V4 analysis`);
          }
        }
      } else {
        toolsLogger.info('🌐 [WEBSITE HANDLER] Step 1: Analyzing website...');
        const analyzer = new WebAnalysisAgentV4(input.projectId);
        try {
          v4Data = await analyzer.analyze(input.websiteUrl);
          websiteData = convertV4ToSimplified(v4Data);
          
          // Collect screenshots from V4 data
          if (v4Data.screenshots) {
            screenshotCollector.push(...v4Data.screenshots);
            toolsLogger.info(`🌐 [WEBSITE HANDLER] Found ${v4Data.screenshots.length} screenshots from V4 analysis`);
          }
        } catch (analysisError) {
          toolsLogger.warn('⚠️ [WEBSITE HANDLER] Website analysis failed, creating fallback data...');
          toolsLogger.error('🌐 [WEBSITE HANDLER] Full analysis error', analysisError as Error, {
            url: input.websiteUrl
          });
          // Create minimal fallback data from URL
          const domain = new URL(input.websiteUrl).hostname.replace('www.', '');
          websiteData = createFallbackBrandData(input.websiteUrl, domain);
        }
      }
      
      // Store debug data with V4's enhanced extraction data
      debugData.brandExtraction = websiteData;
      debugData.screenshots = screenshotCollector.length > 0 ? screenshotCollector : 
        websiteData.media?.screenshots || [];
      
      // Store V4's advanced analysis insights if available
      if (v4Data) {
        if ((v4Data.metadata as any)?.phases) {
          debugData.extractionPhases = (v4Data.metadata as any).phases;
        }
        if ((v4Data as any).psychology) {
          debugData.psychologicalProfile = (v4Data as any).psychology;
        }
        if ((v4Data as any).competitors) {
          debugData.competitorAnalysis = (v4Data as any).competitors;
        }
      }
      
      // Check if we're using fallback data
      const isFallbackData = !websiteData.extractionMeta || 
        websiteData.page.title.toLowerCase().includes('utmb') === false;
      
      if (isFallbackData) {
        toolsLogger.warn('⚠️ [WEBSITE HANDLER] Using fallback data - actual extraction may have failed');
        debugData.extractionStatus = 'fallback';
      } else {
        debugData.extractionStatus = 'success';
      }
      
      // 2. Save to brand_profile table and format brand data
      toolsLogger.info('🌐 [WEBSITE HANDLER] Step 2: Saving brand profile and formatting data...');
      
      // Save to database
      await saveBrandProfile(input.projectId, input.websiteUrl, websiteData);
      
      // Create brand style directly from extracted data (skip formatter)
      const brandStyle = createBrandStyleFromExtraction(websiteData);
      toolsLogger.debug('🌐 [WEBSITE HANDLER] Brand style created', {
        primaryColor: brandStyle.colors.primary,
        primaryFont: brandStyle.typography.primaryFont,
        animationStyle: brandStyle.animation.style
      });
      
      // 3. Determine arc configuration based on user input
      const arcConfig = this.determineArcConfig(input);
      toolsLogger.info(`🎬 [WEBSITE HANDLER] Arc config: ${arcConfig.sceneCount} scenes, ${arcConfig.totalDuration} frames (${arcConfig.totalDuration/30}s)`);
      
      // 4. Generate DYNAMIC hero's journey narrative with LLM
      toolsLogger.info('🤖 [WEBSITE HANDLER] Step 4: Creating unique narrative with LLM...');
      
      let narrativeScenes;
      
      // ALWAYS use LLM for unique narratives
      try {
        const llmGenerator = new HeroJourneyLLM();
        
        toolsLogger.info(`🎨 [WEBSITE HANDLER] Generating unique ${arcConfig.sceneCount}-scene narrative with LLM`);
        
        // Generate unique narrative with LLM
        narrativeScenes = await this.generateNarrativeWithLLM(
          llmGenerator,
          websiteData,
          arcConfig
        );
        
        debugData.narrativeGeneration = {
          method: 'llm',
          sceneCount: arcConfig.sceneCount,
          totalDuration: arcConfig.totalDuration
        };
        
        toolsLogger.info('✨ [WEBSITE HANDLER] LLM generated unique narrative successfully');
      } catch (error) {
        toolsLogger.warn('⚠️ [WEBSITE HANDLER] Falling back to hardcoded narrative', error);
        
        const storyGenerator = new HeroJourneyGenerator();
        const baseScenes = storyGenerator.generateNarrative(websiteData);
        narrativeScenes = this.adaptNarrativeToSceneCount(baseScenes, arcConfig);
        
        debugData.narrativeGeneration = { 
          method: 'fallback',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
      
      // Store hero journey debug data
      debugData.heroJourney = narrativeScenes;
      
      // Adjust durations for 20-second video (600 frames total)
      const adjustedScenes = narrativeScenes.map((scene, index) => {
        const durations = [90, 90, 240, 90, 90]; // 3s, 3s, 8s, 3s, 3s
        return {
          ...scene,
          duration: durations[index] || 90
        };
      });
      
      // 4. Select best templates for each narrative beat with brand intelligence
      toolsLogger.info('🌐 [WEBSITE HANDLER] Step 4: Selecting templates with brand context...');
      const selector = new TemplateSelector();
      const selectedTemplates = await selector.selectTemplatesForJourney(
        adjustedScenes, 
        input.style || 'dynamic',
        websiteData // Pass brand data for intelligent selection
      );
      
      // Store template selection debug data
      debugData.templateSelections = selectedTemplates.map((template, i) => ({
        scene: adjustedScenes[i]?.title,
        templateId: template.templateId,
        templateName: template.templateName,
        emotionalBeat: adjustedScenes[i]?.emotionalBeat
      }));
      
      // 5. ✨ STREAMING: Customize templates with incremental database saves
      toolsLogger.info('🌐 [WEBSITE HANDLER] Step 5: Streaming template customization...');
      const customizer = new TemplateCustomizerAI();
      
      // Store generated prompts for debug
      selectedTemplates.forEach((template, i) => {
        debugData.generatedPrompts.push({
          sceneName: adjustedScenes[i]?.title,
          tool: 'edit',
          template: template.templateName,
          content: `Apply brand colors ${brandStyle.colors.primary}, ${brandStyle.colors.secondary} and content to ${template.templateName} template for ${adjustedScenes[i]?.narrative}`
        });
      });
      
      // Clear existing scenes BEFORE starting (safety measure)
      await db.delete(scenes).where(eq(scenes.projectId, input.projectId));
      
      // Define streaming callback for immediate database persistence
      const { randomUUID } = require('crypto');
      const onSceneComplete = async (scene: any, index: number) => {
        toolsLogger.debug(`🌐 [WEBSITE HANDLER] Scene ${index + 1} completed: ${scene.name}`);
        
        // Save scene to database immediately
        const sceneId = randomUUID();
        const sceneRecord = {
          id: sceneId,
          projectId: input.projectId,
          name: scene.name,
          tsxCode: scene.code,
          duration: scene.duration,
          order: index,
          props: {},
          layoutJson: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        // Insert into database
        await db.insert(scenes).values([sceneRecord]);
        
        // Send streaming update to frontend
        if (input.streamingCallback) {
          await input.streamingCallback({
            type: 'scene_completed',
            data: {
              sceneIndex: index,
              sceneName: scene.name,
              totalScenes: selectedTemplates.length,
              sceneId,
              projectId: input.projectId
            }
          });
        }
      };
      
      // Use streaming customization instead of batch
      const customizedScenes = await customizer.customizeTemplatesStreaming({
        templates: selectedTemplates,
        brandStyle,
        websiteData,
        narrativeScenes: adjustedScenes,
      }, onSceneComplete);
      
      // Final completion event
      if (input.streamingCallback) {
        await input.streamingCallback({
          type: 'all_scenes_complete',
          data: {
            sceneIndex: customizedScenes.length - 1,
            sceneName: 'Generation Complete',
            totalScenes: customizedScenes.length,
            projectId: input.projectId
          }
        });
      }
      
      // Update project metadata
      await db.update(projects)
        .set({
          updatedAt: new Date(),
        })
        .where(eq(projects.id, input.projectId));
      
      toolsLogger.info('🌐 [WEBSITE HANDLER] Generation complete!');
      
      // Build success message with scene details
      const sceneList = customizedScenes.map((scene, i) => 
        `${i + 1}. ${adjustedScenes[i]?.title || 'Scene'} (${(scene.duration / 30).toFixed(1)}s)`
      ).join('\n');
      
      // Return scenes at the top level for scene-operations.ts
      // Also need to return the actual database records after insertion
      const insertedScenes = await db.select().from(scenes)
        .where(eq(scenes.projectId, input.projectId))
        .orderBy(asc(scenes.order));
      
      return {
        success: true,
        toolName: 'websiteToVideo',
        scenes: insertedScenes, // This is what scene-operations.ts expects
        data: {
          scenesGenerated: customizedScenes.length,
          totalDuration: 20,
          brandColors: brandStyle.colors,
          websiteTitle: websiteData.page.title,
          scenes: customizedScenes,
        },
        debugData, // Include debug data for admin panel
        reasoning: `Analyzed ${input.websiteUrl} and created ${customizedScenes.length} branded scenes`,
        chatResponse: `I've analyzed ${websiteData.page.title} and created a professional 20-second video with your brand style!\n\n**Generated Scenes:**\n${sceneList}\n\n**Brand Elements Extracted:**\n• Primary color: ${brandStyle.colors.primary}\n• Typography: ${brandStyle.typography.primaryFont}\n• ${websiteData.product.features.length} key features highlighted\n\nThe video follows a hero's journey narrative structure, perfect for showcasing your product.`,
      } as any;
      
    } catch (error) {
      console.error('🌐 [WEBSITE HANDLER] Error:', error);
      
      return {
        success: false,
        toolName: 'websiteToVideo',
        error: {
          message: error instanceof Error ? error.message : 'Failed to generate video from website',
          code: 'WEBSITE_GENERATION_FAILED',
        },
        reasoning: 'Website analysis or video generation failed',
        chatResponse: `I encountered an issue analyzing the website. This might be due to:\n• The website being protected by Cloudflare\n• Invalid or inaccessible URL\n• Connection timeout\n\nPlease verify the URL is accessible and try again.`,
      };
    }
  }

  /**
   * Determine arc configuration based on user input
   */
  private determineArcConfig(input: WebsiteToVideoInput): {
    sceneCount: number;
    totalDuration: number; // in frames
  } {
    let sceneCount = 5; // default
    let totalDuration = 450; // default 15 seconds at 30fps
    
    if (input.sceneCount) {
      // User specified exact scene count
      sceneCount = Math.min(Math.max(input.sceneCount, 2), 10); // Clamp 2-10
      totalDuration = sceneCount * 90; // ~3 seconds per scene average
      toolsLogger.info(`📊 [ARC CONFIG] User requested ${input.sceneCount} scenes → ${sceneCount} scenes`);
    } else if (input.duration) {
      // User specified duration, calculate optimal scene count
      totalDuration = input.duration * 30; // Convert to frames
      
      if (input.duration <= 6) {
        sceneCount = 2;
      } else if (input.duration <= 10) {
        sceneCount = 3;
      } else if (input.duration <= 15) {
        sceneCount = 4;
      } else if (input.duration <= 20) {
        sceneCount = 5;
      } else if (input.duration <= 25) {
        sceneCount = 6;
      } else if (input.duration <= 30) {
        sceneCount = 7;
      } else {
        sceneCount = Math.min(Math.ceil(input.duration / 5), 10); // ~5 seconds per scene for long videos
      }
      
      toolsLogger.info(`📊 [ARC CONFIG] User requested ${input.duration}s → ${sceneCount} scenes`);
    }
    
    return { sceneCount, totalDuration };
  }
  
  /**
   * Generate narrative using LLM
   */
  private async generateNarrativeWithLLM(
    llmGenerator: HeroJourneyLLM,
    websiteData: ExtractedBrandDataV4,
    arcConfig: { sceneCount: number; totalDuration: number }
  ): Promise<HeroJourneyScene[]> {
    try {
      // Use the new LLM method to generate unique narrative scenes
      const scenes = await llmGenerator.generateNarrativeScenes(
        websiteData,
        arcConfig.sceneCount,
        arcConfig.totalDuration
      );
      
      return scenes;
    } catch (error) {
      console.error('LLM narrative generation failed:', error);
      // Fallback to hardcoded and adapt
      const hardcodedGenerator = new HeroJourneyGenerator();
      const baseScenes = hardcodedGenerator.generateNarrative(websiteData);
      return this.adaptNarrativeToSceneCount(baseScenes, arcConfig);
    }
  }
  
  /**
   * Build prompt for LLM narrative generation
   */
  private buildLLMPrompt(
    websiteData: ExtractedBrandDataV4,
    arcConfig: { sceneCount: number; totalDuration: number }
  ): string {
    const durationSeconds = arcConfig.totalDuration / 30;
    
    return `Create a ${arcConfig.sceneCount}-scene narrative for a ${durationSeconds}-second motion graphics video.
    
Brand: ${websiteData.brand?.identity?.name || 'Unknown'}
Tagline: ${websiteData.brand?.identity?.tagline || ''}
Problem: ${websiteData.product?.problem || ''}
Solution: ${websiteData.product?.value_prop?.headline || ''}

Generate ${arcConfig.sceneCount} unique scenes that tell a compelling story.`;
  }
  
  /**
   * Adapt narrative to requested scene count
   */
  private adaptNarrativeToSceneCount(
    baseScenes: HeroJourneyScene[], 
    arcConfig: { sceneCount: number; totalDuration: number }
  ): HeroJourneyScene[] {
    const { sceneCount, totalDuration } = arcConfig;
    
    // Distribute duration across scenes
    const durations = this.distributeDuration(totalDuration, sceneCount);
    
    if (sceneCount === baseScenes.length) {
      // Just adjust durations
      return baseScenes.map((scene, i) => ({
        ...scene,
        duration: durations[i]
      }));
    } else if (sceneCount < baseScenes.length) {
      // Merge scenes
      const mergedScenes: HeroJourneyScene[] = [];
      
      if (sceneCount === 2) {
        // Hook + CTA
        mergedScenes.push({
          ...baseScenes[0],
          title: "The Challenge",
          duration: durations[0],
          narrative: baseScenes[0].narrative + " " + baseScenes[1].narrative
        });
        mergedScenes.push({
          ...baseScenes[4],
          title: "Your Solution",
          duration: durations[1]
        });
      } else if (sceneCount === 3) {
        // Problem + Solution + CTA
        mergedScenes.push(baseScenes[0]); // Problem
        mergedScenes.push({
          ...baseScenes[2],
          title: "The Solution",
          duration: durations[1],
          narrative: baseScenes[1].narrative + " " + baseScenes[2].narrative
        });
        mergedScenes.push(baseScenes[4]); // CTA
      } else if (sceneCount === 4) {
        // Skip triumph scene
        mergedScenes.push(...baseScenes.slice(0, 3));
        mergedScenes.push(baseScenes[4]);
      }
      
      // Update durations
      return mergedScenes.map((scene, i) => ({
        ...scene,
        duration: durations[i]
      }));
    } else {
      // Expand scenes - add more detailed breakdowns
      const expandedScenes: HeroJourneyScene[] = [];
      
      if (sceneCount === 6) {
        expandedScenes.push(baseScenes[0]); // Problem
        expandedScenes.push(baseScenes[1]); // Discovery
        expandedScenes.push({
          ...baseScenes[2],
          title: "Key Features",
          duration: durations[2],
          emotionalBeat: 'transformation'
        });
        expandedScenes.push({
          ...baseScenes[2],
          title: "Benefits",
          duration: durations[3],
          narrative: "See the benefits in action",
          emotionalBeat: 'transformation'
        });
        expandedScenes.push(baseScenes[3]); // Triumph
        expandedScenes.push(baseScenes[4]); // CTA
      } else if (sceneCount === 7) {
        // Add intro and more detail
        expandedScenes.push({
          title: "Opening Hook",
          duration: durations[0],
          narrative: "Attention-grabbing opener",
          visualElements: ["Logo animation", "Brand colors"],
          brandElements: baseScenes[0].brandElements,
          emotionalBeat: 'discovery'
        });
        expandedScenes.push(...baseScenes);
        expandedScenes.push({
          title: "Final Impact",
          duration: durations[6],
          narrative: "Leave a lasting impression",
          visualElements: ["Brand reinforcement"],
          brandElements: baseScenes[4].brandElements,
          emotionalBeat: 'invitation'
        });
      }
      
      // For 8+ scenes, duplicate and modify transformation scenes
      else {
        expandedScenes.push(...baseScenes.slice(0, 2));
        const extraScenes = sceneCount - 4;
        for (let i = 0; i < extraScenes; i++) {
          expandedScenes.push({
            ...baseScenes[2],
            title: `Feature ${i + 1}`,
            duration: durations[2 + i],
            narrative: `Showcase feature ${i + 1}`,
            emotionalBeat: 'transformation'
          });
        }
        expandedScenes.push(baseScenes[3]);
        expandedScenes.push(baseScenes[4]);
      }
      
      // Update durations
      return expandedScenes.slice(0, sceneCount).map((scene, i) => ({
        ...scene,
        duration: durations[i]
      }));
    }
  }
  
  /**
   * Distribute total duration across scenes intelligently
   */
  private distributeDuration(totalFrames: number, sceneCount: number): number[] {
    if (sceneCount === 2) {
      // 60/40 split
      return [
        Math.floor(totalFrames * 0.6),
        Math.floor(totalFrames * 0.4)
      ];
    } else if (sceneCount === 3) {
      // 30/40/30 split
      return [
        Math.floor(totalFrames * 0.3),
        Math.floor(totalFrames * 0.4),
        Math.floor(totalFrames * 0.3)
      ];
    } else if (sceneCount === 4) {
      // 25/25/35/15 split
      return [
        Math.floor(totalFrames * 0.25),
        Math.floor(totalFrames * 0.25),
        Math.floor(totalFrames * 0.35),
        Math.floor(totalFrames * 0.15)
      ];
    } else if (sceneCount === 5) {
      // Classic 20/13/34/20/13 split
      return [
        Math.floor(totalFrames * 0.2),
        Math.floor(totalFrames * 0.13),
        Math.floor(totalFrames * 0.34),
        Math.floor(totalFrames * 0.2),
        Math.floor(totalFrames * 0.13)
      ];
    } else {
      // Even distribution with slight emphasis on middle
      const baseFrames = Math.floor(totalFrames / sceneCount);
      const durations = new Array(sceneCount).fill(baseFrames);
      
      // Add remaining frames to middle scenes
      const remainder = totalFrames - (baseFrames * sceneCount);
      const middleIndex = Math.floor(sceneCount / 2);
      for (let i = 0; i < remainder; i++) {
        durations[middleIndex - Math.floor(i/2) + (i%2)] += 1;
      }
      
      return durations;
    }
  }

  // Removed - now using createFallbackBrandData from brandDataAdapter
}