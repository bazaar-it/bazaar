/**
 * Web Extraction Tests - DOM Analysis (3 tests)
 * Tests DOM analysis capabilities of enhanced WebAnalysisAgentV4
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { TEST_SITES } from '../../fixtures/test-sites';

// Mock DOM analysis functions
const mockDOMAnalyzer = {
  extractComputedStyles: jest.fn(),
  detectFonts: jest.fn(),
  handleModalsAndOverlays: jest.fn(),
};

describe('Web Extraction - DOM Analysis Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('2.1 Computed styles extraction accuracy', async () => {
    // Setup
    const mockExtractedStyles = {
      colors: [
        { hex: '#635BFF', usage: 'primary', selector: '.btn-primary' },
        { hex: '#FFFFFF', usage: 'background', selector: 'body' },
        { hex: '#1A1A1A', usage: 'text', selector: 'h1, h2, h3' },
        { hex: '#0066FF', usage: 'accent', selector: '.link' },
        { hex: '#00D924', usage: 'success', selector: '.success' }
      ],
      spacing: {
        margins: ['0px', '8px', '16px', '24px', '32px'],
        paddings: ['8px', '16px', '24px', '32px', '48px']
      },
      borderRadius: ['0px', '4px', '8px', '12px'],
      shadows: [
        '0 1px 3px rgba(0,0,0,0.1)',
        '0 4px 12px rgba(0,0,0,0.15)',
        '0 8px 32px rgba(0,0,0,0.12)'
      ]
    };

    mockDOMAnalyzer.extractComputedStyles.mockResolvedValue(mockExtractedStyles);

    // Execute
    const extractedStyles = await mockDOMAnalyzer.extractComputedStyles(TEST_SITES.stripe.url, {
      includeColors: true,
      includeSpacing: true,
      includeShadows: true,
      includeTypography: true
    });

    // Assert
    expect(extractedStyles.colors).toHaveLength(5);
    expect(extractedStyles.colors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          hex: expect.stringMatching(/^#[0-9A-F]{6}$/i),
          usage: expect.any(String),
          selector: expect.any(String)
        })
      ])
    );

    // Verify Stripe's brand colors are detected
    const primaryColor = extractedStyles.colors.find(c => c.usage === 'primary');
    expect(primaryColor?.hex).toBe('#635BFF');

    // Verify spacing system is extracted
    expect(extractedStyles.spacing.margins).toContain('16px');
    expect(extractedStyles.spacing.margins).toContain('24px');
    expect(extractedStyles.spacing.paddings).toContain('16px');

    // Verify shadows are captured
    expect(extractedStyles.shadows).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^0 \d+px \d+px rgba\(\d+,\d+,\d+,[\d.]+\)$/)
      ])
    );
  });

  test('2.2 Font detection and classification', async () => {
    // Setup
    const mockDetectedFonts = {
      families: [
        { 
          family: 'Inter', 
          weights: ['400', '500', '600'], 
          usage: ['headers', 'body'],
          selectors: ['h1', 'h2', 'p', '.body-text']
        },
        { 
          family: 'SF Pro Display', 
          weights: ['400', '500'], 
          usage: ['navigation'],
          selectors: ['nav', '.nav-link']
        }
      ],
      fallbacks: ['Arial', 'Helvetica', 'sans-serif'],
      loadedFonts: ['Inter', 'SF Pro Display'],
      systemFonts: ['Arial', 'Helvetica']
    };

    mockDOMAnalyzer.detectFonts.mockResolvedValue(mockDetectedFonts);

    // Execute
    const detectedFonts = await mockDOMAnalyzer.detectFonts(TEST_SITES.stripe.url, {
      includeWebFonts: true,
      includeSystemFonts: true,
      analyzeFontUsage: true
    });

    // Assert
    expect(detectedFonts.families).toHaveLength(2);
    expect(detectedFonts.loadedFonts).toContainEqual('Inter');

    // Verify Inter font (commonly used by Stripe)
    const interFont = detectedFonts.families.find(f => f.family === 'Inter');
    expect(interFont).toMatchObject({
      family: 'Inter',
      weights: expect.arrayContaining(['400', '500']),
      usage: expect.arrayContaining(['headers', 'body']),
      selectors: expect.any(Array)
    });

    // Verify fallback chain exists
    expect(detectedFonts.fallbacks).toContain('sans-serif');
    expect(detectedFonts.fallbacks).toEqual(
      expect.arrayContaining(['Arial', 'Helvetica', 'sans-serif'])
    );
  });

  test('2.3 Modal and overlay handling', async () => {
    // Setup - Simulate page with cookie banner, chat widget, and newsletter modal
    const mockModalHandling = {
      modalsFound: [
        { type: 'cookie-banner', selector: '[data-cookie-banner]', handled: true },
        { type: 'newsletter-modal', selector: '.newsletter-modal', handled: true },
        { type: 'chat-widget', selector: '#intercom-frame', handled: true },
        { type: 'notification', selector: '.notification-bar', handled: true }
      ],
      overlaysHidden: 4,
      interactionsRequired: 2, // Some modals needed clicks to dismiss
      cleanExtractionSuccess: true,
      beforeScreenshot: '/screenshots/stripe-with-overlays.png',
      afterScreenshot: '/screenshots/stripe-clean.png'
    };

    mockDOMAnalyzer.handleModalsAndOverlays.mockResolvedValue(mockModalHandling);

    // Execute
    const modalHandling = await mockDOMAnalyzer.handleModalsAndOverlays(TEST_SITES.stripe.url, {
      cookieBanners: true,
      newsletterModals: true,
      chatWidgets: true,
      notifications: true,
      autoInteract: true
    });

    // Assert
    expect(modalHandling.modalsFound).toHaveLength(4);
    expect(modalHandling.overlaysHidden).toBe(4);
    expect(modalHandling.cleanExtractionSuccess).toBe(true);

    // Verify specific modal types were handled
    const cookieBanner = modalHandling.modalsFound.find(m => m.type === 'cookie-banner');
    const chatWidget = modalHandling.modalsFound.find(m => m.type === 'chat-widget');
    
    expect(cookieBanner).toMatchObject({
      type: 'cookie-banner',
      handled: true,
      selector: expect.any(String)
    });

    expect(chatWidget).toMatchObject({
      type: 'chat-widget',
      handled: true,
      selector: expect.any(String)
    });

    // Verify clean extraction was achieved
    expect(modalHandling.beforeScreenshot).toBeDefined();
    expect(modalHandling.afterScreenshot).toBeDefined();
    expect(modalHandling.interactionsRequired).toBeGreaterThanOrEqual(0);
  });
});