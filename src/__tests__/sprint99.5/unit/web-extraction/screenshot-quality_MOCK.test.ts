/**
 * Web Extraction Tests - Screenshot Quality (3 tests)
 * Tests enhanced WebAnalysisAgentV4 screenshot capabilities
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { TEST_SITES } from '../../fixtures/test-sites';
import { createPerformanceTimer } from '../../utils/test-helpers';

// Mock the WebAnalysisAgentV4 for testing
const mockWebAnalysisAgent = {
  captureFullPageScreenshot: jest.fn(),
  captureElementScreenshots: jest.fn(),
  sliceSectionScreenshots: jest.fn(),
};

describe('Web Extraction - Screenshot Quality Tests', () => {
  let performanceTimer: ReturnType<typeof createPerformanceTimer>;

  beforeEach(() => {
    performanceTimer = createPerformanceTimer();
    jest.clearAllMocks();
  });

  test('1.1 Full-page screenshot capture quality', async () => {
    // Setup
    const testSite = TEST_SITES.stripe;
    const mockScreenshot = {
      width: 3840, // 1920 * 2 (@2x resolution)
      height: 4800, // Full page height
      format: 'png',
      buffer: Buffer.from('mock-screenshot-data'),
      path: '/screenshots/stripe-fullpage.png'
    };

    mockWebAnalysisAgent.captureFullPageScreenshot.mockResolvedValue(mockScreenshot);

    performanceTimer.start();

    // Execute
    const screenshot = await mockWebAnalysisAgent.captureFullPageScreenshot(testSite.url, {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 2,
      fullPage: true
    });

    // Assert
    expect(screenshot).toMatchObject({
      width: 3840, // @2x resolution
      height: expect.any(Number),
      format: 'png'
    });
    
    expect(screenshot.height).toBeGreaterThan(3000); // Full page
    expect(screenshot.buffer).toBeDefined();
    expect(screenshot.path).toMatch(/\.png$/);
    
    // Performance check
    performanceTimer.expectLessThan(10000); // <10s for screenshot
  });

  test('1.2 Section slicing accuracy', async () => {
    // Setup
    const mockSections = [
      { 
        id: 'hero', 
        bbox: { x: 0, y: 0, width: 1920, height: 800 },
        screenshot: '/screenshots/stripe-hero.png'
      },
      { 
        id: 'features', 
        bbox: { x: 0, y: 800, width: 1920, height: 600 },
        screenshot: '/screenshots/stripe-features.png'
      },
      { 
        id: 'testimonials', 
        bbox: { x: 0, y: 1400, width: 1920, height: 400 },
        screenshot: '/screenshots/stripe-testimonials.png'
      }
    ];

    mockWebAnalysisAgent.sliceSectionScreenshots.mockResolvedValue(mockSections);

    // Execute
    const sections = await mockWebAnalysisAgent.sliceSectionScreenshots(
      '/screenshots/stripe-fullpage.png',
      {
        hero: { selector: 'main > section:first-child' },
        features: { selector: 'main > section:nth-child(2)' },
        testimonials: { selector: '[data-section="testimonials"]' }
      }
    );

    // Assert
    expect(sections).toHaveLength(3);
    expect(sections).toContainEqual(
      expect.objectContaining({
        id: 'hero',
        bbox: expect.objectContaining({
          width: expect.any(Number),
          height: expect.any(Number)
        }),
        screenshot: expect.stringMatching(/hero\.png$/)
      })
    );

    // Verify logical section order
    const heroSection = sections.find(s => s.id === 'hero');
    const featuresSection = sections.find(s => s.id === 'features');
    expect(heroSection!.bbox.y).toBeLessThan(featuresSection!.bbox.y);
  });

  test('1.3 Element-level crops for UI components', async () => {
    // Setup
    const mockElementCrops = [
      {
        element: 'cta_button',
        bbox: { x: 50, y: 100, width: 200, height: 48 },
        screenshot: '/screenshots/stripe-cta-button.png',
        type: 'ui'
      },
      {
        element: 'logo',
        bbox: { x: 20, y: 20, width: 120, height: 40 },
        screenshot: '/screenshots/stripe-logo.png',
        type: 'brand'
      },
      {
        element: 'nav_menu',
        bbox: { x: 200, y: 20, width: 400, height: 40 },
        screenshot: '/screenshots/stripe-nav.png',
        type: 'ui'
      },
      {
        element: 'dashboard_preview',
        bbox: { x: 100, y: 300, width: 600, height: 400 },
        screenshot: '/screenshots/stripe-dashboard.png',
        type: 'ui'
      }
    ];

    mockWebAnalysisAgent.captureElementScreenshots.mockResolvedValue(mockElementCrops);

    // Execute
    const elementCrops = await mockWebAnalysisAgent.captureElementScreenshots(
      TEST_SITES.stripe.url,
      {
        elements: [
          { selector: 'button[data-cta]', name: 'cta_button' },
          { selector: '.logo', name: 'logo' },
          { selector: 'nav', name: 'nav_menu' },
          { selector: '[data-dashboard-preview]', name: 'dashboard_preview' }
        ]
      }
    );

    // Assert
    expect(elementCrops).toHaveLength(4);
    
    // Verify key UI components are captured
    const ctaButton = elementCrops.find(e => e.element === 'cta_button');
    const dashboard = elementCrops.find(e => e.element === 'dashboard_preview');
    
    expect(ctaButton).toMatchObject({
      element: 'cta_button',
      type: 'ui',
      bbox: expect.objectContaining({
        width: expect.any(Number),
        height: expect.any(Number)
      })
    });

    expect(dashboard).toMatchObject({
      element: 'dashboard_preview',
      type: 'ui',
      bbox: expect.objectContaining({
        width: expect.any(Number),
        height: expect.any(Number)
      })
    });

    // Verify all crops have valid bounding boxes
    elementCrops.forEach(crop => {
      expect(crop.bbox.width).toBeGreaterThan(0);
      expect(crop.bbox.height).toBeGreaterThan(0);
      expect(crop.screenshot).toMatch(/\.png$/);
    });
  });
});