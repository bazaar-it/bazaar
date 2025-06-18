# Final Verified Dependency Analysis - Sprint 42

## Overview
This document provides a systematic dependency analysis starting from UI entry points, showing what's actually being used versus what can be safely deleted.

## Current Architecture Flow

```
UI Entry Points (Pages)
    ↓
Panel Components (ChatPanelG, etc.)
    ↓
API Calls (tRPC)
    ↓
Routers (generation.clean.ts)
    ↓
Services & Tools
```

## 1. Active Dependencies (Currently Being Used)

### UI Layer Dependencies
```
/src/app/projects/[id]/generate/page.tsx
  └─ GenerateWorkspaceRoot
      └─ WorkspaceContentAreaG
          ├─ ChatPanelG → uses generation.generateScene
          ├─ PreviewPanelG → uses scenes.getAll
          ├─ StoryboardPanelG → uses scenes operations
          ├─ CodePanelG → direct state access
          └─ TemplatesPanelG → uses generation operations
```

### API Router Dependencies (from root.ts)
```
Active Routers:
✓ generation.clean.ts (NEW - replacing generation.ts)
✓ project.ts
✓ chat.ts
✓ render.ts
✓ voice.ts
✓ feedback.ts
✓ emailSubscriber.ts
✓ scenes.ts
✓ share.ts
✓ admin.ts
```

### Service Dependencies (NEW Architecture)
```
generation.clean.ts imports:
  ├─ /brain/orchestratorNEW.ts
  ├─ /tools/add/add.ts
  ├─ /tools/edit/edit.ts
  ├─ /tools/delete/delete.ts
  ├─ /services/database.service.ts
  ├─ /services/background.service.ts
  └─ /services/data/projectMemory.service.ts  ← Still using old service!
```

### Tool Dependencies
```
/tools/add/add.ts
  └─ /tools/add/add_helpers/*NEW.ts files

/tools/edit/edit.ts
  └─ /tools/edit/edit_helpers/*NEW.ts files

All tools are now pure functions (TICKET-003 ✓)
```

## 2. Transition Status (Per Sprint 42 Tickets)

### TICKET-003: Refactor Tools to Pure Functions ✅
- Status: COMPLETED
- All tools refactored to pure functions
- No database access in tools

### TICKET-004: Move Database Operations to Router ✅
- Status: COMPLETED
- generation.clean.ts created with all DB operations
- But still imports projectMemory.service.ts from old architecture

### TICKET-005: Enhance Brain for Smart Context Building 🚧
- Status: IN PROGRESS
- Brain uses some old services for context building

### TICKET-006: Optimize ChatPanelG for Speed 🚧
- Status: WAITING
- ChatPanelG needs to be updated to use new API

## 3. Files Still Being Used (Cannot Delete)

### Old Services Still Active
```
/src/server/services/
├─ ai/                          # ✓ KEEP - Used for OpenAI utilities
├─ data/
│  └─ projectMemory.service.ts  # ✓ KEEP - Used by generation.clean.ts
└─ brain/
   └─ contextBuilder.service.ts # ✓ KEEP - Used by brain functions
```

### Utilities Still Referenced
```
/src/lib/
├─ openai.ts    # Used by AI services
├─ r2.ts        # Used for storage
├─ utils.ts     # Used everywhere
└─ evals/       # Marked "DO NOT DELETE" in CLAUDE.md
```

## 4. Verified Safe to Delete (17 files)

### Backup Files (2)
```bash
rm src/server/api/root.ts.backup
rm src/server/services/brain/contextBuilder.service.ts.backup
```

### Old Router Implementations (4)
```bash
rm src/server/api/routers/generation.old.ts
rm src/server/api/routers/generation.simplified.ts
rm src/server/api/routers/generation.universal.ts
rm src/server/api/routers/stock.ts
```

### Duplicate Store Implementations (3)
```bash
rm src/stores/videoState-simple.ts
rm src/stores/videoState-hybrid.ts
rm src/stores/videoState.normalized.ts
```

### Unused UI Components (1)
```bash
rm src/app/projects/[id]/generate/workspace/panels/PreviewPanelG-simple.tsx
```

### Test Files for Non-Existent Code (2)
```bash
rm src/server/services/brain/__tests__/orchestrator.test.ts
rm src/server/api/routers/__tests__/generation.test.ts
```

### Broken/Empty Files (1)
```bash
rm src/server/services/mcp/index.ts  # Exports non-existent './tools'
```

### Unused API Helpers (4)
```bash
rm -rf src/lib/api/  # Contains unused universal response implementation
```

## 5. Files That LOOK Unused But Are Actually Used

### generation.ts
- Status: Still imported by utilities and eval runner
- Can delete AFTER updating imports to use generation.clean.ts

### Old Scene Services
- Status: Some still imported by brain context builder
- Need to update brain imports first

### Brain Services
- contextBuilder.service.ts - Used by orchestrator functions
- Others may be unused but need verification

## 6. Migration Path for Additional Cleanup

To delete more files, complete these migrations:

1. **Update ChatPanelG** to use generation.clean.ts endpoints
2. **Update brain functions** to not import old services
3. **Move projectMemory.service.ts** logic to database.service.ts
4. **Update eval runner** to use new architecture

## 7. Summary

### Immediate Deletions: 17 files
- All verified with no active imports
- Safe to delete right now

### Potential Future Deletions: ~50 files
- Require migration of dependencies first
- Mostly in /server/services/ directory

### Must Keep: ~100 files
- Active routers, tools, utilities
- New service architecture
- UI components

## Commands for Safe Deletion

```bash
# Run from project root
# Total: 17 files

# Delete backup files (2)
find . -name "*.backup" -type f -delete

# Delete old routers (4)
rm src/server/api/routers/generation.old.ts
rm src/server/api/routers/generation.simplified.ts
rm src/server/api/routers/generation.universal.ts
rm src/server/api/routers/stock.ts

# Delete duplicate stores (3)
rm src/stores/videoState-simple.ts
rm src/stores/videoState-hybrid.ts
rm src/stores/videoState.normalized.ts

# Delete unused UI (1)
rm src/app/projects/[id]/generate/workspace/panels/PreviewPanelG-simple.tsx

# Delete old tests (2)
rm src/server/services/brain/__tests__/orchestrator.test.ts
rm src/server/api/routers/__tests__/generation.test.ts

# Delete broken file (1)
rm src/server/services/mcp/index.ts

# Delete unused API helpers (4)
rm -rf src/lib/api/

# Verify everything still works
npm run typecheck
npm run build
```

## Notes

1. The dramatic reduction from 150 to 17 files shows many "old" services are still actively used
2. The new architecture is using a hybrid approach - new routers/tools but some old services
3. Full cleanup requires completing the migration, not just deleting files