# Complete Dependency Analysis - Sprint 42

## Executive Summary

This analysis traces all dependencies from UI entry points to services, identifying which files are actively used by the NEW architecture vs orphaned files from old implementations.

## Current Architecture Flow

### Primary Entry Points

1. **Main Generate Page**: `/src/app/projects/[id]/generate/page.tsx`
   - Loads project data from database
   - Renders `GenerateWorkspaceRoot`
   
2. **Dashboard**: `/src/app/dashboard/page.tsx`
   - Lists user projects
   
3. **Admin Pages**: `/src/app/admin/**/*.tsx`
   - User management, analytics, testing

### Core UI Components (Active)

```
GenerateWorkspaceRoot
├── WorkspaceContentAreaG
│   ├── ChatPanelG ✅ (Primary interface)
│   ├── PreviewPanelG ✅
│   ├── CodePanelG ✅ 
│   ├── StoryboardPanelG ✅
│   ├── TemplatesPanelG ✅
│   └── MyProjectsPanelG ✅
└── GenerateSidebar ✅
```

## NEW Architecture Dependencies

### 1. ChatPanelG → Backend Flow

```
ChatPanelG
├── api.generation.generateScene → generation.clean.ts ✅
├── api.generation.getProjectScenes → generation.ts (OLD - needs migration)
├── api.chat.getMessages → chat.ts (simplified)
└── useVideoState (Zustand store)
```

### 2. generation.clean.ts Dependencies ✅

```
generation.clean.ts (NEW - TICKET-004 Complete)
├── orchestrator (~/brain/orchestratorNEW.ts)
│   ├── ContextBuilder
│   └── IntentAnalyzer
├── Tools (Pure Functions - TICKET-003 Complete)
│   ├── addTool (~/tools/add/add.ts)
│   ├── editTool (~/tools/edit/edit.ts)
│   └── deleteTool (~/tools/delete/delete.ts)
├── databaseService (NEW - handles all DB ops)
├── backgroundTaskService (NEW - async operations)
└── projectMemoryService (for image analysis)
```

### 3. Active Service Dependencies

#### Used by NEW Architecture:
- `/src/server/api/services/database.service.ts` ✅
- `/src/server/api/services/background.service.ts` ✅ 
- `/src/server/api/services/data/projectMemory.service.ts` ✅
- `/src/server/services/ai/openai.service.ts` ✅ (used by tools)
- `/src/server/services/storage/r2.service.ts` ✅ (component storage)

#### Used by Brain Orchestrator:
- Image analysis services (for vision features)
- Context building helpers

## OLD Architecture Files (Can Be Deleted)

### 1. Old Routers (Verified Safe)
- `generation.old.ts` - Not imported in root.ts
- `generation.simplified.ts` - Not imported  
- `generation.universal.ts` - Not imported (replaced by clean)
- `stock.ts` - Not imported

### 2. Old Services (Need Migration Check)
- `/src/server/services/generation/` - Most replaced by tools
- `/src/server/services/brain/` - Old orchestrator (replaced)
- `/src/server/services/mcp/` - Check if brain uses these

### 3. Duplicate Stores (Safe to Delete)
- `videoState-simple.ts`
- `videoState-hybrid.ts`
- `videoState.normalized.ts`

### 4. Unused UI (Safe)
- `PreviewPanelG-simple.tsx`

## Migration Status (Sprint 42)

### ✅ Completed:
- TICKET-001: Generate types from schema
- TICKET-002: Universal response format (partial)
- TICKET-003: Tools to pure functions
- TICKET-004: Database operations to router

### 🚧 In Progress:
- TICKET-005: Brain enhancements
- TICKET-006: ChatPanelG optimization

### ⏳ Not Started:
- TICKET-007: Real-time preview
- TICKET-008: Edit with image

## Critical Dependencies to Keep

1. **Evaluation Framework**: `/src/lib/evals/` (DO NOT DELETE - per CLAUDE.md)
2. **MCP Tools**: Check brain usage before deleting
3. **generation.ts**: Still used by `getProjectScenes` - needs migration

## Recommendations

### Immediate Actions:
1. Delete verified safe files (~20 files)
2. Migrate `getProjectScenes` to generation.clean.ts
3. Update ChatPanelG to use only clean router

### Next Sprint:
1. Complete brain orchestrator migration
2. Remove old service layer completely
3. Consolidate image handling services

## File Count Summary

- **Active Files**: ~150 (used by current architecture)
- **Transition Files**: ~30 (being migrated)
- **Safe to Delete**: ~20 (no dependencies)
- **Need Analysis**: ~50 (unclear usage)

Total potential cleanup: ~70 files after full migration