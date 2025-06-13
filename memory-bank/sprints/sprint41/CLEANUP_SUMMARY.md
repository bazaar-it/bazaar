# Sprint 41 Cleanup Summary

## What We Deleted

### 1. Old MCP Tools Directory
- **Location**: `/src/server/services/mcp/tools/`
- **Reason**: Replaced by simplified tools in `/src/tools/`
- **Impact**: Cleaner codebase, single implementation

### 2. Old Orchestrator Files
- **Deleted**:
  - `/src/server/services/brain/orchestrator.ts` (2442 lines)
  - `/src/server/services/brain/orchestrator.simplified.ts`
  - `/src/server/services/brain/orchestrator_functions/toolSelector.ts`
  - `/src/server/services/brain/orchestrator_functions/toolExecutor.ts`
  - `/src/server/services/brain/orchestrator_functions/contextExtractor.ts`
  - `/src/server/services/brain/orchestrator_functions/contextPreparer.ts`
- **Kept**: 
  - `orchestratorNEW.ts` (decision-only)
  - `contextBuilder.ts`, `intentAnalyzer.ts`, `types.ts` (still used)

## Current Architecture (Sprint 41)

```
User Input → ChatPanelG → generation.ts → orchestratorNEW (decision) 
→ generation.ts (execution) → tools → database → UI update
```

### Key Components
1. **Brain** (`/src/brain/orchestratorNEW.ts`): Makes decisions only
2. **Generation** (`/src/server/api/routers/generation.ts`): Executes tools
3. **Tools** (`/src/tools/`): Add, Edit, Delete scenes
4. **UI** (`ChatPanelG.tsx`): Sends requests, handles responses

## Field Naming (Zero Transformation)
- `tsxCode` (not sceneCode)
- `name` (not sceneName)
- Direct database field names everywhere

## TODO
- [ ] Update eval runner to use new architecture
- [ ] Test all operations end-to-end
- [ ] Performance testing

## Benefits Achieved
1. **Simpler**: 3 tools instead of 10+
2. **Cleaner**: Single implementation path
3. **Faster**: Direct execution, no extra layers
4. **Smarter**: AI-generated context-aware responses
5. **Modular**: Clear separation of concerns