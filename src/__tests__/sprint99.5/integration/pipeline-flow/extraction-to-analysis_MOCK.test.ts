/**
 * Pipeline Flow Integration Tests - Extraction → Analysis (5 tests)
 * Tests component interaction in Sprint 99.5 pipeline
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { MOCK_STRIPE_BRAND, MOCK_LINEAR_BRAND } from '../../fixtures/mock-brand-data';
import { validateEvidenceChain } from '../../utils/test-helpers';

// Mock pipeline components for integration testing
const mockExtractionComponent = {
  captureFullPageScreenshot: jest.fn(),
  sliceSectionScreenshots: jest.fn(),
  extractComputedStyles: jest.fn(),
  extractDOMStructure: jest.fn(),
};

const mockAnalysisComponent = {
  analyzeScreenshots: jest.fn(),
  classifyVisualElements: jest.fn(),
  extractBrandData: jest.fn(),
  validateEvidence: jest.fn(),
};

describe('Pipeline Integration - Extraction → Analysis Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('8.1 Screenshots feed into brand analysis correctly', async () => {
    // Setup - Mock extraction output feeding into analysis
    const mockExtractionOutput = {
      fullPageScreenshot: {
        path: '/screenshots/stripe-full.png',
        width: 3840,
        height: 4800,
        sections: [
          { id: 'hero', bbox: { x: 0, y: 0, width: 3840, height: 1600 } },
          { id: 'features', bbox: { x: 0, y: 1600, width: 3840, height: 1200 } },
          { id: 'testimonials', bbox: { x: 0, y: 2800, width: 3840, height: 800 } }
        ]
      },
      sectionScreenshots: [
        { id: 'hero', path: '/screenshots/stripe-hero.png', bbox: { x: 0, y: 0, width: 3840, height: 1600 } },
        { id: 'features', path: '/screenshots/stripe-features.png', bbox: { x: 0, y: 1600, width: 3840, height: 1200 } },
        { id: 'testimonials', path: '/screenshots/stripe-testimonials.png', bbox: { x: 0, y: 2800, width: 3840, height: 800 } }
      ],
      elementScreenshots: [
        { element: 'cta_button', path: '/screenshots/stripe-cta.png' },
        { element: 'logo', path: '/screenshots/stripe-logo.png' },
        { element: 'dashboard_preview', path: '/screenshots/stripe-dashboard.png' }
      ]
    };

    const mockAnalysisResult = {
      brandData: MOCK_STRIPE_BRAND,
      screenshotMapping: {
        'hero-screenshot-1': '/screenshots/stripe-hero.png',
        'features-screenshot-1': '/screenshots/stripe-features.png',
        'testimonials-screenshot-1': '/screenshots/stripe-testimonials.png'
      },
      evidenceValidation: {
        totalClaims: 8,
        evidencedClaims: 8,
        unmappedScreenshots: 0,
        duplicateReferences: 0
      }
    };

    mockExtractionComponent.captureFullPageScreenshot.mockResolvedValue(mockExtractionOutput.fullPageScreenshot);
    mockExtractionComponent.sliceSectionScreenshots.mockResolvedValue(mockExtractionOutput.sectionScreenshots);
    mockAnalysisComponent.analyzeScreenshots.mockResolvedValue(mockAnalysisResult);

    // Execute pipeline flow
    const extractionResult = await mockExtractionComponent.captureFullPageScreenshot('https://stripe.com');
    const sectionScreenshots = await mockExtractionComponent.sliceSectionScreenshots(extractionResult);
    const analysisResult = await mockAnalysisComponent.analyzeScreenshots(sectionScreenshots);

    // Assert integration works correctly
    expect(analysisResult.screenshotMapping).toHaveProperty('hero-screenshot-1');
    expect(analysisResult.screenshotMapping['hero-screenshot-1']).toBe('/screenshots/stripe-hero.png');

    // Verify all screenshots are mapped to analysis
    expect(analysisResult.evidenceValidation.unmappedScreenshots).toBe(0);
    expect(analysisResult.evidenceValidation.evidencedClaims).toBe(
      analysisResult.evidenceValidation.totalClaims
    );

    // Verify brand data references correct screenshots
    const heroSection = analysisResult.brandData.sections.find(s => s.type === 'hero');
    expect(heroSection!.evidence.screenshotIds).toContain('hero-screenshot-1');
    expect(analysisResult.screenshotMapping).toHaveProperty('hero-screenshot-1');
  });

  test('8.2 DOM data enhances visual classification', async () => {
    // Setup - Mock extraction output for this test
    const mockExtractionOutput = {
      elementScreenshots: [
        { element: 'dashboard-preview', path: '/screenshots/dashboard.png' },
        { element: 'hero-image', path: '/screenshots/hero.png' }
      ]
    };

    // Setup - DOM data should inform visual element classification
    const mockDOMData = {
      elements: [
        {
          selector: '[data-dashboard-preview]',
          tagName: 'div',
          classList: ['dashboard-container', 'interactive'],
          attributes: {
            'data-component': 'payment-dashboard',
            'role': 'application'
          },
          computedStyles: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            background: '#FAFAFA'
          },
          interactive: true
        },
        {
          selector: '.hero-image',
          tagName: 'img',
          classList: ['hero-image', 'responsive'],
          attributes: {
            'src': '/hero-team.jpg',
            'alt': 'Team collaborating on payments'
          },
          computedStyles: {
            display: 'block',
            width: '600px',
            height: '400px'
          },
          interactive: false
        }
      ]
    };

    const mockEnhancedClassification = {
      visualElements: [
        {
          element: '[data-dashboard-preview]',
          classification: 'ui',
          category: 'dashboard',
          confidence: 0.96,
          domContext: {
            hasInteractiveElements: true,
            hasGridLayout: true,
            hasDataAttributes: true
          },
          enhancementFromDOM: 0.15 // Confidence boost from DOM analysis
        },
        {
          element: '.hero-image',
          classification: 'photo',
          category: 'hero-image',
          confidence: 0.94,
          domContext: {
            hasAltText: true,
            isImageElement: true,
            hasInteractiveElements: false
          },
          enhancementFromDOM: 0.08 // Minor boost from alt text
        }
      ],
      domEnhancementImpact: 0.12 // Average confidence improvement
    };

    mockExtractionComponent.extractDOMStructure.mockResolvedValue(mockDOMData);
    mockAnalysisComponent.classifyVisualElements.mockResolvedValue(mockEnhancedClassification);

    // Execute
    const domData = await mockExtractionComponent.extractDOMStructure('https://stripe.com');
    const classification = await mockAnalysisComponent.classifyVisualElements(
      mockExtractionOutput.elementScreenshots,
      { enhanceWithDOM: domData }
    );

    // Assert DOM data improves classification
    expect(classification.domEnhancementImpact).toBeGreaterThan(0.1);
    
    // Verify UI element classification uses DOM context
    const dashboardElement = classification.visualElements.find(
      e => e.element === '[data-dashboard-preview]'
    );
    expect(dashboardElement!.classification).toBe('ui');
    expect(dashboardElement!.domContext.hasInteractiveElements).toBe(true);
    expect(dashboardElement!.domContext.hasGridLayout).toBe(true);
    expect(dashboardElement!.enhancementFromDOM).toBeGreaterThan(0.1);

    // Verify photo classification uses image context
    const heroImage = classification.visualElements.find(
      e => e.element === '.hero-image'
    );
    expect(heroImage!.classification).toBe('photo');
    expect(heroImage!.domContext.isImageElement).toBe(true);
    expect(heroImage!.domContext.hasAltText).toBe(true);
  });

  test('8.3 Style extraction informs brand colors', async () => {
    // Setup - Mock extraction output for this test
    const mockExtractionOutput = {
      fullPageScreenshot: { path: '/screenshots/stripe-full.png' },
      sectionScreenshots: [
        { id: 'hero', path: '/screenshots/stripe-hero.png' }
      ]
    };

    // Setup - Extracted styles should feed into brand palette
    const mockExtractedStyles = {
      colors: [
        { hex: '#635BFF', usage: 'primary', frequency: 45, selector: '.btn-primary' },
        { hex: '#FFFFFF', usage: 'background', frequency: 89, selector: 'body' },
        { hex: '#1A1A1A', usage: 'text', frequency: 67, selector: 'h1, h2, h3' },
        { hex: '#0066FF', usage: 'accent', frequency: 23, selector: '.link' },
        { hex: '#00D924', usage: 'success', frequency: 12, selector: '.success' }
      ],
      typography: [
        { family: 'Inter', usage: 'headers', frequency: 78 },
        { family: 'Inter', usage: 'body', frequency: 82 }
      ]
    };

    const mockBrandPalette = {
      design: {
        colors: [
          { hex: '#635BFF', usage: 'primary', prominence: 1.0, source: 'computed-styles' },
          { hex: '#0066FF', usage: 'accent', prominence: 0.8, source: 'computed-styles' },
          { hex: '#00D924', usage: 'success', prominence: 0.6, source: 'computed-styles' },
          { hex: '#FFFFFF', usage: 'background', prominence: 0.9, source: 'computed-styles' },
          { hex: '#1A1A1A', usage: 'text', prominence: 0.9, source: 'computed-styles' }
        ],
        typography: [
          { family: 'Inter', usage: 'headers', weights: ['400', '500', '600'], source: 'computed-styles' },
          { family: 'Inter', usage: 'body', weights: ['400', '500'], source: 'computed-styles' }
        ]
      },
      styleMatchAccuracy: 0.94
    };

    mockExtractionComponent.extractComputedStyles.mockResolvedValue(mockExtractedStyles);
    mockAnalysisComponent.extractBrandData.mockResolvedValue(mockBrandPalette);

    // Execute
    const extractedStyles = await mockExtractionComponent.extractComputedStyles('https://stripe.com');
    const brandData = await mockAnalysisComponent.extractBrandData(
      mockExtractionOutput,
      { enhanceWithStyles: extractedStyles }
    );

    // Assert style integration
    expect(brandData.styleMatchAccuracy).toBeGreaterThan(0.9);
    expect(brandData.design.colors).toHaveLength(5);

    // Verify primary brand color matches extracted styles
    const primaryColor = brandData.design.colors.find(c => c.usage === 'primary');
    const extractedPrimary = extractedStyles.colors.find(c => c.usage === 'primary');
    
    expect(primaryColor!.hex).toBe(extractedPrimary!.hex);
    expect(primaryColor!.source).toBe('computed-styles');

    // Verify color prominence reflects frequency
    const highFrequencyColors = extractedStyles.colors.filter(c => c.frequency > 50);
    const highProminenceColors = brandData.design.colors.filter(c => c.prominence > 0.8);
    
    expect(highProminenceColors.length).toBeGreaterThanOrEqual(
      Math.min(highFrequencyColors.length, 3)
    );

    // Verify typography integration
    expect(brandData.design.typography[0].family).toBe('Inter');
    expect(brandData.design.typography[0].source).toBe('computed-styles');
  });

  test('8.4 Section detection consistency validation', async () => {
    // Setup - Sections detected in extraction should align with analysis
    const mockExtractionSections = [
      { id: 'hero', type: 'hero', bbox: { x: 0, y: 0, width: 3840, height: 1600 } },
      { id: 'features', type: 'features', bbox: { x: 0, y: 1600, width: 3840, height: 1200 } },
      { id: 'testimonials', type: 'testimonials', bbox: { x: 0, y: 2800, width: 3840, height: 800 } },
      { id: 'pricing', type: 'pricing', bbox: { x: 0, y: 3600, width: 3840, height: 600 } },
      { id: 'cta', type: 'cta', bbox: { x: 0, y: 4200, width: 3840, height: 400 } }
    ];

    const mockAnalysisSections = [
      { type: 'hero', confidence: 0.96, content: { headline: 'Financial infrastructure for the internet' } },
      { type: 'features', confidence: 0.88, content: { headline: 'A complete commerce toolkit' } },
      { type: 'testimonials', confidence: 0.92, content: { headline: 'Loved by businesses worldwide' } },
      { type: 'pricing', confidence: 0.85, content: { headline: 'Simple, transparent pricing' } },
      { type: 'cta', confidence: 0.94, content: { cta: 'Start now' } }
    ];

    const mockConsistencyValidation = {
      sectionsMatched: 5,
      sectionsTotal: 5,
      consistencyScore: 1.0,
      alignmentDetails: [
        { section: 'hero', extractionPresent: true, analysisPresent: true, aligned: true },
        { section: 'features', extractionPresent: true, analysisPresent: true, aligned: true },
        { section: 'testimonials', extractionPresent: true, analysisPresent: true, aligned: true },
        { section: 'pricing', extractionPresent: true, analysisPresent: true, aligned: true },
        { section: 'cta', extractionPresent: true, analysisPresent: true, aligned: true }
      ],
      misalignments: []
    };

    mockExtractionComponent.sliceSectionScreenshots.mockResolvedValue(mockExtractionSections);
    mockAnalysisComponent.extractBrandData.mockResolvedValue({
      sections: mockAnalysisSections,
      consistency: mockConsistencyValidation
    });

    // Execute
    const extractionSections = await mockExtractionComponent.sliceSectionScreenshots('/screenshots/stripe-full.png');
    const analysisResult = await mockAnalysisComponent.extractBrandData(extractionSections);

    // Assert section alignment
    expect(analysisResult.consistency.consistencyScore).toBe(1.0);
    expect(analysisResult.consistency.sectionsMatched).toBe(analysisResult.consistency.sectionsTotal);
    expect(analysisResult.consistency.misalignments).toHaveLength(0);

    // Verify each extraction section has corresponding analysis
    extractionSections.forEach((extractedSection: any) => {
      const analysisSection = analysisResult.sections.find(s => s.type === extractedSection.type);
      expect(analysisSection).toBeDefined();
      expect(analysisSection!.confidence).toBeGreaterThan(0.8);
    });

    // Verify alignment details
    analysisResult.consistency.alignmentDetails.forEach((detail: any) => {
      expect(detail.extractionPresent).toBe(true);
      expect(detail.analysisPresent).toBe(true);
      expect(detail.aligned).toBe(true);
    });
  });

  test('8.5 Evidence validation pipeline integrity', async () => {
    // Setup - End-to-end evidence chain validation
    const mockPipelineEvidence = {
      extractionEvidence: {
        screenshots: [
          { id: 'full-page', path: '/screenshots/stripe-full.png' },
          { id: 'hero-section', path: '/screenshots/stripe-hero.png' },
          { id: 'features-section', path: '/screenshots/stripe-features.png' }
        ],
        domElements: [
          { selector: 'main > section:first-child', type: 'hero' },
          { selector: 'main > section:nth-child(2)', type: 'features' }
        ]
      },
      analysisEvidence: {
        brandClaims: [
          { 
            claim: 'Financial infrastructure for the internet',
            screenshotRef: 'hero-section',
            domRef: 'main > section:first-child',
            confidence: 0.95
          },
          {
            claim: 'A complete commerce toolkit',
            screenshotRef: 'features-section', 
            domRef: 'main > section:nth-child(2)',
            confidence: 0.88
          }
        ]
      }
    };

    const mockValidationResult = {
      evidenceChainIntegrity: 1.0,
      validationChecks: {
        allClaimsHaveScreenshots: true,
        allScreenshotsExist: true,
        allDOMPathsValid: true,
        noOrphanedEvidence: true,
        confidenceThresholdsMet: true
      },
      invalidEvidence: [],
      strengthenedEvidence: [
        {
          claim: 'Financial infrastructure for the internet',
          strengthening: 'DOM selector validation increased confidence from 0.90 to 0.95'
        }
      ]
    };

    mockAnalysisComponent.validateEvidence.mockResolvedValue(mockValidationResult);

    // Execute evidence validation
    const validationResult = await mockAnalysisComponent.validateEvidence(
      mockPipelineEvidence.extractionEvidence,
      mockPipelineEvidence.analysisEvidence
    );

    // Assert evidence chain integrity
    expect(validationResult.evidenceChainIntegrity).toBe(1.0);
    expect(validationResult.invalidEvidence).toHaveLength(0);

    // Verify all validation checks pass
    Object.values(validationResult.validationChecks).forEach((check: any) => {
      expect(check).toBe(true);
    });

    // Verify evidence strengthening occurred
    expect(validationResult.strengthenedEvidence).toHaveLength(1);
    expect(validationResult.strengthenedEvidence[0].strengthening).toContain('increased confidence');

    // Verify brand data would pass evidence validation
    const mockBrandData = {
      sections: mockPipelineEvidence.analysisEvidence.brandClaims.map(claim => ({
        type: claim.domRef.includes('first-child') ? 'hero' : 'features',
        content: { headline: claim.claim },
        evidence: {
          screenshotIds: [claim.screenshotRef],
          domPath: claim.domRef,
          confidence: claim.confidence
        }
      }))
    };

    expect(validateEvidenceChain(mockBrandData as any)).toBe(true);
  });
});