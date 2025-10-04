/**
 * Website to Video Tool Handler
 * Connects the Brain decision to the website pipeline
 */

import { db } from "~/server/db";
import { env } from "~/env";
import { sceneCompiler } from "~/server/services/compilation/scene-compiler.service";
import { projects, scenes, personalizationTargets } from "~/server/db/schema";
import { eq, asc } from "drizzle-orm";
import { WebAnalysisAgentV4, type ExtractedBrandDataV4 } from "~/tools/webAnalysis/WebAnalysisAgentV4";
import { convertV4ToSimplified, createFallbackBrandData, type SimplifiedBrandData } from "~/tools/webAnalysis/brandDataAdapter";
import { MultiSceneTemplateSelector } from "~/server/services/templates/multi-scene-selector";
import { TemplateCustomizerAI } from "~/server/services/website/template-customizer-ai";
import { saveBrandProfile, createBrandStyleFromExtraction } from "~/server/services/website/save-brand-profile";
import { toolsLogger } from '~/lib/utils/logger';
import { MUSIC_LIBRARY, type UrlToVideoUserInputs } from '~/lib/types/url-to-video';
import { AddAudioTool } from '~/tools/addAudio/addAudio';

function normalizeScreenshotEntries(entries: unknown[]): string[] {
  return entries
    .map((item) => {
      if (!item) return undefined;
      if (typeof item === 'string') return item;
      if (typeof item === 'object') {
        const record = item as Record<string, unknown>;
        const maybeUrl = record.url || record.src || record.image;
        if (typeof maybeUrl === 'string') {
          return maybeUrl;
        }
      }
      return undefined;
    })
    .filter((value): value is string => typeof value === 'string');
}

// Tool execution result interface
interface ToolExecutionResult {
  success: boolean;
  toolName: string;
  data?: Record<string, any>;
  error?: { message: string; code: string };
  reasoning: string;
  chatResponse?: string;
}

export interface WebsiteBrandAnalysisResult {
  websiteData: SimplifiedBrandData;
  brandStyle: ReturnType<typeof createBrandStyleFromExtraction>;
  savedBrand: Awaited<ReturnType<typeof saveBrandProfile>>;
  debugData: Record<string, any>;
  screenshots: string[];
  v4Data: ExtractedBrandDataV4 | null;
  domain: string;
  isFallback: boolean;
}

export async function analyzeWebsiteBranding(options: {
  projectId: string;
  userId: string;
  websiteUrl: string;
  webContext?: any;
}): Promise<WebsiteBrandAnalysisResult> {
  const { projectId, userId, websiteUrl, webContext } = options;

  toolsLogger.info('🌐 [WEBSITE HANDLER] Step 1: Analyzing website…', {
    projectId,
    websiteUrl,
  });

  const debugData: Record<string, any> = {
    screenshots: [],
    brandExtraction: null,
    narrativeScenes: [],
    templateSelections: [],
    generatedPrompts: [],
    extractionPhases: [],
    aiAnalysis: null,
    psychologicalProfile: null,
    competitorAnalysis: null,
  };

  let websiteData: SimplifiedBrandData;
  let v4Data: ExtractedBrandDataV4 | null = null;
  const screenshotCollector: string[] = [];

  if (webContext) {
    toolsLogger.info('🌐 [WEBSITE HANDLER] Using provided web context for analysis');
    if (webContext.pageData?.visualDesign?.extraction) {
      websiteData = webContext.pageData.visualDesign.extraction;
      toolsLogger.debug('🌐 [WEBSITE HANDLER] Detected V1 context with embedded extraction data');
    } else if (webContext.brand && webContext.product) {
      websiteData = webContext;
      toolsLogger.debug('🌐 [WEBSITE HANDLER] Detected direct simplified brand data');
    } else {
      toolsLogger.warn('🌐 [WEBSITE HANDLER] Unknown context shape, running full analysis');
      const analyzer = new WebAnalysisAgentV4(projectId);
      v4Data = await analyzer.analyze(websiteUrl);
      websiteData = convertV4ToSimplified(v4Data);
      if (Array.isArray(v4Data?.screenshots)) {
        screenshotCollector.push(...normalizeScreenshotEntries(v4Data!.screenshots as unknown[]));
      }
    }
  } else {
    const analyzer = new WebAnalysisAgentV4(projectId);
    try {
      v4Data = await analyzer.analyze(websiteUrl);
      websiteData = convertV4ToSimplified(v4Data);
      if (Array.isArray(v4Data?.screenshots)) {
        const normalized = normalizeScreenshotEntries(v4Data!.screenshots as unknown[]);
        screenshotCollector.push(...normalized);
        toolsLogger.info(`🌐 [WEBSITE HANDLER] Found ${normalized.length} screenshots from V4 analysis`);
      }
    } catch (analysisError) {
      toolsLogger.warn('⚠️ [WEBSITE HANDLER] Website analysis failed, creating fallback data…');
      toolsLogger.error('🌐 [WEBSITE HANDLER] Full analysis error', analysisError as Error, {
        url: websiteUrl,
      });
      const domainFallback = new URL(websiteUrl).hostname.replace('www.', '');
      websiteData = createFallbackBrandData(websiteUrl, domainFallback);
    }
  }

  debugData.brandExtraction = websiteData;
  const fallbackScreenshots = Array.isArray(websiteData.media?.screenshots)
    ? normalizeScreenshotEntries(websiteData.media!.screenshots as unknown[])
    : [];

  debugData.screenshots = screenshotCollector.length > 0
    ? screenshotCollector
    : fallbackScreenshots;

  if (v4Data) {
    const phases = (v4Data.metadata as any)?.phases;
    if (phases) {
      debugData.extractionPhases = phases;
    }
    if ((v4Data as any).psychology) {
      debugData.psychologicalProfile = (v4Data as any).psychology;
    }
    if ((v4Data as any).competitors) {
      debugData.competitorAnalysis = (v4Data as any).competitors;
    }
  }

  const isFallbackData = !websiteData.extractionMeta
    || websiteData.page.title.toLowerCase().includes('utmb') === false;
  debugData.extractionStatus = isFallbackData ? 'fallback' : 'success';

  toolsLogger.info('🌐 [WEBSITE HANDLER] Step 2: Saving brand profile and building style…');
  const savedBrand = await saveBrandProfile({
    projectId,
    websiteUrl,
    extractedData: websiteData,
    userId,
  });

  const brandStyle = createBrandStyleFromExtraction(websiteData);
  toolsLogger.debug('🌐 [WEBSITE HANDLER] Brand style created', {
    primaryColor: brandStyle.colors.primary,
    primaryFont: brandStyle.typography.primaryFont,
    animationStyle: brandStyle.animation.style,
  });

  const screenshots = debugData.screenshots as string[];
  const domain = new URL(websiteUrl).hostname.replace('www.', '');

  return {
    websiteData,
    brandStyle,
    savedBrand,
    debugData,
    screenshots,
    v4Data,
    domain,
    isFallback: isFallbackData,
  };
}

export interface WebsiteToVideoInput {
  userPrompt: string;
  projectId: string;
  userId: string;
  websiteUrl: string;
  style?: 'minimal' | 'dynamic' | 'bold';
  duration?: number; // Target duration in seconds
  webContext?: any; // Pass existing web analysis if available
  streamingCallback?: (event: StreamingEvent) => Promise<void>;
  userInputs?: UrlToVideoUserInputs;
}

export type StreamingEvent =
  | {
      type: 'scene_completed';
      data: {
        sceneIndex: number;
        sceneName: string;
        totalScenes: number;
        sceneId?: string;
        projectId: string;
      };
    }
  | {
      type: 'scene_updated';
      data: {
        sceneIndex: number;
        sceneName: string;
        totalScenes: number;
        sceneId: string;
        projectId: string;
        progress: number;
      };
    }
  | {
      type: 'all_scenes_complete';
      data: {
        totalScenes: number;
        projectId: string;
      };
    }
  | {
      type: 'template_selected';
      data: {
        projectId: string;
        templateName: string;
        totalScenes: number;
      };
    }
  | {
      type: 'audio_added';
      data: {
        projectId: string;
        trackName: string;
        trackUrl: string;
      };
    };


export class WebsiteToVideoHandler {
  static async execute(input: WebsiteToVideoInput): Promise<ToolExecutionResult> {
    toolsLogger.info('🌐 [WEBSITE HANDLER] Starting website-to-video generation', {
      url: input.websiteUrl,
      projectId: input.projectId,
      style: input.style || 'dynamic',
      duration: input.duration || 20
    });
    
    try {
      const analysis = await analyzeWebsiteBranding({
        projectId: input.projectId,
        userId: input.userId,
        websiteUrl: input.websiteUrl,
        webContext: input.webContext,
      });

      const {
        websiteData,
        brandStyle,
        savedBrand,
        debugData,
        screenshots: _screenshots,
        v4Data: _v4Data,
        domain,
      } = analysis;

      const now = new Date();
      await upsertPersonalizationTarget({
        projectId: input.projectId,
        websiteUrl: input.websiteUrl,
        companyName: websiteData.brand?.identity?.name || domain,
        brandProfile: websiteData as unknown as Record<string, unknown>,
        brandTheme: brandStyle as unknown as Record<string, unknown>,
        timestamp: now,
      });
      toolsLogger.info('🌐 [WEBSITE HANDLER] Created personalization_target record');

      // 3. Select multi-scene template with AI personality
      toolsLogger.info('🌐 [WEBSITE HANDLER] Step 3: Selecting multi-scene template...');
      const multiSceneSelector = new MultiSceneTemplateSelector();
      const selection = await multiSceneSelector.select({
        websiteData,
        brandStyle,
        preferredDurationSeconds: input.userInputs?.requestedDurationSeconds ?? input.duration,
        aiPersonality: savedBrand?.personality as any, // Use AI-analyzed personality
        userInputs: input.userInputs,
      });

      const adjustedScenes = selection.narrativeScenes;
      const selectedTemplates = selection.templates;

      debugData.narrativeScenes = adjustedScenes;
      debugData.brandPersonality = selection.brandPersonality;
      debugData.templateSelection = {
        templateId: selection.selectedTemplate.id,
        templateName: selection.selectedTemplate.name,
        score: selection.score.score,
        breakdown: selection.score.breakdown,
        reasoning: selection.score.reasoning,
      };
      debugData.userInputs = input.userInputs;
      debugData.templateSelections = selectedTemplates.map((template, i) => ({
        scene: adjustedScenes[i]?.title,
        templateId: template.templateId,
        templateName: template.templateName,
        beat: template.narrativeBeat,
      }));

      if (input.streamingCallback) {
        await input.streamingCallback({
          type: 'template_selected',
          data: {
            projectId: input.projectId,
            templateName: selection.selectedTemplate.name,
            totalScenes: selectedTemplates.length,
          },
        });
      }
      
      // 4. ✨ STREAMING: Customize templates with incremental database saves
      toolsLogger.info('🌐 [WEBSITE HANDLER] Step 4: Streaming template customization...');
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
        userInputs: input.userInputs,
      }, onSceneComplete);

      let selectedMusicTrack = undefined as (typeof MUSIC_LIBRARY)[number] | undefined;
      if (input.userInputs?.musicPreferenceId) {
        selectedMusicTrack = MUSIC_LIBRARY.find((track) => track.id === input.userInputs?.musicPreferenceId);
      }
      if (!selectedMusicTrack && input.userInputs?.musicPreferenceName) {
        const normalized = input.userInputs.musicPreferenceName.toLowerCase();
        selectedMusicTrack = MUSIC_LIBRARY.find((track) => track.name.toLowerCase() === normalized);
      }

      debugData.selectedMusic = selectedMusicTrack
        ? { name: selectedMusicTrack.name, url: selectedMusicTrack.url, applied: false }
        : null;

      if (selectedMusicTrack) {
        try {
          const addAudioTool = new AddAudioTool();
          const audioResult = await addAudioTool.run({
            userPrompt: `Apply ${selectedMusicTrack.name} background audio selected from URL onboarding modal.`,
            projectId: input.projectId,
            audioUrls: [selectedMusicTrack.url],
          });

          debugData.selectedMusic.applied = audioResult.success && audioResult.data?.audioAdded;
          if (!audioResult.success) {
            debugData.selectedMusic.error = audioResult.error?.message ?? 'Failed to add audio';
          }

          if (audioResult.success && audioResult.data?.audioAdded && input.streamingCallback) {
            await input.streamingCallback({
              type: 'audio_added',
              data: {
                projectId: input.projectId,
                trackName: selectedMusicTrack.name,
                trackUrl: selectedMusicTrack.url,
              },
            });
          }
        } catch (error) {
          debugData.selectedMusic.applied = false;
          debugData.selectedMusic.error = error instanceof Error ? error.message : 'Unknown error while adding audio';
          toolsLogger.warn('🎵 [WEBSITE HANDLER] Failed to apply music preference automatically', error);
        }
      }

      // Final completion event
      if (input.streamingCallback) {
        await input.streamingCallback({
          type: 'all_scenes_complete',
          data: {
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

export async function upsertPersonalizationTarget(options: {
  projectId: string;
  websiteUrl: string;
  companyName: string;
  brandProfile: Record<string, unknown>;
  brandTheme: Record<string, unknown>;
  timestamp: Date;
}) {
  const { projectId, websiteUrl, companyName, brandProfile, brandTheme, timestamp } = options;

  const existingTarget = await db.query.personalizationTargets.findFirst({
    where: eq(personalizationTargets.projectId, projectId),
  });

  if (existingTarget) {
    await db.update(personalizationTargets)
      .set({
        status: 'ready',
        brandProfile: brandProfile as any,
        brandTheme: brandTheme as any,
        extractedAt: timestamp,
        updatedAt: timestamp,
      })
      .where(eq(personalizationTargets.id, existingTarget.id));
    return existingTarget.id;
  }

  const [inserted] = await db.insert(personalizationTargets)
    .values({
      projectId,
      websiteUrl,
      companyName,
      status: 'ready',
      brandProfile: brandProfile as any,
      brandTheme: brandTheme as any,
      extractedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .returning({ id: personalizationTargets.id });

  return inserted?.id ?? null;
}
