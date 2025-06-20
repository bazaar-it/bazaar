# /src/lib Cleanup Plan

## Overview
Comprehensive analysis and cleanup plan for the `/src/lib` directory structure.

## Current State Analysis

### 1. Dead Code Identified

#### Utilities (/src/lib/utils/)
- ✅ **DELETED**: `timeline.ts` - Already removed (broken imports, unused)
- ❌ **UNUSED**: `metrics.ts` - No imports found
- ❌ **UNUSED**: `patch.ts` - No imports found (codebase uses fast-json-patch directly)

#### Type Files
- ❌ **UNUSED**: All index.ts barrel exports (6 files)
- ❌ **UNUSED**: `/lib/types/video/storyboard.ts` - No direct imports
- ❌ **UNUSED**: `/lib/types/video/sceneLayout.ts` - Only in unused index

### 2. Active Files Summary

#### Heavily Used Utilities
- `analytics.ts` (6 imports)
- `logger.ts` (4 imports)
- `codeDurationExtractor.ts` (2 imports)
- `url.ts` (2 imports)
- `nameGenerator.ts` (1 import)

#### Type System
- All types are imported directly from specific files
- No barrel exports are used
- Consistent pattern: `import type { X } from "~/lib/types/category/specific-file"`

### 3. Inconsistencies Found
- Eval framework uses relative imports (`../types`) instead of `~` alias
- Multiple index.ts files exist but serve no purpose

## Cleanup Actions

### Phase 1: Remove Dead Code (Immediate)
```bash
# Remove unused utilities
rm src/lib/utils/metrics.ts
rm src/lib/utils/patch.ts

# Remove unused type files
rm src/lib/types/video/storyboard.ts
rm src/lib/types/video/sceneLayout.ts
```

### Phase 2: Remove Unused Barrel Exports (Careful Review)
```bash
# Remove all unused index.ts files
rm src/lib/types/index.ts
rm src/lib/types/api/index.ts
rm src/lib/types/video/index.ts
rm src/lib/types/ai/index.ts
rm src/lib/types/database/index.ts
rm src/lib/types/shared/index.ts
```

### Phase 3: Fix Inconsistencies
Update eval imports from relative to alias:
```typescript
// Change from:
import type { EvalSuite } from '../types';

// To:
import type { EvalSuite } from '~/lib/evals/types';
```

## File Structure After Cleanup

```
src/lib/
├── api/                    # API client utilities
│   ├── __tests__/
│   ├── client.ts          ✅ Active
│   └── response-helpers.ts ✅ Active
├── cn.ts                  ✅ Active (className utility)
├── evals/                 ✅ Active (evaluation framework)
│   └── [files...]         🔧 Need import path updates
├── types/                 # Type definitions
│   ├── ai/
│   │   └── brain.types.ts ✅ Active
│   ├── api/
│   │   ├── chat.ts        ✅ Active
│   │   ├── universal.ts   ✅ Active
│   │   └── README.md      📝 Documentation
│   ├── database/
│   │   └── project.ts     ✅ Active
│   ├── shared/
│   │   ├── global.d.ts    ✅ Active
│   │   └── json-patch.ts  ✅ Active
│   └── video/
│       ├── input-props.ts ✅ Active
│       ├── remotion-constants.ts ✅ Active
│       └── timeline.ts    ✅ Active (UI component types)
└── utils/                 # Utility functions
    ├── analytics.ts       ✅ Active (6 imports)
    ├── codeDurationExtractor.ts ✅ Active (2 imports)
    ├── logger.ts          ✅ Active (4 imports)
    ├── nameGenerator.ts   ✅ Active (1 import)
    └── url.ts             ✅ Active (2 imports)
```

## Benefits of Cleanup
1. **Reduced Confusion**: No duplicate filenames or unused files
2. **Clearer Intent**: Only active code remains
3. **Better Maintenance**: Easier to understand what's actually used
4. **Consistent Patterns**: All imports follow the same direct-file pattern

## Risk Assessment
- **Low Risk**: Removing unused utilities (metrics.ts, patch.ts)
- **Low Risk**: Removing unused type files (storyboard.ts, sceneLayout.ts)
- **Medium Risk**: Removing index.ts files - need to verify no external imports
- **Low Risk**: Updating eval imports to use alias

## Verification Steps
Before removing each file:
1. Run `grep -r "filename" src/` to double-check usage
2. Check for any dynamic imports or require statements
3. Run TypeScript compiler to ensure no broken imports
4. Run tests to ensure functionality remains intact

## Notes
- The codebase follows a "direct import" pattern rather than barrel exports
- This is actually good for tree-shaking and build performance
- Consider documenting this pattern in a README or contributing guide