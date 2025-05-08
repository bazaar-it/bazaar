# Sprint 14.2: Animation Design Brief Generation & Testing - Detailed Tickets

## Ticket 14.2.1: Fix ADB Testing Infrastructure

**Description:**  
Resolve current issues with the Animation Design Brief testing infrastructure, focusing on fixing the import error and ensuring test stability.

**Tasks:**
- [x] Create OpenAI client module at `~/server/lib/openai/client.ts`
- [x] Create proper mock implementation for the OpenAI client in `src/__mocks__`
- [x] Fix the missing import error from `~/server/lib/openai/client` by creating appropriate mocks
- [x] Resolve Jest ESM configuration issues (fixed dynamicImport assumption error)
- [ ] Fix database mocking to prevent real database connections in tests
- [ ] Update test fixtures to reflect the current ADB schema
- [ ] Fix TypeScript errors in test files related to mock implementation typing

**Status:** In Progress

**Technical Details:**
- Created the missing OpenAI client module at `~/server/lib/openai/client.ts`
- Properly configured OpenAI mocking in `animationDesigner.service.test.ts`
- Fixed Babel configuration by replacing `assumptions: { dynamicImport: true }` with the `@babel/plugin-syntax-dynamic-import` plugin
- Installed the missing Babel plugin via npm
- Enhanced the mocking strategy for database connections with multiple layers:
  - Added mock for @neondatabase/serverless neon function
  - Added mock for drizzle-orm/neon-http
  - Added mock for the db module
- Tests now run without ESM errors, but still have database connection issues
- Documented progress and issues in `memory-bank/testing/jest_esm_nextjs_setup.md`

**Remaining Challenges:**
1. Database Mocking: Despite our mocks, the actual database client in the animationDesigner service is still trying to connect to a real database. This suggests that either:
   - The mocks are not being properly applied (order of mocking/importing might matter)
   - There's a caching issue with the database client
   - The drizzle/neon stack requires more specific mocking at a lower level

2. Next Steps:
   - Try more direct mocking approach that completely replaces the database implementation
   - Isolate the test better by manually injecting dependencies
   - Create specialized test helpers for database mocking with this particular ORM
   - Consider using `mockImplementation` instead of just replacing the module exports

## Ticket 14.2.2: Enhance ADB Schema Validation

**Description:**  
Improve validation of the Animation Design Brief schema to ensure it meets all requirements for component generation.

**Tasks:**
- [ ] Audit current validation logic in `animationDesigner.service.ts`
- [ ] Add additional validation for required fields
- [ ] Implement consistent error handling for validation failures
- [ ] Update test coverage for validation edge cases

**Status:** Not Started

## Ticket 14.2.3: Create ADB Test Fixtures

**Description:**  
Develop a comprehensive set of test fixtures for Animation Design Briefs to support consistent testing across the codebase.

**Tasks:**
- [ ] Create test fixtures for different scene types (text, image, transition)
- [ ] Add edge case fixtures for error testing
- [ ] Ensure fixtures validate against the current schema
- [ ] Document fixture usage in test documentation

**Status:** Not Started

## Ticket 14.2.4: Implement UI Integration Tests for ADB

**Description:**  
Create integration tests for ADB generation in the UI, ensuring proper interaction between frontend and backend.

**Tasks:**
- [ ] Set up test infrastructure for UI testing of ADB requests
- [ ] Create test cases for successful ADB generation from UI
- [ ] Test error handling in the UI for ADB failures
- [ ] Verify proper synchronization between ADB status updates and UI state

**Status:** Not Started

## Ticket 14.2.5: Optimize ADB Generation Performance

**Description:**  
Profile and optimize the performance of ADB generation, focusing on reducing latency and improving reliability.

**Tasks:**
- [ ] Add performance metrics to ADB generation
- [ ] Identify bottlenecks in the generation process
- [ ] Implement caching for frequent patterns
- [ ] Reduce API call overhead

**Status:** Not Started

## Ticket 14.2.6: Enhance ADB Error Handling and Recovery

**Description:**  
Improve error handling in the Animation Design Brief generation to ensure the system can recover gracefully from failures.

**Tasks:**
- [ ] Enhance the error handling in `generateAnimationDesignBrief` function (line ~196 in `animationDesigner.service.ts`)
- [ ] Improve the fallback brief creation logic in `createFallbackBrief` (line ~169)
- [ ] Add more detailed error tracking for LLM issues vs. validation issues
- [ ] Implement connection retry logic for transient OpenAI errors
- [ ] Ensure database updates properly capture error state

**Technical Details:**
- Current error handling exists but needs enhancement around line ~324 in `animationDesigner.service.ts`
- The current fallback logic creates a minimal brief, but could be improved to preserve more from partial data
- Add exponential backoff for OpenAI API connection issues

**Definition of Done:**
- System generates usable brief even when OpenAI returns partial or malformed data
- All error states properly update database records with appropriate status and message
- Test coverage demonstrates recovery from various failure scenarios

## Ticket 14.2.7: Optimize ADB Schema and Validation
## Ticket 14.2.3: Optimize ADB Schema and Validation

**Description:**  
Review and optimize the Animation Design Brief schema to ensure it provides clear guidance for component generation.

**Tasks:**
- [ ] Review current schema in `animationDesignBrief.schema.ts` for completeness
- [ ] Optimize the `fixUuidsInObject` function in `animationDesigner.service.ts` (line ~134)
- [ ] Add additional validation to ensure schema captures all required animation properties
- [ ] Update zod schema with improved descriptions and examples
- [ ] Verify schema compatibility with component generator expectations

**Technical Details:**
- Current schema is defined in `animationDesignBrief.schema.ts` and is quite comprehensive
- The UUID handling in `fixUuidsInObject` is critical for consistency but could be optimized
- Need to ensure schema enforces properly structured animations that component generator can use

**Definition of Done:**
- Schema validates all required properties for component generation
- UUID handling is robust and consistent
- Documentation in schema provides clear guidance for LLM output

## Ticket 14.2.4: Improve ADB Integration with Component Generator

**Description:**  
Enhance the integration between Animation Design Brief generation and component generation to ensure briefs effectively guide component creation.

**Tasks:**
- [ ] Verify integration points in `scenePlanner.service.ts` (around line ~164 where ADB is used)
- [ ] Ensure component generator properly utilizes all parts of the ADB structure
- [ ] Add metrics tracking to measure brief quality impact on component generation
- [ ] Test full pipeline from scene planning → ADB → component generation

**Technical Details:**
- `scenePlanner.service.ts` integrates with `animationDesigner.service.ts` around line ~164
- Component generator receives ADB on line ~174 
- Need to ensure consistent patterns between the services

**Definition of Done:**
- Component generator successfully utilizes all relevant parts of the ADB
- Integration tests verify end-to-end flow
- Metrics capture relationship between brief quality and component quality

## Ticket 14.2.5: ADB Database Integration Testing

**Description:**  
Verify the database operations for Animation Design Briefs function correctly under all conditions.

**Tasks:**
- [ ] Test database operation error handling in `saveAnimationDesignBrief` function (line ~58)
- [ ] Verify proper status transitions (pending → complete/error)
- [ ] Test concurrent operations (multiple briefs generated simultaneously)
- [ ] Ensure proper cleanup of failed/abandoned generation attempts
- [ ] Verify briefId linking with component jobs

**Technical Details:**
- Database operations occur in multiple places: 
  - `saveAnimationDesignBrief` (line ~58)
  - During ADB generation (lines ~224 and ~327)
- Status transitions need particular attention

**Definition of Done:**
- Database operations correctly handle all error conditions
- Status transitions work as expected in all scenarios
- Concurrent operations work without conflicts
- Integration tests verify database integrity

## Ticket 14.2.6: Improve ADB Prompt Engineering

**Description:**  
Optimize the prompt construction for Animation Design Brief generation to improve output quality and consistency.

**Tasks:**
- [ ] Review and enhance system prompt in `generateAnimationDesignBrief` (line ~197)
- [ ] Add more detailed examples and constraints to guide the LLM
- [ ] Test different prompt structures to find optimal results
- [ ] Create variant prompts optimized for different scene types
- [ ] Document prompt patterns that produce the best results

**Technical Details:**
- Current system prompt is defined around line ~197
- Prompt engineering should focus on producing more structured and detailed briefs
- Need to ensure LLM properly formats all required fields

**Definition of Done:**
- Updated prompts produce more detailed and structured ADBs
- Documentation captures effective prompt patterns
- Test results show improved consistency in ADB generation

## Ticket 14.2.7: ADB Comprehensive Test Suite

**Description:**  
Create comprehensive test cases for Animation Design Brief generation covering various scenarios and edge cases.

**Tasks:**
- [ ] Develop test cases for standard scene descriptions
- [ ] Create tests for edge cases (empty descriptions, very short/long durations)
- [ ] Test error cases (invalid parameters, network failures)
- [ ] Create tests for each important function:
  - `generateAnimationDesignBrief`
  - `saveAnimationDesignBrief`
  - `createFallbackBrief`
  - `fixUuidsInObject`
- [ ] Set up integration tests for the full pipeline

**Technical Details:**
- Tests should cover all code paths in `animationDesigner.service.ts`
- Both unit tests and integration tests are needed
- Mock OpenAI responses for consistent testing

**Definition of Done:**
- Test coverage exceeds 80% for `animationDesigner.service.ts`
- All edge cases and error paths are tested
- Integration tests verify end-to-end functionality
