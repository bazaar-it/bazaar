# Sprint 43: Cleanup Analysis Report

## Current State
- **Directories**: 153
- **Files**: 394

## Files to be Removed

### 1. Duplicate Brain Implementations (15 files)
```
src/app/projects/[id]/generate/agents/
├── promptOrchestrator.ts
├── sceneAgent.ts
├── styleAgent.ts
├── assetAgent.ts
├── codeGenerator.ts
├── interfaces.ts
└── index.ts

src/server/services/brain/
├── contextBuilder.service.ts
├── contextBuilder.service.ts.backup
├── preferenceExtractor.service.ts
├── sceneRepository.service.ts
├── __tests__/orchestrator.test.ts
├── ARCHITECTURE_DEEP_DIVE.md
├── README.md
└── USER_FLOW_DOCUMENTATION.md
```

### 2. Legacy Service Locations (2 files)
```
src/server/api/services/
├── database.service.ts
└── background.service.ts
```

### 3. Old Router Files (3 files)
```
src/server/api/routers/
├── generation.old.ts
├── generation.simplified.ts
└── root.ts.backup
```

### 4. Scripts to Move (not delete)
```
src/scripts/ → scripts/
- Moving to root level, not deleting
```

## Expected After Cleanup
- **Files to Remove**: ~25-30 files
- **Directories to Remove**: ~10-15 directories
- **Expected Files**: ~365-370
- **Expected Directories**: ~138-143

## Clean Structure Overview

```
src/
├── app/                    # Next.js pages only (cleaned)
├── brain/                  # Single brain location ✅
│   ├── orchestratorNEW.ts
│   └── orchestrator_functions/
├── server/
│   ├── api/
│   │   └── routers/       # Cleaned of old files
│   └── services/          # Cleaned of duplicates
├── tools/                 # MCP tools (keep)
├── lib/                   # Shared utilities
├── components/            # UI components
├── config/               # Configuration
└── stores/               # State management
```

## Benefits After Cleanup

1. **Single Source of Truth**
   - One brain implementation (src/brain/)
   - One location for services (src/server/services/)
   - One location for tools (src/tools/)

2. **Reduced Confusion**
   - No duplicate implementations
   - Clear separation of concerns
   - Easier for team to navigate

3. **Performance**
   - Smaller bundle size
   - Faster builds
   - Less code to maintain

## Safe to Remove Verification

All files marked for deletion have been verified as:
- ✅ Duplicates of existing functionality
- ✅ Legacy implementations replaced by newer versions
- ✅ Not imported by any active code
- ✅ Not referenced in package.json scripts

## Next Steps

1. Run the cleanup script
2. Verify application still builds: `npm run build`
3. Run tests: `npm test`
4. Commit the cleanup