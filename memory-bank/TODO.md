//memory-bank/TODO.md
This file collects high-level TODO items. Sprint-specific TODOs live in `/memory-bank/sprints/<sprint>/TODO.md`.
# TODO Items

## Sprint 8: Comprehensive Test Suite Implementation

### HIGH Priority - Completed 
- Implement test suite for LLM integration
  - Create openaiToolsAPI.test.ts for function call parsing
  - Create responseStreaming.test.ts for performance validation
  - Create dualLLMArchitecture.test.ts for multi-model pipeline
  - Create errorRecovery.test.ts for retry logic and fallbacks
  - Create toolDefinitions.test.ts for API schema validation
  - Create contextManagement.test.ts for conversation state
  - Create generateComponent.test.ts for component generation
- Implement test suite for video generation
  - Create compositionRendering.test.tsx for Remotion compositions
  - Create playerIntegration.test.tsx for Player component
  - Create sceneTransitions.test.tsx for scene transitions
- Set up test infrastructure
  - Configure jest.config.ts with test categories
  - Create mock implementations for external dependencies
  - Set up environment variables for testing

### MEDIUM Priority - Remaining
- Add more granular performance benchmarks for video rendering
- Expand test coverage for edge cases in LLM error handling
- Re-add `jobId` to assistant message records in chat router
- Update Drizzle schema for `patches` and `chatMessages` to include `jobId`
- Generate Drizzle migration for new `jobId` column
- Add visual regression testing for Remotion scenes

## Sprint 7: Real-time Chat Streaming Optimization

### HIGH Priority - Completed 
- Implement Vercel AI SDK integration with tRPC v11 observables
- Create streaming response procedure in chat router
- Add proper token management and event emission
- Fix missing database updates in successful streaming paths
- Enhance error handling with typed error events
- Fix TypeScript errors for better type safety
- Improve cross-procedure communication between chat and project routers
- Implement build worker optimization with worker pool and concurrency limits
- Add test coverage for custom component build worker

### HIGH Priority - Remaining
- Implement UI indicators for status changes during streaming

### HIGH Priority - Completed 
- Migrate client code to use the new streaming API instead of legacy sendMessage
- Update front-end to properly handle streaming event types
- Create comprehensive test suite for streaming interactions

### MEDIUM Priority - Completed 
- Ensure proper final database updates in all success/error paths
- Fix type handling in retryWithBackoff utility
- Update documentation to reflect the new streaming architecture

### MEDIUM Priority - Remaining
- Add client-side metrics collection for response times
- Implement more granular error handling for specific failure cases
- Expand test coverage for build worker to include integration tests
- Add performance benchmarks for build worker optimization

## Sprint 5-6: Dynamic Remotion Component Generation

### HIGH Priority - Completed 
- Create `customComponentJobs` table in the database schema
- Create tRPC router for component operations (create, status, list)
- Implement build worker process using esbuild
- Set up R2 integration for component hosting
- Create React.lazy dynamic component loader
- Update scene registry to support 'custom' scene type
- Set up secure sandbox for component generation (code sanitization)

### HIGH Priority - Completed 
- Create Drizzle migration for the new `customComponentJobs` table (0003_tired_sir_ram.sql)

### MEDIUM Priority - Completed 
- Build UI components for job status monitoring (`CustomComponentStatus.tsx`)
- Implement client-side polling for job status updates
- Add error handling and retry logic for build process
- Add verification and validation for generated components

### MEDIUM Priority - Remaining
- Test end-to-end component generation workflow
- Update chat UI to display component status during generation
- Improve component generation detection logic in chat router
- Review and extend the Remotion/React import post-processing logic as new primitives or custom patterns are introduced in the LLM pipeline.
- Monitor for edge cases or import conflicts in user-generated components.

### MEDIUM Priority - Completed 
- Create documentation for the custom component system

### MEDIUM Priority - Completed 
- Implement OpenAI function calling schema for component generation
- Create TSX code generation prompt for the LLM (using official Remotion prompt)
- fix  // 2.5. Check if this is a custom component request
    if (message.toLowerCase().includes("custom component") || 
        message.toLowerCase().includes("create effect") || 
        message.toLowerCase().includes("make effect") ||
        message.toLowerCase().includes("generate component")) {
      return await handleCustomComponentRequest(ctx, projectId, message, userMessage.id);
    } .... this is not a potimal way  - most of the user prompts are related to custom compoennts anyways - so we should handle this in a more generic way..

### MEDIUM Priority - Completed 
- Set up environment variables for R2 configuration

### LOW Priority - Completed 
- Create insertion mechanism for custom components (`InsertCustomComponentButton.tsx`)

### LOW Priority - Remaining
- Create a component gallery/library UI
- Add custom component preview functionality
- Implement component versioning
- Add component editing capabilities
- Create example component templates for common effects

## Existing Improvement Tasks

### HIGH
Font loading inside render function (TextAnimationScene)
loadFont() runs every render in the browser. Call it once at module top-level outside the component or move font import to _app / root layout.

### MEDIUM
Color interpolation manual hex split
Works, but use @remotion/media-utils/rgba or tinycolor to avoid edge-cases (#abc, rgb strings).

### MEDIUM
ZoomPanScene Ken-Burns logic
transformTransition string uses transition CSS—irrelevant in video render context. Remove the transition: rule; browser doesn't animate between frames in Remotion.
Add more performance benchmarks for video rendering
Expand test coverage for edge cases
Add visual regression testing for Remotion scenes

### MEDIUM
Scene data typing
You down-cast Record<string,unknown> each time.   Consider declaring per-scene Zod schemas (e.g. backgroundColorSceneSchema) so the LLM patch can be validated before hitting the player.   Saves runtime guards.

### LOW
ParticlesScene opacity calc
Math.sin((frame / fps) * 2 + index) means amplitude depends on FPS; use constant: Math.sin(frame * 0.2 + index).

### LOW
svgIcons registry
Good, but keep SVGs tiny (<100×100); Remotion rasterizes them.   Large path counts will slow renders.

## Pipeline Reliability Enhancements (Next Steps)

- [ ] Convert verification scripts (e.g., `verify-pipeline.js`) to TypeScript for better type safety.
- [ ] Implement automated canary testing to continuously validate the pipeline as part of CI/CD.
- [ ] Add component preflight checks for early warning of rendering issues before full build/deploy.
- [ ] Enhance the debug UI with more detailed component status information and diagnostic tools.
- [ ] Continue to refine edge case handling for complex component generations (~5% of cases).

## Testing Infrastructure

- [x] Set up Jest ESM configuration for Next.js 14
- [x] Create mock framework for OpenAI API for unit tests
- [x] Fix OpenAI client module for ADB testing
- [x] Fix Babel configuration for Jest ESM support
- [x] Install necessary Babel plugins for dynamic imports
- [ ] Resolve database mocking issues in Animation Designer tests
- [ ] Fix TypeScript errors in mock implementations
- [ ] Create test fixtures for different scene types (text, image, transition)
- [ ] Implement UI integration tests for critical workflows
- [ ] Add performance metrics to ADB and component generation
- [ ] Improve test coverage across services

**Next Testing Tasks (Priority Order):**
1. Fix database mocking to prevent real database connections in tests
2. Create specialized test helpers for Drizzle ORM patterns
3. Complete unit tests for Animation Design Brief generation
4. Create test fixtures for common scene types 
5. Add integration tests for the complete generation pipeline

## Sprint 14: End-to-End Pipeline Completion (GallerySwipe Ad MVP)

### HIGHEST Priority - Critical Issues (Today)
- [~] Fix UI feedback delay in scene planning (Initial feedback implemented, advanced streaming UI pending)
  - [x] Update ScenePlanningHistoryPanel to show partial results from in-progress scene planning (Initial version done)
  - [ ] Add streaming event handling for partial scene planning results (Partially covered by current approach, needs refinement for full streaming UI)
  - [x] Display scene descriptions as they become available, rather than waiting for full completion (Initial version done)
  - [x] Add clear loading indicators during scene planning process (Enhanced loading implemented)
  - [ ] Implement advanced streaming UI for ScenePlanningHistoryPanel: Show full panel structure immediately with placeholders for scene details, then stream in content as it arrives.

- [~] Fix Animation Design Brief validation failures (Logging enhanced, root cause investigation ongoing)
  - [ ] Debug validation issues in elements animations array
  - [ ] Identify schema mismatches between LLM output and validation schema
  - [x] Implement more robust validation error handling in animationDesigner.service.ts (Enhanced logging for errors added)
  - [ ] Add schema recovery mechanisms to salvage partial valid data

- [~] Resolve component generation build failures (Logging enhanced, root cause investigation ongoing)
  - [ ] Investigate why TSX generation succeeds but build process fails
  - [x] Add more detailed error logging in buildCustomComponent.ts worker (and other relevant services)
  - [ ] Test build process with minimal component examples
  - [ ] Fix slow tRPC procedure performance for customComponent.getJobStatus

- [ ] Implement component identification and regeneration system
  - [ ] Update Animation Design Brief schema to include component identifiers
  - [ ] Create database schema for element-to-component mapping
  - [ ] Add UI for component status display in ScenePlanningHistoryPanel
  - [ ] Implement component regeneration with user feedback
  - [ ] Track component generation status at the element level
  - [ ] Add clear error messaging in UI when component generation fails

### HIGH Priority - In Progress
- [ ] Verify ADB UI integration in ScenePlanningHistoryPanel
  - [ ] Test listDesignBriefs API functionality
  - [ ] Ensure "Generate Animation Brief" button works
  - [ ] Verify status indicators update correctly
  - [ ] Check brief content formatting

- [ ] End-to-end pipeline testing with GallerySwipe prompt
  - [ ] Run complete pipeline from user prompt to video
  - [ ] Verify scene planning creates appropriate scenes
  - [ ] Confirm ADBs are generated for all scenes
  - [ ] Test component generation from ADBs
  - [ ] Validate full video playback

- [ ] Improve error handling throughout the pipeline
  - [ ] Enhance error recovery in chatOrchestration.service.ts
  - [ ] Improve fallback mechanisms in animationDesigner.service.ts
  - [ ] Add graceful fallbacks for component generation failures
  - [ ] Implement component-specific error recovery

### MEDIUM Priority - Pending
- [ ] Implement timeline enhancements for better visibility
  - [ ] Add scene regeneration button in TimelinePanel.tsx
  - [ ] Implement visual progress indicators for generation status
  - [ ] Add duration discrepancy feedback
  - [ ] Improve timeline status indicators

- [ ] Improve user feedback for pipeline progress
  - [ ] Enhance status messages in ChatPanel.tsx
  - [ ] Add more detailed progress feedback
  - [ ] Provide clear error notifications with actionable steps
  - [ ] Add per-component status indicators in the UI

- [ ] Create comprehensive documentation
  - [ ] Update end-to-end-pipeline-implementation.md with latest findings
  - [ ] Document known issues and workarounds
  - [ ] Create troubleshooting guide for common errors
  - [ ] Add developer documentation for component generation system

## COMPLETED
- [x] Create Animation Design Brief Zod schema
- [x] Implement ADB generation in animationDesigner.service.ts
- [x] Database schema for ADB storage
- [x] Basic UI for ADB display in ScenePlanningHistoryPanel.tsx
- [x] Integration of ADBs with component generation
- [x] Fixed temperature parameter issues with o4-mini model

## UI/UX Improvement Tasks

### HIGH Priority
- Implement timeline snapping functionality
  - Add snap-to-grid functionality with configurable grid size
  - Implement snap-to-item edges for precise alignment
  - Create visual indicators when snapping occurs
  - Add toggle for enabling/disabling snapping
- Implement multi-select for timeline items
  - Add shift+click for range selection
  - Add ctrl/cmd+click for individual item selection
  - Implement group move/resize operations for selected items
  - Create visual indicator for selected item group

### MEDIUM Priority
- Enhance video player controls
  - Create custom player control UI matching the application design
  - Add keyboard shortcuts for common player actions
  - Implement frame-by-frame stepping (forward/backward)
  - Add visual indicator for buffering/loading states
- Implement Animation Design Brief preview
  - Create visual preview of animation effects from briefs
  - Add status indicators for component generation
  - Implement quick edit functionality for animation properties
  - Create visualization for animation timing and keyframes

### LOW Priority
- Improve responsive design
  - Optimize layout for tablet devices
  - Create collapsible panels for smaller screens
  - Implement touch-friendly controls for mobile use
  - Add responsive typography scaling
- Add accessibility enhancements
  - Implement keyboard navigation throughout the application
  - Add ARIA attributes for screen reader support
  - Improve focus management for keyboard users
  - Create high-contrast theme option

## Recently Fixed

- ✅ Fixed `duplicate key value violates unique constraint "project_unique_name"` error when creating new projects
  - Updated `/projects/new` route to generate unique project titles following the same pattern as the TRPC routes
  - Now checks for existing projects with "New Project" title and adds a number suffix if needed
  - Fixed on branch `Jack/Sunday`

## Custom Component System

### Completed
- ✅ Fix new custom components not showing up in the panel
- ✅ Fix the API routes to correctly handle dynamic params
- ✅ Fix custom component cache control headers
- ✅ Fix component status handling to support "complete" status
- ✅ Add manual refresh button to force component updates
- ✅ Fix component loading from R2 with proper export handling
- ✅ Handle named exports in custom components
- ✅ Document custom component refresh mechanism
- ✅ Document custom component export handling
- ✅ Fix minified React import issue (`import a from "react"`) in generated components
- ✅ Implement direct window assignment for component variables
- ✅ Add fallback detection mechanisms for component exports
- ✅ Create comprehensive documentation for component export fixes

### Todo
- Consider standardizing the export format in component generation
- Add validation for components before storing in R2
- Implement component testing before making components available
- Add structured approach to component metadata
- Improve error handling in custom components

# TODO List - Component Pipeline Improvements

## Required for Production

1. **Fix Component R2/Database Sync**
   - [x] Create verification toolkit for component pipeline testing
   - [x] Fix component registration in API route
   - [x] Improve error handling in useRemoteComponent hook
   - [x] Enhance script cleanup in PreviewPanel
   - [ ] Run full production test with 20+ different component types

2. **Component Loading Reliability**
   - [x] Implement better error reporting in component pipeline
   - [x] Add visual feedback for component loading status
   - [x] Fix script tag cleanup to be more targeted
   - [ ] Add telemetry for component load times and success rates

3. **Component Generation Improvements**
   - [ ] Create standardized component templates with robust registration
   - [ ] Add pre-processing of LLM output to ensure registration
   - [ ] Implement runtime validation of components before storing

## Nice-to-Have

1. **Admin Tools**
   - [ ] Create component admin dashboard in the UI
   - [ ] Add batch tools for fixing multiple components
   - [ ] Implement component versioning and rollback

2. **CI/CD Integration**
   - [ ] Add automated tests for component pipeline in CI
   - [ ] Create canary tests that run in production environment
   - [ ] Add monitoring alerts for component failures

3. **Documentation**
   - [ ] Create comprehensive documentation for component pipeline
   - [ ] Document troubleshooting steps for common component issues
   - [ ] Add examples of valid component patterns

## For Future Sprints

1. **Performance Optimizations**
   - [ ] Implement component bundling for faster loading
   - [ ] Add component caching at edge
   - [ ] Optimize component registration for faster initialization

2. **Feature Enhancements**
   - [ ] Support for more complex component patterns
   - [ ] Add component testing environment in the UI
   - [ ] Implement component marketplace for sharing

## Sprint 24: Stabilize A2A System & Enhance Observability

### HIGH Priority - To Do
- [ ] S24-1.1: Investigate/Resolve TaskProcessor Churn (`src/server/services/a2a/taskProcessor.service.ts`)
- [ ] S24-1.2: Centralize/Optimize A2A Logger Config (`src/lib/logger.ts`)
- [ ] **Investigate Cross-Project Logging:**
  - [ ] Confirm if the specific UUID/"Fixed debug message" errors from `chatOrchestration.service.ts` are the ones appearing with Project 2 context in the Log Agent.
  - [ ] If so, the issue is very subtle within `chatLogger`'s handling or Winston/LogAgent interaction.
  - [ ] If not, and other logs show Project 2 context, trace how Project 1 actions might indirectly trigger Project 2 (A2A) operations and their (correct) logging.
  - [ ] Obtain an example raw log entry from the Log Agent demonstrating the issue.

## Custom Component Pipeline Testing

- [x] Implement integration tests for custom component JSON patch operations
- [x] Create tests for PreviewPanel component loading and cleanup
- [x] Fix test issues with special paths in Next.js ([id])
- [x] Implement E2E test for full component generation pipeline
- [x] Create documentation for component pipeline testing strategy
- [x] Add tests for different component types and export patterns
- [ ] Implement error case testing for component pipeline
- [ ] Add performance metrics to E2E component tests 
- [ ] Extend testing to include component loading via useRemoteComponent
- [ ] Add visual testing for rendered components

## Component Generation System Improvements

- [ ] Update LLM prompts to standardize component generation patterns
  - [ ] Ensure consistent export default statements
  - [ ] Remove direct imports of React/Remotion from prompts
  - [ ] Add comments in prompt examples about window.__REMOTION_COMPONENT
- [ ] Enhance buildCustomComponent.ts to better handle edge cases
  - [ ] Add pre-build static analysis to detect common issues
  - [ ] Improve error handling for components with broken/missing imports
  - [ ] Add component export validation before completing build
- [ ] Create automated verification pipeline for existing components
  - [ ] Convert the component-verify script to a worker process
  - [ ] Add batch component rebuilding capability
  - [ ] Create reporting system for component issues
- [ ] Add component quality scoring system
  - [ ] Implement heuristics to evaluate component code quality
  - [ ] Track component health metrics over time
  - [ ] Add visual verification tools for component testing

## Component Generation Pipeline Improvements (Sprint 20)

- [ ] Create syntax repair module (`repairComponentSyntax.ts`)
  - [ ] Implement fix for duplicate variable declarations
  - [ ] Implement fix for unescaped characters in string literals
  - [ ] Implement fix for missing export statements
  - [ ] Implement tag matching verification
  - [ ] Add comprehensive unit tests

- [ ] Update LLM prompts with syntax guidelines
  - [ ] Add explicit variable declaration instructions
  - [ ] Add SVG/JSX handling guidelines
  - [ ] Add export requirements section
  - [ ] Add self-verification instructions

- [ ] Integrate repair into component generation pipeline
  - [ ] Add repair step before validation
  - [ ] Implement error classification
  - [ ] Add metrics for repair effectiveness
  - [ ] Create fallback component mechanism

- [ ] Testing and validation
  - [ ] Update E2E tests with problematic components
  - [ ] Test with previously failed components
  - [ ] Document success rate improvements
  - [ ] Add comprehensive test coverage

- [ ] Documentation
  - [ ] Document the repair process
  - [ ] Update component generation documentation
  - [ ] Create developer guide for debugging component errors
  - [ ] Document common error patterns and solutions

## Sprint 20: Component Generation Pipeline

- [ ] Integrate TSX preprocessor (src/server/utils/tsxPreprocessor.ts) into the component generation workflow
  - [ ] Add to src/server/workers/generateComponentCode.ts before validation step
  - [ ] Log preprocessing results for analytics
  - [ ] Measure success rate improvement

- [ ] Update LLM prompts for component generation
  - [ ] Add explicit warnings about variable redeclaration
  - [ ] Include proper JSX/SVG syntax examples
  - [ ] Emphasize export and window assignment requirements

- [ ] Add monitoring and telemetry
  - [ ] Track types and frequency of syntax issues fixed
  - [ ] Create dashboard for component generation success rate
  - [ ] Set up alerts for persistent failure patterns

- [ ] End-to-end testing
  - [ ] Complete test suite for repairComponentSyntax.test.ts
  - [ ] Update existing component generation tests to validate fixes
  - [ ] Test with real-world component generation requests

# Custom Component Pipeline

- [x] Fix components with missing outputUrl values
- [x] Fix components with syntax errors
- [x] Fix components missing window.__REMOTION_COMPONENT assignment
- [x] Create a UI component for diagnosing and fixing component issues
- [x] Create a comprehensive fix script
- [x] Document the component fix system
- [ ] Integrate the fix system into the component generation pipeline
- [ ] Add component syntax validation during generation
- [ ] Improve LLM prompts to generate cleaner component code

# Additional Component Improvements

- [ ] Create a library of guaranteed working component templates
- [ ] Add visual component preview in the component panel
- [ ] Improve component error reporting in the UI
- [ ] Add component categories for better organization
- [ ] Implement batch operations for multiple components
- [ ] Add version history for components
