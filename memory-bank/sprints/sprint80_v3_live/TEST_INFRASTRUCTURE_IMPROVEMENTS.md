# Test Infrastructure Improvements

## Current Issues Identified

### 1. Module Resolution Problems
- **Issue**: Path alias `~/` not resolving correctly in some tests
- **Root Cause**: Inconsistent module paths between source code and tests
- **Solution**: Updated import paths to match actual file locations
- **Status**: ✅ FIXED (reduced failures from 8 to 3)

### 2. Mixed Testing Frameworks
- **Issue**: Some tests importing from 'vitest' while project uses Jest
- **Root Cause**: Copy-paste from different projects or AI suggestions
- **Solution**: Converted all vitest imports to Jest equivalents
- **Status**: ✅ FIXED

### 3. Missing Mock Implementations
- **Issue**: Tests failing due to unmocked dependencies
- **Root Cause**: Complex dependency chains not properly isolated
- **Solution**: Create comprehensive mocks for critical services
- **Status**: 🟡 IN PROGRESS

## Improvements Made

### 1. Fixed Import Paths
```typescript
// Before (incorrect)
import { brainOrchestrator } from '~/server/services/brain/orchestrator';

// After (correct)
import { brainOrchestrator } from '~/brain/orchestratorNEW';
```

### 2. Standardized on Jest
```typescript
// Before (vitest)
import { describe, it, expect, vi } from 'vitest';
vi.stubGlobal('crypto', {...});

// After (Jest)
import { describe, it, expect, jest } from '@jest/globals';
global.crypto = {...} as any;
```

### 3. Created Critical Path Tests
- Database cascade deletion test
- Multi-format generation test
- Payment flow test (pending)
- Export system test (pending)

## Remaining Infrastructure Tasks

### 1. Create Service Mocks
Need to create proper mocks for:
- `~/brain/orchestratorNEW`
- `~/server/db` (with transaction support)
- `~/lib/services/client/openai`
- `~/server/services/stripe`

### 2. Setup Test Database
For integration tests, need:
- Docker compose for test PostgreSQL
- Migration runner for test DB
- Seed data scripts
- Cleanup utilities

### 3. Environment Configuration
```env
# .env.test
NODE_ENV=test
DATABASE_URL=postgresql://test:test@localhost:5432/bazaar_test
OPENAI_API_KEY=test-key
STRIPE_SECRET_KEY=sk_test_...
```

### 4. CI/CD Integration
```yaml
# github/workflows/test.yml
- name: Run tests
  run: |
    npm run db:migrate:test
    npm run test:ci
    npm run test:integration
```

## Test Organization Structure

```
src/tests/
├── critical/              # Go-live blocking tests
│   ├── database-cascade-deletion.test.ts
│   ├── multi-format-generation.test.ts
│   ├── payment-flow.test.ts
│   └── export-system.test.ts
├── integration/           # Full flow tests
│   ├── api/
│   ├── db/
│   └── generation/
├── unit/                  # Isolated component tests
│   ├── components/
│   ├── hooks/
│   └── utils/
└── __mocks__/            # Shared mocks
    ├── brain.ts
    ├── database.ts
    └── stripe.ts
```

## Mock Strategy

### 1. Database Mocks
```typescript
// __mocks__/database.ts
export const mockDb = {
  transaction: jest.fn(async (fn) => fn(mockDb)),
  insert: jest.fn().mockReturnValue({
    values: jest.fn().mockReturnValue({
      returning: jest.fn()
    })
  }),
  // ... other methods
};
```

### 2. AI Service Mocks
```typescript
// __mocks__/openai.ts
export const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn().mockResolvedValue({
        choices: [{ message: { content: 'Mocked response' } }]
      })
    }
  }
};
```

### 3. Payment Mocks
```typescript
// __mocks__/stripe.ts
export const mockStripe = {
  webhooks: {
    constructEvent: jest.fn()
  },
  customers: {
    create: jest.fn()
  }
};
```

## Testing Best Practices

### 1. Use AAA Pattern
```typescript
it('should do something', async () => {
  // Arrange
  const input = { ... };
  
  // Act
  const result = await service.method(input);
  
  // Assert
  expect(result).toEqual(expected);
});
```

### 2. Test Data Builders
```typescript
// test-utils/builders.ts
export const buildProject = (overrides = {}) => ({
  id: 'test_proj_' + Date.now(),
  name: 'Test Project',
  userId: 'test_user',
  ...overrides
});
```

### 3. Async Testing
```typescript
// Always use async/await for clarity
it('should handle async operations', async () => {
  const result = await asyncOperation();
  expect(result).toBeDefined();
});
```

## Next Steps

1. **Immediate**: Fix remaining 3 test suites
2. **Today**: Implement Stripe payment flow tests
3. **Tomorrow**: Create Lambda export tests
4. **This Week**: Achieve 50% coverage on critical paths
5. **Before Go-Live**: 
   - All critical tests passing
   - Integration test suite running
   - CI/CD pipeline configured

## Success Metrics

- ✅ 0 failing tests in CI
- ✅ 50%+ coverage on critical paths
- ✅ All go-live checklist items tested
- ✅ < 5 minute test execution time
- ✅ Automated test runs on PR

---

**Last Updated**: 2025-07-21
**Status**: Infrastructure improvements in progress