import { db } from "~/server/db";
import { scenes } from "~/server/db/schema";
import { eq, asc } from "drizzle-orm";
import { analyzeWebsiteBranding, upsertPersonalizationTarget, type StreamingEvent, type WebsiteBrandAnalysisResult } from "~/tools/website/websiteToVideoHandler";
import type { UrlToVideoUserInputs } from "~/lib/types/url-to-video";
import type { BrainDecision } from "~/lib/types/ai/brain.types";
import { executeToolFromDecision } from "~/server/api/routers/generation/helpers";
import { toolsLogger } from "~/lib/utils/logger";
import type { SimplifiedBrandData } from "~/tools/webAnalysis/brandDataAdapter";

interface ApplyBrandingOptions {
  projectId: string;
  userId: string;
  websiteUrl: string;
  sceneIds: string[];
  userPrompt: string;
  userInputs?: UrlToVideoUserInputs;
  streamingCallback?: (event: StreamingEvent | {
    type: 'scene_updated';
    data: {
      sceneId: string;
      sceneName: string;
      sceneIndex: number;
      totalScenes: number;
      projectId: string;
    };
  }) => Promise<void>;
}

export class WebsiteBrandingSceneApplier {
  static async apply(options: ApplyBrandingOptions) {
    const { projectId, userId, websiteUrl, sceneIds, userPrompt, userInputs, streamingCallback } = options;

    if (!sceneIds.length) {
      throw new Error('At least one scene must be selected to apply branding');
    }

    toolsLogger.info('🌐 [WEBSITE APPLIER] Applying website branding to existing scenes', {
      projectId,
      websiteUrl,
      sceneCount: sceneIds.length,
    });

    const analysis = await analyzeWebsiteBranding({
      projectId,
      userId,
      websiteUrl,
    });

    const { websiteData, brandStyle, savedBrand, debugData, screenshots, domain } = analysis;

    await upsertPersonalizationTarget({
      projectId,
      websiteUrl,
      companyName: websiteData.brand?.identity?.name || domain,
      brandProfile: websiteData,
      brandTheme: brandStyle,
      timestamp: new Date(),
    });

    // Prepare storyboard context for edit tool
    const storyboard = await db.query.scenes.findMany({
      where: eq(scenes.projectId, projectId),
      orderBy: asc(scenes.order),
    });

    const storyboardContext = storyboard.map((scene) => ({
      id: scene.id,
      name: scene.name,
      duration: scene.duration,
      order: scene.order ?? 0,
      tsxCode: scene.tsxCode,
    }));

    const sceneOrderMap = new Map(storyboard.map((scene) => [scene.id, scene]));

    const uniqueSceneIds = sceneIds.filter((id, index) => sceneIds.indexOf(id) === index);
    const totalScenes = uniqueSceneIds.length;

    const screenshotUrls = extractScreenshotPair(screenshots, websiteUrl);
    const webContext = buildWebContext({ websiteUrl, websiteData, screenshotUrls });

    const assistantMessages: string[] = [];

    for (let index = 0; index < uniqueSceneIds.length; index++) {
      const sceneId = uniqueSceneIds[index];
      const targetScene = sceneOrderMap.get(sceneId);
      if (!targetScene) {
        throw new Error(`Scene ${sceneId} not found in project ${projectId}`);
      }

      const prompt = buildBrandingPrompt({
        domain,
        brandStyle,
        savedBrand,
        websiteData,
        userInputs,
        originalPrompt: userPrompt,
        sceneName: targetScene.name,
      });

      const decision: BrainDecision = {
        success: true,
        toolName: 'editScene',
        reasoning: `Apply ${domain} branding to scene ${targetScene.name}`,
        toolContext: {
          userPrompt: prompt,
          targetSceneId: sceneId,
          imageAction: 'recreate',
          imageUrls: screenshotUrls.references,
          webContext,
        },
      };

      const result = await executeToolFromDecision(
        decision,
        projectId,
        userId,
        storyboardContext,
      );

      if (!result.success || !result.scene) {
        throw new Error(result?.scene ? 'Edit operation returned no scene' : 'Edit operation failed');
      }

      const progressMessage = `Updated ${result.scene.name} with ${domain} brand styling.`;
      assistantMessages.push(progressMessage);

      if (streamingCallback) {
        await streamingCallback({
          type: 'scene_updated',
          data: {
            sceneId: result.scene.id,
            sceneName: result.scene.name,
            sceneIndex: index,
            totalScenes,
            projectId,
          },
        });
      }
    }

    if (streamingCallback) {
      await streamingCallback({
        type: 'all_scenes_complete',
        data: {
          totalScenes,
          projectId,
        },
      });
    }

    return {
      success: true,
      toolName: 'editScene',
      reasoning: assistantMessages.join('\n'),
      data: {
        debugData,
        updatedScenes: uniqueSceneIds,
      },
    } satisfies ToolExecutionResult;
  }
}

function buildBrandingPrompt(options: {
  domain: string;
  brandStyle: WebsiteBrandAnalysisResult['brandStyle'];
  savedBrand: WebsiteBrandAnalysisResult['savedBrand'];
  websiteData: SimplifiedBrandData;
  userInputs?: UrlToVideoUserInputs;
  originalPrompt: string;
  sceneName: string;
}) {
  const { domain, brandStyle, savedBrand, websiteData, userInputs, originalPrompt, sceneName } = options;

  const lines: string[] = [];
  lines.push(`Apply ${domain}'s branding to the existing scene named "${sceneName}".`);
  lines.push(`Focus on updating colors, typography, button styles, and supporting graphics to reflect the brand.`);
  lines.push(`Brand colors → primary: ${brandStyle.colors.primary}, secondary: ${brandStyle.colors.secondary}, accent: ${brandStyle.colors.accent}.`);
  lines.push(`Typography → headings: ${brandStyle.typography.headingFont}, body: ${brandStyle.typography.primaryFont}, line-height: ${brandStyle.typography.lineHeight}.`);
  lines.push(`Buttons should use border radius ${brandStyle.buttons.borderRadius} and ${brandStyle.buttons.primaryStyle.background} backgrounds with ${brandStyle.buttons.primaryStyle.color} text.`);
  lines.push(`Motion → ${brandStyle.animation.style} style, intensity ${brandStyle.animation.intensity}. Keep movements balanced unless the brand personality demands otherwise.`);

  const valueProp = websiteData.product?.value_prop;
  if (valueProp?.headline) {
    lines.push(`Rewrite the primary headline to emphasize: "${valueProp.headline}".`);
  }
  if (valueProp?.subhead) {
    lines.push(`Ensure supporting copy reinforces the message: "${valueProp.subhead}".`);
  }

  if (websiteData.product?.problem) {
    lines.push(`If the scene introduces a problem, align it with: "${websiteData.product.problem}".`);
  }

  const featureSnippets = (websiteData.product?.features ?? [])
    .map((feature) => feature?.title || feature?.desc)
    .filter((text): text is string => Boolean(text))
    .slice(0, 3);
  if (featureSnippets.length > 0) {
    lines.push(`Highlight key differentiators such as: ${featureSnippets.map((text) => `"${text}"`).join(', ')}.`);
  }

  const tagline = websiteData.brand?.identity?.tagline || websiteData.brand?.voice?.taglines?.[0];
  if (tagline) {
    lines.push(`Consider weaving in the brand tagline: "${tagline}".`);
  }

  const primaryCta = websiteData.ctas?.[0]?.label;
  if (primaryCta) {
    lines.push(`Update the call-to-action wording to mirror: "${primaryCta}".`);
  }

  if (savedBrand?.personality?.tone) {
    lines.push(`Brand tone: ${savedBrand.personality.tone}. Ensure copy reflects this voice.`);
  }

  const problem = userInputs?.problemStatement?.trim();
  if (problem) {
    lines.push(`Highlight this problem statement: ${problem}`);
  }

  const differentiators = userInputs?.differentiators?.trim();
  if (differentiators) {
    lines.push(`Emphasize differentiators: ${differentiators}`);
  }

  if (websiteData?.brand?.messaging?.tagline) {
    lines.push(`Optional tagline inspiration: ${websiteData.brand.messaging.tagline}.`);
  }

  lines.push('Preserve the existing layout and structure unless a minor adjustment is required to align with the brand.');
  lines.push('Keep animations performant and do not introduce new components unless necessary for branding.');
  lines.push('Do not embed website screenshots directly; use provided images as visual reference only.');
  lines.push('Return the complete updated scene code.');

  if (originalPrompt) {
    lines.push(`Reference user prompt summary: ${originalPrompt}`);
  }

  return lines.join('\n');
}

function buildWebContext(options: {
  websiteUrl: string;
  websiteData: SimplifiedBrandData;
  screenshotUrls: ReturnType<typeof extractScreenshotPair>;
}) {
  const { websiteUrl, websiteData, screenshotUrls } = options;

  return {
    originalUrl: websiteUrl,
    screenshotUrls: {
      desktop: screenshotUrls.desktop,
      mobile: screenshotUrls.mobile,
    },
    pageData: {
      title: websiteData.page?.title || new URL(websiteUrl).hostname,
      description: websiteData.page?.description || undefined,
      headings: websiteData.page?.headings || [],
      url: websiteUrl,
    },
    analyzedAt: new Date().toISOString(),
  };
}

function extractScreenshotPair(rawScreenshots: unknown[] | undefined, fallbackUrl: string) {
  const urls: string[] = [];

  if (Array.isArray(rawScreenshots)) {
    rawScreenshots.forEach((item) => {
      if (!item) return;
      if (typeof item === 'string') {
        urls.push(item);
        return;
      }
      if (typeof item === 'object') {
        const record = item as Record<string, unknown>;
        const maybeUrl = record.url || record.src || record.image;
        if (typeof maybeUrl === 'string') {
          urls.push(maybeUrl);
        }
      }
    });
  }

  const desktop = urls[0] || placeholderScreenshot(fallbackUrl);
  const mobile = urls[1] || urls[0] || placeholderScreenshot(fallbackUrl);

  return {
    desktop,
    mobile,
    references: urls.length ? urls : [desktop, mobile].filter((value, index, self) => self.indexOf(value) === index),
  };
}

function placeholderScreenshot(url: string) {
  const domain = new URL(url).hostname.replace('www.', '');
  return `https://image.thum.io/get/width/1200/${encodeURIComponent(`https://${domain}`)}`;
}

// Re-export ToolExecutionResult type locally to avoid circular imports
interface ToolExecutionResult {
  success: boolean;
  toolName: string;
  data?: Record<string, any>;
  error?: { message: string; code: string };
  reasoning: string;
  chatResponse?: string;
}
