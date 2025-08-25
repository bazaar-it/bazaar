import { db } from "~/server/db";
import { brandProfiles } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { dbLogger } from '~/lib/utils/logger';

/**
 * Save extracted brand data to brand_profile table
 */
export async function saveBrandProfile(
  projectId: string,
  websiteUrl: string,
  extractedData: any
) {
  dbLogger.info('💾 [BRAND PROFILE] Saving brand data to database...');
  
  try {
    // Log the structure we're receiving for debugging
    dbLogger.debug('💾 [BRAND PROFILE] Received data structure:', {
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
    const existing = await db.query.brandProfiles.findFirst({
      where: eq(brandProfiles.projectId, projectId),
    });
    
    // Only include V4 enhanced fields if they have actual data
    const enhancedBrandData: any = { ...brandData };
    
    // Only add these fields if they contain data
    if (psychology && Object.keys(psychology).length > 0) {
      enhancedBrandData.psychology = psychology;
    }
    if (competitors && competitors.length > 0) {
      enhancedBrandData.competitors = competitors;
    }
    if (aiAnalysis && Object.keys(aiAnalysis).length > 0) {
      enhancedBrandData.aiAnalysis = aiAnalysis;
    }
    if (semanticContent && Object.keys(semanticContent).length > 0) {
      enhancedBrandData.semanticContent = semanticContent;
    }
    
    const profileData = {
      projectId,
      websiteUrl,
      brandData: enhancedBrandData,
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
        competitiveAdvantage: competitors[0]?.differentiators || product.features?.slice(0, 3),
        marketPosition: aiAnalysis.marketPosition || null,
        // Preserve ALL features, not just first 3
        allFeatures: product.features || [],
        targetAudience: extractedData.targetAudience || [],
        // Keep original features field for backward compatibility but limited
        features: product.features?.slice(0, 3) || []
      },
      socialProof: {
        ...socialProof,
        // Include V4's credibility indicators
        trustSignals: psychology.trustIndicators || socialProof.stats,
        // Preserve all social proof data
        testimonials: socialProof.testimonials || [],
        customerLogos: socialProof.customerLogos || [],
        trustBadges: socialProof.trustBadges || [],
        allStats: socialProof.stats || {},
        // Keep a limited stats field for backward compatibility
        stats: Object.fromEntries(
          Object.entries(socialProof.stats || {}).slice(0, 3)
        )
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
      lastAnalyzedAt: new Date(),
    };
    
    if (existing) {
      dbLogger.debug('💾 [BRAND PROFILE] Updating existing profile...');
      await db
        .update(brandProfiles)
        .set({
          ...profileData,
          updatedAt: new Date(),
        })
        .where(eq(brandProfiles.id, existing.id));
      
      return { ...existing, ...profileData };
    } else {
      dbLogger.debug('💾 [BRAND PROFILE] Creating new profile...');
      const [newProfile] = await db
        .insert(brandProfiles)
        .values(profileData)
        .returning();
      
      return newProfile;
    }
  } catch (error) {
    console.error('💾 [BRAND PROFILE] Error saving:', error);
    throw error;
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