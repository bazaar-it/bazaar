/**
 * Test utilities for Sprint 99.5 tests
 * Common helper functions and matchers
 */

import type { MockBrandData } from '../fixtures/mock-brand-data';

export interface TestExpectations {
  fidelityScore: number;
  evidenceCoverage: number;
  uiTemplateAccuracy: number;
  visualClassificationAccuracy: number;
}

export const DEFAULT_EXPECTATIONS: TestExpectations = {
  fidelityScore: 0.85,
  evidenceCoverage: 1.0,
  uiTemplateAccuracy: 0.95,
  visualClassificationAccuracy: 0.90
};

/**
 * Calculate fidelity score between source and generated content
 */
export function calculateFidelityScore(
  source: Record<string, any>,
  generated: Record<string, any>
): number {
  let matches = 0;
  let total = 0;

  // Compare colors
  if (source.colors && generated.colors) {
    const sourceColors = source.colors.map((c: any) => c.hex?.toLowerCase());
    const generatedColors = generated.colors.map((c: any) => c.hex?.toLowerCase());
    
    sourceColors.forEach((color: string) => {
      total++;
      if (generatedColors.includes(color)) matches++;
    });
  }

  // Compare text content
  if (source.text && generated.text) {
    const sourceText = source.text.toLowerCase();
    const generatedText = generated.text.toLowerCase();
    total++;
    if (sourceText === generatedText) matches++;
  }

  // Compare layout structure
  if (source.layout && generated.layout) {
    total++;
    if (source.layout === generated.layout) matches++;
  }

  return total > 0 ? matches / total : 0;
}

/**
 * Validate evidence chain completeness
 */
export function validateEvidenceChain(brandData: MockBrandData): boolean {
  return brandData.sections.every(section => {
    const hasScreenshots = section.evidence.screenshotIds.length > 0;
    const hasDOMPath = section.evidence.domPath.length > 0;
    const hasConfidence = section.evidence.confidence > 0;
    
    return hasScreenshots && hasDOMPath && hasConfidence;
  });
}

/**
 * Calculate visual classification accuracy
 */
export function calculateVisualClassificationAccuracy(
  classified: Array<{ type: 'photo' | 'ui'; actualType: 'photo' | 'ui' }>
): number {
  const correct = classified.filter(item => item.type === item.actualType).length;
  return classified.length > 0 ? correct / classified.length : 0;
}

/**
 * Validate UI template preference logic
 */
export function validateUITemplatePreference(
  scene: { visualElements: any },
  selectedTemplate: { type: string; category: string }
): boolean {
  const hasUIComponents = scene.visualElements?.uiComponents?.length > 0;
  
  if (hasUIComponents) {
    // Should prefer UI templates when UI components exist
    return selectedTemplate.type === 'ui' || selectedTemplate.category.includes('dashboard') || selectedTemplate.category.includes('interface');
  }
  
  return true; // No preference requirement if no UI components
}

/**
 * Validate rebuild specification quality
 */
export function validateRebuildSpecification(rebuildSpec: any): {
  feasibilityScore: number;
  completeness: number;
  specificity: number;
} {
  let feasibilityScore = 0;
  let completeness = 0;
  let specificity = 0;

  // Check layout description
  if (rebuildSpec.layout) {
    completeness += 0.33;
    if (rebuildSpec.layout.includes('grid') || rebuildSpec.layout.includes('column')) {
      specificity += 0.25;
      feasibilityScore += 0.25;
    }
  }

  // Check components list
  if (rebuildSpec.components && Array.isArray(rebuildSpec.components)) {
    completeness += 0.33;
    if (rebuildSpec.components.length > 0) {
      specificity += 0.25;
      feasibilityScore += 0.25;
    }
  }

  // Check styling details
  if (rebuildSpec.styling) {
    completeness += 0.34;
    const stylingProps = Object.keys(rebuildSpec.styling);
    if (stylingProps.length >= 3) {
      specificity += 0.25;
      feasibilityScore += 0.25;
    }
  }

  // Check for interaction states
  if (rebuildSpec.interactions) {
    specificity += 0.25;
    feasibilityScore += 0.25;
  }

  return { feasibilityScore, completeness, specificity };
}

/**
 * Mock template metadata for testing
 */
export const MOCK_TEMPLATE_METADATA = {
  ui_dashboard: {
    id: 'ui_dashboard',
    type: 'ui',
    category: 'dashboard',
    capabilities: ['charts', 'metrics', 'data-visualization'],
    requirements: {
      duration: { min: 90, max: 450 },
      texts: { headline: { max: 60 } },
      images: { max: 3 }
    },
    industries: ['fintech', 'productivity', 'analytics'],
    uiTemplateBonus: 0.2
  },
  visual_hero: {
    id: 'visual_hero',
    type: 'visual',
    category: 'hero',
    capabilities: ['photos', 'gradients', 'text-overlay'],
    requirements: {
      duration: { min: 60, max: 300 },
      texts: { headline: { max: 80 } },
      images: { min: 1, max: 2 }
    },
    industries: ['design', 'commerce', 'marketing'],
    uiTemplateBonus: 0
  },
  text_minimal: {
    id: 'text_minimal',
    type: 'text',
    category: 'minimal',
    capabilities: ['typography', 'animations', 'transitions'],
    requirements: {
      duration: { min: 30, max: 180 },
      texts: { headline: { max: 40 } },
      images: { max: 0 }
    },
    industries: ['any'],
    uiTemplateBonus: 0
  }
};

/**
 * Calculate template selection score
 */
export function calculateTemplateScore(
  template: any,
  scene: { visualElements: any; duration: number; industry?: string }
): number {
  let score = 0.5; // Base score

  // UI template bonus
  const hasUIComponents = scene.visualElements?.uiComponents?.length > 0;
  if (hasUIComponents && template.uiTemplateBonus) {
    score += template.uiTemplateBonus;
  }

  // Duration match
  const durationMatch = scene.duration >= template.requirements.duration.min && 
                       scene.duration <= template.requirements.duration.max;
  if (durationMatch) score += 0.1;

  // Industry alignment
  if (scene.industry && template.industries.includes(scene.industry)) {
    score += 0.1;
  }

  // Capability matching
  const sceneNeeds = [];
  if (hasUIComponents) sceneNeeds.push('data-visualization');
  if (scene.visualElements?.photos?.length > 0) sceneNeeds.push('photos');
  
  const capabilityMatches = sceneNeeds.filter(need => 
    template.capabilities.includes(need)
  ).length;
  
  score += (capabilityMatches / Math.max(sceneNeeds.length, 1)) * 0.2;

  return Math.min(score, 1.0);
}

/**
 * Performance timing utilities
 */
export class PerformanceTimer {
  private startTime: number = 0;

  start(): void {
    this.startTime = Date.now();
  }

  stop(): number {
    return Date.now() - this.startTime;
  }

  expectLessThan(maxMs: number): void {
    const elapsed = this.stop();
    expect(elapsed).toBeLessThan(maxMs);
  }
}

/**
 * Create performance timer
 */
export function createPerformanceTimer(): PerformanceTimer {
  return new PerformanceTimer();
}

/**
 * Custom Jest matchers for Sprint 99.5
 */
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveFidelityScore(expected: number): R;
      toHaveCompleteEvidence(): R;
      toPreferUITemplates(): R;
      toHaveRebuildableSpecs(): R;
    }
  }
}

// Jest custom matchers
expect.extend({
  toHaveFidelityScore(received: any, expected: number) {
    const score = calculateFidelityScore(received.source, received.generated);
    const pass = score >= expected;
    
    return {
      message: () =>
        `expected fidelity score ${score} to be ${pass ? 'less than' : 'at least'} ${expected}`,
      pass,
    };
  },

  toHaveCompleteEvidence(received: MockBrandData) {
    const hasEvidence = validateEvidenceChain(received);
    
    return {
      message: () =>
        `expected brand data to have complete evidence chain`,
      pass: hasEvidence,
    };
  },

  toPreferUITemplates(received: { scene: any; template: any }) {
    const prefersUI = validateUITemplatePreference(received.scene, received.template);
    
    return {
      message: () =>
        `expected to prefer UI templates when UI components are present`,
      pass: prefersUI,
    };
  },

  toHaveRebuildableSpecs(received: any) {
    const validation = validateRebuildSpecification(received);
    const pass = validation.feasibilityScore >= 0.8;
    
    return {
      message: () =>
        `expected rebuild spec to have feasibility score >= 0.8, got ${validation.feasibilityScore}`,
      pass,
    };
  },
});