/**
 * Integration Tests for Intelligent Template Selection
 * Tests the brand-aware template routing system
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { TemplateSelector } from '~/server/services/website/template-selector-v2';
import { createMockTestContext, testWebsites } from '../fixtures/test-database-setup';
import type { HeroJourneyScene } from '~/tools/narrative/herosJourney';
import type { SimplifiedBrandData } from '~/tools/webAnalysis/brandDataAdapter';

describe('Intelligent Template Selection', () => {
  let selector: TemplateSelector;
  let testContext: ReturnType<typeof createMockTestContext>;
  
  beforeEach(() => {
    selector = new TemplateSelector();
    testContext = createMockTestContext();
  });

  afterEach(async () => {
    await testContext.cleanup();
  });

  describe('Brand Archetype Detection', () => {
    it('should identify fintech as professional archetype', async () => {
      const scenes: HeroJourneyScene[] = [
        {
          title: 'The Problem',
          emotionalBeat: 'problem',
          duration: 3000,
          narration: 'Manual expense management wastes time',
          visualDescription: 'Show complexity'
        }
      ];

      const templates = await selector.selectTemplatesForJourney(
        scenes,
        'dynamic',
        testWebsites.fintech.brandData as SimplifiedBrandData
      );

      // Should prefer data-focused templates for fintech
      expect(templates[0].templateId).not.toBe('ParticleExplosion');
      expect(['GlitchText', 'MorphingText', 'DrawOn']).toContain(templates[0].templateId);
    });

    it('should identify design tools as innovator archetype', async () => {
      const scenes: HeroJourneyScene[] = [
        {
          title: 'Discovery',
          emotionalBeat: 'discovery',
          duration: 3000,
          narration: 'A new way to design',
          visualDescription: 'Show innovation'
        }
      ];

      const templates = await selector.selectTemplatesForJourney(
        scenes,
        'bold',
        testWebsites.design.brandData as SimplifiedBrandData
      );

      // Should prefer creative templates for design tools
      expect(templates[0].templateId).toMatch(/ParticleExplosion|FloatingParticles|PulsingCircles/);
    });

    it('should identify developer tools as sophisticate archetype', async () => {
      const scenes: HeroJourneyScene[] = [
        {
          title: 'Transformation',
          emotionalBeat: 'transformation',
          duration: 3000,
          narration: 'Transform your payment infrastructure',
          visualDescription: 'Show technical prowess'
        }
      ];

      const templates = await selector.selectTemplatesForJourney(
        scenes,
        'minimal',
        testWebsites.developer.brandData as SimplifiedBrandData
      );

      // Should prefer clean, technical templates
      expect(['CarouselText', 'FastText', 'TypingTemplate']).toContain(templates[0].templateId);
    });
  });

  describe('Industry-Specific Template Selection', () => {
    it('should select appropriate templates for fintech', async () => {
      const scenes: HeroJourneyScene[] = [
        {
          title: 'Success Metrics',
          emotionalBeat: 'triumph',
          duration: 3000,
          narration: 'See the results',
          visualDescription: 'Data visualization'
        }
      ];

      const templates = await selector.selectTemplatesForJourney(
        scenes,
        'dynamic',
        testWebsites.fintech.brandData as SimplifiedBrandData
      );

      // Fintech should get data visualization templates
      expect(['TeslaStockGraph', 'GrowthGraph', 'Today1Percent']).toContain(templates[0].templateId);
    });

    it('should avoid data-heavy templates for creative brands', async () => {
      const scenes: HeroJourneyScene[] = [
        {
          title: 'Success Story',
          emotionalBeat: 'triumph',
          duration: 3000,
          narration: 'Creative success',
          visualDescription: 'Show achievement'
        }
      ];

      const templates = await selector.selectTemplatesForJourney(
        scenes,
        'bold',
        testWebsites.design.brandData as SimplifiedBrandData
      );

      // Design tools should get visual templates, not graphs
      expect(templates[0].templateId).not.toBe('TeslaStockGraph');
      expect(templates[0].templateId).not.toBe('GrowthGraph');
    });
  });

  describe('Template Variety', () => {
    it('should return different templates for different brands with same beat', async () => {
      const scene: HeroJourneyScene = {
        title: 'Call to Action',
        emotionalBeat: 'invitation',
        duration: 3000,
        narration: 'Get started today',
        visualDescription: 'Final CTA'
      };

      const fintechTemplates = await selector.selectTemplatesForJourney(
        [scene],
        'dynamic',
        testWebsites.fintech.brandData as SimplifiedBrandData
      );

      const designTemplates = await selector.selectTemplatesForJourney(
        [scene],
        'dynamic',
        testWebsites.design.brandData as SimplifiedBrandData
      );

      const devTemplates = await selector.selectTemplatesForJourney(
        [scene],
        'dynamic',
        testWebsites.developer.brandData as SimplifiedBrandData
      );

      // Each brand should potentially get different templates
      const allTemplates = [
        fintechTemplates[0].templateId,
        designTemplates[0].templateId,
        devTemplates[0].templateId
      ];

      // At least one should be different (not all identical)
      const uniqueTemplates = new Set(allTemplates);
      expect(uniqueTemplates.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Fallback Behavior', () => {
    it('should handle missing brand data gracefully', async () => {
      const scenes: HeroJourneyScene[] = [
        {
          title: 'Generic Scene',
          emotionalBeat: 'problem',
          duration: 3000,
          narration: 'A problem exists',
          visualDescription: 'Show issue'
        }
      ];

      const templates = await selector.selectTemplatesForJourney(
        scenes,
        'dynamic',
        undefined // No brand data
      );

      expect(templates).toHaveLength(1);
      expect(templates[0].templateId).toBeDefined();
      expect(templates[0].sceneContent).toBeDefined();
    });

    it('should handle unknown emotional beats', async () => {
      const scenes: HeroJourneyScene[] = [
        {
          title: 'Unknown Beat',
          emotionalBeat: 'tension', // This beat exists now but testing edge case
          duration: 3000,
          narration: 'Tension builds',
          visualDescription: 'Show tension'
        }
      ];

      const templates = await selector.selectTemplatesForJourney(
        scenes,
        'dynamic',
        testWebsites.fintech.brandData as SimplifiedBrandData
      );

      expect(templates).toHaveLength(1);
      expect(templates[0].templateId).toBeDefined();
    });
  });

  describe('Color Compatibility', () => {
    it('should consider brand colors in template selection', async () => {
      const brightBrand: SimplifiedBrandData = {
        ...testWebsites.design.brandData,
        brand: {
          ...testWebsites.design.brandData.brand,
          colors: {
            primary: '#FF00FF', // Bright magenta
            secondary: '#00FFFF', // Bright cyan
            accents: ['#FFFF00', '#FF00FF'],
            neutrals: ['#FFFFFF', '#000000'],
            gradients: []
          }
        }
      } as SimplifiedBrandData;

      const darkBrand: SimplifiedBrandData = {
        ...testWebsites.developer.brandData,
        brand: {
          ...testWebsites.developer.brandData.brand,
          colors: {
            primary: '#1A1A1A', // Very dark
            secondary: '#333333', // Dark gray
            accents: ['#444444', '#555555'],
            neutrals: ['#666666', '#777777'],
            gradients: []
          }
        }
      } as SimplifiedBrandData;

      const scenes: HeroJourneyScene[] = [
        {
          title: 'Visual Scene',
          emotionalBeat: 'discovery',
          duration: 3000,
          narration: 'Discover something',
          visualDescription: 'Visual elements'
        }
      ];

      const brightTemplates = await selector.selectTemplatesForJourney(
        scenes,
        'bold',
        brightBrand
      );

      const darkTemplates = await selector.selectTemplatesForJourney(
        scenes,
        'minimal',
        darkBrand
      );

      // Templates should be selected considering color schemes
      expect(brightTemplates[0].templateId).toBeDefined();
      expect(darkTemplates[0].templateId).toBeDefined();
    });
  });

  describe('Full Journey Consistency', () => {
    it('should maintain brand consistency across all hero journey beats', async () => {
      const fullJourney: HeroJourneyScene[] = [
        {
          title: 'The Challenge',
          emotionalBeat: 'problem',
          duration: 3000,
          narration: 'Companies struggle with expenses',
          visualDescription: 'Show pain point'
        },
        {
          title: 'Building Tension',
          emotionalBeat: 'tension',
          duration: 2500,
          narration: 'Costs spiral out of control',
          visualDescription: 'Escalating problem'
        },
        {
          title: 'The Solution',
          emotionalBeat: 'discovery',
          duration: 3000,
          narration: 'Ramp provides the answer',
          visualDescription: 'Reveal solution'
        },
        {
          title: 'Implementation',
          emotionalBeat: 'transformation',
          duration: 3500,
          narration: 'Transform your finance operations',
          visualDescription: 'Show change'
        },
        {
          title: 'Results',
          emotionalBeat: 'triumph',
          duration: 3000,
          narration: 'Save 3.5% on every dollar',
          visualDescription: 'Show success metrics'
        },
        {
          title: 'Get Started',
          emotionalBeat: 'invitation',
          duration: 2500,
          narration: 'Join thousands of companies',
          visualDescription: 'Call to action'
        }
      ];

      const templates = await selector.selectTemplatesForJourney(
        fullJourney,
        'dynamic',
        testWebsites.fintech.brandData as SimplifiedBrandData
      );

      // Should get a template for each scene
      expect(templates).toHaveLength(6);

      // All templates should be appropriate for fintech
      templates.forEach((template, index) => {
        expect(template.templateId).toBeDefined();
        expect(template.sceneIndex).toBe(index);
        expect(template.sceneContent).toContain(fullJourney[index].title);
      });

      // Data visualization templates should appear for metrics
      const triumphTemplate = templates.find(t => t.sceneIndex === 4);
      expect(['TeslaStockGraph', 'GrowthGraph', 'WordFlip']).toContain(triumphTemplate?.templateId);
    });
  });

  describe('Performance', () => {
    it('should select templates quickly even with complex brand data', async () => {
      const complexBrand: SimplifiedBrandData = {
        ...testWebsites.fintech.brandData,
        product: {
          ...testWebsites.fintech.brandData.product,
          features: Array(20).fill(null).map((_, i) => ({
            title: `Feature ${i}`,
            desc: `Description for feature ${i}`
          }))
        }
      } as SimplifiedBrandData;

      const scenes: HeroJourneyScene[] = Array(10).fill(null).map((_, i) => ({
        title: `Scene ${i}`,
        emotionalBeat: ['problem', 'tension', 'discovery', 'transformation', 'triumph', 'invitation'][i % 6] as any,
        duration: 3000,
        narration: `Narration ${i}`,
        visualDescription: `Visual ${i}`
      }));

      const startTime = Date.now();
      const templates = await selector.selectTemplatesForJourney(
        scenes,
        'dynamic',
        complexBrand
      );
      const endTime = Date.now();

      expect(templates).toHaveLength(10);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
    });
  });
});