# Sprint 20: Implementation Plan for Fixing Component Generation

## Priority Order

1. **TSX Pre-processor** - Implement syntax repair module first as this will have the most immediate impact
2. **Prompt Enhancement** - Update LLM prompts with syntax guidelines 
3. **Pipeline Integration** - Add repair step to generation pipeline
4. **Testing Framework** - Extend test suite with problematic component examples
5. **Validation Process** - Improve validation feedback and error handling

## 1. TSX Pre-processor Implementation (Days 1-2)

### Tasks

- [ ] Create `src/server/workers/repairComponentSyntax.ts` module
- [ ] Implement core repair functions:
  - [ ] Duplicate variable detection and removal
  - [ ] String literal character escaping
  - [ ] Missing export detection and addition
  - [ ] Tag matching verification
- [ ] Create unit tests for repair functions
- [ ] Develop examples of each error type for testing

### Files to Create

```
src/server/workers/repairComponentSyntax.ts
src/server/workers/__tests__/repairComponentSyntax.test.ts
```

### Success Criteria

- Unit tests pass for all repair functions
- Can successfully fix at least the identified syntax error types:
  - Duplicate `frame` declarations
  - Unescaped `<` in string literals
  - Missing export statements
  - Malformed JSX/SVG

## 2. Prompt Enhancement (Days 2-3)

### Tasks

- [ ] Create clear syntax guidelines section for LLM prompts
- [ ] Update component generation prompts with explicit syntax rules
- [ ] Add examples of correctly formatted component patterns
- [ ] Reduce prompt complexity where possible
- [ ] Add self-verification instructions

### Files to Modify

```
src/server/services/componentGenerator.service.ts
```

### Success Criteria

- Prompts contain clear syntax guidelines
- Instructions prevent redeclaration of variables
- SVG/JSX handling instructions are explicit
- Prompts include examples of correct patterns

## 3. Pipeline Integration (Days 3-4)

### Tasks

- [ ] Add repair step to component generation pipeline
- [ ] Integrate syntax repair before validation
- [ ] Add logging for applied fixes
- [ ] Implement error classification
- [ ] Update error handling to use repaired code

### Files to Modify

```
src/server/workers/generateComponentCode.ts
```

### Success Criteria

- Pipeline successfully applies repairs before validation
- LLM-generated components with syntax errors are fixed
- Logs provide clear information about applied fixes
- Generation process handles repair step correctly

## 4. Testing Framework Enhancement (Days 4-5)

### Tasks

- [ ] Expand E2E component pipeline test with problematic examples
- [ ] Create test fixtures for each error type
- [ ] Add tests that verify repair functions work within the pipeline
- [ ] Update test documentation

### Files to Modify

```
src/tests/e2e/fullComponentPipeline.e2e.test.ts
```

### Success Criteria

- Tests include examples of problematic components
- Pipeline correctly repairs and builds problematic components
- Tests provide coverage for all identified error types
- Test documentation is clear and comprehensive

## 5. End-to-End Validation (Day 5)

### Tasks

- [ ] Create real-world test scenarios for each error type
- [ ] Test entire pipeline from generation to rendering
- [ ] Measure repair success rate
- [ ] Document results and remaining issues

### Files to Create

```
memory-bank/sprints/sprint20/validation-results.md
```

### Success Criteria

- Successfully generates and renders components with previously problematic patterns
- Improvement in component generation success rate
- Clear documentation of results and any remaining issues

## Required Resources

- Access to codebase and development environment
- Test database for E2E testing
- Access to o4-mini model for testing prompt changes

## Potential Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| AST parsing complexity | High | Medium | Use simplified regex-based approach first, add AST parsing later if needed |
| Unforeseen syntax errors | Medium | High | Build extensible repair system, log unhandled errors |
| Performance impact | Low | Low | Measure repair time, optimize if needed |
| LLM prompt changes ineffective | Medium | Medium | A/B test different prompt structures, focus on repair if needed |

## Testing Plan

### Unit Tests

- Test each repair function individually
- Verify edge cases for each error type
- Test with minimal and complex examples

### Integration Tests

- Test repair functions within pipeline
- Verify database interactions
- Test error handling and logging

### E2E Tests

- Test entire pipeline with problematic components
- Verify successful component generation and rendering
- Measure improvement in success rate

## Dependencies

- TSX pre-processor must be completed before pipeline integration
- Pipeline integration required for E2E testing
- Prompt enhancements can be developed in parallel

## Definition of Done

- All unit and integration tests pass
- Problematic components from logs can be successfully repaired and built
- Component generation success rate has increased
- Documentation is updated with results and any remaining issues 