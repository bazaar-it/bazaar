# Sprint 80: V3 Go-Live Test Strategy

## Executive Summary

This document outlines the comprehensive test strategy for Sprint 80 V3 Go-Live. Current test coverage is critically low at ~1.17%, with 8 failing test suites. This strategy prioritizes critical path testing for production readiness.

## Current State Analysis

### Test Suite Status
- **Coverage**: 1.17% statements, 0.3% branches, 1.2% lines, 0.99% functions
- **Failing Tests**: 8 out of 18 test suites
- **Main Issues**:
  1. Module resolution errors (path mapping issues)
  2. Mixed test frameworks (Jest vs Vitest)
  3. Missing mocks for critical services
  4. Outdated test configurations

### Infrastructure Issues
1. **Path Mapping**: `~/` alias not resolving correctly in tests
2. **Framework Confusion**: Some tests importing from 'vitest' while using Jest
3. **Missing Dependencies**: Required modules not properly mocked
4. **Environment Setup**: Incomplete test environment configuration

## Test Priority Matrix

### 🔴 Critical (Must Have for Go-Live)
These tests directly impact production stability and user experience.

#### 1. Database & Data Integrity Tests
- **Purpose**: Ensure data safety and cascade deletions work correctly
- **Coverage Target**: 100%
- **Test Areas**:
  - Project deletion cascades (scenes, messages, images)
  - User data integrity
  - Migration safety checks
  - Foreign key constraints
  - Orphaned data prevention

#### 2. Payment & Billing Tests
- **Purpose**: Protect revenue and prevent billing errors
- **Coverage Target**: 95%
- **Test Areas**:
  - Stripe webhook handling
  - Rate limiting enforcement
  - Purchase modal triggers
  - Quota management
  - Currency handling (EUR)
  - Subscription state transitions

#### 3. Core Generation Pipeline Tests
- **Purpose**: Ensure AI generation works reliably
- **Coverage Target**: 90%
- **Test Areas**:
  - Brain orchestrator tool selection (excluding scene planner)
  - Multi-format code generation (desktop/mobile/square)
  - Auto-fix system (progressive retry logic)
  - Context building from conversations
  - Error handling and recovery

#### 4. Video Export Tests
- **Purpose**: Ensure users can export their work
- **Coverage Target**: 85%
- **Test Areas**:
  - Lambda function invocation
  - S3 permissions and public access
  - Progress tracking accuracy
  - Download functionality
  - Rate limiting (10 exports/day)

### 🟡 Important (Should Have)
These tests improve reliability but aren't blockers.

#### 5. SSE & Real-time Communication Tests
- **Purpose**: Ensure smooth user experience
- **Coverage Target**: 80%
- **Test Areas**:
  - No duplicate messages
  - Connection recovery
  - Error propagation
  - Stream termination

#### 6. UI Component Tests
- **Purpose**: Ensure UI works correctly
- **Coverage Target**: 70%
- **Test Areas**:
  - Chat panel functionality
  - Preview panel updates
  - Format switching
  - Voice input
  - Image upload

### 🟢 Nice to Have
These tests improve quality but can be added post-launch.

#### 7. Performance Tests
- **Purpose**: Monitor system performance
- **Coverage Target**: 60%
- **Test Areas**:
  - Generation speed (60-90s target)
  - Memory usage
  - Bundle size

## Test Implementation Plan

### Phase 1: Fix Infrastructure (Immediate)
1. Fix module resolution in Jest config
2. Remove Vitest dependencies, standardize on Jest
3. Create proper mocks for services
4. Update test environment setup

### Phase 2: Critical Path Tests (Priority 1)
1. Database cascade deletion tests
2. Stripe integration tests
3. Brain orchestrator tests (without scene planner)
4. Lambda export tests

### Phase 3: Important Tests (Priority 2)
1. SSE streaming tests
2. UI component integration tests
3. Auto-fix system tests

### Phase 4: Full Coverage (Post-Launch)
1. Performance benchmarks
2. Edge case handling
3. Error recovery scenarios

## Test Patterns & Best Practices

### Unit Test Pattern
```typescript
describe('ServiceName', () => {
  beforeEach(() => {
    // Setup mocks and test data
  });

  it('should handle success case', async () => {
    // Arrange
    const input = { /* test data */ };
    
    // Act
    const result = await service.method(input);
    
    // Assert
    expect(result).toMatchExpectedOutput();
  });

  it('should handle error case', async () => {
    // Test error scenarios
  });
});
```

### Integration Test Pattern
```typescript
describe('Feature Integration', () => {
  it('should complete full user flow', async () => {
    // Test complete user journey
    // Mock external services
    // Verify all components work together
  });
});
```

### E2E Test Pattern (Future)
```typescript
describe('E2E User Journey', () => {
  it('should generate video from prompt', async () => {
    // Full flow from prompt to export
  });
});
```

## Success Metrics

### Go-Live Requirements
- ✅ All critical tests passing (100%)
- ✅ No failing tests in CI/CD pipeline
- ✅ Coverage >= 50% for critical paths
- ✅ All payment flows tested
- ✅ Database operations verified safe

### Quality Indicators
- Response time < 2s for API calls
- Generation time < 90s
- No memory leaks detected
- Error rate < 1%

## Risk Mitigation

### High Risk Areas
1. **Database Migrations**: Test rollback procedures
2. **Payment Processing**: Double-check Stripe webhooks
3. **AI Generation**: Verify scene planner exclusion
4. **Export System**: Confirm S3 public access

### Mitigation Strategies
1. Run tests in staging environment
2. Create rollback scripts
3. Monitor error rates post-deployment
4. Have hotfix procedures ready

## Timeline

### Week 1 (Current)
- Day 1-2: Fix test infrastructure
- Day 3-4: Implement critical database tests
- Day 5-7: Payment and billing tests

### Week 2
- Day 1-3: Generation pipeline tests
- Day 4-5: Export system tests
- Day 6-7: Integration testing

### Week 3
- Day 1-2: SSE and UI tests
- Day 3-4: Performance tests
- Day 5-7: Final validation and fixes

## Appendix: Test Checklist

### Before Each Test Session
- [ ] Pull latest code
- [ ] Run `npm install`
- [ ] Check environment variables
- [ ] Clear test database

### After Test Implementation
- [ ] Run full test suite
- [ ] Check coverage report
- [ ] Verify no console errors
- [ ] Update this document

---

**Last Updated**: 2025-07-21
**Author**: Test Orchestrator
**Status**: In Progress