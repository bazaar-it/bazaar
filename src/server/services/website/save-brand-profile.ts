import { db } from "~/server/db";
import { brandProfiles } from "~/server/db/schema";
import { eq } from "drizzle-orm";

/**
 * Save extracted brand data to brand_profile table
 */
export async function saveBrandProfile(
  projectId: string,
  websiteUrl: string,
  extractedData: any
) {
  console.log('💾 [BRAND PROFILE] Saving brand data to database...');
  
  try {
    // Extract brand data from the nested structure
    const brandData = extractedData.pageData?.visualDesign?.extraction?.brand || 
                     extractedData.brand || 
                     {};
    
    const media = extractedData.pageData?.visualDesign?.extraction?.media || 
                  extractedData.media || 
                  {};
    
    const socialProof = extractedData.pageData?.visualDesign?.extraction?.socialProof || 
                       extractedData.socialProof || 
                       {};
    
    const product = extractedData.pageData?.visualDesign?.extraction?.product || 
                   extractedData.product || 
                   {};
    
    // Check if profile already exists
    const existing = await db.query.brandProfiles.findFirst({
      where: eq(brandProfiles.projectId, projectId),
    });
    
    const profileData = {
      projectId,
      websiteUrl,
      brandData: brandData,
      colors: brandData.colors || {},
      typography: brandData.typography || {},
      logos: brandData.logos || brandData.logo || {},
      copyVoice: {
        ...brandData.voice,
        headlines: product.value_prop ? [
          product.value_prop.headline,
          product.value_prop.subhead
        ].filter(Boolean) : []
      },
      productNarrative: product,
      socialProof: socialProof,
      screenshots: media.screenshots || [],
      mediaAssets: [
        ...(media.screenshots || []),
        ...(media.lottieUrls?.map((url: string) => ({ type: 'lottie', url })) || [])
      ],
      extractionVersion: '2.0.0',
      extractionConfidence: {
        overall: extractedData.pageData?.visualDesign?.extraction?.extractionMeta?.confidence || 0.95,
        colors: 0.95,
        typography: 0.90,
        content: 0.85
      },
      lastAnalyzedAt: new Date(),
    };
    
    if (existing) {
      console.log('💾 [BRAND PROFILE] Updating existing profile...');
      await db
        .update(brandProfiles)
        .set({
          ...profileData,
          updatedAt: new Date(),
        })
        .where(eq(brandProfiles.id, existing.id));
      
      return { ...existing, ...profileData };
    } else {
      console.log('💾 [BRAND PROFILE] Creating new profile...');
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
  const brand = extractedData.pageData?.visualDesign?.extraction?.brand || 
                extractedData.brand || 
                {};
  
  const typography = brand.typography || {};
  const colors = brand.colors || {};
  
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
    },
    animation: {
      duration: 300,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      style: determineAnimationStyle(extractedData),
    },
    buttons: {
      borderRadius: brand.borderRadius?.md || '8px',
      padding: brand.buttons?.padding || '12px 24px',
      primaryStyle: {
        background: brand.buttons?.styles?.primary?.background || colors.primary || '#000',
        color: brand.buttons?.styles?.primary?.color || '#ffffff',
        hover: brand.buttons?.styles?.primary?.hover,
      },
    },
    spacing: {
      sm: 8,
      md: 16,
      lg: 32,
      xl: 64,
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