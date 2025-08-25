/**
 * Enhanced Brand Extraction Integration Tests
 * Tests the 10x data extraction improvements
 */

import { WebAnalysisAgentV4 } from '~/tools/webAnalysis/WebAnalysisAgentV4';
import { convertV4ToSimplified } from '~/tools/webAnalysis/brandDataAdapter';
import { saveBrandProfile } from '~/server/services/website/save-brand-profile';
import { createTestContext, createMockTestContext, testWebsites } from '~/tests/fixtures/test-database-setup';
import { db } from '~/server/db';
import { brandProfiles } from '~/server/db/schema';
import { eq } from 'drizzle-orm';

describe('Enhanced Brand Extraction (10x Data)', () => {
  let testContext: any;
  let analyzer: WebAnalysisAgentV4;

  beforeAll(async () => {
    // Use mock context for unit tests, real context for E2E
    if (process.env.RUN_E2E_TESTS === 'true') {
      testContext = await createTestContext();
    } else {
      testContext = createMockTestContext();
    }
    
    analyzer = new WebAnalysisAgentV4(testContext.projectId);
  });

  afterAll(async () => {
    if (testContext?.cleanup) {
      await testContext.cleanup();
    }
  });

  describe('Feature Extraction (No Limits)', () => {
    it('should extract ALL features without limiting to 3', () => {
      // Create mock V4 data with 30 features
      const mockV4Data = {
        brand: {
          identity: { name: 'TestBrand', tagline: 'Test Tagline' },
          visual: {
            colors: { primary: '#000000', secondary: '#FFFFFF' },
            typography: { stack: { primary: ['Inter'] } }
          }
        },
        product: {
          features: Array.from({ length: 30 }, (_, i) => ({
            name: `Feature ${i + 1}`,
            description: `Description for feature ${i + 1}`,
            icon: `icon-${i + 1}`
          })),
          targetAudience: ['Developers', 'Designers', 'Product Managers', 'CTOs'],
          problem: 'Complex workflows',
          solution: 'Streamlined automation'
        },
        metadata: { url: 'https://test.com', version: '4.0.0' }
      };

      const simplified = convertV4ToSimplified(mockV4Data as any);
      
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
      });
    });

    it('should preserve all target audiences', () => {
      const mockV4Data = {
        brand: { identity: { name: 'TestBrand' } },
        product: {
          targetAudience: [
            'Software Engineers',
            'DevOps Teams',
            'Site Reliability Engineers',
            'Platform Engineers',
            'Cloud Architects',
            'Technical Leaders'
          ],
          features: []
        },
        metadata: { url: 'https://test.com' }
      };

      const simplified = convertV4ToSimplified(mockV4Data as any);
      
      expect(simplified.targetAudience).toHaveLength(6);
      expect(simplified.targetAudience).toContain('Software Engineers');
      expect(simplified.targetAudience).toContain('Cloud Architects');
    });
  });

  describe('Social Proof Extraction', () => {
    it('should capture ALL testimonials without limits', () => {
      const mockV4Data = {
        brand: { identity: { name: 'TestBrand' } },
        product: { features: [] },
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
        metadata: { url: 'https://test.com' }
      };

      const simplified = convertV4ToSimplified(mockV4Data as any);
      
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
  });

  describe('Database Persistence', () => {
    it('should save ALL extracted data to brand_profiles table', async () => {
      if (process.env.RUN_E2E_TESTS !== 'true') {
        console.log('Skipping database test in mock mode');
        return;
      }

      const mockExtractedData = {
        brand: {
          colors: { primary: '#FF0000', secondary: '#00FF00' },
          typography: { fonts: [{ family: 'Roboto', weights: [400, 700] }] },
          voice: { taglines: ['Innovation First'], tone: 'professional' }
        },
        product: {
          value_prop: { headline: 'Transform Your Business', subhead: 'With AI' },
          features: Array.from({ length: 25 }, (_, i) => ({
            title: `Feature ${i + 1}`,
            desc: `Desc ${i + 1}`
          })),
          problem: 'Manual processes',
          solution: 'AI automation'
        },
        targetAudience: ['Enterprises', 'Startups', 'SMBs'],
        social_proof: {
          stats: {
            users: '100,000+',
            rating: '4.9',
            revenue: '$50M ARR',
            growth: '300% YoY'
          },
          testimonials: Array.from({ length: 15 }, (_, i) => ({
            author: `CEO ${i + 1}`,
            content: `Great product ${i + 1}`
          })),
          customerLogos: ['aws.png', 'google.png', 'microsoft.png'],
          trustBadges: ['SOC2', 'ISO27001']
        },
        page: {
          url: 'https://test-enhanced.com',
          title: 'Enhanced Test Brand'
        },
        extractionMeta: {
          version: '4.0.0',
          confidence: { overall: 0.95 }
        }
      };

      // Save to database
      const savedProfile = await saveBrandProfile(
        testContext.projectId,
        'https://test-enhanced.com',
        mockExtractedData
      );

      // Verify saved data
      expect(savedProfile).toBeTruthy();
      expect(savedProfile.projectId).toBe(testContext.projectId);

      // Query database directly to verify persistence
      const dbProfile = await db.query.brandProfiles.findFirst({
        where: eq(brandProfiles.projectId, testContext.projectId)
      });

      expect(dbProfile).toBeTruthy();
      
      // Verify ALL features saved
      expect(dbProfile?.productNarrative?.allFeatures).toHaveLength(25);
      
      // Verify target audiences saved
      expect(dbProfile?.productNarrative?.targetAudience).toHaveLength(3);
      expect(dbProfile?.productNarrative?.targetAudience).toContain('Enterprises');
      
      // Verify social proof saved
      expect(dbProfile?.socialProof?.allStats?.revenue).toBe('$50M ARR');
      expect(dbProfile?.socialProof?.testimonials).toHaveLength(15);
      expect(dbProfile?.socialProof?.customerLogos).toHaveLength(3);
      expect(dbProfile?.socialProof?.trustBadges).toHaveLength(2);
    });
  });

  describe('Real Website Extraction', () => {
    it('should extract comprehensive data from Vercel.com', async () => {
      if (process.env.RUN_E2E_TESTS !== 'true') {
        console.log('Skipping real website test in mock mode');
        return;
      }

      // Mock the Playwright extraction but use realistic Vercel data
      const vercelMockData = {
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
              ]
            },
            typography: {
              stack: { primary: ['Geist', 'Inter', 'system-ui'] }
            }
          }
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
          solution: 'Instant deployments with the best DX'
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
          ]
        },
        metadata: {
          url: 'https://vercel.com',
          version: '4.0.0',
          confidence: { overall: 0.92 }
        }
      };

      const simplified = convertV4ToSimplified(vercelMockData as any);
      
      // Verify comprehensive extraction
      expect(simplified.product.features.length).toBeGreaterThanOrEqual(10);
      expect(simplified.targetAudience?.length).toBeGreaterThanOrEqual(4);
      expect(simplified.social_proof?.customerLogos?.length).toBeGreaterThanOrEqual(5);
      
      // Verify specific Vercel data
      expect(simplified.brand.colors.primary).toBe('#000000');
      expect(simplified.brand.typography.fonts[0].family).toBe('Geist');
      expect(simplified.page.title).toBe('Vercel');
      
      // Save and verify persistence
      await saveBrandProfile(testContext.projectId, 'https://vercel.com', simplified);
      
      const saved = await db.query.brandProfiles.findFirst({
        where: eq(brandProfiles.projectId, testContext.projectId)
      });
      
      expect(saved?.productNarrative?.allFeatures.length).toBeGreaterThanOrEqual(10);
      expect(saved?.socialProof?.customerLogos).toContain('adobe');
    });
  });

  describe('Performance', () => {
    it('should handle extraction of 100+ features efficiently', () => {
      const startTime = Date.now();
      
      const largeDataset = {
        brand: { identity: { name: 'MegaBrand' } },
        product: {
          features: Array.from({ length: 100 }, (_, i) => ({
            name: `Feature ${i}`,
            description: `Description ${i}`,
            icon: `icon-${i}`
          }))
        },
        socialProof: {
          testimonials: Array.from({ length: 50 }, (_, i) => ({
            author: `Author ${i}`,
            content: `Content ${i}`
          })),
          stats: Array.from({ length: 20 }, (_, i) => ({
            label: `Metric ${i}`,
            value: `${i * 1000}`
          }))
        },
        metadata: { url: 'https://mega.com' }
      };

      const simplified = convertV4ToSimplified(largeDataset as any);
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
});

describe('Brand Panel Display', () => {
  it('should have all data available for UI display', async () => {
    const testData = {
      brand: {
        colors: { primary: '#FF0000', secondary: '#00FF00', accents: ['#0000FF'] },
        typography: { fonts: [{ family: 'Arial', weights: [400, 700] }] },
        voice: { taglines: ['Test Tagline'], tone: 'friendly' }
      },
      product: {
        value_prop: { headline: 'Test Headline', subhead: 'Test Subhead' },
        features: Array.from({ length: 10 }, (_, i) => ({
          title: `Feature ${i}`,
          desc: `Description ${i}`
        }))
      },
      targetAudience: ['Audience 1', 'Audience 2'],
      social_proof: {
        stats: { users: '1000+', rating: '5.0' },
        testimonials: [{ author: 'John', content: 'Great!' }],
        customerLogos: ['logo.png'],
        trustBadges: ['Badge1']
      },
      page: { url: 'https://test.com', title: 'Test' },
      extractionMeta: { version: '4.0.0' }
    };

    // This is what the UI receives
    const uiData = convertV4ToSimplified(testData as any);
    
    // Verify UI has access to all enhanced data
    expect(uiData.brand.colors.primary).toBe('#FF0000');
    expect(uiData.brand.colors.accents).toHaveLength(1);
    expect(uiData.product.features).toHaveLength(10);
    expect(uiData.targetAudience).toHaveLength(2);
    expect(uiData.social_proof?.stats?.users).toBe('1000+');
    expect(uiData.social_proof?.testimonials).toHaveLength(1);
    expect(uiData.social_proof?.customerLogos).toHaveLength(1);
    expect(uiData.social_proof?.trustBadges).toHaveLength(1);
  });
});