import { TemplateLoaderService } from "~/server/services/ai/templateLoader.service";
import type { SelectedTemplate } from "~/server/services/website/template-selector";
import type { SimplifiedBrandData } from "~/tools/webAnalysis/brandDataAdapter";
import type { HeroJourneyScene } from "~/tools/narrative/herosJourney";
import { toolsLogger } from "~/lib/utils/logger";
import type { UrlToVideoUserInputs } from '~/lib/types/url-to-video';
import {
  MULTI_SCENE_TEMPLATES,
  type BrandPersonality,
  type MultiSceneTemplateMetadata,
  type MultiSceneTemplateScene,
  type TemplateSelectionScore,
  selectBestTemplate,
} from "./multi-scene-metadata";

const FPS = 30;

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function collectKeywords(text?: string | null): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
}

function extractKeywords(data: SimplifiedBrandData): string[] {
  const keywords = new Set<string>();

  const add = (value?: string | null) => {
    for (const token of collectKeywords(value)) {
      keywords.add(token);
    }
  };

  add(data.page?.title);
  add(data.page?.description);
  data.page?.headings?.forEach(add);
  add(data.brand?.identity?.mission);
  add(data.brand?.identity?.vision);
  data.brand?.identity?.values?.forEach(add);

  const adjectives = data.brand?.voice?.adjectives ?? [];
  adjectives.forEach(add);
  add(data.brand?.voice?.tone);
  add(data.brand?.voice?.style);

  if (Array.isArray(data.product?.features)) {
    data.product.features.forEach((feature) => {
      add(feature?.title);
      add(feature?.desc);
    });
  }

  add(data.product?.problem);
  add(data.product?.solution);
  add(data.product?.value_prop?.headline);
  add(data.product?.value_prop?.subhead);

  data.ctas?.forEach((cta) => add(cta?.label));

  const urlKeywords = collectKeywords(data.page?.url)
    .filter((token) => token.length > 3 && token !== 'https' && token !== 'http');
  urlKeywords.forEach((token) => keywords.add(token));

  return Array.from(keywords);
}

function deriveBrandPersonality(
  data: SimplifiedBrandData,
  brandStyle: any
): BrandPersonality {
  const adjectives = new Set(
    (data.brand?.voice?.adjectives ?? [])
      .concat((data.brand?.voice?.keywords as string[] | undefined) ?? [])
      .map((word) => word.toLowerCase())
  );
  const tone = (data.brand?.voice?.tone ?? '').toLowerCase();
  const palette = data.brand?.colors?.accents ?? [];
  const gradients = data.brand?.colors?.gradients ?? [];

  const personality: BrandPersonality = {
    corporate: 0.5,
    minimalist: 0.5,
    playful: 0.5,
    technical: 0.5,
    bold: 0.5,
    modern: 0.5,
  };

  const hasKeyword = (...keywords: string[]) =>
    keywords.some((keyword) => adjectives.has(keyword) || tone.includes(keyword));

  if (hasKeyword('enterprise', 'professional', 'secure', 'trustworthy', 'regulated')) {
    personality.corporate = clamp(personality.corporate + 0.25);
  }
  if (hasKeyword('friendly', 'approachable', 'playful', 'fun', 'delightful')) {
    personality.playful = clamp(personality.playful + 0.3);
    personality.corporate = clamp(personality.corporate - 0.1);
  }
  if (hasKeyword('minimal', 'clean', 'simple', 'elegant', 'sleek')) {
    personality.minimalist = clamp(personality.minimalist + 0.3);
  }
  if (palette.length <= 2) {
    personality.minimalist = clamp(personality.minimalist + 0.1);
  }
  if (hasKeyword('technical', 'developer', 'api', 'data', 'analytics', 'automation', 'ai')) {
    personality.technical = clamp(personality.technical + 0.3);
  }
  if (hasKeyword('bold', 'powerful', 'dynamic', 'impactful', 'vibrant')) {
    personality.bold = clamp(personality.bold + 0.3);
  }
  if (palette.length >= 3 || gradients.length > 0) {
    personality.bold = clamp(personality.bold + 0.1);
  }
  if (hasKeyword('modern', 'innovative', 'future', 'cutting-edge', 'next-gen')) {
    personality.modern = clamp(personality.modern + 0.3);
  }

  const animationStyle = brandStyle?.animation?.style as string | undefined;
  if (animationStyle) {
    if (/calm|smooth|gentle/.test(animationStyle)) {
      personality.minimalist = clamp(personality.minimalist + 0.05);
    }
    if (/energetic|dynamic|punchy/.test(animationStyle)) {
      personality.bold = clamp(personality.bold + 0.1);
      personality.playful = clamp(personality.playful + 0.05);
    }
  }

  if (personality.playful > 0.7) {
    personality.corporate = clamp(personality.corporate - 0.1);
  }
  if (personality.corporate > 0.7) {
    personality.playful = clamp(personality.playful - 0.1);
  }

  return personality;
}

function computeContentAvailability(data: SimplifiedBrandData) {
  const hasLogo = Boolean(data.brand?.logo);
  const hasSocialProof = Boolean(
    data.social_proof?.stats &&
    Object.values(data.social_proof.stats).some((value) => Boolean(value))
  );
  const hasScreenshots = Array.isArray(data.media?.screenshots) && data.media.screenshots.length > 0;
  const featureCount = Array.isArray(data.product?.features) ? data.product.features.length : 0;

  return { hasLogo, hasSocialProof, hasScreenshots, featureCount };
}

type SceneBeatType = MultiSceneTemplateScene['beatType'];

const beatToEmotionalMap: Record<SceneBeatType, HeroJourneyScene['emotionalBeat']> = {
  logo_reveal: 'discovery',
  tagline: 'discovery',
  hook: 'tension',
  problem_setup: 'problem',
  problem_impact: 'tension',
  solution_intro: 'discovery',
  solution_feature: 'transformation',
  proof: 'triumph',
  benefit: 'transformation',
  cta: 'invitation',
};

function buildNarrativeForBeat(
  scene: MultiSceneTemplateScene,
  data: SimplifiedBrandData,
  userInputs?: UrlToVideoUserInputs
): { title: string; narrative: string; visualElements: string[] } {
  const fallbackTitle = scene.name;
  const voiceTone = data.brand?.voice?.tone ?? '';

  switch (scene.beatType) {
    case 'logo_reveal':
      return {
        title: data.page?.title || fallbackTitle,
        narrative: data.brand?.identity?.tagline || `Introducing ${data.page?.title || 'our brand'}`,
        visualElements: ['Logo animation', 'Gradient reveal', 'Brand palette background'],
      };
    case 'tagline':
      return {
        title: 'Our Mission',
        narrative:
          data.brand?.identity?.tagline || data.product?.value_prop?.headline || 'We deliver results that matter.',
        visualElements: ['Headline typography', 'Accent highlight', 'Supporting subtext'],
      };
    case 'hook':
      return {
        title: 'Imagine Better',
        narrative:
          data.product?.value_prop?.headline || 'There is a better way to work.',
        visualElements: ['Hero imagery', 'Animated keywords', 'Energy lines'],
      };
    case 'problem_setup':
      return {
        title: 'The Challenge',
        narrative:
          userInputs?.problemStatement ||
          data.product?.problem ||
          'Teams struggle with outdated tools every day.',
        visualElements: ['Frustrated user', 'Broken interface', 'Warning icons'],
      };
    case 'problem_impact':
      return {
        title: 'The Impact',
        narrative:
          data.product?.solution || 'Losing hours, momentum, and opportunities.',
        visualElements: ['Clock draining', 'Falling metrics', 'Stress visuals'],
      };
    case 'solution_intro':
      return {
        title: 'The Solution',
        narrative:
          data.product?.value_prop?.headline || `Meet ${data.page?.title || 'the solution'}.`,
        visualElements: ['Product highlight', 'Light burst', 'Positive motion'],
      };
    case 'solution_feature': {
      const feature = data.product?.features?.[0];
      return {
        title: feature?.title || 'What you get',
        narrative:
          userInputs?.differentiators ||
          feature?.desc ||
          'Powerful features that just work.',
        visualElements: ['Feature iconography', 'Screenshot frame', 'Callout labels'],
      };
    }
    case 'benefit':
      return {
        title: 'Why It Matters',
        narrative:
          data.product?.features?.[1]?.desc || data.product?.value_prop?.subhead || 'Focus on outcomes, not busywork.',
        visualElements: ['Benefit icons', 'Before/after comparison', 'Positive metrics'],
      };
    case 'proof': {
      const stats = data.social_proof?.stats;
      const users = stats?.users || 'Thousands of teams';
      return {
        title: 'Proven Results',
        narrative: stats?.rating
          ? `${users} trust us • Rated ${stats.rating}`
          : `${users} already switched`,
        visualElements: ['Ratings', 'Customer logos', 'Testimonial quotes'],
      };
    }
    case 'cta': {
      const cta = data.ctas?.[0]?.label || 'Get Started';
      return {
        title: 'Ready When You Are',
        narrative: (userInputs?.musicPreferenceName || userInputs?.musicPreferenceId)
          ? `${cta} today • Set to a ${(userInputs?.musicPreferenceName || userInputs?.musicPreferenceId || '').toLowerCase()} soundtrack`
          : `${cta} today`,
        visualElements: ['CTA button', 'Arrow motion', 'Product screenshot'],
      };
    }
    default:
      return {
        title: fallbackTitle,
        narrative: data.product?.value_prop?.headline || 'Build momentum with us.',
        visualElements: ['Typography', 'Brand shapes', 'Abstract motion'],
      };
  }
}

function computeSceneDurations(
  template: MultiSceneTemplateMetadata,
  preferredDurationSeconds?: number
): number[] {
  if (!preferredDurationSeconds || preferredDurationSeconds <= 0) {
    return template.scenes.map((scene) => scene.duration);
  }

  const targetFrames = Math.round(preferredDurationSeconds * FPS);
  if (targetFrames <= 0) {
    return template.scenes.map((scene) => scene.duration);
  }

  const ratio = targetFrames / template.totalDuration;
  const scaled = template.scenes.map((scene) => Math.max(45, Math.round(scene.duration * ratio)));
  const currentSum = scaled.reduce((sum, value) => sum + value, 0);
  const delta = targetFrames - currentSum;

  if (delta !== 0 && scaled.length > 0) {
    scaled[scaled.length - 1] = Math.max(45, scaled[scaled.length - 1] + delta);
  }

  return scaled;
}

function buildNarrativeScenes(
  template: MultiSceneTemplateMetadata,
  data: SimplifiedBrandData,
  brandStyle: any,
  preferredDurationSeconds?: number,
  userInputs?: UrlToVideoUserInputs
): HeroJourneyScene[] {
  const durations = computeSceneDurations(template, preferredDurationSeconds);

  return template.scenes.map((scene, index) => {
    const mapped = buildNarrativeForBeat(scene, data, userInputs);
    const emotionalBeat = beatToEmotionalMap[scene.beatType] ?? 'discovery';
    const duration = durations[index] ?? scene.duration;

    return {
      title: mapped.title,
      duration,
      narrative: mapped.narrative,
      visualElements: mapped.visualElements,
      brandElements: {
        colors: [
          brandStyle?.colors?.primary ?? '#000000',
          brandStyle?.colors?.secondary ?? '#666666',
          brandStyle?.colors?.accent ?? '#00AEEF',
        ].filter(Boolean),
        typography: brandStyle?.typography?.primaryFont ?? 'Inter',
        motion: brandStyle?.animation?.style ?? 'smooth',
      },
      emotionalBeat,
    } satisfies HeroJourneyScene;
  });
}

export interface MultiSceneSelectionResult {
  selectedTemplate: MultiSceneTemplateMetadata;
  score: TemplateSelectionScore;
  brandPersonality: BrandPersonality;
  templates: SelectedTemplate[];
  narrativeScenes: HeroJourneyScene[];
}

export class MultiSceneTemplateSelector {
  constructor(private templates: MultiSceneTemplateMetadata[] = MULTI_SCENE_TEMPLATES) {}

  async select(options: {
    websiteData: SimplifiedBrandData;
    brandStyle: any;
    preferredDurationSeconds?: number;
    aiPersonality?: BrandPersonality; // AI-analyzed personality from brand repository
    userInputs?: UrlToVideoUserInputs;
  }): Promise<MultiSceneSelectionResult> {
    const { websiteData, brandStyle, preferredDurationSeconds, aiPersonality, userInputs } = options;

    // Use AI-analyzed personality if available, otherwise fall back to rule-based
    const brandPersonality = aiPersonality ?? deriveBrandPersonality(websiteData, brandStyle);

    if (aiPersonality) {
      toolsLogger.info('🎯 [MULTI-SCENE SELECTOR] Using AI-analyzed personality:', aiPersonality);
    } else {
      toolsLogger.info('⚙️ [MULTI-SCENE SELECTOR] Using rule-based personality (fallback):', brandPersonality);
    }
    const contentAvailability = computeContentAvailability(websiteData);
    const detectedKeywords = extractKeywords(websiteData);

    const computedScore = this.templates.length
      ? selectBestTemplate(this.templates, brandPersonality, {
          ...contentAvailability,
          detectedKeywords,
        })
      : undefined;

    const selectedTemplate = computedScore?.template ?? this.templates[0];
    if (!selectedTemplate) {
      throw new Error('No multi-scene templates available for selection');
    }

    const score: TemplateSelectionScore = computedScore ?? {
      template: selectedTemplate,
      score: 0,
      breakdown: {
        personalityMatch: 0,
        industryMatch: 0,
        contentAvailability: 0,
        keywordMatch: 0,
      },
      reasoning: 'Default template used (no active templates scored)',
    };

    const loader = new TemplateLoaderService();
    const templates: SelectedTemplate[] = [];

    for (const scene of selectedTemplate.scenes) {
      const templateCode = await loader.loadTemplateCode(scene.templateId);

      if (!templateCode) {
        toolsLogger.warn(
          `🎨 [MULTI-SCENE SELECTOR] Missing template code for ${scene.templateId}, using FadeIn fallback`
        );
        const fallbackCode = await loader.loadTemplateCode('FadeIn');
        if (!fallbackCode) {
          throw new Error(`Unable to load template code for ${scene.templateId} or fallback FadeIn`);
        }
        templates.push({
          templateId: 'FadeIn',
          templateName: 'Fallback Fade In',
          templateCode: fallbackCode,
          originalDuration: scene.duration,
          narrativeBeat: scene.beatType,
          customizationHints: {},
        });
        continue;
      }

      templates.push({
        templateId: scene.templateId,
        templateName: scene.name,
        templateCode,
        originalDuration: scene.duration,
        narrativeBeat: scene.beatType,
        customizationHints: {},
      });
    }

    const narrativeScenes = buildNarrativeScenes(
      selectedTemplate,
      websiteData,
      brandStyle,
      preferredDurationSeconds,
      userInputs
    );

    return {
      selectedTemplate,
      score,
      brandPersonality,
      templates,
      narrativeScenes,
    };
  }
}
