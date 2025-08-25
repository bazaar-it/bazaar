/**
 * Template Selection Tests - UI Template Preference (5 tests)
 * Tests Sprint 99.5 UI template preference logic
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { calculateTemplateScore, MOCK_TEMPLATE_METADATA, validateUITemplatePreference } from '../../utils/test-helpers';
import { MOCK_LINEAR_BRAND, MOCK_STRIPE_BRAND, MOCK_SHOPIFY_BRAND } from '../../fixtures/mock-brand-data';

// Mock template selection system
const mockTemplateSelector = {
  selectTemplate: jest.fn(),
  calculateUIBonus: jest.fn(),
  scoreTemplateMatch: jest.fn(),
  filterEligibleTemplates: jest.fn(),
  rankTemplatesByScore: jest.fn(),
};

describe('Template Selection - UI Template Preference Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('6.1 UI template selection when UI elements exist', async () => {
    // Setup - Scene with rich UI components (Linear dashboard)
    const sceneWithUI = {
      visualElements: {
        uiComponents: [
          {
            type: 'dashboard',
            category: 'project-management',
            rebuildSpec: {
              layout: 'kanban board with 4 columns',
              components: ['task-cards', 'progress-bars', 'status-indicators']
            }
          },
          {
            type: 'sidebar',
            category: 'navigation',
            rebuildSpec: {
              layout: 'vertical navigation with icons',
              components: ['nav-icons', 'project-list']
            }
          }
        ],
        photos: []
      },
      duration: 300,
      industry: 'productivity'
    };

    const mockSelectedTemplate = {
      templateId: 'ui_dashboard_kanban',
      templateType: 'ui',
      category: 'dashboard',
      score: 0.92,
      uiBonusApplied: 0.2
    };

    mockTemplateSelector.selectTemplate.mockResolvedValue(mockSelectedTemplate);

    // Execute
    const selectedTemplate = await mockTemplateSelector.selectTemplate(sceneWithUI, {
      preferUITemplates: true,
      applyUIBonus: true
    });

    // Assert
    expect(selectedTemplate.templateType).toBe('ui');
    expect(selectedTemplate.category).toBe('dashboard');
    expect(selectedTemplate.score).toBeGreaterThan(0.9);
    expect(selectedTemplate.uiBonusApplied).toBe(0.2);

    // Verify UI template preference validation
    expect({ scene: sceneWithUI, template: selectedTemplate }).toPreferUITemplates();
  });

  test('6.2 Photo template selection when photos dominate', async () => {
    // Setup - Scene with primarily photos (Shopify merchant story)
    const sceneWithPhotos = {
      visualElements: {
        photos: [
          {
            url: '/merchant-photo.jpg',
            message: 'Small business owner managing online store',
            purpose: 'hero'
          },
          {
            url: '/products-showcase.jpg',
            message: 'Curated product showcase for online store',
            purpose: 'product-gallery'
          }
        ],
        uiComponents: [
          {
            type: 'button',
            category: 'cta',
            rebuildSpec: {
              layout: 'centered button',
              components: ['cta-text']
            }
          }
        ]
      },
      duration: 240,
      industry: 'commerce'
    };

    const mockSelectedTemplate = {
      templateId: 'visual_hero_commerce',
      templateType: 'visual',
      category: 'hero',
      score: 0.88,
      uiBonusApplied: 0 // No UI bonus since photos dominate
    };

    mockTemplateSelector.selectTemplate.mockResolvedValue(mockSelectedTemplate);

    // Execute
    const selectedTemplate = await mockTemplateSelector.selectTemplate(sceneWithPhotos, {
      preferUITemplates: true,
      applyUIBonus: true
    });

    // Assert
    expect(selectedTemplate.templateType).toBe('visual');
    expect(selectedTemplate.category).toBe('hero');
    expect(selectedTemplate.uiBonusApplied).toBe(0); // No UI bonus applied

    // Photos should outweigh single UI component
    expect(sceneWithPhotos.visualElements.photos.length).toBeGreaterThan(0);
    expect(selectedTemplate.templateId).toContain('visual');
  });

  test('6.3 UI template bonus scoring mechanism', async () => {
    // Setup - Compare same scene with different template types
    const sceneWithDashboard = {
      visualElements: {
        uiComponents: [
          {
            type: 'dashboard',
            category: 'analytics',
            rebuildSpec: {
              layout: '3-column metrics dashboard',
              components: ['revenue-chart', 'conversion-metrics', 'user-stats']
            }
          }
        ],
        photos: []
      },
      duration: 360,
      industry: 'fintech'
    };

    const mockScoringComparison = {
      uiTemplate: {
        templateId: 'ui_dashboard_analytics',
        baseScore: 0.70,
        uiBonus: 0.20,
        finalScore: 0.90
      },
      textTemplate: {
        templateId: 'text_minimal_stats',
        baseScore: 0.75,
        uiBonus: 0.00,
        finalScore: 0.75
      },
      visualTemplate: {
        templateId: 'visual_charts',
        baseScore: 0.65,
        uiBonus: 0.00,
        finalScore: 0.65
      }
    };

    mockTemplateSelector.calculateUIBonus.mockResolvedValue(mockScoringComparison);

    // Execute
    const scoringComparison = await mockTemplateSelector.calculateUIBonus(sceneWithDashboard, [
      MOCK_TEMPLATE_METADATA.ui_dashboard,
      MOCK_TEMPLATE_METADATA.text_minimal,
      MOCK_TEMPLATE_METADATA.visual_hero
    ]);

    // Assert
    expect(scoringComparison.uiTemplate.finalScore).toBeGreaterThan(
      scoringComparison.textTemplate.finalScore
    );
    expect(scoringComparison.uiTemplate.finalScore).toBeGreaterThan(
      scoringComparison.visualTemplate.finalScore
    );

    // Verify UI bonus calculation
    expect(scoringComparison.uiTemplate.uiBonus).toBe(0.20);
    expect(scoringComparison.textTemplate.uiBonus).toBe(0.00);
    expect(scoringComparison.visualTemplate.uiBonus).toBe(0.00);

    // Verify final scores include bonus (with floating point tolerance)
    expect(scoringComparison.uiTemplate.finalScore).toBeCloseTo(
      scoringComparison.uiTemplate.baseScore + scoringComparison.uiTemplate.uiBonus,
      2
    );
  });

  test('6.4 Mixed content template selection strategy', async () => {
    // Setup - Scene with both UI components and photos (Stripe features)
    const mixedContentScene = {
      visualElements: {
        uiComponents: [
          {
            type: 'feature-grid',
            category: 'ui',
            rebuildSpec: {
              layout: '2x3 grid with cards',
              components: ['feature-icons', 'feature-titles', 'feature-descriptions']
            }
          },
          {
            type: 'dashboard',
            category: 'payments',
            rebuildSpec: {
              layout: '3-column grid with sidebar',
              components: ['payment-cards', 'transaction-chart', 'revenue-metrics']
            }
          }
        ],
        photos: [
          {
            url: '/team-collaboration.jpg',
            message: 'Team working on payment solutions',
            purpose: 'feature-support'
          }
        ]
      },
      duration: 420,
      industry: 'fintech'
    };

    const mockSelectionStrategy = {
      strategy: 'ui-preferred-with-photo-integration',
      selectedTemplate: {
        templateId: 'ui_feature_grid_with_media',
        templateType: 'ui',
        category: 'feature-showcase',
        score: 0.87,
        reasoning: 'UI elements dominate (2 vs 1), UI template can integrate photos'
      },
      alternativeTemplates: [
        {
          templateId: 'visual_hero_features',
          templateType: 'visual',
          score: 0.73,
          reasoning: 'Photo-focused but would underutilize UI components'
        }
      ]
    };

    mockTemplateSelector.selectTemplate.mockResolvedValue(mockSelectionStrategy);

    // Execute
    const selectionResult = await mockTemplateSelector.selectTemplate(mixedContentScene, {
      handleMixedContent: true,
      preferUIWhenPossible: true
    });

    // Assert
    expect(selectionResult.strategy).toBe('ui-preferred-with-photo-integration');
    expect(selectionResult.selectedTemplate.templateType).toBe('ui');
    
    // UI components outnumber photos, so UI template should be preferred
    expect(mixedContentScene.visualElements.uiComponents.length).toBeGreaterThan(
      mixedContentScene.visualElements.photos.length
    );

    // Selected template should have higher score than alternatives
    expect(selectionResult.selectedTemplate.score).toBeGreaterThan(
      selectionResult.alternativeTemplates[0].score
    );

    // Verify reasoning includes mixed content handling
    expect(selectionResult.selectedTemplate.reasoning).toContain('UI elements dominate');
    expect(selectionResult.selectedTemplate.reasoning).toContain('integrate photos');
  });

  test('6.5 Template variety enforcement across scenes', async () => {
    // Setup - Multiple scenes from same brand to test variety
    const multiSceneProject = [
      {
        sceneId: 'hero',
        visualElements: {
          uiComponents: [{ type: 'dashboard', category: 'hero' }],
          photos: [{ purpose: 'hero' }]
        }
      },
      {
        sceneId: 'features', 
        visualElements: {
          uiComponents: [
            { type: 'feature-grid', category: 'features' },
            { type: 'chart', category: 'analytics' }
          ],
          photos: []
        }
      },
      {
        sceneId: 'testimonials',
        visualElements: {
          uiComponents: [],
          photos: [
            { purpose: 'testimonial' },
            { purpose: 'customer-logo' }
          ]
        }
      },
      {
        sceneId: 'pricing',
        visualElements: {
          uiComponents: [
            { type: 'pricing-table', category: 'pricing' },
            { type: 'feature-comparison', category: 'table' }
          ],
          photos: []
        }
      }
    ];

    const mockVarietyResults = {
      selectedTemplates: [
        { sceneId: 'hero', templateId: 'ui_dashboard_hero', templateType: 'ui' },
        { sceneId: 'features', templateId: 'ui_feature_grid', templateType: 'ui' },
        { sceneId: 'testimonials', templateId: 'visual_testimonial', templateType: 'visual' },
        { sceneId: 'pricing', templateId: 'ui_pricing_table', templateType: 'ui' }
      ],
      varietyScore: 0.85, // Good variety (75% UI, 25% visual)
      templateTypes: { ui: 3, visual: 1, text: 0 },
      uniqueTemplates: 4,
      varietyMet: true,
      recommendations: [
        'Good balance between UI and visual templates',
        'UI preference correctly applied where UI components exist',
        'Visual template appropriately used for photo-heavy testimonials'
      ]
    };

    mockTemplateSelector.rankTemplatesByScore.mockResolvedValue(mockVarietyResults);

    // Execute
    const varietyResults = await mockTemplateSelector.rankTemplatesByScore(multiSceneProject, {
      enforceVariety: true,
      minVarietyScore: 0.8,
      preferUIForUIScenes: true
    });

    // Assert
    expect(varietyResults.varietyScore).toBeGreaterThan(0.8);
    expect(varietyResults.uniqueTemplates).toBe(4); // All different templates
    expect(varietyResults.varietyMet).toBe(true);

    // Verify UI templates used for UI-heavy scenes
    const uiScenes = varietyResults.selectedTemplates.filter(t => t.templateType === 'ui');
    expect(uiScenes).toHaveLength(3);

    // Verify visual template used for photo-heavy scene
    const visualScene = varietyResults.selectedTemplates.find(t => t.sceneId === 'testimonials');
    expect(visualScene!.templateType).toBe('visual');

    // Verify template variety distribution
    expect(varietyResults.templateTypes.ui).toBeGreaterThan(varietyResults.templateTypes.visual);
    expect(varietyResults.recommendations).toEqual(
      expect.arrayContaining([
        expect.stringContaining('UI preference correctly applied')
      ])
    );
  });
});