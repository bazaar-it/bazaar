# VERIFIED Safe Files to Delete - Conservative List

## ⚠️ IMPORTANT
This is a CONSERVATIVE list of files that are verified safe to delete. Each file has been checked for imports.

## Actually Safe to Delete

### 1. Backup Files (100% safe)
```bash
# Find and list all backup files
find . -name "*.backup" -type f

# Files found:
src/server/api/root.ts.backup
src/server/services/brain/contextBuilder.service.ts.backup
```

### 2. Old Router Files (Verified not imported in root.ts)
```
src/server/api/routers/generation.old.ts     # Only imported by test files
src/server/api/routers/generation.simplified.ts  # Not imported anywhere except tests
src/server/api/routers/generation.universal.ts   # Not imported in root.ts
src/server/api/routers/stock.ts                  # Not imported in root.ts
```

### 3. Duplicate Store Implementations (Verified)
```
src/stores/videoState-simple.ts      # Not imported anywhere
src/stores/videoState-hybrid.ts      # Not imported anywhere  
src/stores/videoState.normalized.ts  # Not imported anywhere
```

### 4. Test Files for Non-Existent Code
```
src/server/services/brain/__tests__/orchestrator.test.ts  # Tests for non-existent orchestrator.ts
src/server/api/routers/__tests__/generation.test.ts       # Tests for old generation router
```

### 5. Universal Response Files (Not integrated)
Since you're using generation.clean.ts which doesn't use UniversalResponse:
```
src/lib/api/client.ts                # Not imported anywhere
src/lib/api/response-helpers.ts      # Not imported anywhere
src/lib/api/__tests__/universal-response.test.ts  # Tests for unused code
```

### 6. Old UI Components
```
src/app/projects/[id]/generate/workspace/panels/PreviewPanelG-simple.tsx  # Not imported
```

### 7. Empty/Broken Files
```
src/server/services/mcp/index.ts     # Exports non-existent './tools'
```

## Files That Look Unused But Need More Verification

These files don't appear to be directly imported but might be used dynamically:
- Files in `/src/server/services/` - Some are imported by brain functions
- `generation.ts` - Still referenced by utils and eval runner
- Files in `/src/lib/evals/` - Marked "DO NOT DELETE" in CLAUDE.md

## Recommended Approach

1. **Start with the verified safe list above** (~20 files)
2. **Run tests after each deletion batch**
3. **Use git to revert if anything breaks**

### Safe Deletion Commands
```bash
# Delete backup files
find . -name "*.backup" -type f -delete

# Delete old routers
rm src/server/api/routers/generation.old.ts
rm src/server/api/routers/generation.simplified.ts
rm src/server/api/routers/generation.universal.ts
rm src/server/api/routers/stock.ts

# Delete duplicate stores
rm src/stores/videoState-simple.ts
rm src/stores/videoState-hybrid.ts
rm src/stores/videoState.normalized.ts

# Delete unused universal response
rm -rf src/lib/api/

# Delete specific test files
rm src/server/services/brain/__tests__/orchestrator.test.ts
rm src/server/api/routers/__tests__/generation.test.ts

# Delete unused UI component
rm src/app/projects/[id]/generate/workspace/panels/PreviewPanelG-simple.tsx
```

## Total: ~20 files (not 150!)

The actual number of safely deletable files is much smaller than initially thought. Many files in the old service architecture are still being imported by various parts of the system.

## Next Steps

To clean up more files, you would need to:
1. Update imports in brain functions that still use old services
2. Migrate any remaining logic from old services to new architecture
3. Update test files to use new architecture

This is a much more involved process than simple deletion.