# Dependency Analysis Report - Sprint 40

**Date**: June 14, 2025  
**Total Files Analyzed**: 345 TypeScript files in `/src`

## Executive Summary

The dependency analysis reveals:
- **118 ACTIVE files** (34%) - Currently in use and part of the active dependency chain
- **27 TRANSITIONAL files** (8%) - Will be replaced in Sprint 42 migration
- **173 ORPHANED files** (50%) - No imports, safe to delete immediately
- **25 TEST files** (7%) - Test files
- **1 GENERATED file** (<1%) - Auto-generated files

## Key Findings

### 1. Immediate Cleanup Opportunity
**173 orphaned files can be deleted NOW** without any impact on the application. These files:
- Have no imports from other files
- Are not part of the active dependency chain
- Include many old components, unused utilities, and deprecated services

### 2. Sprint 42 Migration Files
**27 files are marked for replacement** in Sprint 42:
- Old orchestrator and brain components
- Legacy tools (add, edit, delete)
- Old workspace panels and components
- These are still actively used but will be replaced by the new clean architecture

### 3. Active Core
**118 files form the active core** of the application:
- Entry points (pages, layouts, API routes)
- Core services and routers
- UI components actively used
- Essential utilities and types

## File Distribution by Directory

### Top Directories by File Count:
1. `components/ui/` - 29 files (many orphaned)
2. `templates/` - 26 files (mostly orphaned)
3. `server/api/routers/` - 15 files
4. `hooks/` - 12 files (many orphaned)
5. `lib/types/` - Various type definition files

### Orphaned File Categories:

#### 1. Old UI Components (Safe to Delete)
- `components/ui/accordion.tsx`
- `components/ui/alert.tsx`
- `components/ui/calendar.tsx`
- `components/ui/checkbox.tsx`
- `components/ui/popover.tsx`
- `components/ui/sheet.tsx`
- `components/ui/slider.tsx`
- `components/ui/spinner.tsx`
- `components/ui/switch.tsx`
- `components/ui/ThinkingAnimation.tsx`
- `components/ui/FeedbackButton.tsx`

#### 2. Unused Templates (Safe to Delete)
- All 26 template files are orphaned
- Including: `AICoding.tsx`, `AIDialogue.tsx`, `Code.tsx`, etc.

#### 3. Legacy Services (Safe to Delete)
- `server/services/generation/` - Many unused generators
- `server/services/scene/` - Old scene services
- `server/services/ai/conversationalResponse.service.ts`
- `server/services/brain/sceneRepository.service.ts`

#### 4. Deprecated Hooks (Safe to Delete)
- `hooks/useDebounce.ts`
- `hooks/useImageAnalysis.ts`
- `hooks/useLocalStorage.ts`
- `hooks/useTimelineDragAndDrop.tsx`
- `hooks/useTimelineEventHandlers.tsx`
- `hooks/useTimelinePositioning.tsx`
- `hooks/useTimelineState.tsx`
- `hooks/useTimelineZoom.tsx`
- `hooks/useVideoPlayer.tsx`

#### 5. Old Timeline Components (Safe to Delete)
- `components/client/Timeline/` - All 7 files are orphaned

#### 6. Unused Types (Safe to Delete)
- Many type definition files with no consumers
- Old API contract types
- Deprecated interfaces

## Warnings About Dependencies

Some orphaned files show warnings because they import each other, but the entire chain is orphaned:
- The old agent system files import each other but nothing imports them
- Old timeline components form an isolated dependency chain
- Some test utilities are only used by other orphaned files

## Recommended Actions

### Phase 1: Immediate Cleanup (Sprint 40)
1. **Delete all 173 orphaned files**
   - This will reduce codebase by 50%
   - No risk of breaking functionality
   - Improves code navigation and build times

### Phase 2: Sprint 42 Migration
1. **Complete new clean architecture**
2. **Replace 27 transitional files**
3. **Delete old implementations**

### Phase 3: Post-Migration
1. **Re-run dependency analysis**
2. **Clean up any newly orphaned files**
3. **Optimize imports in remaining files**

## Impact Analysis

### Benefits of Cleanup:
- **50% reduction** in source files
- **Faster builds** - Less files to process
- **Easier navigation** - Only active code remains
- **Clearer architecture** - Remove confusion from old code
- **Smaller bundle** - Potential reduction in final build size

### Risk Assessment:
- **LOW RISK** - All files marked for deletion have no active imports
- Analysis verified through TypeScript AST parsing
- Double-checked with reverse dependency mapping

## Next Steps

1. Create a cleanup script to delete orphaned files
2. Commit deletion in a separate commit for easy revert
3. Run full test suite after deletion
4. Monitor for any runtime issues
5. Document the cleanup in progress.md

## Technical Details

The analysis was performed using:
- TypeScript compiler API for accurate import resolution
- Recursive file traversal of src directory
- Import path resolution including:
  - Relative imports (./xxx)
  - Alias imports (~/xxx)
  - Index file resolution
- Reverse dependency mapping to find all consumers

Full detailed analysis available in: `/dependency-analysis.json`