# Sprint 106: Hybrid TSX/JS Compilation - Implementation Review

## Overview
We successfully implemented a hybrid compilation system that stores both TSX (source) and compiled JS in the database, eliminating client-side compilation overhead for video preview.

## Problem Statement
- **Initial Issue**: 60% success rate for video generation (625 errors in 30 days)
- **Root Cause**: Client-side compilation happening in 9 different locations
- **Performance Impact**: Each scene compilation taking 100-200ms in browser
- **Reliability**: Compilation failures breaking entire video preview

## Solution Implemented: Hybrid Approach
Instead of full server-side compilation or continuing with client-side only, we implemented a hybrid system:
- Store BOTH TSX (source) and compiled JS in database
- Compile TSX → JS at generation time (future work)
- Use pre-compiled JS when available, fallback to client compilation
- Progressive rollout starting with PreviewPanelG

## What We Built

### 1. Database Schema Changes
**File**: `/drizzle/migrations/0016_add_scene_js_compilation.sql`
```sql
ALTER TABLE "bazaar-vid_scene" 
ADD COLUMN "js_code" text,              -- Pre-compiled JavaScript
ADD COLUMN "js_compiled_at" timestamp,   -- When compiled
ADD COLUMN "compilation_error" text;     -- Error tracking
```

**Status**: ✅ Applied to dev database

### 2. Compilation Utility
**File**: `/src/server/utils/compile-scene.ts`
```typescript
export function compileSceneToJS(tsxCode: string): CompilationResult {
  // Uses Sucrase to compile TSX → JS
  // Same transform used in client, but on server
  const { code: jsCode } = transform(tsxCode, {
    transforms: ['typescript', 'jsx'],
    production: true,
    jsxRuntime: 'classic'
  });
  return { success: true, jsCode, compiledAt: new Date() };
}
```

**Status**: ✅ Created and tested

### 3. PreviewPanelG Integration
**File**: `/src/app/projects/[id]/generate/workspace/panels/PreviewPanelG.tsx`

**Key Changes**:
```typescript
// Before: Always compile in browser
const { code: transformed } = transform(sceneCode, {...});

// After: Use pre-compiled JS when available
if (preCompiledJS) {
  console.log(`🚀 Using pre-compiled JS for scene ${index}`);
  // Clean export statements that break Function constructor
  let cleanCompiledJS = preCompiledJS
    .replace(/export\s+default\s+function\s+(\w+)/g, 'function $1')
    .replace(/export\s+const\s+/g, 'const ');
  transformedCode = cleanCompiledJS;
} else {
  console.log(`⚠️ No pre-compiled JS, using client-side compilation`);
  // Fallback to old behavior
}
```

**Critical Fix**: Had to remove `export` statements from compiled JS since Function constructor doesn't support them.

**Status**: ✅ Working in preview

### 4. Test Results
**Test Project**: b1d9fd38-78b9-44ec-9e35-b14b31ee4142 (Logo Unveiling)
- 5 scenes successfully compiled
- JS code stored in database
- Preview now using pre-compiled JS
- Console shows: "🚀 Using pre-compiled JS for scene"
- No more compilation errors

## Technical Discoveries

### 1. Data Flow
```
Database (scenes table)
  ├── tsxCode (original)
  └── jsCode (compiled)
         ↓
API (getProjectScenes)
         ↓
PreviewPanelG
  ├── Receives both tsxCode and jsCode
  ├── Transforms to scene.data structure
  └── Uses jsCode if available
```

### 2. Compilation Context Issues
The compiled JS still contains:
- `export default function` statements
- `export const` statements
- Module syntax that doesn't work in Function constructor

We handle this by stripping exports during usage, not during compilation.

### 3. Performance Gains
- **Before**: 100-200ms per scene compilation in browser
- **After**: 0ms (pre-compiled JS already ready)
- **Total Savings**: 500-1000ms for 5-scene project

## What's Still Needed

### Immediate Next Steps
1. **Update Scene Creation** ⏳
   - Compile TSX → JS when scenes are created/edited
   - Store both in database atomically
   
2. **Tool Integration** ⏳
   - Update Add tool to compile and save JS
   - Update Edit tool to recompile after changes
   
3. **Gradual Rollout** ⏳
   - CodePanelG (for code view)
   - TemplatesPanelG (for template preview)
   - MyProjectsPanelG (for project cards)
   - ShareVideoPlayerClient (for shared videos)

### Future Considerations
1. **Backfill Existing Scenes**
   - ~1000 scenes need compilation
   - Can be done gradually or in batch job

2. **Lambda Rendering**
   - MainCompositionSimple.tsx also compiles
   - Could use pre-compiled JS there too

3. **Error Recovery**
   - What if compilation fails?
   - Should we store error and retry?

## Metrics to Track
- Compilation success rate
- Preview load time
- Auto-fix trigger frequency
- Client-side fallback usage

## Risk Assessment
- **Low Risk**: Backward compatible (fallback to client compilation)
- **Medium Risk**: Export statement cleaning might miss edge cases
- **Mitigated**: Progressive rollout, starting with preview only

## Sprint 106 Status
**Completed**:
- ✅ Database schema migration
- ✅ Compilation utility
- ✅ PreviewPanelG integration  
- ✅ Test with real project
- ✅ Fix export statement issues

**In Progress**:
- ⏳ Scene creation integration
- ⏳ Tool updates

**Not Started**:
- ⬜ Other panel integrations
- ⬜ Backfill existing scenes
- ⬜ Production deployment

## Conclusion
The hybrid approach successfully eliminates client-side compilation overhead while maintaining backward compatibility. The system is working in dev with real data, proving the concept. Next step is to integrate compilation into the scene creation flow so all new scenes automatically get pre-compiled JS.