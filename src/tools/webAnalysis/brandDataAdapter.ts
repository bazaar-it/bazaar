/**
 * Adapter to convert between different brand data formats
 * Bridges V4's complex structure to the simpler format expected by Hero's Journey
 */

import type { ExtractedBrandDataV4 } from './WebAnalysisAgentV4';

function normalizeFontStack(stack?: string[]): { family?: string; fallback?: string } {
  if (!Array.isArray(stack) || stack.length === 0) {
    return {};
  }

  const [primary, ...rest] = stack;
  const normalize = (value?: string) => value?.replace(/["']/g, '').trim();

  return {
    family: normalize(primary),
    fallback: rest.map(normalize).filter(Boolean).join(', ') || undefined,
  };
}

function extractDomain(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
}

function toTitleCaseFromSlug(value?: string | null): string | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/[^a-zA-Z0-9-_\s]/g, '');
  if (!cleaned) return undefined;
  const words = cleaned
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1));
  const result = words.join(' ').trim();
  return result || undefined;
}

function normalizeCandidate(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const normalized = trimmed.replace(/\s+/g, ' ');
  if (normalized.length < 2 || normalized.length > 80) return undefined;
  if (/^https?:/i.test(normalized)) return undefined;
  return normalized;
}

function matchesDomain(candidate: string, domain?: string): boolean {
  if (!domain) return false;
  const normalizedDomain = domain.replace(/[^a-z0-9]/gi, '').toLowerCase();
  if (!normalizedDomain) return false;
  const normalizedCandidate = candidate.replace(/[^a-z0-9]/gi, '').toLowerCase();
  if (!normalizedCandidate) return false;
  return (
    normalizedCandidate.includes(normalizedDomain) ||
    normalizedDomain.includes(normalizedCandidate)
  );
}

function deriveBrandName(v4Data: ExtractedBrandDataV4, domain?: string): string | undefined {
  const candidates: Array<{ value: string; weight: number }> = [];
  const addCandidate = (raw?: string | null, weight = 1) => {
    const normalized = normalizeCandidate(raw);
    if (!normalized) return;
    if (candidates.some((entry) => entry.value.toLowerCase() === normalized.toLowerCase())) {
      return;
    }
    candidates.push({ value: normalized, weight });
  };

  addCandidate((v4Data.brand?.identity as any)?.shortName, 12);
  addCandidate(v4Data.brand?.identity?.name, 11);
  addCandidate(v4Data.content?.hero?.headline, 5);
  addCandidate(v4Data.product?.value_prop?.headline, 4);
  addCandidate((v4Data.brand?.identity as any)?.mission, 2);

  if (domain) {
    const domainSlug = domain.split('.')[0] || domain;
    addCandidate(toTitleCaseFromSlug(domainSlug), 10);
    addCandidate(domain, 6);
  }

  if (candidates.length === 0) {
    return toTitleCaseFromSlug(domain) ?? domain;
  }

  const scored = candidates.map(({ value, weight }) => {
    let score = weight;
    if (matchesDomain(value, domain)) {
      score += 6;
    }
    if (/customers?|clients?|partners?/i.test(value)) {
      score -= 4;
    }
    return { value, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.value ?? toTitleCaseFromSlug(domain) ?? domain;
}

function uniqueStrings(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = value?.trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }
  return result;
}

export interface SimplifiedBrandData {
  page: {
    url: string;
    title: string;
    description?: string;
    headings?: string[];
  };
  brand: {
    identity?: {
      name?: string;
      tagline?: string;
      mission?: string;
      vision?: string;
      values?: string[];
      archetype?: string;
    };
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
      background?: string;
      text?: {
        default?: string;
        heading?: string;
        body?: string;
      };
      palette?: Array<{ hex: string } | string>;
    };
    typography: {
      fonts: Array<{
        family: string;
        weights: number[];
        fallback?: string;
        role?: "heading" | "body" | "mono";
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
      style?: string;
      adjectives?: string[];
      keywords?: string[];
      personality?: string;
    };
    logo?: Record<string, unknown>;
    iconography?: {
      style?: "line" | "solid" | "duotone" | "mixed";
      detectedIcons?: string[];
    };
    backgroundEffects?: string[];
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

  const domain = extractDomain(v4Data.metadata?.url);
  const stack = v4Data.brand?.visual?.typography?.stack ?? {};
  const fonts: SimplifiedBrandData['brand']['typography']['fonts'] = [];
  const fontRoles = new Set<string>();

  const pushFont = (fontStack?: string[], role?: "heading" | "body" | "mono") => {
    const { family, fallback } = normalizeFontStack(fontStack);
    if (!family) return;
    const key = `${role ?? 'general'}:${family.toLowerCase()}`;
    if (fontRoles.has(key)) return;
    fontRoles.add(key);
    const weights =
      role === 'heading'
        ? [600, 700]
        : role === 'mono'
          ? [400, 500]
          : [400, 500, 600];
    fonts.push({ family, weights, fallback, role });
  };

  pushFont(stack.headings ?? stack.primary, 'heading');
  pushFont(stack.body ?? stack.primary, 'body');
  pushFont(stack.primary, undefined);
  pushFont(stack.code, 'mono');

  if (fonts.length === 0) {
    fonts.push({ family: 'Inter', weights: [400, 500, 600, 700] });
  }

  const rawTaglines = uniqueStrings([
    v4Data.brand?.identity?.tagline,
    v4Data.content?.hero?.headline,
    v4Data.content?.hero?.subheadline,
    v4Data.product?.value_prop?.headline,
    v4Data.product?.value_prop?.subhead,
  ]);

  const voiceKeywordsRaw = Array.isArray((v4Data.brand as any)?.voice?.keywords)
    ? ((v4Data.brand as any).voice.keywords as string[])
    : [];

  const voiceKeywords = uniqueStrings(voiceKeywordsRaw);

  const seoKeywordsRaw = Array.isArray((v4Data.content as any)?.seo?.keywords)
    ? ((v4Data.content as any).seo.keywords as string[])
    : [];

  const voiceAdjectives = uniqueStrings([...voiceKeywords, ...seoKeywordsRaw]).slice(0, 8);
  const ctasList: SimplifiedBrandData['ctas'] = [];
  if (Array.isArray(v4Data.content?.ctas)) {
    v4Data.content.ctas.forEach((cta) => {
      if (!cta || typeof cta.label !== 'string') return;
      const label = cta.label.trim();
      if (!label) return;
      ctasList.push({
        label,
        type: typeof cta.type === 'string' ? cta.type : undefined,
        placement: typeof cta.placement === 'string' ? cta.placement : undefined,
      });
    });
  }

  const socialStats = Array.isArray((v4Data.socialProof as any)?.stats)
    ? ((v4Data.socialProof as any).stats as Array<{ label?: string; value?: string }>)
    : [];

  const findStatValue = (needle: string): string | undefined => {
    const match = socialStats.find((stat) =>
      typeof stat?.label === 'string' && stat.label.toLowerCase().includes(needle),
    );
    return match?.value?.toString();
  };

  const stats = {
    users: v4Data.metrics?.users?.toString() ?? findStatValue('user') ?? undefined,
    rating: v4Data.metrics?.rating?.toString() ?? findStatValue('rating') ?? undefined,
    reviews: findStatValue('review') ?? (v4Data.metrics as any)?.reviews?.toString() ?? undefined,
  };

  const derivedBrandName = deriveBrandName(v4Data, domain);

  const result: SimplifiedBrandData = {
    page: {
      url: v4Data.metadata?.url || '',
      title: derivedBrandName || domain || 'Website',
      description: v4Data.brand?.identity?.tagline || '',
      headings: []
    },
    brand: {
      identity: {
        name: derivedBrandName || domain || 'Website',
        tagline: v4Data.brand?.identity?.tagline || v4Data.content?.hero?.subheadline || '',
        mission: v4Data.brand?.identity?.mission || '',
        vision: v4Data.brand?.identity?.vision || '',
        values: Array.isArray(v4Data.brand?.identity?.values)
          ? (v4Data.brand?.identity?.values as string[])
          : [],
        archetype: (v4Data.brand as any)?.identity?.archetype,
      },
      colors: {
        primary: v4Data.brand?.visual?.colors?.primary || '#000000',
        secondary: v4Data.brand?.visual?.colors?.secondary || '#666666',
        accents: v4Data.brand?.visual?.colors?.palette?.map(p => p.hex) || [],
        neutrals: ['#ffffff', '#f5f5f5', '#333333'],
        gradients: v4Data.brand?.visual?.colors?.gradients || [],
        background: v4Data.brand?.visual?.colors?.background || '#ffffff',
        text: {
          default: (v4Data.brand?.visual?.colors as any)?.text?.default || '#111827',
        },
        palette: v4Data.brand?.visual?.colors?.palette || [],
      },
      typography: {
        fonts,
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
        taglines: rawTaglines.length > 0 ? rawTaglines : [v4Data.brand?.identity?.tagline || ''],
        tone: v4Data.brand?.voice?.tone || v4Data.content?.voice?.tone || 'professional',
        style: (v4Data.brand as any)?.voice?.personality || (v4Data.brand?.identity as any)?.archetype,
        adjectives: voiceAdjectives,
        keywords: voiceKeywords,
        personality: (v4Data.brand as any)?.voice?.personality,
      },
      logo: (v4Data.brand as any)?.visual?.logo,
      iconography: (v4Data.brand as any)?.visual?.iconography,
      backgroundEffects: Array.isArray((v4Data.brand as any)?.visual?.effects?.backgroundEffects)
        ? ((v4Data.brand as any).visual.effects.backgroundEffects as string[])
        : undefined,
    },
    product: {
      value_prop: {
        headline: v4Data.content?.hero?.headline || v4Data.brand?.identity?.tagline || 'Transform Your Business',
        subhead: v4Data.content?.hero?.subheadline || v4Data.brand?.identity?.mission || 'Professional solutions'
      },
      problem: v4Data.product?.problem || 'Outdated solutions',
      solution: v4Data.product?.solution || 'Modern approach',
      features: v4Data.product?.features?.slice(0, 3).map(f => ({
        title: f.name || 'Feature',
        desc: f.description || '',
        icon: f.icon
      })) || []
    },
    social_proof: {
      stats: {
        users: stats.users || '1000+',
        rating: stats.rating || '4.9',
        reviews: stats.reviews
      }
    },
    ctas: ctasList,
    media: {
      screenshots: v4Data.screenshots || []
    },
    extractionMeta: v4Data.metadata
  };
  
  // Log the result
  console.log('🔄 [ADAPTER] Simplified data result:', {
    pageTitle: result.page.title,
    brandColors: result.brand.colors.primary,
    featuresConverted: result.product.features.length,
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
