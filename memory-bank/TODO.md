# TODO Items

## Sprint 8: Comprehensive Test Suite Implementation

### HIGH Priority - Completed ✅
- ✅ Implement test suite for LLM integration
  - ✅ Create openaiToolsAPI.test.ts for function call parsing
  - ✅ Create responseStreaming.test.ts for performance validation
  - ✅ Create dualLLMArchitecture.test.ts for multi-model pipeline
  - ✅ Create errorRecovery.test.ts for retry logic and fallbacks
  - ✅ Create toolDefinitions.test.ts for API schema validation
  - ✅ Create contextManagement.test.ts for conversation state
  - ✅ Create generateComponent.test.ts for component generation
- ✅ Implement test suite for video generation
  - ✅ Create compositionRendering.test.tsx for Remotion compositions
  - ✅ Create playerIntegration.test.tsx for Player component
  - ✅ Create sceneTransitions.test.tsx for scene transitions
- ✅ Set up test infrastructure
  - ✅ Configure jest.config.ts with test categories
  - ✅ Create mock implementations for external dependencies
  - ✅ Set up environment variables for testing

### MEDIUM Priority - Remaining
- Add more granular performance benchmarks for video rendering
- Expand test coverage for edge cases in LLM error handling
- Add visual regression testing for Remotion scenes

## Sprint 7: Real-time Chat Streaming Optimization

### HIGH Priority - Completed ✅
- ✅ Implement Vercel AI SDK integration with tRPC v11 observables
- ✅ Create streaming response procedure in chat router
- ✅ Add proper token management and event emission
- ✅ Fix missing database updates in successful streaming paths
- ✅ Enhance error handling with typed error events
- ✅ Fix TypeScript errors for better type safety
- ✅ Improve cross-procedure communication between chat and project routers
- ✅ Implement build worker optimization with worker pool and concurrency limits
- ✅ Add test coverage for custom component build worker

### HIGH Priority - Remaining
- Implement UI indicators for status changes during streaming

### HIGH Priority - Completed ✅
- ✅ Migrate client code to use the new streaming API instead of legacy sendMessage
- ✅ Update front-end to properly handle streaming event types
- ✅ Create comprehensive test suite for streaming interactions

### MEDIUM Priority - Completed ✅
- ✅ Ensure proper final database updates in all success/error paths
- ✅ Fix type handling in retryWithBackoff utility
- ✅ Update documentation to reflect the new streaming architecture

### MEDIUM Priority - Remaining
- Add client-side metrics collection for response times
- Implement more granular error handling for specific failure cases
- Expand test coverage for build worker to include integration tests
- Add performance benchmarks for build worker optimization

## Sprint 5-6: Dynamic Remotion Component Generation

### HIGH Priority - Completed ✅
- ✅ Create `customComponentJobs` table in the database schema
- ✅ Create tRPC router for component operations (create, status, list)
- ✅ Implement build worker process using esbuild
- ✅ Set up R2 integration for component hosting
- ✅ Create React.lazy dynamic component loader
- ✅ Update scene registry to support 'custom' scene type
- ✅ Set up secure sandbox for component generation (code sanitization)

### HIGH Priority - Completed ✅
- ✅ Create Drizzle migration for the new `customComponentJobs` table (0003_tired_sir_ram.sql)

### MEDIUM Priority - Completed ✅
- ✅ Build UI components for job status monitoring (`CustomComponentStatus.tsx`)
- ✅ Implement client-side polling for job status updates
- ✅ Add error handling and retry logic for build process
- ✅ Add verification and validation for generated components

### MEDIUM Priority - Remaining
- Test end-to-end component generation workflow
- Update chat UI to display component status during generation
- Improve component generation detection logic in chat router
- Review and extend the Remotion/React import post-processing logic as new primitives or custom patterns are introduced in the LLM pipeline.
- Monitor for edge cases or import conflicts in user-generated components.

### MEDIUM Priority - Completed ✅
- ✅ Create documentation for the custom component system

### MEDIUM Priority - Completed ✅
- ✅ Implement OpenAI function calling schema for component generation
- ✅ Create TSX code generation prompt for the LLM (using official Remotion prompt)
- fix  // 2.5. Check if this is a custom component request
    if (message.toLowerCase().includes("custom component") || 
        message.toLowerCase().includes("create effect") || 
        message.toLowerCase().includes("make effect") ||
        message.toLowerCase().includes("generate component")) {
      return await handleCustomComponentRequest(ctx, projectId, message, userMessage.id);
    } .... this is not a potimal way  - most of the user prompts are related to custom compoennts anyways - so we should handle this in a more generic way..

### MEDIUM Priority - Completed ✅
- ✅ Set up environment variables for R2 configuration

### LOW Priority - Completed ✅
- ✅ Create insertion mechanism for custom components (`InsertCustomComponentButton.tsx`)

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
