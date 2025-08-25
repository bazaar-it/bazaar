/**
 * REAL Integration Test 1-3: WebAnalysisAgentV4 Extraction
 * Tests actual brand data extraction from real websites
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';

// Import real components, not mocks
import { WebAnalysisAgentV4 } from '~/tools/webAnalysis/WebAnalysisAgentV4';
import type { ExtractedBrandDataV4 } from '~/tools/webAnalysis/WebAnalysisAgentV4';

describe('REAL WebAnalysisAgentV4 Extraction Tests', () => {
  let webAnalyzer: WebAnalysisAgentV4;

  beforeAll(async () => {
    webAnalyzer = new WebAnalysisAgentV4('test-project-id');
    // Give more time for real web requests
    jest.setTimeout(120000); // 2 minutes
  });

  afterAll(async () => {
    // WebAnalysisAgentV4 cleans up automatically
  });

  test('1. WebAnalysisAgentV4 extracts Stripe brand data correctly', async () => {
    console.log('🌍 Testing REAL Stripe extraction...');
    
    // REAL extraction from REAL website
    const brandData: ExtractedBrandDataV4 = await webAnalyzer.analyze('https://stripe.com');
    
    // Validate REAL extracted data
    expect(brandData).toBeDefined();
    expect(brandData.brand).toBeDefined();
    expect(brandData.brand.identity).toBeDefined();
    
    // Stripe should be detected
    expect(brandData.brand.identity.name).toMatch(/stripe/i);
    
    // Stripe purple should be extracted
    const colors = brandData.brand?.visual?.colors?.palette || [];
    const hasStripePurple = colors.some(color => 
      color.hex.toLowerCase().includes('635bff') || 
      color.hex.toLowerCase().includes('6772e5')
    );
    expect(hasStripePurple).toBe(true);
    
    // Should have product features
    expect(brandData.product?.features?.length || 0).toBeGreaterThan(0);
    
    // Should have screenshots for evidence
    expect(brandData.screenshots?.length || 0).toBeGreaterThan(0);
    
    console.log('✅ Stripe extraction successful:', {
      brand: brandData.brand.identity.name,
      features: brandData.product?.features?.length || 0,
      colors: brandData.brand?.visual?.colors?.palette?.length || 0
    });
  });

  test('2. WebAnalysisAgentV4 extracts Linear brand data correctly', async () => {
    console.log('🌍 Testing REAL Linear extraction...');
    
    const brandData: ExtractedBrandDataV4 = await webAnalyzer.analyze('https://linear.app');
    
    expect(brandData).toBeDefined();
    expect(brandData.brand.identity.name).toMatch(/linear/i);
    
    // Should have product features related to project management
    expect(brandData.product?.features?.length || 0).toBeGreaterThan(0);
    
    // Linear brand colors (purple/blue)
    const colors = brandData.brand?.visual?.colors?.palette || [];
    expect(colors.length).toBeGreaterThan(2);
    
    // Should have content CTAs
    expect(brandData.content?.ctas?.length || 0).toBeGreaterThan(0);
    
    console.log('✅ Linear extraction successful:', {
      brand: brandData.brand.identity.name,
      features: brandData.product?.features?.length || 0,
      colors: colors.length
    });
  });

  test('3. WebAnalysisAgentV4 extracts Figma brand data correctly', async () => {
    console.log('🌍 Testing REAL Figma extraction...');
    
    const brandData: ExtractedBrandDataV4 = await webAnalyzer.analyze('https://figma.com');
    
    expect(brandData).toBeDefined();
    expect(brandData.brand.identity.name).toMatch(/figma/i);
    
    // Figma rainbow colors should be detected
    const colors = brandData.brand?.visual?.colors?.palette || [];
    expect(colors.length).toBeGreaterThan(3);
    
    // Should have product features for design tools
    expect(brandData.product?.features?.length || 0).toBeGreaterThan(0);
    
    // Should have screenshots for evidence
    const screenshots = brandData.screenshots || [];
    expect(screenshots.length).toBeGreaterThan(0);
    
    console.log('✅ Figma extraction successful:', {
      brand: brandData.brand.identity.name,
      features: brandData.product?.features?.length || 0,
      screenshots: screenshots.length,
      colors: colors.length
    });
  });

  // Helper test for debugging extraction issues
  test.skip('DEBUG: Test extraction on development site', async () => {
    // Use this for debugging extraction issues
    const brandData = await webAnalyzer.analyze('https://example.com');
    console.log('🔍 DEBUG extraction result:', JSON.stringify(brandData, null, 2));
  });
});