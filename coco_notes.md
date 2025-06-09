# COMPREHENSIVE REPOSITORY CLEANUP COMPLETED ✅
# Phase 1-4: ALL CLEANUP TASKS COMPLETED
# - Deleted entire A2A system, simplified chat router (1089→32 lines)
# - Removed unused frontend components & consolidated OpenAI clients  
# - Only kept production code: ChatPanelG → generation.generateScene → MCP tools
# - Build works, dev server works, all functionality preserved
# See: memory-bank/COMPREHENSIVE-CLEANUP-SUMMARY.md for full details

# main functionality

src/app/projects/[id]/generate/page.tsx
src/app/projects/[id]/generate/workspace/WorkspaceContentAreaG.tsx
src/app/projects/[id]/generate/workspace/GenerateWorkspaceRoot.tsx
src/app/projects/[id]/generate/workspace/panels/TemplatesPanelG.tsx
src/app/projects/[id]/generate/workspace/panels/StoryboardPanelG.tsx
src/app/projects/[id]/generate/workspace/panels/CodePanelG.tsx
src/app/projects/[id]/generate/workspace/panels/ChatPanelG.tsx
src/app/projects/[id]/generate/workspace/panels/PreviewPanelG.tsx
src/app/projects/[id]/generate/workspace/GenerateSidebar.tsx

# backend - UPDATED PATHS AFTER CLEANUP
src/server/api/routers/generation.ts
src/server/services/brain/orchestrator.ts
src/server/services/brain/sceneRepository.service.ts
src/server/services/mcp/tools/addScene.ts
src/server/services/mcp/tools/analyzeImage.ts
src/server/services/mcp/tools/changeDuration.ts
src/server/services/mcp/tools/base.ts
src/server/services/mcp/tools/createSceneFromImage.ts
src/server/services/mcp/tools/deleteScene.ts
src/server/services/mcp/tools/editScene.ts
src/server/services/mcp/tools/editSceneWithImage.ts
src/server/services/mcp/tools/fixBrokenScene.ts
src/server/services/mcp/tools/index.ts
src/server/services/generation/sceneBuilder.service.ts
src/server/services/data/projectMemory.service.ts
src/server/services/generation/layoutGenerator.service.ts
src/server/services/generation/directCodeEditor.service.ts
src/server/services/generation/codeGenerator.service.ts
src/server/services/ai/aiClient.service.ts
src/server/services/data/dataLifecycle.service.ts
src/config/models.config.ts
src/config/prompts.config.ts