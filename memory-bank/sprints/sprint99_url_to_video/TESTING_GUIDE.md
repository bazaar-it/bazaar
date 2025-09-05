# Testing Guide for Intelligent Template Selection

**Sprint 99** - URL-to-Video Pipeline Enhancement  
**Date**: August 23, 2025  
**Focus**: Comprehensive testing infrastructure

---

## 🧪 Test Infrastructure Overview

We've created a comprehensive testing suite that solves the common problems with our testing:
- **Problem**: Tests fail due to missing project IDs, user IDs, and API keys
- **Solution**: Complete test fixture system with database setup and cleanup

### Key Components

1. **Test Fixtures** (`src/tests/fixtures/test-database-setup.ts`)
   - Creates test admin user with proper authentication
   - Generates test project with credits
   - Sets up API keys and session tokens
   - Automatic cleanup after tests

2. **Integration Tests** (`src/tests/integration/template-selection-intelligent.test.ts`)
   - Brand archetype detection
   - Industry-specific template selection
   - Template variety verification
   - Color compatibility testing
   - Full journey consistency

3. **E2E Tests** (`src/tests/e2e/url-to-video-pipeline.test.ts`)
   - Complete pipeline testing
   - Brand extraction verification
   - Template selection intelligence
   - Performance benchmarks

---

## 🚀 Running Tests

### Quick Start

```bash
# Run unit tests for template selection
npm run test:template-selection

# Run end-to-end pipeline tests
npm run test:e2e

# Run all intelligent tests
npm run test:all

# Run with real database (requires .env.local)
RUN_E2E_TESTS=true npm run test:e2e
```

### Test Commands

| Command | Description | Database |
|---------|-------------|----------|
| `npm run test:template-selection` | Unit tests for intelligent selection | Mock |
| `npm run test:e2e` | End-to-end pipeline tests | Mock/Real |
| `npm run test:all` | All intelligent tests | Mock/Real |
| `npm run test:fixtures` | Test database fixture setup | Real |

---

## 📋 Test Coverage

### 1. Brand Archetype Detection
Tests that different website types are correctly identified:
- **Fintech** → Professional archetype
- **Design Tools** → Innovator archetype  
- **Developer Tools** → Sophisticate archetype

### 2. Industry-Specific Selection
Verifies templates match industry requirements:
- **Fintech** → Data visualization templates (graphs, charts)
- **Creative** → Visual templates (particles, animations)
- **Technical** → Clean, minimal templates

### 3. Template Variety
Ensures different brands get different templates:
```javascript
// Same emotional beat, different brands = different templates
Ramp.com + 'invitation' → TypingTemplate
Figma.com + 'invitation' → PulsingCircles
Stripe.com + 'invitation' → WordFlip
```

### 4. Full Journey Consistency
Tests complete hero's journey with all 6 beats:
- Problem
- Tension
- Discovery
- Transformation
- Triumph
- Invitation

### 5. Performance Benchmarks
- Brand extraction: < 10 seconds
- Template selection: < 500ms for 10 scenes
- Full pipeline: < 30 seconds

---

## 🔧 Test Fixtures

### Creating Test Context

```typescript
import { createTestContext } from '~/tests/fixtures/test-database-setup';

// Real database context
const context = await createTestContext();
// Returns: { userId, projectId, apiKey, sessionToken, cleanup }

// Automatic cleanup
await context.cleanup();
```

### Mock Context (No Database)

```typescript
import { createMockTestContext } from '~/tests/fixtures/test-database-setup';

const context = createMockTestContext();
// Returns mock IDs for unit testing
```

### Test Website Data

Pre-configured brand data for testing:

```typescript
import { testWebsites } from '~/tests/fixtures/test-database-setup';

// Available test data:
testWebsites.fintech   // Ramp.com profile
testWebsites.design    // Figma.com profile
testWebsites.developer // Stripe.com profile
```

---

## 🎯 Test Scenarios

### Scenario 1: Brand-Aware Selection
```typescript
it('should identify fintech as professional archetype', async () => {
  const templates = await selector.selectTemplatesForJourney(
    scenes,
    'dynamic',
    testWebsites.fintech.brandData
  );
  
  // Fintech should avoid playful templates
  expect(templates[0].templateId).not.toBe('ParticleExplosion');
});
```

### Scenario 2: Industry Filtering
```typescript
it('should select data templates for fintech triumph', async () => {
  const scene = { emotionalBeat: 'triumph', /* ... */ };
  const templates = await selector.selectTemplatesForJourney(
    [scene],
    'dynamic',
    testWebsites.fintech.brandData
  );
  
  // Should get graph/chart templates
  expect(['TeslaStockGraph', 'GrowthGraph']).toContain(
    templates[0].templateId
  );
});
```

### Scenario 3: Template Variety
```typescript
it('should return different templates for different brands', async () => {
  const fintechTemplates = await selectForFintech();
  const designTemplates = await selectForDesign();
  
  // Should have variety
  expect(fintechTemplates[0].templateId)
    .not.toBe(designTemplates[0].templateId);
});
```

---

## 🐛 Debugging Tests

### Enable Debug Logging

```bash
# Set debug level in tests
DEBUG=* npm run test:template-selection

# Or in code
process.env.DEBUG = 'template-selector:*';
```

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "Project not found" | Missing test context | Use `createTestContext()` |
| "User unauthorized" | No session/API key | Ensure test fixtures loaded |
| "Template not found" | Missing template files | Check template registry |
| "Database connection failed" | Missing .env.local | Copy from .env.example |

### Inspecting Test Database

```bash
# View test data in database UI
npm run db:studio

# Check test user creation
SELECT * FROM users WHERE email LIKE 'test-%@bazaar.test';

# Check test projects
SELECT * FROM projects WHERE name LIKE 'Test Project%';
```

---

## 📊 CI/CD Integration

### GitHub Actions Configuration

```yaml
name: Template Selection Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run template selection tests
        run: npm run test:template-selection
        env:
          NODE_ENV: test
          
      - name: Run E2E tests (mock mode)
        run: npm run test:e2e
        env:
          RUN_E2E_TESTS: false
```

---

## 🔄 Continuous Improvement

### Adding New Tests

1. **Create test file** in appropriate directory:
   - `src/tests/unit/` - Unit tests
   - `src/tests/integration/` - Integration tests
   - `src/tests/e2e/` - End-to-end tests

2. **Use test fixtures** for consistent setup:
   ```typescript
   import { createTestContext } from '~/tests/fixtures/test-database-setup';
   ```

3. **Follow naming convention**:
   - `*.test.ts` - Test files
   - `describe('Feature Name')` - Test suites
   - `it('should do something')` - Test cases

### Test Coverage Goals

- [ ] 80% code coverage for template selection
- [ ] 100% coverage for brand archetype detection
- [ ] E2E tests for all major user flows
- [ ] Performance regression tests

---

## 🎉 Success Metrics

### Current Status
- ✅ Test infrastructure created
- ✅ Database fixtures implemented
- ✅ Integration tests written
- ✅ E2E pipeline tests created
- ✅ Performance benchmarks added

### Next Steps
- [ ] Run tests against production data
- [ ] Add visual regression testing
- [ ] Implement load testing
- [ ] Create test dashboard

---

## 📝 Notes

### Why This Matters
Previous tests were failing because they lacked proper context (user IDs, project IDs, API keys). This new infrastructure ensures tests can run reliably both locally and in CI/CD.

### Key Innovation
The `createTestContext()` function creates a complete test environment with:
- Real database records
- Proper authentication
- Automatic cleanup
- No interference with production data

### Best Practices
1. Always use test fixtures for consistency
2. Clean up test data after each test
3. Use mock context for unit tests
4. Use real context for integration tests
5. Document expected vs actual behavior

---

**Remember**: Good tests enable confident deployments. These tests ensure our intelligent template selection works correctly for every type of website.