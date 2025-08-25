/**
 * REAL Integration Test 8-9: End-to-End Pipeline
 * Tests complete URL to video pipeline with real websites
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';

// Import real components
import { websiteToVideoHandler } from '~/tools/website/websiteToVideoHandler';
import type { WebsiteToVideoResult } from '~/tools/website/websiteToVideoHandler';

describe('REAL End-to-End Pipeline Tests', () => {
  beforeAll(async () => {
    jest.setTimeout(120000); // 2 minutes for full pipeline
  });

  test('8. Complete URL to video pipeline processes Stripe successfully', async () => {
    console.log('🚀 Testing REAL end-to-end pipeline on Stripe...');
    
    const startTime = Date.now();
    
    // Run REAL complete pipeline
    const result: WebsiteToVideoResult = await websiteToVideoHandler.process({
      url: 'https://stripe.com',
      projectId: 'test-stripe-pipeline',
      userId: 'test-user',
      format: {
        width: 1920,
        height: 1080,
        format: 'landscape'
      }
    });
    
    const processingTime = Date.now() - startTime;
    
    console.log('⏱️ Pipeline timing:', {
      processingTime: `${processingTime}ms`,
      processingSeconds: Math.round(processingTime / 1000)
    });
    
    // Validate pipeline success
    expect(result.success).toBe(true);
    expect(result.error).toBeFalsy();
    
    // Validate scene generation
    expect(result.scenes).toBeDefined();
    expect(result.scenes.length).toBeGreaterThan(0);
    expect(result.scenes.length).toBeLessThanOrEqual(6); // Reasonable scene count
    
    // Validate scene content
    result.scenes.forEach((scene, index) => {
      expect(scene.tsxCode).toBeTruthy();
      expect(scene.name).toBeTruthy();
      expect(scene.duration).toBeGreaterThan(0);
      
      // TSX should be valid structure
      expect(scene.tsxCode).toMatch(/export\s+(default\s+)?function/);
      expect(scene.tsxCode).toMatch(/return\s*\(/);
      
      console.log(`📦 Scene ${index + 1}:`, {
        name: scene.name,
        duration: `${scene.duration}f`,
        codeLength: scene.tsxCode.length
      });
    });
    
    // Validate total duration (should be reasonable)
    const totalDuration = result.scenes.reduce((sum, scene) => sum + (scene.duration || 0), 0);
    expect(totalDuration).toBeGreaterThan(300); // >10s
    expect(totalDuration).toBeLessThan(1200); // <40s
    
    // Performance target: <60s processing
    expect(processingTime).toBeLessThan(60000);
    
    // Brand data should be included
    expect(result.brandData).toBeDefined();
    expect(result.brandData.brand.identity.name).toMatch(/stripe/i);
    
    console.log('✅ Stripe pipeline successful:', {
      sceneCount: result.scenes.length,
      totalDuration: `${totalDuration}f`,
      processingTime: `${Math.round(processingTime/1000)}s`,
      brandDetected: result.brandData.brand.identity.name
    });
  });

  test('9. Complete URL to video pipeline processes Figma successfully', async () => {
    console.log('🚀 Testing REAL end-to-end pipeline on Figma...');
    
    const startTime = Date.now();
    
    const result: WebsiteToVideoResult = await websiteToVideoHandler.process({
      url: 'https://figma.com',
      projectId: 'test-figma-pipeline',  
      userId: 'test-user',
      format: {
        width: 1920,
        height: 1080,
        format: 'landscape'
      }
    });
    
    const processingTime = Date.now() - startTime;
    
    // Pipeline success
    expect(result.success).toBe(true);
    expect(result.scenes.length).toBeGreaterThan(0);
    
    // Figma-specific validation
    expect(result.brandData.brand.identity.name).toMatch(/figma/i);
    
    // Should detect design-related UI elements
    const hasDesignUI = result.brandData.visualElements?.uiComponents?.some(ui =>
      ui.category.includes('design') ||
      ui.type.includes('editor') ||
      ui.category.includes('interface')
    );
    
    if (result.brandData.visualElements?.uiComponents?.length > 0) {
      expect(hasDesignUI).toBe(true);
    }
    
    // Performance validation
    expect(processingTime).toBeLessThan(60000); // <60s
    
    // Scene quality validation
    const validScenes = result.scenes.filter(scene => 
      scene.tsxCode && 
      scene.name && 
      scene.duration > 0 &&
      scene.tsxCode.includes('export')
    );
    expect(validScenes.length).toBe(result.scenes.length);
    
    console.log('✅ Figma pipeline successful:', {
      sceneCount: result.scenes.length,
      processingTime: `${Math.round(processingTime/1000)}s`,
      hasDesignUI: hasDesignUI || 'N/A',
      brandDetected: result.brandData.brand.identity.name
    });
  });

  // Edge case test for complex sites
  test.skip('EDGE: Pipeline handles complex GitHub site', async () => {
    console.log('🚀 Testing REAL pipeline on complex GitHub site...');
    
    const result = await websiteToVideoHandler.process({
      url: 'https://github.com',
      projectId: 'test-github-pipeline',
      userId: 'test-user', 
      format: { width: 1920, height: 1080, format: 'landscape' }
    });
    
    // GitHub is complex, should still succeed but might take longer
    expect(result.success).toBe(true);
    
    // Should detect developer tools UI
    const hasDeveloperUI = result.brandData.visualElements?.uiComponents?.some(ui =>
      ui.category.includes('developer') ||
      ui.type.includes('code') ||
      ui.category.includes('repository')
    );
    
    console.log('✅ GitHub pipeline result:', {
      success: result.success,
      scenes: result.scenes.length,
      hasDeveloperUI: hasDeveloperUI || 'N/A'
    });
  });
});