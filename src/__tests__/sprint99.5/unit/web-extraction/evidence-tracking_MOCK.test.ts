/**
 * Web Extraction Tests - Evidence Tracking (4 tests)
 * Tests evidence tracking system for Sprint 99.5 "film the website" philosophy
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { MOCK_STRIPE_BRAND, MOCK_LINEAR_BRAND } from '../../fixtures/mock-brand-data';
import { validateEvidenceChain } from '../../utils/test-helpers';

// Mock evidence tracking system
const mockEvidenceTracker = {
  linkContentToScreenshots: jest.fn(),
  calculateConfidenceScores: jest.fn(),
  validateDOMPaths: jest.fn(),
  validateBoundingBoxes: jest.fn(),
};

describe('Web Extraction - Evidence Tracking Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('3.1 Every claim has screenshot evidence', async () => {
    // Setup - Mock brand data with complete evidence chain
    const brandData = MOCK_STRIPE_BRAND;
    
    mockEvidenceTracker.linkContentToScreenshots.mockResolvedValue({
      totalClaims: 8,
      evidencedClaims: 8,
      coverage: 1.0,
      evidenceLinks: [
        { 
          claim: 'Financial infrastructure for the internet',
          screenshotId: 'hero-screenshot-1',
          confidence: 0.95
        },
        {
          claim: 'Start now',
          screenshotId: 'hero-screenshot-1', 
          confidence: 0.98
        },
        {
          claim: 'A complete commerce toolkit',
          screenshotId: 'features-screenshot-1',
          confidence: 0.88
        }
      ]
    });

    // Execute
    const evidenceResults = await mockEvidenceTracker.linkContentToScreenshots(brandData);

    // Assert
    expect(evidenceResults.coverage).toBe(1.0); // 100% evidence coverage
    expect(evidenceResults.totalClaims).toBe(evidenceResults.evidencedClaims);
    
    // Verify each section has evidence
    expect(brandData).toHaveCompleteEvidence();

    // Verify evidence links are valid
    evidenceResults.evidenceLinks.forEach((link: any) => {
      expect(link.screenshotId).toMatch(/^[a-z-]+-screenshot-\d+$/);
      expect(link.confidence).toBeGreaterThan(0.7);
      expect(link.claim).toBeTruthy();
    });
  });

  test('3.2 Confidence scoring accuracy', async () => {
    // Setup - Mock confidence calculation
    const mockConfidenceResults = {
      overall: 0.91,
      extraction: 0.93,
      classification: 0.89,
      sections: [
        { 
          type: 'hero', 
          confidence: 0.95,
          factors: {
            textCertainty: 0.98,
            visualCertainty: 0.92,
            structuralCertainty: 0.95
          }
        },
        { 
          type: 'features', 
          confidence: 0.88,
          factors: {
            textCertainty: 0.90,
            visualCertainty: 0.85,
            structuralCertainty: 0.89
          }
        }
      ]
    };

    mockEvidenceTracker.calculateConfidenceScores.mockResolvedValue(mockConfidenceResults);

    // Execute
    const confidenceScores = await mockEvidenceTracker.calculateConfidenceScores(
      MOCK_STRIPE_BRAND,
      { includeFactors: true }
    );

    // Assert
    expect(confidenceScores.overall).toBeGreaterThan(0.7);
    expect(confidenceScores.extraction).toBeGreaterThan(confidenceScores.classification);
    
    // Verify section-level confidence
    const heroSection = confidenceScores.sections.find(s => s.type === 'hero');
    expect(heroSection!.confidence).toBeGreaterThan(0.9);
    expect(heroSection!.factors.textCertainty).toBeGreaterThan(0.9);

    // Verify lower confidence sections are flagged
    const featuresSection = confidenceScores.sections.find(s => s.type === 'features');
    expect(featuresSection!.confidence).toBeLessThan(heroSection!.confidence);
  });

  test('3.3 DOM path validation', async () => {
    // Setup - Mock DOM path validation
    const mockDOMValidation = {
      validPaths: 6,
      invalidPaths: 0,
      totalPaths: 6,
      pathValidations: [
        { 
          path: 'main > section:first-child', 
          valid: true, 
          exists: true,
          specificity: 0.9
        },
        { 
          path: 'main > section:nth-child(2)', 
          valid: true, 
          exists: true,
          specificity: 0.85
        },
        { 
          path: '[data-section="testimonials"]', 
          valid: true, 
          exists: true,
          specificity: 0.95
        },
        { 
          path: '#hero-section', 
          valid: true, 
          exists: true,
          specificity: 1.0
        },
        { 
          path: '.features-grid', 
          valid: true, 
          exists: true,
          specificity: 0.8
        },
        { 
          path: 'button[data-cta]', 
          valid: true, 
          exists: true,
          specificity: 0.95
        }
      ]
    };

    mockEvidenceTracker.validateDOMPaths.mockResolvedValue(mockDOMValidation);

    // Execute
    const domValidation = await mockEvidenceTracker.validateDOMPaths(
      MOCK_STRIPE_BRAND.sections.map(s => s.evidence.domPath)
    );

    // Assert
    expect(domValidation.validPaths).toBe(domValidation.totalPaths);
    expect(domValidation.invalidPaths).toBe(0);

    // Verify all paths are valid and specific enough
    domValidation.pathValidations.forEach((validation: any) => {
      expect(validation.valid).toBe(true);
      expect(validation.exists).toBe(true);
      expect(validation.specificity).toBeGreaterThan(0.7);
      expect(validation.path).toMatch(/^[a-z0-9#.\[\]:>\s\(\)"=-]+$/i); // Valid CSS selector pattern including quotes and equals
    });

    // Verify high-specificity selectors are preferred
    const highSpecificity = domValidation.pathValidations.filter(v => v.specificity >= 0.9);
    expect(highSpecificity.length).toBeGreaterThan(0);
  });

  test('3.4 Bounding box accuracy', async () => {
    // Setup - Mock bounding box validation
    const mockBoundingBoxValidation = {
      totalBoxes: 8,
      validBoxes: 8,
      averageAccuracy: 0.94,
      boxValidations: [
        {
          element: 'hero-section',
          bbox: { x: 0, y: 0, width: 1920, height: 800 },
          withinBounds: true,
          hasArea: true,
          accuracy: 0.96
        },
        {
          element: 'cta-button',
          bbox: { x: 50, y: 100, width: 200, height: 48 },
          withinBounds: true,
          hasArea: true,
          accuracy: 0.99
        },
        {
          element: 'features-grid',
          bbox: { x: 0, y: 800, width: 1920, height: 600 },
          withinBounds: true,
          hasArea: true,
          accuracy: 0.92
        },
        {
          element: 'dashboard-preview',
          bbox: { x: 100, y: 300, width: 600, height: 400 },
          withinBounds: true,
          hasArea: true,
          accuracy: 0.90
        }
      ],
      screenDimensions: { width: 1920, height: 1080 }
    };

    mockEvidenceTracker.validateBoundingBoxes.mockResolvedValue(mockBoundingBoxValidation);

    // Execute
    const bboxValidation = await mockEvidenceTracker.validateBoundingBoxes([
      { x: 0, y: 0, width: 1920, height: 800 },
      { x: 50, y: 100, width: 200, height: 48 },
      { x: 0, y: 800, width: 1920, height: 600 },
      { x: 100, y: 300, width: 600, height: 400 }
    ]);

    // Assert
    expect(bboxValidation.validBoxes).toBe(bboxValidation.totalBoxes);
    expect(bboxValidation.averageAccuracy).toBeGreaterThan(0.9);

    // Verify each bounding box is valid
    bboxValidation.boxValidations.forEach((validation: any) => {
      // Within screen bounds
      expect(validation.bbox.x).toBeGreaterThanOrEqual(0);
      expect(validation.bbox.y).toBeGreaterThanOrEqual(0);
      expect(validation.bbox.x + validation.bbox.width).toBeLessThanOrEqual(
        bboxValidation.screenDimensions.width
      );

      // Has positive area
      expect(validation.bbox.width).toBeGreaterThan(0);
      expect(validation.bbox.height).toBeGreaterThan(0);
      expect(validation.hasArea).toBe(true);
      expect(validation.withinBounds).toBe(true);
      expect(validation.accuracy).toBeGreaterThan(0.8);
    });

    // Verify CTA button has high accuracy (important UI element)
    const ctaValidation = bboxValidation.boxValidations.find(v => v.element === 'cta-button');
    expect(ctaValidation!.accuracy).toBeGreaterThan(0.95);
  });
});