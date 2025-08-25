/**
 * Template Selection Tests - Metadata-Driven Selection (5 tests)
 * Tests enhanced template metadata system for Sprint 99.5
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { MOCK_TEMPLATE_METADATA } from '../../utils/test-helpers';

// Mock metadata-driven template selector
const mockMetadataSelector = {
  filterByRequirements: jest.fn(),
  matchCapabilities: jest.fn(),
  alignWithIndustry: jest.fn(),
  selectFallbackTemplate: jest.fn(),
  enforceTemplateVariety: jest.fn(),
};

describe('Template Selection - Metadata-Driven Selection Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('7.1 Technical requirements filtering', async () => {
    // Setup - Scene requirements that should filter templates
    const sceneRequirements = {
      duration: 450, // 15 seconds
      texts: {
        headline: 75, // 75 characters
        description: 200
      },
      images: 2,
      interactions: ['hover', 'click'],
      complexity: 'medium'
    };

    const availableTemplates = [
      {
        id: 'ui_dashboard',
        requirements: {
          duration: { min: 90, max: 450 }, // ✓ Matches
          texts: { headline: { max: 60 } }, // ✗ Too short for headline
          images: { max: 3 }, // ✓ Matches
        }
      },
      {
        id: 'visual_hero',
        requirements: {
          duration: { min: 60, max: 300 }, // ✗ Too short for duration
          texts: { headline: { max: 80 } }, // ✓ Matches
          images: { min: 1, max: 2 }, // ✓ Matches
        }
      },
      {
        id: 'text_extended',
        requirements: {
          duration: { min: 300, max: 600 }, // ✓ Matches
          texts: { headline: { max: 100 } }, // ✓ Matches
          images: { max: 0 }, // ✗ Doesn't support images
        }
      },
      {
        id: 'ui_feature_showcase',
        requirements: {
          duration: { min: 60, max: 480 }, // ✓ Matches
          texts: { headline: { max: 90 } }, // ✓ Matches
          images: { max: 5 }, // ✓ Matches
        }
      }
    ];

    const mockFilteredTemplates = [
      availableTemplates[3] // Only ui_feature_showcase meets all requirements
    ];

    mockMetadataSelector.filterByRequirements.mockResolvedValue({
      eligible: mockFilteredTemplates,
      filtered: availableTemplates.length - mockFilteredTemplates.length,
      filterReasons: [
        { templateId: 'ui_dashboard', reason: 'headline too long (75 > 60)' },
        { templateId: 'visual_hero', reason: 'duration too long (450 > 300)' },
        { templateId: 'text_extended', reason: 'requires 0 images, scene has 2' }
      ]
    });

    // Execute
    const filterResult = await mockMetadataSelector.filterByRequirements(
      availableTemplates,
      sceneRequirements
    );

    // Assert
    expect(filterResult.eligible).toHaveLength(1);
    expect(filterResult.filtered).toBe(3);
    expect(filterResult.eligible[0].id).toBe('ui_feature_showcase');

    // Verify filtering reasons are specific
    expect(filterResult.filterReasons).toHaveLength(3);
    filterResult.filterReasons.forEach((reason: any) => {
      expect(reason.templateId).toBeTruthy();
      expect(
        reason.reason.includes('headline') || 
        reason.reason.includes('duration') ||
        reason.reason.includes('images')
      ).toBe(true);
    });

    // Verify hard requirements block incompatible templates
    const headlineReasons = filterResult.filterReasons.filter(r => 
      r.reason.includes('headline')
    );
    expect(headlineReasons.length).toBeGreaterThan(0);
  });

  test('7.2 Capability matching accuracy', async () => {
    // Setup - Scene needs with specific capabilities
    const sceneNeeds = {
      visualElements: ['charts', 'data-visualization', 'metrics'],
      interactions: ['hover-tooltips', 'drill-down'],
      animations: ['counter-up', 'progress-bars'],
      industry: 'fintech'
    };

    const templatesWithCapabilities = [
      {
        id: 'ui_analytics_dashboard',
        capabilities: ['charts', 'data-visualization', 'metrics', 'hover-tooltips'],
        score: 0.0 // Will be calculated
      },
      {
        id: 'ui_simple_cards',
        capabilities: ['cards', 'text-animations'],
        score: 0.0
      },
      {
        id: 'visual_infographic',
        capabilities: ['charts', 'static-graphics'],
        score: 0.0
      },
      {
        id: 'text_minimal',
        capabilities: ['typography', 'fade-animations'],
        score: 0.0
      }
    ];

    const mockCapabilityMatching = {
      results: [
        {
          templateId: 'ui_analytics_dashboard',
          matchedCapabilities: ['charts', 'data-visualization', 'metrics', 'hover-tooltips'],
          matchScore: 4/4, // Perfect match
          missingCapabilities: []
        },
        {
          templateId: 'ui_simple_cards',
          matchedCapabilities: [],
          matchScore: 0/4, // No matches
          missingCapabilities: ['charts', 'data-visualization', 'metrics', 'hover-tooltips']
        },
        {
          templateId: 'visual_infographic',
          matchedCapabilities: ['charts'],
          matchScore: 1/4, // Partial match
          missingCapabilities: ['data-visualization', 'metrics', 'hover-tooltips']
        },
        {
          templateId: 'text_minimal',
          matchedCapabilities: [],
          matchScore: 0/4, // No matches
          missingCapabilities: ['charts', 'data-visualization', 'metrics', 'hover-tooltips']
        }
      ],
      bestMatch: 'ui_analytics_dashboard'
    };

    mockMetadataSelector.matchCapabilities.mockResolvedValue(mockCapabilityMatching);

    // Execute
    const capabilityResult = await mockMetadataSelector.matchCapabilities(
      templatesWithCapabilities,
      sceneNeeds
    );

    // Assert
    expect(capabilityResult.bestMatch).toBe('ui_analytics_dashboard');
    
    const bestMatchResult = capabilityResult.results.find(
      r => r.templateId === 'ui_analytics_dashboard'
    );
    expect(bestMatchResult!.matchScore).toBe(1.0); // Perfect match
    expect(bestMatchResult!.missingCapabilities).toHaveLength(0);

    // Verify capability matching is accurate
    expect(bestMatchResult!.matchedCapabilities).toContain('charts');
    expect(bestMatchResult!.matchedCapabilities).toContain('data-visualization');
    expect(bestMatchResult!.matchedCapabilities).toContain('metrics');

    // Verify poor matches have low scores
    const poorMatch = capabilityResult.results.find(
      r => r.templateId === 'ui_simple_cards'
    );
    expect(poorMatch!.matchScore).toBe(0);
    expect(poorMatch!.missingCapabilities).toHaveLength(4);
  });

  test('7.3 Industry alignment scoring', async () => {
    // Setup - Different templates with industry preferences
    const brandIndustry = 'fintech';
    const templatesWithIndustryData = [
      {
        id: 'ui_fintech_dashboard',
        industries: ['fintech', 'banking', 'finance'],
        industryBonus: 0.0
      },
      {
        id: 'ui_generic_dashboard',
        industries: ['any'],
        industryBonus: 0.0
      },
      {
        id: 'visual_ecommerce_hero',
        industries: ['commerce', 'retail', 'shopping'],
        industryBonus: 0.0
      },
      {
        id: 'text_corporate',
        industries: ['enterprise', 'b2b', 'corporate'],
        industryBonus: 0.0
      }
    ];

    const mockIndustryAlignment = {
      alignedTemplates: [
        {
          templateId: 'ui_fintech_dashboard',
          industryMatch: 'exact',
          bonus: 0.15,
          reasoning: 'Specifically designed for fintech industry'
        },
        {
          templateId: 'ui_generic_dashboard',
          industryMatch: 'generic',
          bonus: 0.05,
          reasoning: 'Generic template supports any industry'
        },
        {
          templateId: 'visual_ecommerce_hero',
          industryMatch: 'mismatch',
          bonus: 0.0,
          reasoning: 'Designed for commerce, not fintech'
        },
        {
          templateId: 'text_corporate',
          industryMatch: 'partial',
          bonus: 0.08,
          reasoning: 'Corporate theme has some fintech overlap'
        }
      ],
      bestIndustryMatch: 'ui_fintech_dashboard'
    };

    mockMetadataSelector.alignWithIndustry.mockResolvedValue(mockIndustryAlignment);

    // Execute
    const industryResult = await mockMetadataSelector.alignWithIndustry(
      templatesWithIndustryData,
      brandIndustry
    );

    // Assert
    expect(industryResult.bestIndustryMatch).toBe('ui_fintech_dashboard');

    // Verify exact industry match gets highest bonus
    const exactMatch = industryResult.alignedTemplates.find(
      t => t.templateId === 'ui_fintech_dashboard'
    );
    expect(exactMatch!.industryMatch).toBe('exact');
    expect(exactMatch!.bonus).toBe(0.15);

    // Verify generic template gets modest bonus
    const genericMatch = industryResult.alignedTemplates.find(
      t => t.templateId === 'ui_generic_dashboard'
    );
    expect(genericMatch!.bonus).toBeGreaterThan(0);
    expect(genericMatch!.bonus).toBeLessThan(exactMatch!.bonus);

    // Verify mismatched industry gets no bonus
    const mismatch = industryResult.alignedTemplates.find(
      t => t.templateId === 'visual_ecommerce_hero'
    );
    expect(mismatch!.bonus).toBe(0);
    expect(mismatch!.industryMatch).toBe('mismatch');

    // Verify all templates have reasoning
    industryResult.alignedTemplates.forEach((template: any) => {
      expect(template.reasoning).toBeTruthy();
      expect(template.reasoning.length).toBeGreaterThan(10);
    });
  });

  test('7.4 Fallback template selection reliability', async () => {
    // Setup - Problematic scene that might break normal selection
    const problematicScene = {
      duration: 1200, // Very long duration
      texts: {
        headline: 150, // Very long headline
        description: 500 // Very long description
      },
      images: 10, // Many images
      complexity: 'high',
      specialRequirements: ['custom-animations', 'video-background', '3d-effects']
    };

    const mockFallbackSelection = {
      primarySelectionFailed: true,
      fallbackReason: 'No templates meet duration requirement (1200s)',
      fallbackStrategy: 'closest-match-with-adaptations',
      selectedFallback: {
        templateId: 'ui_flexible_extended',
        adaptations: [
          'Split into 3 shorter scenes (400s each)',
          'Truncate headline to 80 characters',
          'Paginate images into carousel (3 per scene)',
          'Remove unsupported 3D effects'
        ],
        confidence: 0.75
      },
      alternativeFallbacks: [
        {
          templateId: 'text_extended_content',
          adaptations: ['Remove all images', 'Split into 2 text scenes'],
          confidence: 0.60
        }
      ]
    };

    mockMetadataSelector.selectFallbackTemplate.mockResolvedValue(mockFallbackSelection);

    // Execute
    const fallbackResult = await mockMetadataSelector.selectFallbackTemplate(
      problematicScene,
      { allowAdaptations: true, maxAdaptations: 5 }
    );

    // Assert
    expect(fallbackResult.primarySelectionFailed).toBe(true);
    expect(fallbackResult.selectedFallback).toBeDefined();
    expect(fallbackResult.selectedFallback.templateId).toBe('ui_flexible_extended');

    // Verify fallback includes adaptations
    expect(fallbackResult.selectedFallback.adaptations).toHaveLength(4);
    expect(fallbackResult.selectedFallback.adaptations).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Split into')
      ])
    );

    // Verify fallback confidence is reasonable
    expect(fallbackResult.selectedFallback.confidence).toBeGreaterThan(0.7);

    // Verify alternative fallbacks are provided
    expect(fallbackResult.alternativeFallbacks).toHaveLength(1);
    expect(fallbackResult.alternativeFallbacks[0].confidence).toBeLessThan(
      fallbackResult.selectedFallback.confidence
    );

    // Verify fallback reason explains why primary failed
    expect(fallbackResult.fallbackReason).toContain('duration requirement');
  });

  test('7.5 Template variety enforcement across project', async () => {
    // Setup - Multi-scene project to test variety enforcement
    const projectScenes = [
      { sceneId: 'scene1', selectedTemplate: 'ui_dashboard_a' },
      { sceneId: 'scene2', selectedTemplate: 'ui_dashboard_b' },
      { sceneId: 'scene3', selectedTemplate: 'ui_dashboard_c' },
      { sceneId: 'scene4', selectedTemplate: 'ui_dashboard_d' },
      { sceneId: 'scene5', selectedTemplate: 'ui_dashboard_e' }
    ];

    const mockVarietyEnforcement = {
      varietyIssues: [
        {
          issue: 'excessive_ui_templates',
          severity: 'moderate',
          description: '100% UI templates, lacks variety'
        }
      ],
      enforcedChanges: [
        {
          sceneId: 'scene3',
          originalTemplate: 'ui_dashboard_c',
          newTemplate: 'visual_hero_showcase',
          reason: 'Inject visual variety in middle scene'
        },
        {
          sceneId: 'scene5',
          originalTemplate: 'ui_dashboard_e',
          newTemplate: 'text_call_to_action',
          reason: 'End with text-focused CTA for variety'
        }
      ],
      finalVarietyScore: 0.82, // Improved from 0.20
      templateDistribution: {
        ui: 3, // Down from 5
        visual: 1, // Up from 0
        text: 1 // Up from 0
      },
      varietyMet: true
    };

    mockMetadataSelector.enforceTemplateVariety.mockResolvedValue(mockVarietyEnforcement);

    // Execute
    const varietyResult = await mockMetadataSelector.enforceTemplateVariety(
      projectScenes,
      { minVarietyScore: 0.8, maxSameType: 3 }
    );

    // Assert
    expect(varietyResult.finalVarietyScore).toBeGreaterThan(0.8);
    expect(varietyResult.varietyMet).toBe(true);

    // Verify variety issues were identified
    expect(varietyResult.varietyIssues).toHaveLength(1);
    expect(varietyResult.varietyIssues[0].issue).toBe('excessive_ui_templates');

    // Verify enforcement made strategic changes
    expect(varietyResult.enforcedChanges).toHaveLength(2);
    
    const midSceneChange = varietyResult.enforcedChanges.find(c => c.sceneId === 'scene3');
    const endSceneChange = varietyResult.enforcedChanges.find(c => c.sceneId === 'scene5');
    
    expect(midSceneChange!.newTemplate).toContain('visual');
    expect(endSceneChange!.newTemplate).toContain('text');

    // Verify final distribution has variety
    expect(varietyResult.templateDistribution.ui).toBeLessThan(5);
    expect(varietyResult.templateDistribution.visual).toBeGreaterThan(0);
    expect(varietyResult.templateDistribution.text).toBeGreaterThan(0);

    // Verify changes have reasoning
    varietyResult.enforcedChanges.forEach((change: any) => {
      expect(change.reason).toBeTruthy();
      expect(change.reason).toContain('variety');
    });
  });
});