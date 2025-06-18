# Final List of Files Safe to Delete - Sprint 42

## Context
Based on complete dependency analysis, these files have been verified as having NO imports from any active code paths in the NEW architecture.

## 1. Backup Files (Delete Immediately)
```bash
rm src/server/api/root.ts.backup
rm src/server/services/brain/contextBuilder.service.ts.backup
```

## 2. Old Router Files (Verified Not Used)
```bash
# These are NOT imported in root.ts or anywhere else
rm src/server/api/routers/generation.old.ts
rm src/server/api/routers/generation.simplified.ts  
rm src/server/api/routers/generation.universal.ts
rm src/server/api/routers/stock.ts
```

## 3. Duplicate VideoState Stores (Confirmed Orphaned)
```bash
# Only videoState.ts is imported, these variants are not used
rm src/stores/videoState-simple.ts
rm src/stores/videoState-hybrid.ts
rm src/stores/videoState.normalized.ts
```

## 4. Old UI Components
```bash
rm src/app/projects/[id]/generate/workspace/panels/PreviewPanelG-simple.tsx
```

## 5. Test Files for Non-Existent Code
```bash
rm src/server/services/brain/__tests__/orchestrator.test.ts
rm src/server/api/routers/__tests__/generation.test.ts
```

## 6. Unused API Response Helpers (Not integrated with clean router)
```bash
# generation.clean.ts uses its own response building
rm -rf src/lib/api/
```

## 7. Empty/Broken Service Files
```bash
rm src/server/services/mcp/index.ts  # Exports non-existent './tools'
```

## Total: 17 Files

### Single Command to Delete All:
```bash
# Run from project root
rm src/server/api/root.ts.backup \
   src/server/services/brain/contextBuilder.service.ts.backup \
   src/server/api/routers/generation.old.ts \
   src/server/api/routers/generation.simplified.ts \
   src/server/api/routers/generation.universal.ts \
   src/server/api/routers/stock.ts \
   src/stores/videoState-simple.ts \
   src/stores/videoState-hybrid.ts \
   src/stores/videoState.normalized.ts \
   src/app/projects/[id]/generate/workspace/panels/PreviewPanelG-simple.tsx \
   src/server/services/brain/__tests__/orchestrator.test.ts \
   src/server/api/routers/__tests__/generation.test.ts \
   src/server/services/mcp/index.ts && \
rm -rf src/lib/api/
```

## Files That Need Migration First

These files CANNOT be deleted yet because they're still being used:

1. **generation.ts** - Still used by `getProjectScenes` query in ChatPanelG
   - Migration: Already added to generation.clean.ts, need to update ChatPanelG import

2. **/src/server/services/** - Many subdirectories still imported by brain functions
   - Need to check each service usage before deletion

3. **Old brain services** - Check if new orchestrator still uses any

## Next Steps

1. Delete the 17 files listed above (safe)
2. Update ChatPanelG to use generation.clean.ts for getProjectScenes
3. Then delete generation.ts
4. Analyze remaining service dependencies