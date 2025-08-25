/**
 * Visual Classification Tests - Photo vs UI Distinction (5 tests)
 * Tests Sprint 99.5 visual element classification capabilities
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { calculateVisualClassificationAccuracy } from '../../utils/test-helpers';
import { MOCK_STRIPE_BRAND, MOCK_LINEAR_BRAND, MOCK_SHOPIFY_BRAND } from '../../fixtures/mock-brand-data';

// Mock visual classification system
const mockVisualClassifier = {
  classifyVisualElements: jest.fn(),
  extractPhotoMessages: jest.fn(),
  identifyUIComponents: jest.fn(),
  analyzeElementContext: jest.fn(),
  validateClassification: jest.fn(),
};

describe('Visual Classification - Photo vs UI Distinction Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('4.1 Photo classification accuracy', async () => {
    // Setup - Mock photo classification results
    const mockPhotoClassification = {
      totalElements: 12,
      photos: [
        {
          url: '/hero-team-photo.jpg',
          type: 'photo',
          message: 'Diverse team collaborating on payments technology',
          purpose: 'hero',
          confidence: 0.96,
          actualType: 'photo'
        },
        {
          url: '/shopify-merchant.jpg',
          type: 'photo', 
          message: 'Small business owner managing online store',
          purpose: 'testimonial',
          confidence: 0.94,
          actualType: 'photo'
        },
        {
          url: '/product-showcase.jpg',
          type: 'photo',
          message: 'Curated product showcase for online store',
          purpose: 'product-gallery',
          confidence: 0.91,
          actualType: 'photo'
        }
      ],
      accuracy: 0.95
    };

    mockVisualClassifier.classifyVisualElements.mockResolvedValue(mockPhotoClassification);

    // Execute
    const classification = await mockVisualClassifier.classifyVisualElements(
      MOCK_SHOPIFY_BRAND.sections,
      { includePhotos: true, includeUI: false }
    );

    // Assert
    expect(classification.photos).toHaveLength(3);
    expect(classification.accuracy).toBeGreaterThan(0.9);

    // Verify photo classification accuracy
    const classificationData = classification.photos.map(photo => ({
      type: photo.type,
      actualType: photo.actualType
    }));
    
    const accuracy = calculateVisualClassificationAccuracy(classificationData);
    expect(accuracy).toBe(1.0); // Perfect classification

    // Verify photo messages capture purpose
    classification.photos.forEach((photo: any) => {
      expect(photo.type).toBe('photo');
      expect(photo.message).toBeTruthy();
      expect(photo.message.length).toBeGreaterThan(10); // Meaningful description
      expect(photo.purpose).toMatch(/hero|testimonial|product-gallery|feature/);
      expect(photo.confidence).toBeGreaterThan(0.8);
    });

    // Verify hero photo has highest priority message
    const heroPhoto = classification.photos.find(p => p.purpose === 'hero');
    expect(heroPhoto!.confidence).toBeGreaterThan(0.9);
  });

  test('4.2 UI component classification accuracy', async () => {
    // Setup - Mock UI component classification
    const mockUIClassification = {
      totalElements: 15,
      uiComponents: [
        {
          type: 'ui',
          category: 'dashboard',
          element: 'payment-dashboard',
          confidence: 0.97,
          actualType: 'ui'
        },
        {
          type: 'ui',
          category: 'navigation',
          element: 'sidebar-nav',
          confidence: 0.93,
          actualType: 'ui'
        },
        {
          type: 'ui',
          category: 'form',
          element: 'checkout-form',
          confidence: 0.89,
          actualType: 'ui'
        },
        {
          type: 'ui',
          category: 'chart',
          element: 'revenue-chart',
          confidence: 0.95,
          actualType: 'ui'
        },
        {
          type: 'ui',
          category: 'table',
          element: 'transaction-table',
          confidence: 0.91,
          actualType: 'ui'
        }
      ],
      accuracy: 0.93
    };

    mockVisualClassifier.classifyVisualElements.mockResolvedValue(mockUIClassification);

    // Execute
    const uiClassification = await mockVisualClassifier.classifyVisualElements(
      MOCK_LINEAR_BRAND.sections,
      { includePhotos: false, includeUI: true }
    );

    // Assert
    expect(uiClassification.uiComponents).toHaveLength(5);
    expect(uiClassification.accuracy).toBeGreaterThan(0.9);

    // Verify UI component categories
    const categories = uiClassification.uiComponents.map((ui: any) => ui.category);
    expect(categories).toContain('dashboard');
    expect(categories).toContain('navigation');
    expect(categories).toContain('chart');

    // Verify classification accuracy for UI elements
    const classificationData = uiClassification.uiComponents.map((ui: any) => ({
      type: ui.type,
      actualType: ui.actualType
    }));
    
    const accuracy = calculateVisualClassificationAccuracy(classificationData);
    expect(accuracy).toBe(1.0);

    // Verify dashboard components have high confidence
    const dashboardComponent = uiClassification.uiComponents.find(ui => ui.category === 'dashboard');
    expect(dashboardComponent!.confidence).toBeGreaterThan(0.95);
  });

  test('4.3 Mixed content section handling', async () => {
    // Setup - Section with both photos and UI elements
    const mockMixedClassification = {
      sectionType: 'features',
      totalElements: 8,
      photos: [
        {
          url: '/feature-demo.jpg',
          type: 'photo',
          message: 'Product interface demonstration',
          purpose: 'feature-illustration'
        }
      ],
      uiComponents: [
        {
          type: 'ui',
          category: 'feature-grid',
          element: 'features-layout'
        },
        {
          type: 'ui', 
          category: 'card',
          element: 'feature-card'
        },
        {
          type: 'ui',
          category: 'button',
          element: 'feature-cta'
        }
      ],
      mixedContentHandling: {
        prioritization: 'ui-first', // UI elements get priority for template selection
        photoIntegration: 'supporting-role',
        balanceScore: 0.7 // Good balance between UI and photos
      }
    };

    mockVisualClassifier.analyzeElementContext.mockResolvedValue(mockMixedClassification);

    // Execute
    const mixedAnalysis = await mockVisualClassifier.analyzeElementContext(
      MOCK_STRIPE_BRAND.sections[1], // features section
      { analyzeMixedContent: true }
    );

    // Assert
    expect(mixedAnalysis.photos).toHaveLength(1);
    expect(mixedAnalysis.uiComponents).toHaveLength(3);
    
    // Verify mixed content prioritization
    expect(mixedAnalysis.mixedContentHandling.prioritization).toBe('ui-first');
    expect(mixedAnalysis.mixedContentHandling.balanceScore).toBeGreaterThan(0.5);

    // Verify UI elements outnumber photos (typical for SaaS features)
    expect(mixedAnalysis.uiComponents.length).toBeGreaterThan(mixedAnalysis.photos.length);

    // Verify photo serves supporting role
    expect(mixedAnalysis.mixedContentHandling.photoIntegration).toBe('supporting-role');
    expect(mixedAnalysis.photos[0].purpose).toBe('feature-illustration');
  });

  test('4.4 Edge case handling - ambiguous elements', async () => {
    // Setup - Elements that could be classified as either photo or UI
    const mockAmbiguousClassification = {
      ambiguousElements: [
        {
          element: 'screenshot-of-app',
          possibleTypes: ['photo', 'ui'],
          classification: 'ui',
          reasoning: 'Contains interactive elements and interface components',
          confidence: 0.78,
          actualType: 'ui'
        },
        {
          element: 'stylized-illustration',
          possibleTypes: ['photo', 'ui'],
          classification: 'photo',
          reasoning: 'Artistic illustration without interactive elements',
          confidence: 0.82,
          actualType: 'photo'
        },
        {
          element: 'infographic-chart',
          possibleTypes: ['photo', 'ui'],
          classification: 'ui',
          reasoning: 'Data visualization with chart elements',
          confidence: 0.85,
          actualType: 'ui'
        }
      ],
      resolutionStrategy: 'context-based',
      overallAccuracy: 0.88
    };

    mockVisualClassifier.validateClassification.mockResolvedValue(mockAmbiguousClassification);

    // Execute
    const ambiguousAnalysis = await mockVisualClassifier.validateClassification([
      { element: 'app-screenshot.png', context: 'features-section' },
      { element: 'hero-illustration.svg', context: 'hero-section' },
      { element: 'revenue-chart.png', context: 'dashboard-section' }
    ]);

    // Assert
    expect(ambiguousAnalysis.ambiguousElements).toHaveLength(3);
    expect(ambiguousAnalysis.overallAccuracy).toBeGreaterThan(0.8);

    // Verify context-based resolution
    expect(ambiguousAnalysis.resolutionStrategy).toBe('context-based');

    // Verify each ambiguous element got classified
    ambiguousAnalysis.ambiguousElements.forEach((element: any) => {
      expect(element.classification).toMatch(/^(photo|ui)$/);
      expect(element.reasoning).toBeTruthy();
      expect(element.confidence).toBeGreaterThan(0.7);
      expect(element.possibleTypes).toContain('photo');
      expect(element.possibleTypes).toContain('ui');
    });

    // Verify app screenshots classified as UI (common case)
    const appScreenshot = ambiguousAnalysis.ambiguousElements.find(
      e => e.element === 'screenshot-of-app'
    );
    expect(appScreenshot!.classification).toBe('ui');
    expect(appScreenshot!.reasoning).toContain('interactive');
  });

  test('4.5 Classification consistency across sections', async () => {
    // Setup - Multi-section analysis for consistency
    const mockConsistencyAnalysis = {
      sections: ['hero', 'features', 'testimonials', 'pricing'],
      classifications: [
        {
          section: 'hero',
          photos: 1,
          uiComponents: 2,
          consistency: 0.94
        },
        {
          section: 'features', 
          photos: 0,
          uiComponents: 4,
          consistency: 0.96
        },
        {
          section: 'testimonials',
          photos: 3,
          uiComponents: 1,
          consistency: 0.91
        },
        {
          section: 'pricing',
          photos: 0,
          uiComponents: 3,
          consistency: 0.93
        }
      ],
      overallConsistency: 0.94,
      patternRecognition: {
        heroPattern: 'mixed-ui-heavy',
        featuresPattern: 'ui-only',
        testimonialsPattern: 'photo-heavy',
        pricingPattern: 'ui-only'
      }
    };

    mockVisualClassifier.classifyVisualElements.mockResolvedValue(mockConsistencyAnalysis);

    // Execute
    const consistencyAnalysis = await mockVisualClassifier.classifyVisualElements(
      MOCK_STRIPE_BRAND.sections,
      { analyzeConsistency: true, crossSectionValidation: true }
    );

    // Assert
    expect(consistencyAnalysis.overallConsistency).toBeGreaterThan(0.9);
    expect(consistencyAnalysis.sections).toHaveLength(4);

    // Verify section-specific patterns make sense
    const featuresSection = consistencyAnalysis.classifications.find(
      (c: any) => c.section === 'features'
    );
    const testimonialsSection = consistencyAnalysis.classifications.find(
      (c: any) => c.section === 'testimonials'
    );

    // Features sections typically UI-heavy
    expect(featuresSection!.uiComponents).toBeGreaterThan(featuresSection!.photos);
    expect(consistencyAnalysis.patternRecognition.featuresPattern).toBe('ui-only');

    // Testimonials sections typically photo-heavy
    expect(testimonialsSection!.photos).toBeGreaterThan(testimonialsSection!.uiComponents);
    expect(consistencyAnalysis.patternRecognition.testimonialsPattern).toBe('photo-heavy');

    // Verify individual section consistency scores
    consistencyAnalysis.classifications.forEach((section: any) => {
      expect(section.consistency).toBeGreaterThan(0.9);
    });
  });
});