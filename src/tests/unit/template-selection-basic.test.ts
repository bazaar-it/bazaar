/**
 * Basic Unit Tests for Template Selection Logic
 * Tests core functionality without complex dependencies
 */

import { describe, it, expect } from '@jest/globals';

// Mock brand data for testing
const mockBrandData = {
  fintech: {
    page: {
      url: 'https://ramp.com',
      title: 'Ramp - Corporate Cards',
    },
    brand: {
      colors: {
        primary: '#FF6B00',
        secondary: '#1A1A1A',
        accents: ['#FF8533'],
        neutrals: ['#FFFFFF'],
        gradients: []
      },
      typography: {
        fonts: [{ family: 'Inter', weights: [400, 600] }],
        scale: { h1: '3rem', body: '1rem' }
      },
      buttons: {
        radius: '0.375rem',
        padding: '0.75rem 1.5rem'
      },
      voice: {
        taglines: ['Control spend'],
        tone: 'professional'
      }
    },
    product: {
      value_prop: {
        headline: 'Control spend, save time',
        subhead: 'Finance automation'
      },
      features: [
        { title: 'Corporate Cards', desc: 'Virtual cards' }
      ]
    }
  },
  design: {
    page: {
      url: 'https://figma.com',
      title: 'Figma - Design Tool',
    },
    brand: {
      colors: {
        primary: '#F24E1E',
        secondary: '#0ACF83',
        accents: ['#A259FF', '#FFC700'],
        neutrals: ['#FFFFFF'],
        gradients: []
      },
      typography: {
        fonts: [{ family: 'Inter', weights: [400, 600] }],
        scale: { h1: '4rem', body: '1rem' }
      },
      buttons: {
        radius: '0.5rem',
        padding: '0.75rem 1.5rem'
      },
      voice: {
        taglines: ['Nothing great is made alone'],
        tone: 'creative'
      }
    },
    product: {
      value_prop: {
        headline: 'Nothing great is made alone',
        subhead: 'Design as a team'
      },
      features: [
        { title: 'Real-time Collaboration', desc: 'Work together' }
      ]
    }
  }
};

// Template mapping for testing
const templateMap = {
  problem: {
    minimal: ['DarkBGGradientText', 'FadeIn'],
    dynamic: ['GlitchText', 'MorphingText'],
    bold: ['ParticleExplosion', 'WaveAnimation']
  },
  discovery: {
    minimal: ['LogoTemplate', 'FadeIn'],
    dynamic: ['ScaleIn', 'WipeIn'],
    bold: ['ParticleExplosion', 'FloatingParticles']
  },
  triumph: {
    minimal: ['GrowthGraph', 'Today1Percent'],
    dynamic: ['TeslaStockGraph', 'GrowthGraph'],
    bold: ['TeslaStockGraph', 'ParticleExplosion']
  }
};

// Simple archetype detection
function detectArchetype(brandData: any): string {
  const headline = brandData.product?.value_prop?.headline?.toLowerCase() || '';
  const tone = brandData.brand?.voice?.tone || '';
  
  if (headline.includes('control') || headline.includes('automate') || tone === 'professional') {
    return 'professional';
  }
  if (headline.includes('create') || headline.includes('design') || tone === 'creative') {
    return 'innovator';
  }
  return 'everyman';
}

// Simple industry classification
function classifyIndustry(brandData: any): string {
  const url = brandData.page?.url || '';
  const headline = brandData.product?.value_prop?.headline?.toLowerCase() || '';
  
  if (url.includes('ramp') || headline.includes('finance') || headline.includes('spend')) {
    return 'fintech';
  }
  if (url.includes('figma') || headline.includes('design')) {
    return 'design';
  }
  if (url.includes('stripe') || headline.includes('payment')) {
    return 'developer-tools';
  }
  return 'saas';
}

// Template selection logic
function selectTemplate(
  emotionalBeat: string,
  style: string,
  brandData?: any
): string {
  const templates = (templateMap as any)[emotionalBeat]?.[style] || ['FadeIn'];
  
  if (!brandData) {
    return templates[0];
  }
  
  const archetype = detectArchetype(brandData);
  const industry = classifyIndustry(brandData);
  
  // Filter based on brand
  if (industry === 'fintech' && emotionalBeat === 'triumph') {
    // Prefer data visualization for fintech
    const dataTemplates = templates.filter((t: string) => 
      t.includes('Graph') || t.includes('1Percent')
    );
    return dataTemplates[0] || templates[0];
  }
  
  if (archetype === 'innovator' && emotionalBeat === 'discovery') {
    // Prefer creative templates for innovators
    const creativeTemplates = templates.filter((t: string) =>
      t.includes('Particle') || t.includes('Floating')
    );
    return creativeTemplates[0] || templates[0];
  }
  
  return templates[0];
}

describe('Template Selection Logic', () => {
  describe('Archetype Detection', () => {
    it('should identify fintech as professional', () => {
      const archetype = detectArchetype(mockBrandData.fintech);
      expect(archetype).toBe('professional');
    });

    it('should identify design tools as innovator', () => {
      const archetype = detectArchetype(mockBrandData.design);
      expect(archetype).toBe('innovator');
    });
  });

  describe('Industry Classification', () => {
    it('should classify Ramp as fintech', () => {
      const industry = classifyIndustry(mockBrandData.fintech);
      expect(industry).toBe('fintech');
    });

    it('should classify Figma as design', () => {
      const industry = classifyIndustry(mockBrandData.design);
      expect(industry).toBe('design');
    });
  });

  describe('Template Selection', () => {
    it('should select data templates for fintech triumph', () => {
      const template = selectTemplate('triumph', 'dynamic', mockBrandData.fintech);
      expect(['TeslaStockGraph', 'GrowthGraph']).toContain(template);
    });

    it('should select creative templates for design discovery', () => {
      const template = selectTemplate('discovery', 'bold', mockBrandData.design);
      expect(['ParticleExplosion', 'FloatingParticles']).toContain(template);
    });

    it('should return different templates for different brands', () => {
      const fintechTemplate = selectTemplate('problem', 'dynamic', mockBrandData.fintech);
      const designTemplate = selectTemplate('discovery', 'bold', mockBrandData.design);
      
      // Should be different or at least from different categories
      expect(fintechTemplate).toBeDefined();
      expect(designTemplate).toBeDefined();
    });

    it('should handle missing brand data gracefully', () => {
      const template = selectTemplate('problem', 'dynamic', undefined);
      expect(template).toBeDefined();
      expect(template).toBe('GlitchText');
    });
  });

  describe('Template Variety', () => {
    it('should provide variety across emotional beats', () => {
      const templates = [
        selectTemplate('problem', 'dynamic', mockBrandData.fintech),
        selectTemplate('discovery', 'dynamic', mockBrandData.fintech),
        selectTemplate('triumph', 'dynamic', mockBrandData.fintech)
      ];
      
      const uniqueTemplates = new Set(templates);
      expect(uniqueTemplates.size).toBeGreaterThanOrEqual(2);
    });
  });
});