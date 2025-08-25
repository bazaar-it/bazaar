/**
 * Unit tests for brand data adapter
 * Tests the 10x data extraction improvements without database dependencies
 */

import { convertV4ToSimplified } from '~/tools/webAnalysis/brandDataAdapter';
import type { ExtractedBrandDataV4 } from '~/tools/webAnalysis/WebAnalysisAgentV4';

describe('Brand Data Adapter - 10x Data Extraction', () => {
  describe('Feature Extraction (No Limits)', () => {
    it('should extract ALL features without limiting to 3', () => {
      const mockV4Data: Partial<ExtractedBrandDataV4> = {
        brand: {
          identity: { name: 'TestBrand', tagline: 'Test Tagline', mission: 'Test Mission' },
          visual: {
            colors: { 
              primary: '#000000', 
              secondary: '#FFFFFF',
              palette: [],
              gradients: []
            },
            typography: { 
              stack: { 
                primary: ['Inter'], 
                secondary: [],
                body: []
              },
              scale: {},
              lineHeight: 1.5,
              letterSpacing: 'normal'
            },
            spacing: {},
            borders: {},
            shadows: {},
            animations: {}
          },
          voice: { tone: 'professional', style: 'formal', intensity: 'moderate' }
        },
        product: {
          features: Array.from({ length: 30 }, (_, i) => ({
            name: `Feature ${i + 1}`,
            description: `Description for feature ${i + 1}`,
            icon: `icon-${i + 1}`
          })),
          targetAudience: ['Developers', 'Designers', 'Product Managers', 'CTOs'],
          problem: 'Complex workflows',
          solution: 'Streamlined automation',
          useCases: [],
          benefits: []
        },
        content: {
          hero: {},
          ctas: [],
          sections: [],
          voice: { tone: 'professional' }
        },
        metrics: {},
        socialProof: {},
        metadata: { 
          url: 'https://test.com', 
          timestamp: Date.now(),
          version: '4.0.0',
          confidence: { overall: 0.95 }
        }
      };

      const simplified = convertV4ToSimplified(mockV4Data as ExtractedBrandDataV4);
      
      // Should have ALL 30 features, not just 3
      expect(simplified.product.features).toHaveLength(30);
      expect(simplified.product.features[0].title).toBe('Feature 1');
      expect(simplified.product.features[29].title).toBe('Feature 30');
      
      // Verify all features have proper structure
      simplified.product.features.forEach((feature, index) => {
        expect(feature).toHaveProperty('title');
        expect(feature).toHaveProperty('desc');
        expect(feature).toHaveProperty('icon');
        expect(feature.title).toBe(`Feature ${index + 1}`);
        expect(feature.desc).toBe(`Description for feature ${index + 1}`);
        expect(feature.icon).toBe(`icon-${index + 1}`);
      });
    });

    it('should preserve all target audiences', () => {
      const mockV4Data: Partial<ExtractedBrandDataV4> = {
        brand: { 
          identity: { name: 'TestBrand' },
          visual: {
            colors: { primary: '#000', secondary: '#fff', palette: [], gradients: [] },
            typography: { stack: { primary: [], secondary: [], body: [] } },
            spacing: {},
            borders: {},
            shadows: {},
            animations: {}
          },
          voice: { tone: 'professional', style: 'formal', intensity: 'moderate' }
        },
        product: {
          targetAudience: [
            'Software Engineers',
            'DevOps Teams',
            'Site Reliability Engineers',
            'Platform Engineers',
            'Cloud Architects',
            'Technical Leaders'
          ],
          features: [],
          useCases: [],
          benefits: []
        },
        content: {
          hero: {},
          ctas: [],
          sections: [],
          voice: { tone: 'professional' }
        },
        metrics: {},
        socialProof: {},
        metadata: { url: 'https://test.com', timestamp: Date.now() }
      };

      const simplified = convertV4ToSimplified(mockV4Data as ExtractedBrandDataV4);
      
      expect(simplified.targetAudience).toHaveLength(6);
      expect(simplified.targetAudience).toContain('Software Engineers');
      expect(simplified.targetAudience).toContain('Cloud Architects');
      expect(simplified.targetAudience).toContain('Technical Leaders');
    });
  });

  describe('Social Proof Extraction', () => {
    it('should capture ALL testimonials without limits', () => {
      const mockV4Data: Partial<ExtractedBrandDataV4> = {
        brand: { 
          identity: { name: 'TestBrand' },
          visual: {
            colors: { primary: '#000', secondary: '#fff', palette: [], gradients: [] },
            typography: { stack: { primary: [], secondary: [], body: [] } },
            spacing: {},
            borders: {},
            shadows: {},
            animations: {}
          },
          voice: { tone: 'professional', style: 'formal', intensity: 'moderate' }
        },
        product: { features: [], useCases: [], benefits: [] },
        socialProof: {
          testimonials: Array.from({ length: 20 }, (_, i) => ({
            author: `Customer ${i + 1}`,
            company: `Company ${i + 1}`,
            content: `Testimonial content ${i + 1}`,
            rating: 5
          })),
          customerLogos: ['logo1.png', 'logo2.png', 'logo3.png', 'logo4.png', 'logo5.png'],
          trustBadges: ['SOC2', 'ISO27001', 'GDPR', 'HIPAA'],
          stats: [
            { label: 'Active Users', value: '50,000+' },
            { label: 'Countries', value: '120' },
            { label: 'Uptime', value: '99.99%' },
            { label: 'Customer Satisfaction', value: '98%' },
            { label: 'Support Response', value: '<5 min' }
          ]
        },
        content: {
          hero: {},
          ctas: [],
          sections: [],
          voice: { tone: 'professional' }
        },
        metrics: {},
        metadata: { url: 'https://test.com', timestamp: Date.now() }
      };

      const simplified = convertV4ToSimplified(mockV4Data as ExtractedBrandDataV4);
      
      // All testimonials preserved
      expect(simplified.social_proof?.testimonials).toHaveLength(20);
      expect(simplified.social_proof?.testimonials?.[0].author).toBe('Customer 1');
      expect(simplified.social_proof?.testimonials?.[19].author).toBe('Customer 20');
      
      // All customer logos preserved
      expect(simplified.social_proof?.customerLogos).toHaveLength(5);
      
      // All trust badges preserved
      expect(simplified.social_proof?.trustBadges).toHaveLength(4);
      expect(simplified.social_proof?.trustBadges).toContain('SOC2');
      expect(simplified.social_proof?.trustBadges).toContain('HIPAA');
      
      // All stats preserved and accessible
      expect(simplified.social_proof?.stats?.['Active Users']).toBe('50,000+');
      expect(simplified.social_proof?.stats?.['Uptime']).toBe('99.99%');
      expect(simplified.social_proof?.stats?.['Support Response']).toBe('<5 min');
    });

    it('should handle missing social proof gracefully', () => {
      const mockV4Data: Partial<ExtractedBrandDataV4> = {
        brand: { 
          identity: { name: 'TestBrand' },
          visual: {
            colors: { primary: '#000', secondary: '#fff', palette: [], gradients: [] },
            typography: { stack: { primary: [], secondary: [], body: [] } },
            spacing: {},
            borders: {},
            shadows: {},
            animations: {}
          },
          voice: { tone: 'professional', style: 'formal', intensity: 'moderate' }
        },
        product: { features: [], useCases: [], benefits: [] },
        // No social proof provided
        content: {
          hero: {},
          ctas: [],
          sections: [],
          voice: { tone: 'professional' }
        },
        metrics: {},
        metadata: { url: 'https://test.com', timestamp: Date.now() }
      };

      const simplified = convertV4ToSimplified(mockV4Data as ExtractedBrandDataV4);
      
      // Should have social_proof object with defaults
      expect(simplified.social_proof).toBeDefined();
      expect(simplified.social_proof?.stats).toEqual({
        users: '1000+',
        rating: '4.9',
        reviews: 'satisfied customers'
      });
      expect(simplified.social_proof?.testimonials).toEqual([]);
      expect(simplified.social_proof?.customerLogos).toEqual([]);
      expect(simplified.social_proof?.trustBadges).toEqual([]);
    });
  });

  describe('Performance', () => {
    it('should handle extraction of 100+ features efficiently', () => {
      const startTime = Date.now();
      
      const largeDataset: Partial<ExtractedBrandDataV4> = {
        brand: { 
          identity: { name: 'MegaBrand' },
          visual: {
            colors: { primary: '#000', secondary: '#fff', palette: [], gradients: [] },
            typography: { stack: { primary: [], secondary: [], body: [] } },
            spacing: {},
            borders: {},
            shadows: {},
            animations: {}
          },
          voice: { tone: 'professional', style: 'formal', intensity: 'moderate' }
        },
        product: {
          features: Array.from({ length: 100 }, (_, i) => ({
            name: `Feature ${i}`,
            description: `Description ${i}`,
            icon: `icon-${i}`
          })),
          useCases: [],
          benefits: []
        },
        socialProof: {
          testimonials: Array.from({ length: 50 }, (_, i) => ({
            author: `Author ${i}`,
            content: `Content ${i}`
          })),
          stats: Array.from({ length: 20 }, (_, i) => ({
            label: `Metric ${i}`,
            value: `${i * 1000}`
          })),
          customerLogos: [],
          trustBadges: []
        },
        content: {
          hero: {},
          ctas: [],
          sections: [],
          voice: { tone: 'professional' }
        },
        metrics: {},
        metadata: { url: 'https://mega.com', timestamp: Date.now() }
      };

      const simplified = convertV4ToSimplified(largeDataset as ExtractedBrandDataV4);
      const duration = Date.now() - startTime;
      
      // Should process large datasets quickly
      expect(duration).toBeLessThan(100); // Under 100ms
      
      // Should preserve all data
      expect(simplified.product.features).toHaveLength(100);
      expect(simplified.social_proof?.testimonials).toHaveLength(50);
      
      // Verify stat conversion
      const statsKeys = Object.keys(simplified.social_proof?.stats || {});
      expect(statsKeys.length).toBeGreaterThanOrEqual(20);
    });
  });

  describe('Real Website Data Structure', () => {
    it('should handle Vercel.com data structure correctly', () => {
      const vercelMockData: Partial<ExtractedBrandDataV4> = {
        brand: {
          identity: { 
            name: 'Vercel',
            tagline: 'Develop. Preview. Ship.',
            mission: 'For the best frontend teams'
          },
          visual: {
            colors: { 
              primary: '#000000',
              secondary: '#FFFFFF',
              palette: [
                { hex: '#171717', name: 'black' },
                { hex: '#FF0080', name: 'pink' },
                { hex: '#0070F3', name: 'blue' }
              ],
              gradients: []
            },
            typography: {
              stack: { 
                primary: ['Geist', 'Inter', 'system-ui'],
                secondary: [],
                body: []
              },
              scale: {},
              lineHeight: 1.5,
              letterSpacing: 'normal'
            },
            spacing: {},
            borders: {},
            shadows: {},
            animations: {}
          },
          voice: { tone: 'professional', style: 'technical', intensity: 'moderate' }
        },
        product: {
          features: [
            { name: 'Frontend Cloud', description: 'The native Next.js platform' },
            { name: 'Instant Rollbacks', description: 'Revert in seconds' },
            { name: 'Global Edge Network', description: 'Deploy to 30+ regions' },
            { name: 'Analytics', description: 'Real user insights' },
            { name: 'Speed Insights', description: 'Performance monitoring' },
            { name: 'Firewall', description: 'DDoS protection' },
            { name: 'Preview Deployments', description: 'Test before shipping' },
            { name: 'Serverless Functions', description: 'Backend without servers' },
            { name: 'Edge Functions', description: 'Run code at the edge' },
            { name: 'Cron Jobs', description: 'Scheduled tasks' }
          ],
          targetAudience: ['Frontend Developers', 'DevOps Teams', 'Startups', 'Enterprises'],
          problem: 'Slow deployment cycles and poor developer experience',
          solution: 'Instant deployments with the best DX',
          useCases: [],
          benefits: []
        },
        socialProof: {
          customerLogos: ['adobe', 'hashicorp', 'mcdonalds', 'uber', 'tripadvisor'],
          stats: [
            { label: 'Deployments per week', value: '14M+' },
            { label: 'Frontend developers', value: '1M+' },
            { label: 'Global regions', value: '30+' }
          ],
          testimonials: [
            {
              author: 'Guillermo Rauch',
              company: 'Vercel',
              content: 'The best developer experience'
            }
          ],
          trustBadges: []
        },
        content: {
          hero: {},
          ctas: [],
          sections: [],
          voice: { tone: 'professional' }
        },
        metrics: {},
        metadata: {
          url: 'https://vercel.com',
          version: '4.0.0',
          confidence: { overall: 0.92 },
          timestamp: Date.now()
        }
      };

      const simplified = convertV4ToSimplified(vercelMockData as ExtractedBrandDataV4);
      
      // Verify comprehensive extraction
      expect(simplified.product.features.length).toBe(10);
      expect(simplified.targetAudience?.length).toBe(4);
      expect(simplified.social_proof?.customerLogos?.length).toBe(5);
      
      // Verify specific Vercel data
      expect(simplified.brand.colors.primary).toBe('#000000');
      expect(simplified.brand.typography.fonts[0].family).toBe('Geist');
      expect(simplified.page.title).toBe('Vercel');
      
      // Verify all features are preserved
      const featureTitles = simplified.product.features.map(f => f.title);
      expect(featureTitles).toContain('Frontend Cloud');
      expect(featureTitles).toContain('Cron Jobs');
      
      // Verify stats are properly converted
      expect(simplified.social_proof?.stats?.['Deployments per week']).toBe('14M+');
      expect(simplified.social_proof?.stats?.['Frontend developers']).toBe('1M+');
    });
  });
});