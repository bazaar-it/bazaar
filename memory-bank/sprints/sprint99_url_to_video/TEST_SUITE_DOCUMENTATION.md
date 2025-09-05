# Test Suite Documentation - Intelligent Template Selection

**Sprint 99** - URL-to-Video Pipeline Enhancement  
**Created**: August 23, 2025  
**Purpose**: Comprehensive guide to our testing infrastructure

---

## 📚 Table of Contents
1. [Overview](#overview)
2. [Current Test Suite](#current-test-suite)
3. [How to Use Tests](#how-to-use-tests)
4. [Test Strategy](#test-strategy)
5. [Future Test Recommendations](#future-test-recommendations)
6. [Best Practices](#best-practices)

---

## Overview

Our test suite solves the critical problem of tests failing due to missing authentication, project IDs, and API keys. We've created a comprehensive testing infrastructure that supports both mock and real database testing.

### Key Achievement
**Before**: Tests would fail with "missing projectId", "user not authenticated", "API key required"  
**After**: Complete test fixtures provide all necessary context for reliable testing

---

## Current Test Suite

### 1. Test Fixtures (`src/tests/fixtures/test-database-setup.ts`)

**Purpose**: Provides consistent test data and database setup

```typescript
// Real database testing
const context = await createTestContext();
// Returns: { userId, projectId, apiKey, sessionToken, cleanup }

// Mock testing (no database)
const context = createMockTestContext();

// Pre-configured brand profiles
testWebsites.fintech   // Ramp profile
testWebsites.design    // Figma profile
testWebsites.developer // Stripe profile
```

**Key Features**:
- Creates test admin user with proper auth
- Generates test project with credits
- Sets up API keys and sessions
- Automatic cleanup after tests
- No interference with production data

### 2. Unit Tests (`src/tests/unit/template-selection-basic.test.ts`)

**Status**: ✅ 9/9 tests passing

**What it tests**:
- Brand archetype detection (professional, innovator, sophisticate)
- Industry classification (fintech, design, developer-tools)
- Template selection logic
- Template variety across brands
- Fallback handling

**Usage**:
```bash
npm run test:template-selection
```

### 3. Integration Tests (`src/tests/integration/template-selection-intelligent.test.ts`)

**Purpose**: Tests the complete TemplateSelector class with brand context

**What it tests**:
- Brand-aware template filtering
- Industry-specific template selection
- Color compatibility
- Full hero's journey consistency
- Performance benchmarks

**Usage**:
```bash
# With mock data
npm run test:template-selection

# With real database
RUN_E2E_TESTS=true npm run test:e2e
```

### 4. E2E Tests (`src/tests/e2e/url-to-video-pipeline.test.ts`)

**Purpose**: Tests the complete URL-to-video pipeline

**What it tests**:
- Brand extraction from URLs
- Template selection based on extraction
- Complete pipeline execution
- Error handling
- Performance metrics

---

## How to Use Tests

### Running Tests

```bash
# Quick unit tests (no database needed)
npm run test:template-selection

# Run all standard tests
npm test

# Run with coverage
npm run test:ci

# Run specific test file
npx jest src/tests/unit/template-selection-basic.test.ts

# Watch mode for development
npm run test:watch
```

### Test Environment Setup

```bash
# For tests requiring database
cp .env.example .env.test
# Configure test database URL

# Run with test environment
NODE_ENV=test npm test
```

### Writing New Tests

```typescript
import { createTestContext, testWebsites } from '~/tests/fixtures/test-database-setup';

describe('My Feature', () => {
  let context;
  
  beforeAll(async () => {
    // Use real database
    context = await createTestContext();
    // OR use mock
    context = createMockTestContext();
  });
  
  afterAll(async () => {
    await context.cleanup();
  });
  
  it('should do something', async () => {
    // Use context.projectId, context.userId, etc.
    const result = await myFunction({
      projectId: context.projectId,
      userId: context.userId
    });
    
    expect(result).toBeDefined();
  });
});
```

---

## Test Strategy

### Testing Pyramid

```
         /\
        /E2E\        <- Few, critical user journeys
       /------\
      /Integr. \     <- Template selection, pipeline
     /----------\
    /   Unit     \   <- Many, fast, isolated
   /--------------\
```

### What We Test

1. **Unit Level**
   - Pure functions (archetype detection, industry classification)
   - Individual utilities
   - State management logic

2. **Integration Level**
   - Template selection with brand context
   - Database operations
   - API endpoints

3. **E2E Level**
   - Complete URL-to-video flow
   - User authentication flow
   - Payment processing

### Coverage Goals

- Unit tests: 80% coverage
- Integration: Critical paths covered
- E2E: Main user journeys

---

## Future Test Recommendations

### 🎯 High Priority Tests

#### 1. Visual Regression Testing
```typescript
// Test that templates render correctly with brand colors
describe('Template Visual Rendering', () => {
  it('should apply brand colors to templates', async () => {
    const rendered = await renderTemplate('GlitchText', {
      brandColors: { primary: '#FF6B00' }
    });
    
    await expect(rendered).toMatchImageSnapshot();
  });
});
```

#### 2. Performance Testing
```typescript
// Ensure pipeline completes within time limits
describe('Pipeline Performance', () => {
  it('should complete in under 60 seconds', async () => {
    const start = Date.now();
    await websiteToVideoHandler({ url: 'https://ramp.com' });
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(60000);
  });
});
```

#### 3. Template Compatibility Matrix
```typescript
// Test all templates with various brand profiles
describe('Template Compatibility', () => {
  const templates = getAllTemplates();
  const brands = [testWebsites.fintech, testWebsites.design];
  
  templates.forEach(template => {
    brands.forEach(brand => {
      it(`${template} should work with ${brand.name}`, async () => {
        const result = await customizeTemplate(template, brand);
        expect(result.code).toContain('export default');
      });
    });
  });
});
```

### 🔧 Nice-to-Have Tests

#### 4. Load Testing
```typescript
// Test system under concurrent load
describe('Load Testing', () => {
  it('should handle 10 concurrent requests', async () => {
    const requests = Array(10).fill(null).map(() => 
      websiteToVideoHandler({ url: 'https://example.com' })
    );
    
    const results = await Promise.allSettled(requests);
    const successful = results.filter(r => r.status === 'fulfilled');
    
    expect(successful.length).toBeGreaterThan(7); // 70% success rate
  });
});
```

#### 5. Brand Extraction Accuracy
```typescript
// Test extraction quality for known websites
describe('Brand Extraction Accuracy', () => {
  const knownBrands = [
    { url: 'https://apple.com', expectedColors: ['#000000', '#FFFFFF'] },
    { url: 'https://spotify.com', expectedColors: ['#1DB954'] }
  ];
  
  knownBrands.forEach(({ url, expectedColors }) => {
    it(`should extract correct colors from ${url}`, async () => {
      const data = await extractBrandData(url);
      expectedColors.forEach(color => {
        expect(data.colors).toContain(color);
      });
    });
  });
});
```

#### 6. Template Selection Distribution
```typescript
// Ensure good distribution of template usage
describe('Template Distribution', () => {
  it('should not overuse any single template', async () => {
    const usage = {};
    
    // Run 100 selections
    for (let i = 0; i < 100; i++) {
      const template = await selectTemplate('problem', 'dynamic');
      usage[template] = (usage[template] || 0) + 1;
    }
    
    // No template should be used more than 40% of the time
    Object.values(usage).forEach(count => {
      expect(count).toBeLessThan(40);
    });
  });
});
```

#### 7. Error Recovery Testing
```typescript
// Test graceful degradation
describe('Error Recovery', () => {
  it('should use fallback when extraction fails', async () => {
    const result = await websiteToVideoHandler({
      url: 'https://invalid-url-that-does-not-exist.com'
    });
    
    expect(result.scenes).toHaveLength(5); // Still generates scenes
    expect(result.brandData).toMatchObject({
      colors: { primary: expect.any(String) } // Has fallback colors
    });
  });
});
```

#### 8. A/B Testing Framework
```typescript
// Test different selection strategies
describe('A/B Testing', () => {
  it('should support multiple selection strategies', async () => {
    const strategyA = await selectWithStrategy('conservative');
    const strategyB = await selectWithStrategy('experimental');
    
    expect(strategyA).not.toEqual(strategyB);
    // Track which performs better over time
  });
});
```

#### 9. Memory Leak Testing
```typescript
// Ensure no memory leaks in long-running processes
describe('Memory Management', () => {
  it('should not leak memory over multiple runs', async () => {
    const initialMemory = process.memoryUsage().heapUsed;
    
    for (let i = 0; i < 50; i++) {
      await websiteToVideoHandler({ url: 'https://example.com' });
      global.gc(); // Force garbage collection
    }
    
    const finalMemory = process.memoryUsage().heapUsed;
    const increase = finalMemory - initialMemory;
    
    expect(increase).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
  });
});
```

#### 10. Contract Testing
```typescript
// Ensure API contracts are maintained
describe('API Contracts', () => {
  it('should return expected shape', async () => {
    const result = await api.generation.generateScene({
      prompt: 'test',
      projectId: 'test-id'
    });
    
    expect(result).toMatchObject({
      scenes: expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          code: expect.any(String),
          duration: expect.any(Number)
        })
      ])
    });
  });
});
```

---

## Best Practices

### 1. Test Naming
```typescript
// Good: Descriptive and specific
it('should select data visualization templates for fintech triumph scenes')

// Bad: Vague
it('should work')
```

### 2. Test Isolation
```typescript
// Each test should be independent
beforeEach(() => {
  jest.clearAllMocks();
  // Reset state
});
```

### 3. Use Test Fixtures
```typescript
// Don't hardcode test data
import { testWebsites } from '~/tests/fixtures/test-database-setup';

// Use pre-configured profiles
const brandData = testWebsites.fintech.brandData;
```

### 4. Test Behavior, Not Implementation
```typescript
// Good: Test the outcome
expect(selectedTemplate).toMatch(/Graph|Chart|Data/);

// Bad: Test internal details
expect(selector._internalMethod()).toBe('something');
```

### 5. Performance Assertions
```typescript
// Add performance checks to critical paths
const start = performance.now();
const result = await criticalFunction();
const duration = performance.now() - start;

expect(duration).toBeLessThan(1000); // Must complete in 1 second
```

---

## CI/CD Integration

### GitHub Actions Workflow
```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install deps
        run: npm ci
        
      - name: Run unit tests
        run: npm run test:template-selection
        
      - name: Run integration tests
        run: npm test
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test
          
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## Monitoring Test Health

### Metrics to Track
1. **Test execution time** - Should not increase over time
2. **Flaky test rate** - Should be < 1%
3. **Coverage percentage** - Should increase or maintain
4. **Test/code ratio** - Aim for 1:1 or higher

### Regular Maintenance
- Weekly: Review failing tests
- Monthly: Update test fixtures with new brands
- Quarterly: Performance baseline update
- Yearly: Test strategy review

---

## Conclusion

Our test suite provides comprehensive coverage for the intelligent template selection system. The infrastructure solves the authentication/context problem and enables reliable testing at all levels.

**Key Success**: Tests now run reliably with proper context, enabling confident deployments and rapid iteration.

**Next Steps**: Implement visual regression and performance testing for complete confidence in the system.