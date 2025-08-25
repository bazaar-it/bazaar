/**
 * REAL Integration Test 4-5: Visual Classification Accuracy
 * Tests classification accuracy using actual WebAnalysisAgentV4 extraction
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';

// Import real components
import { WebAnalysisAgentV4 } from '~/tools/webAnalysis/WebAnalysisAgentV4';
import type { ExtractedBrandDataV4 } from '~/tools/webAnalysis/WebAnalysisAgentV4';

describe('REAL Visual Classification Accuracy Tests', () => {
  let webAnalyzer: WebAnalysisAgentV4;

  beforeAll(async () => {
    webAnalyzer = new WebAnalysisAgentV4('test-project-id');
    jest.setTimeout(120000); // 2 minutes
  });

  afterAll(async () => {
    // WebAnalysisAgentV4 cleans up automatically
  });

  test('4. Linear extraction correctly identifies UI-heavy project management tool', async () => {
    console.log('🎯 Testing REAL Linear brand extraction...');
    
    const brandData: ExtractedBrandDataV4 = await webAnalyzer.analyze('https://linear.app');
    
    // Since WebAnalysisAgentV4 interface focuses on brand data extraction,
    // we'll test based on actual extracted data structure
    const features = brandData.product?.features || [];
    const screenshots = brandData.screenshots || [];
    
    console.log('📊 Linear extraction results:', {
      features: features.length,
      screenshots: screenshots.length,
      brand: brandData.brand?.identity?.name
    });
    
    // Linear should have project management features
    expect(features.length).toBeGreaterThan(0);
    
    // Should have screenshots for visual evidence
    expect(screenshots.length).toBeGreaterThan(0);
    
    // Feature descriptions should indicate UI-heavy project management tool
    const projectFeatures = features.filter(feature => {
      const desc = (feature.description || feature.desc || '').toLowerCase();
      return desc.includes('project') || desc.includes('task') || 
             desc.includes('team') || desc.includes('workflow') ||
             desc.includes('issue') || desc.includes('roadmap');
    });
    expect(projectFeatures.length).toBeGreaterThan(0);
    
    // Should detect Linear brand
    expect(brandData.brand?.identity?.name).toMatch(/linear/i);
    
    console.log('✅ Linear classification successful:', {
      features: features.length,
      projectFeatures: projectFeatures.length,
      screenshots: screenshots.length
    });
  });

  test('5. Shopify extraction correctly identifies e-commerce platform features', async () => {
    console.log('🎯 Testing REAL Shopify brand extraction...');
    
    const brandData: ExtractedBrandDataV4 = await webAnalyzer.analyze('https://shopify.com');
    
    const features = brandData.product?.features || [];
    const screenshots = brandData.screenshots || [];
    const ctas = brandData.content?.ctas || [];
    
    console.log('📊 Shopify extraction results:', {
      features: features.length,
      screenshots: screenshots.length,
      ctas: ctas.length
    });
    
    // Shopify should have e-commerce features
    expect(features.length).toBeGreaterThan(0);
    
    // Should have screenshots for visual evidence
    expect(screenshots.length).toBeGreaterThan(0);
    
    // Should have CTAs (commerce sites are CTA-heavy)
    expect(ctas.length).toBeGreaterThan(0);
    
    // Features should indicate e-commerce/merchant tools
    const commerceFeatures = features.filter(feature => {
      const desc = (feature.description || feature.desc || '').toLowerCase();
      return desc.includes('store') || desc.includes('sell') || 
             desc.includes('merchant') || desc.includes('commerce') ||
             desc.includes('payment') || desc.includes('checkout');
    });
    expect(commerceFeatures.length).toBeGreaterThan(0);
    
    // Should detect Shopify brand
    expect(brandData.brand?.identity?.name).toMatch(/shopify/i);
    
    console.log('✅ Shopify classification successful:', {
      features: features.length,
      commerceFeatures: commerceFeatures.length,
      screenshots: screenshots.length,
      ctas: ctas.length
    });
  });

  // Additional helper test for edge cases
  test.skip('DEBUG: Brand extraction on mixed content site', async () => {
    // Use for testing sites with balanced content
    const brandData = await webAnalyzer.analyze('https://notion.so');
    
    console.log('🔍 DEBUG extracted data structure:', {
      brand: brandData.brand?.identity,
      features: brandData.product?.features?.length || 0,
      screenshots: brandData.screenshots?.length || 0,
      ctas: brandData.content?.ctas?.length || 0
    });
  });
});