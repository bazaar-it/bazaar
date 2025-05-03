# TODO Items

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
transformTransition string uses transition CSS—irrelevant in video render context. Remove the transition: rule; browser doesn’t animate between frames in Remotion.

### MEDIUM
Scene data typing
You down-cast Record<string,unknown> each time.   Consider declaring per-scene Zod schemas (e.g. backgroundColorSceneSchema) so the LLM patch can be validated before hitting the player.   Saves runtime guards.

### LOW
ParticlesScene opacity calc
Math.sin((frame / fps) * 2 + index) means amplitude depends on FPS; use constant: Math.sin(frame * 0.2 + index).

### LOW
svgIcons registry
Good, but keep SVGs tiny (<100×100); Remotion rasterizes them.   Large path counts will slow renders.
