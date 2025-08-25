/**
 * Adapter to convert between different brand data formats
 * Bridges V4's complex structure to the simpler format expected by Hero's Journey
 */

import type { ExtractedBrandDataV4 } from './WebAnalysisAgentV4';

export interface SimplifiedBrandData {
  page: {
    url: string;
    title: string;
    description?: string;
    headings?: string[];
  };
  targetAudience?: string[];
  brand: {
    colors: {
      primary: string;
      secondary: string;
      accents: string[];
      neutrals: string[];
      gradients: Array<{
        type: string;
        angle?: number;
        stops: string[];
      }>;
    };
    typography: {
      fonts: Array<{
        family: string;
        weights: number[];
      }>;
      scale: Record<string, string>;
    };
    buttons: {
      radius: string;
      padding: string;
      shadow?: string;
    };
    voice: {
      taglines: string[];
      tone: string;
    };
  };
  product: {
    value_prop: {
      headline: string;
      subhead: string;
    };
    problem?: string;
    solution?: string;
    features: Array<{
      title: string;
      desc: string;
      icon?: string;
    }>;
  };
  social_proof?: {
    stats?: {
      users?: string;
      rating?: string;
      reviews?: string;
    };
  };
  ctas?: Array<{
    label: string;
    type?: string;
    placement?: string;
  }>;
  media?: {
    screenshots?: any[];
  };
  extractionMeta?: any;
}

/**
 * Convert V4 brand data to simplified format for Hero's Journey
 */
export function convertV4ToSimplified(v4Data: ExtractedBrandDataV4): SimplifiedBrandData {
  // Log what we're converting
  console.log('🔄 [ADAPTER] Converting V4 data to simplified format:', {
    hasIdentity: !!v4Data.brand?.identity,
    identityName: v4Data.brand?.identity?.name,
    hasVisual: !!v4Data.brand?.visual,
    primaryColor: v4Data.brand?.visual?.colors?.primary,
    hasProduct: !!v4Data.product,
    productHeadline: v4Data.product?.value_prop?.headline,
    featuresCount: v4Data.product?.features?.length || 0,
    hasMetrics: !!v4Data.metrics
  });
  
  const result: SimplifiedBrandData = {
    page: {
      url: v4Data.metadata?.url || '',
      title: v4Data.brand?.identity?.name || 'Website',
      description: v4Data.brand?.identity?.tagline || '',
      headings: []
    },
    targetAudience: v4Data.product?.targetAudience || [],
    brand: {
      colors: {
        primary: v4Data.brand?.visual?.colors?.primary || '#000000',
        secondary: v4Data.brand?.visual?.colors?.secondary || '#666666',
        accents: v4Data.brand?.visual?.colors?.palette?.map(p => p.hex) || [],
        neutrals: ['#ffffff', '#f5f5f5', '#333333'],
        gradients: v4Data.brand?.visual?.colors?.gradients || []
      },
      typography: {
        fonts: [{
          family: v4Data.brand?.visual?.typography?.stack?.primary?.[0] || 'Inter',
          weights: [400, 500, 600, 700]
        }],
        scale: {
          h1: '3rem',
          h2: '2rem',
          h3: '1.5rem',
          body: '1rem'
        }
      },
      buttons: {
        radius: v4Data.brand?.visual?.borders?.radius?.button || '0.5rem',
        padding: '0.75rem 1.5rem'
      },
      voice: {
        taglines: [v4Data.brand?.identity?.tagline || ''],
        tone: v4Data.content?.voice?.tone || 'professional'
      }
    },
    product: {
      value_prop: {
        headline: v4Data.content?.hero?.headline || v4Data.brand?.identity?.tagline || 'Transform Your Business',
        subhead: v4Data.content?.hero?.subheadline || v4Data.brand?.identity?.mission || 'Professional solutions'
      },
      problem: v4Data.product?.problem || 'Outdated solutions',
      solution: v4Data.product?.solution || 'Modern approach',
      features: v4Data.product?.features?.map(f => ({
        title: f.name || f.title || 'Feature',
        desc: f.description || f.desc || '',
        icon: f.icon
      })) || []
    },
    social_proof: {
      stats: {
        users: v4Data.metrics?.users?.toString() || '1000+',
        rating: v4Data.metrics?.rating?.toString() || '4.9',
        // Include ALL extracted stats
        ...(v4Data.socialProof?.stats?.reduce((acc: any, stat: any) => {
          acc[stat.label] = stat.value;
          return acc;
        }, {}) || {})
      },
      testimonials: v4Data.socialProof?.testimonials || [],
      customerLogos: v4Data.socialProof?.customerLogos || [],
      trustBadges: v4Data.socialProof?.trustBadges || []
    },
    ctas: v4Data.content?.ctas || [],
    media: {
      screenshots: v4Data.screenshots || []
    },
    extractionMeta: v4Data.metadata
  };
  
  // Log the COMPLETE result
  console.log('🔄 [ADAPTER] Simplified data result:', {
    pageTitle: result.page.title,
    brandColors: result.brand.colors.primary,
    featuresConverted: result.product.features.length,
    targetAudienceCount: result.targetAudience?.length || 0,
    socialProof: {
      testimonials: result.social_proof.testimonials?.length || 0,
      customerLogos: result.social_proof.customerLogos?.length || 0,
      statsCount: Object.keys(result.social_proof.stats || {}).length
    },
    ctasCount: result.ctas?.length || 0,
    hasExtractonMeta: !!result.extractionMeta
  });
  
  return result;
}

/**
 * Create fallback brand data when extraction fails
 */
export function createFallbackBrandData(url: string, domain: string): SimplifiedBrandData {
  return {
    page: {
      url,
      title: domain.charAt(0).toUpperCase() + domain.slice(1).replace(/[.-]/g, ' '),
      description: `Professional website for ${domain}`,
    },
    brand: {
      colors: {
        primary: '#2563eb',
        secondary: '#1e40af',
        accents: ['#3b82f6', '#60a5fa'],
        neutrals: ['#f8fafc', '#e2e8f0', '#64748b'],
        gradients: [{
          type: 'linear',
          angle: 135,
          stops: ['#2563eb', '#3b82f6']
        }]
      },
      typography: {
        fonts: [{
          family: 'Inter',
          weights: [400, 500, 600, 700]
        }],
        scale: {
          h1: '3rem',
          h2: '2rem',
          h3: '1.5rem',
          body: '1rem'
        }
      },
      buttons: {
        radius: '0.5rem',
        padding: '0.75rem 1.5rem'
      },
      voice: {
        taglines: [`Welcome to ${domain}`],
        tone: 'professional'
      }
    },
    product: {
      value_prop: {
        headline: `Transform Your Business with ${domain}`,
        subhead: 'Professional solutions for modern businesses'
      },
      problem: 'Many businesses struggle with outdated solutions',
      features: [
        { title: 'Professional Service', desc: 'High-quality solutions' },
        { title: 'Expert Team', desc: 'Experienced professionals' },
        { title: 'Modern Approach', desc: 'Latest technology and methods' }
      ]
    },
    social_proof: {
      stats: {
        users: '1000+',
        rating: '4.9',
        reviews: 'satisfied customers'
      }
    },
    ctas: [
      { label: 'Get Started', type: 'primary', placement: 'hero' },
      { label: 'Learn More', type: 'secondary', placement: 'section' }
    ],
    media: {
      screenshots: []
    }
  };
}