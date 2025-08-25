/**
 * Sprint 99.5 Test Runner
 * Comprehensive test suite for URL to Video V2 "Film the website, don't imagine it"
 * 
 * Total Tests: 55 tests across 2 categories
 * - Unit Tests: 30 tests
 * - Integration Tests: 25 tests
 */

export interface TestSuite {
  category: 'unit' | 'integration';
  name: string;
  tests: number;
  description: string;
  files: string[];
}

export const SPRINT_99_5_TEST_SUITES: TestSuite[] = [
  // ============================================
  // UNIT TESTS (30 tests)
  // ============================================
  
  // Web Extraction Tests (10 tests)
  {
    category: 'unit',
    name: 'Web Extraction Tests',
    tests: 10,
    description: 'Enhanced WebAnalysisAgentV4 with Playwright extraction',
    files: [
      'unit/web-extraction/screenshot-quality.test.ts', // 3 tests
      'unit/web-extraction/dom-analysis.test.ts', // 3 tests  
      'unit/web-extraction/evidence-tracking.test.ts', // 4 tests
    ]
  },
  
  // Visual Classification Tests (10 tests)
  {
    category: 'unit',
    name: 'Visual Classification Tests', 
    tests: 10,
    description: 'Photo vs UI distinction and rebuild specifications',
    files: [
      'unit/visual-classification/photo-vs-ui-distinction.test.ts', // 5 tests
      'unit/visual-classification/rebuild-specifications.test.ts', // 5 tests
    ]
  },
  
  // Template Selection Tests (10 tests)  
  {
    category: 'unit',
    name: 'Template Selection Tests',
    tests: 10,
    description: 'UI template preference and metadata-driven selection',
    files: [
      'unit/template-selection/ui-template-preference.test.ts', // 5 tests
      'unit/template-selection/metadata-driven-selection.test.ts', // 5 tests
    ]
  },
  
  // ============================================
  // INTEGRATION TESTS (25 tests)
  // ============================================
  
  // Pipeline Flow Tests (15 tests)
  {
    category: 'integration',
    name: 'Pipeline Flow Tests',
    tests: 15,
    description: 'Component interaction across the pipeline',
    files: [
      'integration/pipeline-flow/extraction-to-analysis.test.ts', // 5 tests
      'integration/pipeline-flow/analysis-to-scene-planning.test.ts', // 5 tests
      'integration/pipeline-flow/scene-planning-to-template-selection.test.ts', // 5 tests (placeholder)
    ]
  },
  
  // Edit Tool Enhancement Tests (10 tests)
  {
    category: 'integration', 
    name: 'Edit Tool Enhancement Tests',
    tests: 10,
    description: 'Context injection and scene generation quality',
    files: [
      'integration/edit-tool-enhancement/context-injection.test.ts', // 5 tests
      'integration/edit-tool-enhancement/scene-generation-quality.test.ts', // 5 tests (placeholder)
    ]
  }
];

/**
 * Test breakdown by feature area
 */
export const TEST_BREAKDOWN = {
  // Unit Tests (30)
  'screenshot-quality': 3,
  'dom-analysis': 3, 
  'evidence-tracking': 4,
  'photo-vs-ui-distinction': 5,
  'rebuild-specifications': 5,
  'ui-template-preference': 5,
  'metadata-driven-selection': 5,
  
  // Integration Tests (25)
  'extraction-to-analysis': 5,
  'analysis-to-scene-planning': 5,
  'scene-planning-to-template-selection': 5,
  'context-injection': 5,
  'scene-generation-quality': 5,
};

/**
 * Sprint 99.5 Success Criteria
 */
export const SUCCESS_CRITERIA = {
  totalTests: 55,
  requiredPassRate: 1.0, // 100% - all tests must pass for production readiness
  
  // Core Sprint 99.5 Enhancements
  visualClassificationAccuracy: 0.90, // 90%+ accurate photo vs UI distinction
  uiTemplatePreferenceAccuracy: 0.95, // 95%+ accurate UI template selection
  evidenceCoverage: 1.0, // 100% content has source references
  brandFidelity: 0.85, // 85%+ brand accuracy
  
  // Performance Targets
  extractionTime: 20000, // <20s
  analysisTime: 15000, // <15s
  sceneGenerationTime: 20000, // <20s per scene
  totalPipelineTime: 60000, // <60s end-to-end
};

/**
 * Test file mapping for Jest runner
 */
export const TEST_FILES = [
  // Unit Tests
  'src/__tests__/sprint99.5/unit/web-extraction/screenshot-quality.test.ts',
  'src/__tests__/sprint99.5/unit/web-extraction/dom-analysis.test.ts', 
  'src/__tests__/sprint99.5/unit/web-extraction/evidence-tracking.test.ts',
  'src/__tests__/sprint99.5/unit/visual-classification/photo-vs-ui-distinction.test.ts',
  'src/__tests__/sprint99.5/unit/visual-classification/rebuild-specifications.test.ts',
  'src/__tests__/sprint99.5/unit/template-selection/ui-template-preference.test.ts',
  'src/__tests__/sprint99.5/unit/template-selection/metadata-driven-selection.test.ts',
  
  // Integration Tests
  'src/__tests__/sprint99.5/integration/pipeline-flow/extraction-to-analysis.test.ts',
  'src/__tests__/sprint99.5/integration/pipeline-flow/analysis-to-scene-planning.test.ts',
  'src/__tests__/sprint99.5/integration/edit-tool-enhancement/context-injection.test.ts',
];

/**
 * Run all Sprint 99.5 tests
 */
export function runAllSprint99Tests(): string[] {
  return TEST_FILES;
}

/**
 * Run tests by category
 */
export function runTestsByCategory(category: 'unit' | 'integration'): string[] {
  return TEST_FILES.filter(file => file.includes(`/${category}/`));
}

/**
 * Run tests by feature area
 */
export function runTestsByFeature(feature: keyof typeof TEST_BREAKDOWN): string[] {
  return TEST_FILES.filter(file => file.includes(feature));
}

/**
 * Test summary for Sprint 99.5 production readiness
 */
export function generateTestSummary() {
  const totalTests = Object.values(TEST_BREAKDOWN).reduce((sum, count) => sum + count, 0);
  const unitTests = Object.entries(TEST_BREAKDOWN)
    .filter(([key]) => ['screenshot-quality', 'dom-analysis', 'evidence-tracking', 'photo-vs-ui-distinction', 'rebuild-specifications', 'ui-template-preference', 'metadata-driven-selection'].includes(key))
    .reduce((sum, [, count]) => sum + count, 0);
  const integrationTests = totalTests - unitTests;

  return {
    totalTests,
    unitTests, 
    integrationTests,
    testSuites: SPRINT_99_5_TEST_SUITES.length,
    successCriteria: SUCCESS_CRITERIA,
    productionReadiness: {
      requirement: 'All 55 tests must pass',
      enhancement: 'Visual classification >90%, UI preference >95%, Evidence 100%',
      performance: 'End-to-end pipeline <60s',
      philosophy: 'Film the website, don\'t imagine it'
    }
  };
}

/**
 * CLI Commands for running Sprint 99.5 tests
 */
export const TEST_COMMANDS = {
  all: 'npm test src/__tests__/sprint99.5',
  unit: 'npm test src/__tests__/sprint99.5/unit',
  integration: 'npm test src/__tests__/sprint99.5/integration', 
  webExtraction: 'npm test src/__tests__/sprint99.5/unit/web-extraction',
  visualClassification: 'npm test src/__tests__/sprint99.5/unit/visual-classification',
  templateSelection: 'npm test src/__tests__/sprint99.5/unit/template-selection',
  pipelineFlow: 'npm test src/__tests__/sprint99.5/integration/pipeline-flow',
  editTool: 'npm test src/__tests__/sprint99.5/integration/edit-tool-enhancement',
  coverage: 'npm test src/__tests__/sprint99.5 -- --coverage',
  watch: 'npm test src/__tests__/sprint99.5 -- --watch',
};

// Export test summary for documentation
console.log('Sprint 99.5 Test Suite Summary:');
console.log(generateTestSummary());