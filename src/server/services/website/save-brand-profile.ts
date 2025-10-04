import { and, eq, sql } from "drizzle-orm";
import { db } from "~/server/db";
import {
  brandRepository,
  projectBrandUsage,
  brandExtractionCache,
  brandProfiles,
} from "~/server/db/schema";
import { dbLogger } from "~/lib/utils/logger";
import {
  hashNormalizedUrl,
  normalizeBrandUrl,
} from "~/lib/utils/brand-url";
import { BrandPersonalityAnalyzer } from "~/server/services/ai/brand-personality-analyzer";
import { VisualBrandAnalyzer } from "~/server/services/ai/visual-brand-analyzer";

const BRAND_TTL_DAYS = 30;

export interface SaveBrandProfileParams {
  projectId: string;
  websiteUrl: string;
  extractedData: any;
  userId?: string;
}

/**
 * Save extracted brand data into the shared brand repository and link it to the project.
 */
export async function saveBrandProfile(params: SaveBrandProfileParams) {
  const { projectId, websiteUrl, extractedData, userId } = params;
  dbLogger.info("💾 [BRAND PROFILE] Saving brand data to shared repository...", {
    projectId,
    websiteUrl,
  });

  const normalizedUrl = normalizeBrandUrl(websiteUrl);
  if (!normalizedUrl) {
    throw new Error(`Cannot normalize provided website URL: ${websiteUrl}`);
  }

  const now = new Date();
  const ttlDate = new Date(now.getTime() + BRAND_TTL_DAYS * 24 * 60 * 60 * 1000);

  try {
    dbLogger.debug("💾 [BRAND PROFILE] Received data structure:", {
      hasPageData: !!extractedData.pageData,
      hasBrand: !!extractedData.brand,
      hasProduct: !!extractedData.product,
      hasSocialProof: !!extractedData.social_proof,
      topLevelKeys: Object.keys(extractedData)
    });
    
    // Handle SimplifiedBrandData structure from brandDataAdapter
    const brandData = extractedData.brand || 
                     extractedData.pageData?.visualDesign?.extraction?.brand || 
                     {};
    
    const media = extractedData.media || 
                  extractedData.pageData?.visualDesign?.extraction?.media || 
                  {};
    
    // Note: SimplifiedBrandData uses 'social_proof' not 'socialProof'
    const socialProof = extractedData.social_proof || 
                       extractedData.socialProof ||
                       extractedData.pageData?.visualDesign?.extraction?.socialProof || 
                       {};
    
    const product = extractedData.product || 
                   extractedData.pageData?.visualDesign?.extraction?.product || 
                   {};
    
    // Extract V4's enhanced data if available (these don't exist in SimplifiedBrandData)
    const psychology = extractedData.psychology || {};
    const competitors = extractedData.competitors || [];
    const aiAnalysis = extractedData.aiAnalysis || {};
    const semanticContent = extractedData.semanticContent || {};
    
    // Log what we extracted
    dbLogger.debug('💾 [BRAND PROFILE] Extracted data:', {
      brandColors: brandData.colors?.primary,
      brandFonts: brandData.typography?.fonts?.length,
      productHeadline: product.value_prop?.headline,
      socialProofStats: socialProof.stats,
      screenshotsCount: media.screenshots?.length
    });
    
    // Check if profile already exists
    const baseBrandData = {
      brandData: {
        ...brandData,
        // Include V4's enhanced brand insights
        psychology: psychology,
        competitors: competitors,
        aiAnalysis: aiAnalysis,
        semanticContent: semanticContent,
      },
      colors: brandData.colors || {},
      typography: brandData.typography || {},
      logos: brandData.logos || brandData.logo || {},
      copyVoice: {
        ...brandData.voice,
        headlines: product.value_prop ? [
          product.value_prop.headline,
          product.value_prop.subhead
        ].filter(Boolean) : [],
        // Include V4's psychological tone insights
        emotionalTone: psychology.emotionalProfile?.primaryEmotion || brandData.voice?.tone,
        persuasionStyle: psychology.persuasionTechniques?.[0] || brandData.voice?.style,
      },
      productNarrative: {
        ...product,
        // Include V4's competitive positioning
        competitiveAdvantage: competitors[0]?.differentiators || product.features,
        marketPosition: aiAnalysis.marketPosition || null,
      },
      socialProof: {
        ...socialProof,
        // Include V4's credibility indicators
        trustSignals: psychology.trustIndicators || socialProof.stats,
      },
      screenshots: media.screenshots || [],
      mediaAssets: [
        ...(media.screenshots || []),
        ...(media.lottieUrls?.map((url: string) => ({ type: 'lottie', url })) || []),
        ...(media.videos?.map((url: string) => ({ type: 'video', url })) || [])
      ],
      extractionVersion: extractedData.extractionMeta?.version || '4.0.0',
      extractionConfidence: {
        overall: extractedData.extractionMeta?.confidence?.overall || 
                 extractedData.pageData?.visualDesign?.extraction?.extractionMeta?.confidence || 0.95,
        colors: extractedData.extractionMeta?.confidence?.colors || 0.95,
        typography: extractedData.extractionMeta?.confidence?.typography || 0.90,
        content: extractedData.extractionMeta?.confidence?.content || 0.85,
        // V4 specific confidence scores
        aiAnalysis: extractedData.extractionMeta?.confidence?.aiAnalysis || 0.92,
        psychology: extractedData.extractionMeta?.confidence?.psychology || 0.88,
        competitors: extractedData.extractionMeta?.confidence?.competitors || 0.75,
      },
      lastAnalyzedAt: now,
    };

    // Analyze screenshots with vision (if available)
    let visualAnalysis;
    if (baseBrandData.screenshots && baseBrandData.screenshots.length > 0) {
      dbLogger.info("👁️ [VISUAL ANALYSIS] Analyzing screenshots with GPT-4o Vision...");
      const visualAnalyzer = new VisualBrandAnalyzer();
      visualAnalysis = await visualAnalyzer.analyzeScreenshots(
        baseBrandData.screenshots.map((s: any) => s.url || s).filter(Boolean)
      );
      dbLogger.info("👁️ [VISUAL ANALYSIS] Complete:", {
        density: visualAnalysis.density,
        colorEmotion: visualAnalysis.colorEmotion,
        professionalLevel: visualAnalysis.professionalLevel,
        confidence: visualAnalysis.confidence
      });
    }

    // Analyze brand personality using AI (with optional visual signals)
    dbLogger.info("🧠 [BRAND PERSONALITY] Analyzing brand personality...");
    const analyzer = new BrandPersonalityAnalyzer();
    const personality = await analyzer.analyzeBrandPersonality({
      colors: brandData.colors,
      typography: brandData.typography,
      copyVoice: baseBrandData.copyVoice,
      productNarrative: baseBrandData.productNarrative,
      screenshots: baseBrandData.screenshots,
      visualAnalysis, // Include visual analysis for better personality scoring
    });
    dbLogger.info("🧠 [BRAND PERSONALITY] Analysis complete:", personality);

    const screenshotUrls = (media.screenshots || [])
      .map((shot: { url?: string }) => shot?.url)
      .filter((url: string | undefined): url is string => typeof url === 'string' && url.length > 0);

    const cachePayload = {
      normalizedUrl,
      cacheKey: hashNormalizedUrl(normalizedUrl),
      rawHtml: extractedData.html || extractedData.rawHtml || null,
      screenshotUrls,
      colorSwatches: brandData.colors?.accents || [],
      ttl: ttlDate,
      extractedAt: now,
      createdAt: now,
    };

    const brandRecord = await db.transaction(async (tx) => {
      const existingBrand = await tx.query.brandRepository.findFirst({
        where: eq(brandRepository.normalizedUrl, normalizedUrl),
      });

      if (existingBrand) {
        dbLogger.debug("💾 [BRAND PROFILE] Updating shared repository entry", {
          normalizedUrl,
          brandId: existingBrand.id,
        });

        await tx
          .update(brandRepository)
          .set({
            ...baseBrandData,
            originalUrl: existingBrand.originalUrl || websiteUrl,
            firstExtractedBy: existingBrand.firstExtractedBy ?? userId ?? existingBrand.firstExtractedBy,
            personality,
            confidenceScore:
              extractedData.extractionMeta?.confidence?.overall ?? existingBrand.confidenceScore ?? 0.95,
            extractionVersion: extractedData.extractionMeta?.version || existingBrand.extractionVersion,
            reviewStatus: existingBrand.reviewStatus ?? 'automated',
            lastExtractedAt: now,
            updatedAt: now,
          })
          .where(eq(brandRepository.id, existingBrand.id));
      } else {
        dbLogger.debug("💾 [BRAND PROFILE] Creating shared repository entry", {
          normalizedUrl,
        });

        await tx.insert(brandRepository).values({
          normalizedUrl,
          originalUrl: websiteUrl,
          firstExtractedBy: userId ?? null,
          latestExtractionId: null,
          ...baseBrandData,
          personality,
          confidenceScore: extractedData.extractionMeta?.confidence?.overall ?? 0.95,
          reviewStatus: 'automated',
          extractionVersion: extractedData.extractionMeta?.version || '4.0.0',
          usageCount: 0,
          lastUsedAt: now,
          lastExtractedAt: now,
          ttl: ttlDate,
          createdAt: now,
          updatedAt: now,
        });
      }

      const brand = await tx.query.brandRepository.findFirst({
        where: eq(brandRepository.normalizedUrl, normalizedUrl),
      });

      if (!brand) {
        throw new Error(`Failed to locate brand repository entry for ${normalizedUrl}`);
      }

      const existingUsage = await tx.query.projectBrandUsage.findFirst({
        where: and(
          eq(projectBrandUsage.projectId, projectId),
          eq(projectBrandUsage.brandRepositoryId, brand.id),
        ),
      });

      if (existingUsage) {
        await tx
          .update(projectBrandUsage)
          .set({ usedAt: now })
          .where(eq(projectBrandUsage.id, existingUsage.id));
      } else {
        await tx.insert(projectBrandUsage).values({
          projectId,
          brandRepositoryId: brand.id,
          usedAt: now,
        });
      }

      const usageCountResult = await tx
        .select({ count: sql<number>`count(*)` })
        .from(projectBrandUsage)
        .where(eq(projectBrandUsage.brandRepositoryId, brand.id));

      const usageCount = usageCountResult[0]?.count ?? 0;

      const [finalBrand] = await tx
        .update(brandRepository)
        .set({
          usageCount,
          lastUsedAt: now,
          ttl: ttlDate,
          updatedAt: now,
        })
        .where(eq(brandRepository.id, brand.id))
        .returning();

      await tx
        .insert(brandExtractionCache)
        .values(cachePayload)
        .onConflictDoUpdate({
          target: brandExtractionCache.normalizedUrl,
          set: {
            cacheKey: cachePayload.cacheKey,
            rawHtml: cachePayload.rawHtml,
            screenshotUrls: cachePayload.screenshotUrls,
            colorSwatches: cachePayload.colorSwatches,
            ttl: cachePayload.ttl,
            extractedAt: cachePayload.extractedAt,
          },
        });

      return finalBrand;
    });

    // Maintain legacy per-project table for backward compatibility until callers migrate
    await syncLegacyBrandProfile(projectId, websiteUrl, baseBrandData);

    return brandRecord;
  } catch (error) {
    console.error('💾 [BRAND PROFILE] Error saving:', error);
    throw error;
  }
}

async function syncLegacyBrandProfile(
  projectId: string,
  websiteUrl: string,
  profileData: {
    brandData: Record<string, unknown>;
    colors: Record<string, unknown>;
    typography: Record<string, unknown>;
    logos: Record<string, unknown>;
    copyVoice: Record<string, unknown>;
    productNarrative: Record<string, unknown>;
    socialProof: Record<string, unknown>;
    screenshots: Array<Record<string, unknown>>;
    mediaAssets: Array<Record<string, unknown>>;
    extractionVersion: string;
    extractionConfidence: Record<string, unknown>;
    lastAnalyzedAt: Date;
  }
) {
  try {
    const existing = await db.query.brandProfiles.findFirst({
      where: eq(brandProfiles.projectId, projectId),
    });

    const legacyPayload = {
      projectId,
      websiteUrl,
      brandData: profileData.brandData,
      colors: profileData.colors,
      typography: profileData.typography,
      logos: profileData.logos,
      copyVoice: profileData.copyVoice,
      productNarrative: profileData.productNarrative,
      socialProof: profileData.socialProof,
      screenshots: profileData.screenshots,
      mediaAssets: profileData.mediaAssets,
      extractionVersion: profileData.extractionVersion,
      extractionConfidence: profileData.extractionConfidence || {},
      lastAnalyzedAt: profileData.lastAnalyzedAt ?? new Date(),
      updatedAt: new Date(),
    } as const;

    if (existing) {
      await db
        .update(brandProfiles)
        .set(legacyPayload)
        .where(eq(brandProfiles.id, existing.id));
    } else {
      await db.insert(brandProfiles).values({
        ...legacyPayload,
        createdAt: new Date(),
      });
    }
  } catch (legacyError) {
    console.warn('[BRAND PROFILE] Failed syncing legacy brand_profile table (non-blocking)', legacyError);
  }
}

/**
 * Create a formatted brand style directly from extracted data
 * Skips the BrandFormatter since data is already well-structured
 */
export function createBrandStyleFromExtraction(extractedData: any) {
  // Handle SimplifiedBrandData structure
  const brand = extractedData.brand || 
                extractedData.pageData?.visualDesign?.extraction?.brand || 
                {};
  
  const typography = brand.typography || {};
  const colors = brand.colors || {};
  const psychology = extractedData.psychology || {};
  const aiAnalysis = extractedData.aiAnalysis || {};
  
  // Log what we're working with
  dbLogger.debug('🎨 [BRAND STYLE] Creating style from:', {
    primaryColor: colors.primary,
    secondaryColor: colors.secondary,
    fonts: typography.fonts,
    hasButtons: !!brand.buttons
  });
  
  // Determine animation intensity based on psychological profile
  const animationIntensity = psychology.emotionalProfile?.energy || 
                             aiAnalysis.brandPersonality?.dynamism || 
                             'medium';
  
  return {
    colors: {
      primary: colors.primary || '#000000',
      secondary: colors.secondary || '#FFFFFF',
      accent: colors.accents?.[0] || colors.primary || '#000000',
      dark: colors.neutrals?.[1] || '#1a1a1a',
      light: colors.neutrals?.[0] || '#ffffff',
      gradient: colors.gradients?.[0] 
        ? `linear-gradient(${colors.gradients[0].angle || 135}deg, ${colors.gradients[0].stops?.join(', ') || `${colors.primary}, ${colors.secondary}`})`
        : `linear-gradient(135deg, ${colors.primary || '#000'}, ${colors.secondary || '#fff'})`,
      // V4 enhanced: emotion-based accent colors
      emotionalAccent: psychology.colorPsychology?.emotionalColor || colors.accents?.[1] || colors.primary,
    },
    typography: {
      primaryFont: typography.fonts?.[0]?.family || 'Inter',
      headingFont: typography.fonts?.[1]?.family || typography.fonts?.[0]?.family || 'Inter',
      fontSize: {
        hero: typography.scale?.h1?.size || '72px',
        heading: typography.scale?.h2?.size || '48px',
        body: typography.scale?.body?.size || '16px',
        caption: '14px',
      },
      fontWeight: {
        bold: 700,
        medium: 500,
        regular: 400,
      },
      // V4 enhanced: readability and hierarchy
      lineHeight: typography.lineHeight || 1.5,
      letterSpacing: typography.letterSpacing || 'normal',
    },
    animation: {
      duration: animationIntensity === 'high' ? 400 : animationIntensity === 'low' ? 200 : 300,
      easing: brand.animations?.easing?.spring || 'cubic-bezier(0.4, 0, 0.2, 1)',
      style: determineAnimationStyle(extractedData),
      // V4 enhanced: psychological motion preferences
      intensity: animationIntensity,
      motionPreference: psychology.userExperience?.motionPreference || 'balanced',
    },
    buttons: {
      borderRadius: brand.borders?.radius?.md || '8px',
      padding: brand.buttons?.padding || '12px 24px',
      primaryStyle: {
        background: brand.buttons?.styles?.primary?.background || colors.primary || '#000',
        color: brand.buttons?.styles?.primary?.color || '#ffffff',
        hover: brand.buttons?.styles?.primary?.hover,
      },
      // V4 enhanced: CTA psychology
      ctaStyle: psychology.persuasionTechniques?.includes('urgency') ? 'urgent' : 'standard',
    },
    spacing: {
      sm: 8,
      md: 16,
      lg: 32,
      xl: 64,
    },
    // V4 additions: Brand personality and voice
    personality: {
      tone: psychology.emotionalProfile?.primaryEmotion || brand.voice?.tone || 'professional',
      energy: animationIntensity,
      formality: aiAnalysis.brandPersonality?.formality || 'balanced',
      trustLevel: psychology.trustIndicators?.length || 0,
    },
  };
}

function determineAnimationStyle(data: any): 'minimal' | 'dynamic' | 'bold' {
  const layoutMotion = data.pageData?.visualDesign?.extraction?.layoutMotion || 
                       data.layoutMotion || 
                       {};
  
  if (layoutMotion.hasAnimation || layoutMotion.hasVideo) {
    return 'bold';
  }
  
  if (layoutMotion.transitions?.length > 1) {
    return 'dynamic';
  }
  
  return 'minimal';
}
