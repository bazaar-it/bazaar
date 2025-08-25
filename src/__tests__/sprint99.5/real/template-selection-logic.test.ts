/**
 * REAL Integration Test 6-7: Template Selection Logic  
 * Tests real template selection with actual brand data and scene plans
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';

// Import real components
import { WebAnalysisAgentV4 } from '~/tools/webAnalysis/WebAnalysisAgentV4';
import { herosJourneyLLM } from '~/tools/narrative/herosJourneyLLM';
import type { ExtractedBrandDataV4 } from '~/tools/webAnalysis/WebAnalysisAgentV4';

describe('REAL Template Selection Logic Tests', () => {
  let webAnalyzer: WebAnalysisAgentV4;

  beforeAll(async () => {
    webAnalyzer = new WebAnalysisAgentV4('test-project-id');
    jest.setTimeout(120000); // 2 minutes for scene planning + template selection
  });

  afterAll(async () => {
    // WebAnalysisAgentV4 cleans up automatically
  });

  test('6. Hero\'s Journey LLM generates scenes from Linear brand data', async () => {
    console.log('🎨 Testing REAL scene generation for Linear...');
    
    // Extract real brand data from Linear
    const brandData: ExtractedBrandDataV4 = await webAnalyzer.analyze('https://linear.app');
    
    expect(brandData).toBeDefined();
    expect(brandData.brand?.identity?.name).toMatch(/linear/i);
    
    // Generate real scene plan using hero's journey
    const scenePlan = await herosJourneyLLM.generateNarrative(brandData, {
      sceneCount: 3,
      totalDuration: 450 // 15 seconds
    });
    
    expect(scenePlan).toBeDefined();
    expect(scenePlan.scenes).toBeDefined();
    expect(scenePlan.scenes.length).toBeGreaterThan(0);
    expect(scenePlan.scenes.length).toBeLessThanOrEqual(3);
    
    // Validate scene structure
    scenePlan.scenes.forEach((scene, index) => {
      expect(scene.emotionalBeat).toBeTruthy();
      expect(scene.duration).toBeGreaterThan(0);
      console.log(`Scene ${index + 1}: ${scene.emotionalBeat} (${scene.duration}f)`);
    });
    
    // Scenes should be relevant to project management (Linear's domain)
    const sceneContent = scenePlan.scenes.map(s => 
      (s.content?.headline || s.emotionalBeat || '').toLowerCase()
    ).join(' ');
    
    const hasRelevantContent = sceneContent.includes('project') || 
                               sceneContent.includes('team') ||
                               sceneContent.includes('task') ||
                               sceneContent.includes('workflow') ||
                               sceneContent.includes('linear');
                               
    expect(hasRelevantContent).toBe(true);
    
    console.log('✅ Linear scene generation successful:', {
      sceneCount: scenePlan.scenes.length,
      totalDuration: scenePlan.scenes.reduce((sum, s) => sum + s.duration, 0),
      hasRelevantContent
    });
  });

  test('7. Hero\'s Journey LLM adapts scenes for Shopify e-commerce brand', async () => {
    console.log('🎨 Testing REAL scene generation for Shopify...');
    
    // Extract real brand data from Shopify
    const brandData: ExtractedBrandDataV4 = await webAnalyzer.analyze('https://shopify.com');
    
    expect(brandData).toBeDefined();
    expect(brandData.brand?.identity?.name).toMatch(/shopify/i);
    
    // Generate scenes for e-commerce context
    const scenePlan = await herosJourneyLLM.generateNarrative(brandData, {
      sceneCount: 3,
      totalDuration: 450
    });
    
    expect(scenePlan.scenes.length).toBeGreaterThan(0);
    
    // Validate scene relevance to e-commerce
    const sceneContent = scenePlan.scenes.map(s => 
      (s.content?.headline || s.emotionalBeat || '').toLowerCase()
    ).join(' ');
    
    const hasEcommerceContent = sceneContent.includes('store') ||
                                sceneContent.includes('sell') ||
                                sceneContent.includes('merchant') ||
                                sceneContent.includes('commerce') ||
                                sceneContent.includes('shopify');
                                
    expect(hasEcommerceContent).toBe(true);
    
    // Should have calls-to-action for commerce
    const features = brandData.product?.features || [];
    const ctas = brandData.content?.ctas || [];
    
    console.log('📊 Shopify brand analysis:', {
      features: features.length,
      ctas: ctas.length,
      hasEcommerceContent
    });
    
    expect(features.length).toBeGreaterThan(0);
    
    console.log('✅ Shopify scene generation successful:', {
      sceneCount: scenePlan.scenes.length,
      hasEcommerceContent,
      brandFeatures: features.length
    });
  });

  // Helper test for debugging scene generation
  test.skip('DEBUG: Scene generation analysis', async () => {
    const brandData = await webAnalyzer.analyze('https://stripe.com');
    const scenePlan = await herosJourneyLLM.generateNarrative(brandData, { 
      sceneCount: 2,
      totalDuration: 300
    });
    
    console.log('🔍 DEBUG scene generation:', {
      brandData: {
        name: brandData.brand?.identity?.name,
        features: brandData.product?.features?.length || 0,
        colors: brandData.brand?.visual?.colors?.palette?.length || 0
      },
      scenePlan: {
        scenes: scenePlan.scenes.length,
        details: scenePlan.scenes.map(s => ({
          beat: s.emotionalBeat,
          duration: s.duration,
          headline: s.content?.headline
        }))
      }
    });
  });
});