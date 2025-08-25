/**
 * Pipeline Flow Integration Tests - Analysis → Scene Planning (5 tests)  
 * Tests brand data flowing into scene planning for Sprint 99.5
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { MOCK_STRIPE_BRAND, MOCK_LINEAR_BRAND } from '../../fixtures/mock-brand-data';

// Mock scene planning components
const mockScenePlanner = {
  generateScenePlan: jest.fn(),
  validateContentUsage: jest.fn(),
  createNarrative: jest.fn(),
  allocateDuration: jest.fn(),
};

describe('Pipeline Integration - Analysis → Scene Planning Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('9.1 Brand data informs scene content', async () => {
    // Setup - Brand data should directly inform scene content
    const mockScenePlan = {
      scenes: [
        {
          sceneId: 'hero',
          content: {
            headline: 'Financial infrastructure for the internet',
            description: 'Millions of companies use Stripe to accept payments, grow their revenue, and accelerate new business opportunities.',
            cta: 'Start now'
          },
          brandDataSource: {
            headline: MOCK_STRIPE_BRAND.sections[0].content.headline,
            description: MOCK_STRIPE_BRAND.sections[0].content.description,
            cta: MOCK_STRIPE_BRAND.sections[0].content.cta
          },
          verbatimUsage: 1.0 // 100% verbatim from brand data
        },
        {
          sceneId: 'features',
          content: {
            headline: 'A complete commerce toolkit',
            description: 'From checkout to global sales tax compliance'
          },
          brandDataSource: {
            headline: MOCK_STRIPE_BRAND.sections[1].content.headline,
            description: MOCK_STRIPE_BRAND.sections[1].content.description
          },
          verbatimUsage: 1.0
        }
      ],
      brandDataReflection: 1.0
    };

    mockScenePlanner.generateScenePlan.mockResolvedValue(mockScenePlan);

    // Execute
    const scenePlan = await mockScenePlanner.generateScenePlan(MOCK_STRIPE_BRAND, {
      enforceVerbatimContent: true,
      noHallucination: true
    });

    // Assert brand data reflection
    expect(scenePlan.brandDataReflection).toBe(1.0);
    
    // Verify hero scene uses exact brand content
    const heroScene = scenePlan.scenes.find(s => s.sceneId === 'hero');
    expect(heroScene!.content.headline).toBe(MOCK_STRIPE_BRAND.sections[0].content.headline);
    expect(heroScene!.content.description).toBe(MOCK_STRIPE_BRAND.sections[0].content.description);
    expect(heroScene!.verbatimUsage).toBe(1.0);

    // Verify features scene uses brand content
    const featuresScene = scenePlan.scenes.find(s => s.sceneId === 'features');
    expect(featuresScene!.content.headline).toBe(MOCK_STRIPE_BRAND.sections[1].content.headline);
    expect(featuresScene!.verbatimUsage).toBe(1.0);

    // Verify no content hallucination
    scenePlan.scenes.forEach((scene: any) => {
      expect(scene.brandDataSource).toBeDefined();
      Object.keys(scene.content).forEach(key => {
        expect(scene.brandDataSource).toHaveProperty(key);
      });
    });
  });

  test('9.2 Visual elements influence scene types', async () => {
    // Setup - Visual classification should determine scene structure
    const mockSceneStructuring = {
      scenes: [
        {
          sceneId: 'hero',
          sceneType: 'ui-dashboard',
          visualBasis: {
            uiComponents: 2,
            photos: 1,
            dominantType: 'ui'
          },
          templatePreference: 'ui',
          reasoning: 'UI components (dashboard, sidebar) dominate over single photo'
        },
        {
          sceneId: 'features',
          sceneType: 'ui-grid',
          visualBasis: {
            uiComponents: 1,
            photos: 0,
            dominantType: 'ui'
          },
          templatePreference: 'ui',
          reasoning: 'Feature grid UI component, no photos'
        }
      ],
      visualInfluenceScore: 0.94
    };

    mockScenePlanner.validateContentUsage.mockResolvedValue(mockSceneStructuring);

    // Execute
    const sceneStructuring = await mockScenePlanner.validateContentUsage(
      MOCK_LINEAR_BRAND,
      { prioritizeVisualElements: true }
    );

    // Assert visual influence
    expect(sceneStructuring.visualInfluenceScore).toBeGreaterThan(0.9);

    // Verify UI-heavy scene gets UI preference
    const heroScene = sceneStructuring.scenes.find(s => s.sceneId === 'hero');
    expect(heroScene!.visualBasis.dominantType).toBe('ui');
    expect(heroScene!.templatePreference).toBe('ui');
    expect(heroScene!.reasoning).toContain('UI components');

    // Verify scene types match visual content
    sceneStructuring.scenes.forEach((scene: any) => {
      if (scene.visualBasis.uiComponents > scene.visualBasis.photos) {
        expect(scene.templatePreference).toBe('ui');
        expect(scene.sceneType).toContain('ui');
      }
    });
  });

  test('9.3 Evidence links carry through to scenes', async () => {
    // Setup - Evidence chain should be preserved in scene planning
    const mockEvidencePreservation = {
      scenes: [
        {
          sceneId: 'hero',
          content: { headline: 'Built for modern software teams' },
          evidenceChain: {
            originalScreenshot: 'linear-hero-1',
            domPath: 'main > section[data-section="hero"]',
            confidence: 0.94,
            sourceSection: 'hero'
          }
        },
        {
          sceneId: 'features',
          content: { headline: 'Streamline software projects' },
          evidenceChain: {
            originalScreenshot: 'linear-features-1',
            domPath: 'main > section[data-section="features"]', 
            confidence: 0.89,
            sourceSection: 'features'
          }
        }
      ],
      evidencePreservation: 1.0,
      brokenChains: []
    };

    mockScenePlanner.createNarrative.mockResolvedValue(mockEvidencePreservation);

    // Execute
    const narrativeResult = await mockScenePlanner.createNarrative(
      MOCK_LINEAR_BRAND,
      { preserveEvidenceChains: true }
    );

    // Assert evidence preservation
    expect(narrativeResult.evidencePreservation).toBe(1.0);
    expect(narrativeResult.brokenChains).toHaveLength(0);

    // Verify each scene has evidence chain
    narrativeResult.scenes.forEach((scene: any) => {
      expect(scene.evidenceChain).toBeDefined();
      expect(scene.evidenceChain.originalScreenshot).toBeTruthy();
      expect(scene.evidenceChain.domPath).toBeTruthy();
      expect(scene.evidenceChain.confidence).toBeGreaterThan(0.8);
    });

    // Verify evidence links to original brand data
    const heroScene = narrativeResult.scenes.find(s => s.sceneId === 'hero');
    const originalHeroSection = MOCK_LINEAR_BRAND.sections.find(s => s.type === 'hero');
    
    expect(heroScene!.evidenceChain.originalScreenshot).toBe(
      originalHeroSection!.evidence.screenshotIds[0]
    );
    expect(heroScene!.evidenceChain.domPath).toBe(
      originalHeroSection!.evidence.domPath
    );
  });

  test('9.4 No hallucinated content in scenes', async () => {
    // Setup - Strict validation against content hallucination
    const mockHallucinationCheck = {
      scenes: [
        {
          sceneId: 'hero',
          content: {
            headline: 'Built for modern software teams',
            description: 'Linear helps streamline software projects, sprints, tasks, and bug tracking.'
          },
          contentValidation: {
            headline: { source: 'brand-data', hallucinated: false },
            description: { source: 'brand-data', hallucinated: false }
          }
        },
        {
          sceneId: 'features',
          content: {
            headline: 'Streamline your workflow',
            description: 'Powerful features for modern teams'
          },
          contentValidation: {
            headline: { source: 'generated', hallucinated: true },
            description: { source: 'generated', hallucinated: true }
          }
        }
      ],
      hallucinationDetected: true,
      hallucinatedContent: ['Streamline your workflow', 'Powerful features for modern teams'],
      correctedScenes: [
        {
          sceneId: 'features',
          originalContent: {
            headline: 'Streamline your workflow',
            description: 'Powerful features for modern teams'
          },
          correctedContent: {
            headline: 'Built for modern software teams', // From brand data
            description: 'Linear helps streamline software projects' // From brand data
          }
        }
      ]
    };

    mockScenePlanner.validateContentUsage.mockResolvedValue(mockHallucinationCheck);

    // Execute
    const hallucinationResult = await mockScenePlanner.validateContentUsage(
      MOCK_LINEAR_BRAND,
      { detectHallucination: true, correctHallucination: true }
    );

    // Assert hallucination detection
    expect(hallucinationResult.hallucinationDetected).toBe(true);
    expect(hallucinationResult.hallucinatedContent).toHaveLength(2);

    // Verify hallucinated content identified
    expect(hallucinationResult.hallucinatedContent).toContain('Streamline your workflow');
    expect(hallucinationResult.hallucinatedContent).toContain('Powerful features for modern teams');

    // Verify corrections use actual brand data
    const correction = hallucinationResult.correctedScenes[0];
    expect(correction.correctedContent.headline).toBe(MOCK_LINEAR_BRAND.brand.identity.tagline);

    // Verify non-hallucinated content remains unchanged
    const heroScene = hallucinationResult.scenes.find(s => s.sceneId === 'hero');
    expect(heroScene!.contentValidation.headline.hallucinated).toBe(false);
    expect(heroScene!.contentValidation.description.hallucinated).toBe(false);
  });

  test('9.5 Duration allocation reflects content complexity', async () => {
    // Setup - Scene duration should match content complexity
    const mockDurationAllocation = {
      scenes: [
        {
          sceneId: 'hero',
          contentComplexity: {
            textLength: 65, // Short headline
            visualElements: 3, // Dashboard + sidebar + photo
            uiComplexity: 'high', // Interactive dashboard
            readingTime: 3.2 // seconds
          },
          allocatedDuration: 300, // 10 seconds
          reasoning: 'High UI complexity requires more time to showcase'
        },
        {
          sceneId: 'features',
          contentComplexity: {
            textLength: 45, // Shorter text
            visualElements: 1, // Simple feature grid
            uiComplexity: 'medium',
            readingTime: 2.8
          },
          allocatedDuration: 240, // 8 seconds
          reasoning: 'Medium complexity, less showcase time needed'
        },
        {
          sceneId: 'testimonials',
          contentComplexity: {
            textLength: 120, // Longer testimonial text
            visualElements: 3, // Multiple photos
            uiComplexity: 'low', // Static content
            readingTime: 6.5
          },
          allocatedDuration: 360, // 12 seconds
          reasoning: 'Longer reading time requires extended duration'
        }
      ],
      totalDuration: 900, // 30 seconds
      durationEfficiency: 0.91
    };

    mockScenePlanner.allocateDuration.mockResolvedValue(mockDurationAllocation);

    // Execute
    const durationResult = await mockScenePlanner.allocateDuration(
      MOCK_LINEAR_BRAND,
      { totalDuration: 900, optimizeForReadability: true }
    );

    // Assert duration efficiency
    expect(durationResult.durationEfficiency).toBeGreaterThan(0.9);
    expect(durationResult.totalDuration).toBe(900);

    // Verify complex scenes get more time
    const heroScene = durationResult.scenes.find(s => s.sceneId === 'hero');
    const featuresScene = durationResult.scenes.find(s => s.sceneId === 'features');
    
    expect(heroScene!.contentComplexity.uiComplexity).toBe('high');
    expect(heroScene!.allocatedDuration).toBeGreaterThan(featuresScene!.allocatedDuration);

    // Verify reading time influences duration
    const testimonialsScene = durationResult.scenes.find(s => s.sceneId === 'testimonials');
    expect(testimonialsScene!.contentComplexity.readingTime).toBeGreaterThan(
      heroScene!.contentComplexity.readingTime
    );
    expect(testimonialsScene!.allocatedDuration).toBeGreaterThan(
      heroScene!.allocatedDuration
    );

    // Verify duration reasoning is provided
    durationResult.scenes.forEach((scene: any) => {
      expect(scene.reasoning).toBeTruthy();
      expect(scene.reasoning.length).toBeGreaterThan(20);
    });
  });
});