//memory-bank/sprints/sprint14/TODO.md
# Sprint 14 - TODO List

## Testing Infrastructure (Ticket 14.1)

### Jest ESM Configuration
- [ ] Update `jest.config.cjs` to properly handle ESM dependencies:
  - [ ] Fix `transformIgnorePatterns` to include all problematic ESM packages
  - [ ] Ensure transform configuration is optimal for TypeScript files
  - [ ] Update Jest moduleNameMapper for path aliases
- [ ] Fix `babel.jest.config.cjs` to properly transform node_modules with ESM syntax
- [ ] Create helper utilities for mocking problematic ESM modules

### Test Files
- [ ] Fix animationDesigner.service.test.ts:
  - [x] Replace non-existent import from `~/server/lib/openai/client` with proper 'openai' mock
  - [ ] Create comprehensive mocks for zod schema validation
  - [ ] Add test cases for error handling scenarios
- [ ] Update componentGenerator.service.test.ts:
  - [ ] Complete the more comprehensive test cases that were simplified
  - [ ] Add proper database operation mocking

## Animation Design Brief System (Ticket 14.2)

- [ ] Review and optimize current ADB schema in `animationDesignBrief.schema.ts`
- [ ] Enhance `animationDesigner.service.ts`:
  - [ ] Add more robust error handling
  - [ ] Implement fallback mechanisms for LLM failures
  - [ ] Optimize prompt construction for better ADB generation
- [ ] Verify database integration:
  - [ ] Test ADB storage and retrieval with actual database
  - [ ] Ensure all status updates (pending → complete/error) work correctly

## UI Implementation (Ticket 14.3)

- [ ] Update `ScenePlanningHistoryPanel.tsx`:
  - [ ] Add collapsible sections for ADBs
  - [ ] Implement status indicators (pending/complete/error)
  - [ ] Create JSON formatter for brief display
  - [ ] Add generation/regeneration buttons
  - [ ] Implement polling for status updates
- [ ] Integrate with Animation Router:
  - [ ] Connect to `listDesignBriefs` API
  - [ ] Implement `generateDesignBrief` functionality
  - [ ] Add error handling for API calls

## Scene Management UI (Ticket 14.4)

- [ ] Add scene regeneration button to timeline UI
- [ ] Implement visual indicators for:
  - [ ] Duration discrepancies (planned vs. actual)
  - [ ] Generation progress
  - [ ] Scene validity status
- [ ] Test scene repositioning logic when durations change

## End-to-End Testing (Ticket 14.5)

- [ ] Create manual test scenarios document
- [ ] Define success metrics for the GallerySwipe ad use case
- [ ] Test full pipeline with various prompt complexities
- [ ] Document results and findings

## Error Handling Improvements (Ticket 14.6)

- [ ] Implement graceful fallbacks for:
  - [ ] Failed scene planning
  - [ ] Failed ADB generation
  - [ ] Failed component generation
- [ ] Enhance error messaging for users
- [ ] Add detailed technical logging

## Immediate Next Actions

1. **Fix animationDesigner.service.test.ts mocking** - This is partially done but needs completion
2. **Update Jest configuration** to better handle ESM modules
3. **Begin implementing the ScenePlanningHistoryPanel modifications** since this doesn't depend on test fixes
4. **Create more detailed test plan** for validating the full pipeline
