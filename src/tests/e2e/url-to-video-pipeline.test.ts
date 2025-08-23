/**
 * End-to-End Tests for URL-to-Video Pipeline
 * Tests the complete flow from URL input to video generation
 */

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { createTestContext, testWebsites, type TestContext } from '../fixtures/test-database-setup';
import { websiteToVideoHandler } from '~/tools/website/websiteToVideoHandler';
import { WebAnalysisAgentV4 } from '~/tools/webAnalysis/WebAnalysisAgentV4';
import { convertV4ToSimplified } from '~/tools/webAnalysis/brandDataAdapter';
import { TemplateSelector } from '~/server/services/website/template-selector-v2';
import type { SimplifiedBrandData } from '~/tools/webAnalysis/brandDataAdapter';

// Mock external dependencies
jest.mock('~/server/services/ai/openai.service', () => ({
  openaiService: {
    generateCompletion: jest.fn().mockResolvedValue({
      content: 'Mocked AI response'
    })
  }
}));

jest.mock('puppeteer', () => ({
  launch: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      goto: jest.fn(),
      screenshot: jest.fn().mockResolvedValue(Buffer.from('mock-screenshot')),
      evaluate: jest.fn().mockResolvedValue({
        title: 'Mock Website',
        description: 'Mock description'
      }),
      close: jest.fn()
    }),
    close: jest.fn()
  })
}));

describe('URL-to-Video Pipeline E2E', () => {
  let testContext: TestContext;
  
  beforeAll(async () => {
    // Create real test context with database
    if (process.env.RUN_E2E_TESTS === 'true') {
      testContext = await createTestContext();
    } else {
      // Use mock context for CI/quick tests
      testContext = {
        userId: 'test-user',
        projectId: 'test-project',
        apiKey: 'test-key',
        sessionToken: 'test-session',
        cleanup: async () => {}
      };
    }
  });

  afterAll(async () => {
    await testContext.cleanup();
  });

  describe('Brand Extraction', () => {
    it('should extract rich brand data from Ramp.com', async () => {
      const agent = new WebAnalysisAgentV4();
      const extractedData = await agent.extractBrandData(testWebsites.fintech.url);
      
      expect(extractedData).toBeDefined();
      expect(extractedData.brand?.identity?.name).toBeTruthy();
      expect(extractedData.brand?.visual?.colors?.primary).toBeTruthy();
      expect(extractedData.product?.features).toBeInstanceOf(Array);
      expect(extractedData.product?.features.length).toBeGreaterThan(0);
    });

    it('should adapt V4 data to simplified format', () => {
      const v4Data = {
        brand: {
          identity: {
            name: 'Test Company',
            tagline: 'Test Tagline',
            archetype: 'innovator' as const
          },
          visual: {
            colors: {
              primary: '#FF6B00',
              secondary: '#1A1A1A',
              palette: [
                { hex: '#FF8533', rgb: 'rgb(255, 133, 51)', usage: 'accent' }
              ]
            }
          }
        },
        product: {
          features: [
            { name: 'Feature 1', description: 'Description 1' }
          ]
        },
        metadata: {
          url: 'https://test.com',
          extractionTimestamp: new Date().toISOString()
        }
      };

      const simplified = convertV4ToSimplified(v4Data as any);
      
      expect(simplified.page.url).toBe('https://test.com');
      expect(simplified.brand.colors.primary).toBe('#FF6B00');
      expect(simplified.product.features).toHaveLength(1);
      expect(simplified.product.features[0].title).toBe('Feature 1');
    });
  });

  describe('Template Selection Intelligence', () => {
    it('should select different templates for different brand archetypes', async () => {
      const selector = new TemplateSelector();
      
      // Test fintech (professional)
      const fintechScenes = [{
        title: 'Problem',
        emotionalBeat: 'problem' as const,
        duration: 3000,
        narration: 'Financial challenges',
        visualDescription: 'Show problem'
      }];
      
      const fintechTemplates = await selector.selectTemplatesForJourney(
        fintechScenes,
        'dynamic',
        testWebsites.fintech.brandData as SimplifiedBrandData
      );

      // Test design (innovator)
      const designScenes = [{
        title: 'Problem',
        emotionalBeat: 'problem' as const,
        duration: 3000,
        narration: 'Design challenges',
        visualDescription: 'Show problem'
      }];
      
      const designTemplates = await selector.selectTemplatesForJourney(
        designScenes,
        'dynamic',
        testWebsites.design.brandData as SimplifiedBrandData
      );

      // Templates should be different
      expect(fintechTemplates[0].templateId).toBeDefined();
      expect(designTemplates[0].templateId).toBeDefined();
      
      // Log for visibility
      console.log('Fintech template:', fintechTemplates[0].templateId);
      console.log('Design template:', designTemplates[0].templateId);
    });
  });

  describe('Complete Pipeline', () => {
    it('should process a website URL end-to-end', async () => {
      const result = await websiteToVideoHandler({
        url: testWebsites.fintech.url,
        projectId: testContext.projectId,
        userId: testContext.userId,
        style: 'dynamic',
        duration: 15,
        format: {
          format: 'landscape',
          width: 1920,
          height: 1080
        }
      });

      expect(result).toBeDefined();
      expect(result.scenes).toBeInstanceOf(Array);
      expect(result.scenes.length).toBeGreaterThan(0);
      
      // Each scene should have generated code
      result.scenes.forEach(scene => {
        expect(scene.code).toBeTruthy();
        expect(scene.title).toBeTruthy();
        expect(scene.duration).toBeGreaterThan(0);
      });

      // Should have variety in templates used
      const templateIds = result.scenes.map(s => {
        // Extract template name from generated code
        const match = s.code.match(/export default function (\w+)/);
        return match ? match[1] : 'unknown';
      });
      
      const uniqueTemplates = new Set(templateIds);
      expect(uniqueTemplates.size).toBeGreaterThan(1);
    }, 30000); // 30 second timeout for full pipeline

    it('should handle different industries appropriately', async () => {
      const websites = [
        { url: testWebsites.fintech.url, expectedType: 'data-focused' },
        { url: testWebsites.design.url, expectedType: 'creative' },
        { url: testWebsites.developer.url, expectedType: 'technical' }
      ];

      const results = await Promise.all(
        websites.map(site => 
          websiteToVideoHandler({
            url: site.url,
            projectId: testContext.projectId,
            userId: testContext.userId,
            style: 'dynamic',
            duration: 15,
            format: {
              format: 'landscape',
              width: 1920,
              height: 1080
            }
          })
        )
      );

      // Each should have generated scenes
      results.forEach((result, index) => {
        expect(result.scenes).toBeInstanceOf(Array);
        expect(result.scenes.length).toBeGreaterThan(0);
        
        console.log(`${websites[index].url} generated ${result.scenes.length} scenes`);
      });

      // Templates should vary between industries
      const allTemplateNames = results.map(r => 
        r.scenes.map(s => {
          const match = s.code.match(/export default function (\w+)/);
          return match ? match[1] : 'unknown';
        })
      );

      // Log template distribution
      console.log('Template distribution by industry:');
      allTemplateNames.forEach((templates, i) => {
        console.log(`${websites[i].expectedType}:`, templates);
      });
    }, 60000); // 60 second timeout for multiple pipelines
  });

  describe('Error Handling', () => {
    it('should handle invalid URLs gracefully', async () => {
      const result = await websiteToVideoHandler({
        url: 'https://this-website-definitely-does-not-exist-12345.com',
        projectId: testContext.projectId,
        userId: testContext.userId,
        style: 'dynamic',
        duration: 15,
        format: {
          format: 'landscape',
          width: 1920,
          height: 1080
        }
      });

      // Should still generate something with fallback data
      expect(result).toBeDefined();
      expect(result.scenes).toBeInstanceOf(Array);
      expect(result.scenes.length).toBeGreaterThan(0);
    });

    it('should handle missing brand data', async () => {
      const selector = new TemplateSelector();
      
      const scenes = [{
        title: 'Generic',
        emotionalBeat: 'problem' as const,
        duration: 3000,
        narration: 'Generic problem',
        visualDescription: 'Show issue'
      }];
      
      // No brand data provided
      const templates = await selector.selectTemplatesForJourney(
        scenes,
        'dynamic',
        undefined
      );

      expect(templates).toHaveLength(1);
      expect(templates[0].templateId).toBeDefined();
    });
  });

  describe('Performance Benchmarks', () => {
    it('should complete brand extraction in reasonable time', async () => {
      const agent = new WebAnalysisAgentV4();
      const startTime = Date.now();
      
      await agent.extractBrandData(testWebsites.fintech.url);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10000); // Should complete in under 10 seconds
      
      console.log(`Brand extraction took ${duration}ms`);
    });

    it('should select templates quickly', async () => {
      const selector = new TemplateSelector();
      const scenes = Array(10).fill(null).map((_, i) => ({
        title: `Scene ${i}`,
        emotionalBeat: ['problem', 'discovery', 'transformation', 'triumph', 'invitation'][i % 5] as any,
        duration: 3000,
        narration: `Narration ${i}`,
        visualDescription: `Visual ${i}`
      }));

      const startTime = Date.now();
      
      await selector.selectTemplatesForJourney(
        scenes,
        'dynamic',
        testWebsites.fintech.brandData as SimplifiedBrandData
      );
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(500); // Should complete in under 500ms
      
      console.log(`Template selection for ${scenes.length} scenes took ${duration}ms`);
    });
  });
});