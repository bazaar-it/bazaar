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
import { env } from "~/env";
import { sceneCompiler } from "~/server/services/compilation/scene-compiler.service";
import { projects, scenes } from "~/server/db/schema";
import { eq, asc } from "drizzle-orm";
import { WebAnalysisAgentV4, type ExtractedBrandDataV4 } from "~/tools/webAnalysis/WebAnalysisAgentV4";
import { convertV4ToSimplified, createFallbackBrandData, type SimplifiedBrandData } from "~/tools/webAnalysis/brandDataAdapter";
import { HeroJourneyGenerator } from "~/tools/narrative/herosJourney";
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
      
      // 3. Generate hero's journey narrative
      toolsLogger.info('🌐 [WEBSITE HANDLER] Step 3: Creating narrative structure...');
      const storyGenerator = new HeroJourneyGenerator();
      const narrativeScenes = storyGenerator.generateNarrative(websiteData);
      
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
        let compiled = { jsCode: null as string | null, jsCompiledAt: null as Date | null };
        if (env.USE_SERVER_COMPILATION) {
          const res = await sceneCompiler.compileScene(scene.code, { projectId: input.projectId, sceneId });
          compiled = { jsCode: res.jsCode, jsCompiledAt: res.compiledAt };
          console.log('[CompileMetrics] websiteToVideo sceneIndex=%d compiled=%s', index, String(!!res.jsCode));
        }
        const sceneRecord = {
          id: sceneId,
          projectId: input.projectId,
          name: scene.name,
          tsxCode: scene.code,
          jsCode: compiled.jsCode,
          jsCompiledAt: compiled.jsCompiledAt,
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

  // Removed - now using createFallbackBrandData from brandDataAdapter
}
