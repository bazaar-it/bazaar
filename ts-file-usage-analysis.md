# TypeScript File Usage Analysis

## Methodology
- Analyzed all .ts files in key directories
- Traced import chains from entry points (root.ts, trpc.ts, etc.)
- Categorized files as USED, UNUSED, TEST, or TYPE

## USED FILES (Actively imported and executed)

### Core Infrastructure
- `src/server/api/root.ts` - Main API router entry point
- `src/server/api/trpc.ts` - tRPC setup and context
- `src/trpc/server.ts` - Server-side tRPC client
- `src/server/db/index.ts` - Database connection
- `src/server/db/schema.ts` - Database schema definitions
- `src/server/db/schema/index.ts` - Schema exports
- `src/server/auth/index.ts` - Authentication setup
- `src/server/auth/config.ts` - Auth configuration
- `src/server/init.ts` - Server initialization
- `src/server/lib/openai.ts` - OpenAI client
- `src/server/lib/r2.ts` - Cloudflare R2 storage

### Active API Routers (imported by root.ts)
- `src/server/api/routers/project.ts` - Project management
- `src/server/api/routers/chat.ts` - Chat functionality
- `src/server/api/routers/render.ts` - Video rendering
- `src/server/api/routers/generation.ts` - Scene generation (active)
- `src/server/api/routers/voice.ts` - Voice/TTS
- `src/server/api/routers/feedback.ts` - User feedback
- `src/server/api/routers/emailSubscriber.ts` - Email subscriptions
- `src/server/api/routers/scenes.ts` - Scene management
- `src/server/api/routers/share.ts` - Project sharing
- `src/server/api/routers/admin.ts` - Admin functions

### Active Brain/Orchestrator (imported by generation.ts)
- `src/brain/orchestratorNEW.ts` - Main orchestrator
- `src/brain/orchestrator_functions/contextBuilder.ts` - Context building
- `src/brain/orchestrator_functions/intentAnalyzer.ts` - Intent analysis
- `src/brain/orchestrator_functions/types.ts` - Orchestrator types
- `src/brain/config/models.config.ts` - Model configuration
- `src/brain/config/prompts.config.ts` - Prompt templates

### Active Tools (imported by generation.ts)
- `src/tools/add/add.ts` - Add scene tool
- `src/tools/edit/edit.ts` - Edit scene tool
- `src/tools/delete/delete.ts` - Delete scene tool
- `src/tools/helpers/base.ts` - Base tool class
- `src/tools/helpers/types.ts` - Tool type definitions
- `src/tools/add/add_helpers/CodeGeneratorNEW.ts` - Code generation
- `src/tools/add/add_helpers/ImageToCodeGeneratorNEW.ts` - Image to code
- `src/tools/add/add_helpers/layoutGeneratorNEW.ts` - Layout generation
- `src/tools/edit/edit_helpers/BaseEditorNEW.ts` - Base editor
- `src/tools/edit/edit_helpers/CreativeEditorNEW.ts` - Creative editing
- `src/tools/edit/edit_helpers/ErrorFixerNEW.ts` - Error fixing
- `src/tools/edit/edit_helpers/SurgicalEditorNEW.ts` - Surgical editing

### Active Utilities (imported throughout)
- `src/lib/utils.ts` - General utilities
- `src/lib/cn.ts` - Class name utilities
- `src/lib/logger.ts` - Logging utilities
- `src/lib/nameGenerator.ts` - Name generation
- `src/lib/patch.ts` - JSON patch utilities

### Active Stores (used by UI components)
- `src/stores/videoState.ts` - Main video state store

### Services Used by Routers
- `src/server/queries/getUserProjects.ts` - Database queries
- `src/server/constants/chat.ts` - Chat constants
- `src/server/utils/tsxPreprocessor.ts` - TSX preprocessing

## UNUSED FILES (Never imported)

### Old Generation Router Versions
- `src/server/api/routers/generation.old.ts`
- `src/server/api/routers/generation.simplified.ts`
- `src/server/api/routers/generation.universal.ts`
- `src/server/api/routers/stock.ts`

### Unused Services
- `src/server/services/ai/aiClient.service.ts`
- `src/server/services/ai/conversationalResponse.service.ts`
- `src/server/services/ai/titleGenerator.service.ts`
- `src/server/services/base/StandardSceneService.ts`
- `src/server/services/brain/contextBuilder.service.ts`
- `src/server/services/brain/preferenceExtractor.service.ts`
- `src/server/services/brain/sceneRepository.service.ts`
- `src/server/services/data/dataLifecycle.service.ts`
- `src/server/services/data/projectMemory.service.ts`
- `src/server/services/data/versionHistory.service.ts`
- `src/server/services/generation/codeGenerator.service.ts`
- `src/server/services/generation/directCodeEditor.service.ts`
- `src/server/services/generation/layoutGenerator.service.ts`
- `src/server/services/generation/sceneAnalyzer.service.ts`
- `src/server/services/generation/sceneBuilder.service.ts`
- `src/server/services/generation/sceneBuilder.service.updated.ts`
- `src/server/services/scene/add/CodeGenerator.ts`
- `src/server/services/scene/add/ImageToCodeGenerator.ts`
- `src/server/services/scene/add/LayoutGenerator.ts`
- `src/server/services/scene/delete/SceneDeleter.ts`
- `src/server/services/scene/edit/BaseEditor.ts`
- `src/server/services/scene/edit/CreativeEditor.ts`
- `src/server/services/scene/edit/ErrorFixer.ts`
- `src/server/services/scene/edit/SurgicalEditor.ts`
- `src/server/services/scene/scene.service.ts`

### Unused Store Variants
- `src/stores/videoState-hybrid.ts`
- `src/stores/videoState-simple.ts`
- `src/stores/videoState.normalized.ts`

### Unused Tools/Helpers
- `src/tools/sceneBuilderNEW.ts`
- `src/tools/helpers/index.ts`

### Unused Evaluation Framework
- `src/lib/evals/enhanced-runner.ts`
- `src/lib/evals/performance-runner.ts`
- `src/lib/evals/prompt-optimizer.ts`
- `src/lib/evals/registry.ts`
- `src/lib/evals/runner.ts`
- `src/lib/evals/suites/basic-prompts.ts`
- `src/lib/evals/suites/bazaar-vid-pipeline.ts`
- `src/lib/evals/suites/model-pack-performance.ts`
- `src/lib/evals/types.ts`

### Unused Utilities
- `src/lib/analytics.ts`
- `src/lib/api/client.ts`
- `src/lib/api/response-helpers.ts`
- `src/lib/client/sceneUpdater.ts`
- `src/lib/events/sceneEvents.ts`
- `src/lib/metrics.ts`
- `src/lib/simpleLogger.ts`
- `src/lib/unregister-service-worker.ts`
- `src/lib/utils/codeDurationExtractor.ts`
- `src/lib/utils/timeline.ts`
- `src/lib/utils/welcomeSceneUtils.ts`

### Unused Scripts
- `src/scripts/lib/db-direct.ts`
- `src/scripts/log-tools/*` (all log tools)

## TEST FILES
- `src/lib/api/__tests__/universal-response.test.ts`
- `src/server/api/routers/__tests__/generation.test.ts`
- `src/server/services/__tests__/simpleServices.test.ts`
- `src/server/services/base/__tests__/StandardSceneService.test.ts`
- `src/server/services/brain/__tests__/orchestrator.test.ts`
- `src/server/services/generation/__tests__/sceneBuilder.test.ts`
- `src/stores/__tests__/videoState.test.ts`

## TYPE DEFINITION FILES
All files in `src/lib/types/` directories are type definitions used for TypeScript type checking.

## UNCLEAR (May be dynamically imported or used by client)
- `src/server/services/mcp/index.ts` - MCP tools service
- `src/server/services/componentGenerator/adapters/flowbite.ts`
- `src/server/services/componentGenerator/sceneSpecGenerator.ts`
- Some index.ts files that may serve as barrel exports

## Summary

### Active Code Paths
1. **API Flow**: root.ts → routers → tools/brain
2. **Generation Flow**: generation.ts → orchestratorNEW → tools (add/edit/delete)
3. **Tool Flow**: tools → helpers → AI generation

### Dead Code
- Most of `/src/server/services/` directory (old architecture)
- Alternative router implementations (generation.old, generation.simplified, etc.)
- Evaluation framework (kept per instructions but unused)
- Various utility files that were replaced

### Recommendations
1. The `/src/server/services/` directory contains mostly dead code from previous architectures
2. Multiple versions of generation router exist - only `generation.ts` is active
3. The evaluation framework is preserved but not actively used
4. Many utility files could potentially be removed if confirmed unused by the UI