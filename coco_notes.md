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

# backend
src/server/api/routers/generation.ts src/server/services/brain/orchestrator.ts
src/server/services/brain/sceneRepository.service.ts src/lib/services/mcp-tools/addScene.ts
src/lib/services/mcp-tools/analyzeImage.ts
src/lib/services/mcp-tools/changeDuration.ts
src/lib/services/mcp-tools/base.ts
src/lib/services/mcp-tools/createSceneFromImage.ts
src/lib/services/mcp-tools/deleteScene.ts
src/lib/services/mcp-tools/editScene.ts
src/lib/services/mcp-tools/editSceneWithImage.ts
src/lib/services/mcp-tools/fixBrokenScene.ts
src/lib/services/mcp-tools/index.ts
src/lib/services/stressTest.service.ts
src/lib/services/sceneBuilder.service.ts
src/lib/services/projectMemory.service.ts
src/lib/services/layoutGenerator.service.ts
src/lib/services/directCodeEditor.service.ts
src/lib/services/contextBuilder.service.ts
src/lib/services/codeGenerator.service.ts
src/lib/services/aiClient.service.ts
src/lib/services/performance.service.ts
src/lib/services/dataLifecycle.service.ts. src/config/models.config.ts
src/config/prompts.config.ts