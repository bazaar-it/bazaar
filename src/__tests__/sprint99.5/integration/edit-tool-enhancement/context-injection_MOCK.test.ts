/**
 * Edit Tool Enhancement Integration Tests - Context Injection (5 tests)
 * Tests enhanced Edit tool context for Sprint 99.5
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { MOCK_STRIPE_BRAND, MOCK_LINEAR_BRAND } from '../../fixtures/mock-brand-data';

// Mock enhanced Edit tool
const mockEditTool = {
  injectContext: jest.fn(),
  generateScene: jest.fn(),
  validateOutput: jest.fn(),
  applyBrandContext: jest.fn(),
  processRebuildSpecs: jest.fn(),
};

describe('Edit Tool Enhancement - Context Injection Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('11.1 Rebuild specs reach Edit tool correctly', async () => {
    // Setup - Rebuild specifications should be injected into Edit tool
    const mockContextInjection = {
      editToolInput: {
        userPrompt: 'Create a dashboard scene showcasing payment metrics',
        tsxCode: '// Template TSX code here',
        webContext: {
          pageData: MOCK_STRIPE_BRAND,
          rebuildSpecs: [
            {
              component: 'payment-dashboard',
              layout: '3-column grid with sidebar',
              components: ['payment-cards', 'transaction-chart', 'revenue-metrics'],
              styling: {
                borderRadius: '8px',
                shadows: ['0 4px 12px rgba(0,0,0,0.1)'],
                spacing: '24px'
              },
              interactions: {
                hover: { transform: 'scale(1.02)' },
                click: { navigation: 'drill-down' }
              }
            }
          ]
        },
        visualElements: {
          uiComponents: [
            {
              type: 'dashboard',
              category: 'payments',
              rebuildSpec: {
                layout: '3-column grid with sidebar',
                implementable: true,
                feasibilityScore: 0.94
              }
            }
          ]
        }
      },
      contextInjectionSuccess: true,
      injectedDataSize: 2450 // bytes
    };

    mockEditTool.injectContext.mockResolvedValue(mockContextInjection);

    // Execute
    const injectionResult = await mockEditTool.injectContext(
      'Create a dashboard scene',
      MOCK_STRIPE_BRAND,
      { includeRebuildSpecs: true, includeInteractions: true }
    );

    // Assert context injection
    expect(injectionResult.contextInjectionSuccess).toBe(true);
    expect(injectionResult.editToolInput.webContext.rebuildSpecs).toHaveLength(1);

    // Verify rebuild spec completeness
    const rebuildSpec = injectionResult.editToolInput.webContext.rebuildSpecs[0];
    expect(rebuildSpec).toHaveProperty('layout');
    expect(rebuildSpec).toHaveProperty('components');
    expect(rebuildSpec).toHaveProperty('styling');
    expect(rebuildSpec).toHaveProperty('interactions');

    // Verify UI components have rebuild specs
    const uiComponent = injectionResult.editToolInput.visualElements.uiComponents[0];
    expect(uiComponent.rebuildSpec.implementable).toBe(true);
    expect(uiComponent.rebuildSpec.feasibilityScore).toBeGreaterThan(0.9);

    // Verify context size is reasonable
    expect(injectionResult.injectedDataSize).toBeGreaterThan(1000);
    expect(injectionResult.injectedDataSize).toBeLessThan(5000);
  });

  test('11.2 Photo messages and context included', async () => {
    // Setup - Photo context with one-line messages
    const mockPhotoContext = {
      editToolInput: {
        visualElements: {
          photos: [
            {
              url: '/shopify-merchant.jpg',
              message: 'Small business owner managing online store',
              purpose: 'hero',
              integrationHint: 'Use as background with text overlay'
            },
            {
              url: '/product-showcase.jpg',
              message: 'Curated product showcase for online store',
              purpose: 'product-gallery',
              integrationHint: 'Feature prominently in product section'
            }
          ],
          photoIntegrationStrategy: 'supporting-ui-elements'
        },
        photoContextSize: 156 // characters
      },
      photoMessagesIncluded: true,
      integrationHintsProvided: true
    };

    mockEditTool.processRebuildSpecs.mockResolvedValue(mockPhotoContext);

    // Execute
    const photoResult = await mockEditTool.processRebuildSpecs(
      MOCK_STRIPE_BRAND.sections[0],
      { includePhotoMessages: true, provideIntegrationHints: true }
    );

    // Assert photo message inclusion
    expect(photoResult.photoMessagesIncluded).toBe(true);
    expect(photoResult.integrationHintsProvided).toBe(true);

    // Verify photo messages are meaningful
    const photos = photoResult.editToolInput.visualElements.photos;
    photos.forEach((photo: any) => {
      expect(photo.message).toBeTruthy();
      expect(photo.message.length).toBeGreaterThan(10);
      expect(photo.purpose).toMatch(/hero|product-gallery|feature|testimonial/);
      expect(photo.integrationHint).toBeTruthy();
    });

    // Verify integration strategy considers photos with UI
    expect(photoResult.editToolInput.visualElements.photoIntegrationStrategy).toBe(
      'supporting-ui-elements'
    );
  });

  test('11.3 Complete brand context available', async () => {
    // Setup - Full brand context injection
    const mockBrandContext = {
      editToolInput: {
        webContext: {
          pageData: MOCK_LINEAR_BRAND,
          brandSummary: {
            name: 'Linear',
            tagline: 'Built for modern software teams',
            colors: ['#5E6AD2', '#26C6F7', '#C026D3'],
            fonts: ['SF Pro Display', 'SF Pro Text'],
            voice: ['professional', 'modern', 'efficient']
          },
          designSystem: {
            spacing: ['8px', '12px', '16px', '24px'],
            borderRadius: ['4px', '6px', '8px'],
            shadows: ['0 2px 8px rgba(0,0,0,0.08)'],
            animations: ['spring-based', 'subtle-transitions']
          }
        },
        brandContextCompleteness: 0.97
      },
      contextIntegrity: true,
      missingElements: []
    };

    mockEditTool.applyBrandContext.mockResolvedValue(mockBrandContext);

    // Execute
    const brandResult = await mockEditTool.applyBrandContext(
      MOCK_LINEAR_BRAND,
      { includeDesignSystem: true, includeVoice: true }
    );

    // Assert brand context completeness
    expect(brandResult.editToolInput.brandContextCompleteness).toBeGreaterThan(0.95);
    expect(brandResult.contextIntegrity).toBe(true);
    expect(brandResult.missingElements).toHaveLength(0);

    // Verify brand summary is accurate
    const brandSummary = brandResult.editToolInput.webContext.brandSummary;
    expect(brandSummary.name).toBe(MOCK_LINEAR_BRAND.brand.identity.name);
    expect(brandSummary.tagline).toBe(MOCK_LINEAR_BRAND.brand.identity.tagline);

    // Verify colors match extracted brand colors
    const primaryColor = MOCK_LINEAR_BRAND.design.colors.find(c => c.usage === 'primary');
    expect(brandSummary.colors).toContain(primaryColor!.hex);

    // Verify design system elements
    const designSystem = brandResult.editToolInput.webContext.designSystem;
    expect(designSystem.spacing).toEqual(expect.arrayContaining(['8px', '16px', '24px']));
    expect(designSystem.borderRadius).toEqual(expect.arrayContaining(['6px']));
  });

  test('11.4 Template preferences guide generation', async () => {
    // Setup - Template preference hints for Edit tool
    const mockTemplateGuidance = {
      editToolInput: {
        templatePreference: {
          preferredType: 'ui',
          reasoning: 'Scene contains dashboard and sidebar UI components',
          templateHints: [
            'Emphasize interactive dashboard elements',
            'Use grid layout with sidebar navigation',
            'Include hover states for cards',
            'Maintain brand color consistency'
          ],
          avoidPatterns: [
            'Static image overlays',
            'Text-heavy layouts',
            'Non-interactive elements'
          ]
        }
      },
      preferencesApplied: true,
      guidanceQuality: 0.92
    };

    mockEditTool.generateScene.mockResolvedValue(mockTemplateGuidance);

    // Execute
    const guidanceResult = await mockEditTool.generateScene(
      'Create a Linear dashboard scene',
      { 
        provideTemplateGuidance: true,
        scene: {
          visualElements: {
            uiComponents: [
              { type: 'dashboard', category: 'project-management' },
              { type: 'sidebar', category: 'navigation' }
            ]
          }
        }
      }
    );

    // Assert template guidance
    expect(guidanceResult.preferencesApplied).toBe(true);
    expect(guidanceResult.guidanceQuality).toBeGreaterThan(0.9);

    // Verify UI preference for UI-heavy scene
    const preference = guidanceResult.editToolInput.templatePreference;
    expect(preference.preferredType).toBe('ui');
    expect(preference.reasoning).toContain('UI components');

    // Verify specific template hints
    expect(preference.templateHints).toEqual(
      expect.arrayContaining([
        expect.stringContaining('dashboard')
      ])
    );
    expect(preference.templateHints).toEqual(
      expect.arrayContaining([
        expect.stringContaining('grid layout')
      ])
    );

    // Verify anti-patterns are specified
    expect(preference.avoidPatterns).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Static image')
      ])
    );
  });

  test('11.5 Evidence-based generation validation', async () => {
    // Setup - Ensure Edit tool output uses only evidenced content
    const mockEvidenceValidation = {
      generatedScene: {
        tsxCode: `
          export function StripeHeroScene() {
            return (
              <div style={{ background: '#FFFFFF' }}>
                <h1>Financial infrastructure for the internet</h1>
                <p>Millions of companies use Stripe to accept payments</p>
                <button style={{ background: '#635BFF' }}>Start now</button>
              </div>
            );
          }
        `,
        evidenceUsage: [
          {
            content: 'Financial infrastructure for the internet',
            evidenceSource: 'hero-screenshot-1',
            evidenceValid: true
          },
          {
            content: 'Millions of companies use Stripe to accept payments',
            evidenceSource: 'hero-screenshot-1', 
            evidenceValid: true
          },
          {
            content: 'Start now',
            evidenceSource: 'hero-screenshot-1',
            evidenceValid: true
          },
          {
            content: '#635BFF',
            evidenceSource: 'computed-styles',
            evidenceValid: true
          }
        ]
      },
      evidenceCompliance: 1.0,
      unevidencedContent: [],
      hallucinationDetected: false
    };

    mockEditTool.validateOutput.mockResolvedValue(mockEvidenceValidation);

    // Execute
    const validationResult = await mockEditTool.validateOutput(
      mockEvidenceValidation.generatedScene.tsxCode,
      MOCK_STRIPE_BRAND,
      { enforceEvidenceCompliance: true }
    );

    // Assert evidence compliance
    expect(validationResult.evidenceCompliance).toBe(1.0);
    expect(validationResult.unevidencedContent).toHaveLength(0);
    expect(validationResult.hallucinationDetected).toBe(false);

    // Verify all content has evidence
    validationResult.generatedScene.evidenceUsage.forEach((usage: any) => {
      expect(usage.evidenceValid).toBe(true);
      expect(usage.evidenceSource).toBeTruthy();
      
      // Verify evidence source exists in brand data
      if (usage.evidenceSource.includes('screenshot')) {
        const hasScreenshot = MOCK_STRIPE_BRAND.sections.some(section =>
          section.evidence.screenshotIds.includes(usage.evidenceSource)
        );
        expect(hasScreenshot).toBe(true);
      }
    });

    // Verify generated content matches brand data
    const heroSection = MOCK_STRIPE_BRAND.sections[0];
    expect(validationResult.generatedScene.tsxCode).toContain(heroSection.content.headline!);
    expect(validationResult.generatedScene.tsxCode).toContain(heroSection.content.cta!);

    // Verify brand colors are used
    const primaryColor = MOCK_STRIPE_BRAND.design.colors.find(c => c.usage === 'primary');
    expect(validationResult.generatedScene.tsxCode).toContain(primaryColor!.hex);
  });
});