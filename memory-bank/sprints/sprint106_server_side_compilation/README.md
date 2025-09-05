# Sprint 106: Hybrid TSX/JS Compilation System

## Goal
Make LLM-generated code reliable. When user prompts → Brain chooses tool → Add/Edit generates code → That code must NOT crash the preview. Compile server-side, validate before preview, isolate scene errors.

## Why
- **Performance**: 3-5 second delays for public video sharing → <500ms
- **Reliability**: ~60% success rate → 99.9% with pre-compilation
- **Maintenance**: 850+ lines of duplicated compilation logic → 100 lines
- **UX Issues**: Typing lag, slow previews → instant response

## Solution: Hybrid Storage Approach
```
User creates/edits → Server compiles TSX→JS → Store both in DB → Serve JS directly (no compilation)
```

Store both:
- **TSX**: For editing, viewing source
- **JS**: For execution, zero compilation at runtime

## Current Implementation Status

### ✅ Completed
1. **Database Schema** - Added js_code, js_compiled_at, compilation_error to scenes (migration 0016)
2. **Compilation Service** - Server-side compile-scene.ts with export removal
3. **PreviewPanelG** - Partial integration using pre-compiled JS
4. **Scene Creation** - helpers.ts compiles and stores JS
5. **Template Pre-compilation** - 42 templates compile at build time
6. **Template Operations** - Uses pre-compiled templates

### 🚧 In Progress  
- Templates table migration (0017 ready)
- Backfilling existing scenes

### ❌ Not Started (ACTUAL Priority Order)
1. **LLM Code Validation** - CRITICAL - Compile & validate before preview
2. ~~**Scene Isolation**~~ - ✅ ALREADY EXISTS! Error boundaries wrap each scene
3. **Remove Client Fallback** - Stop compiling broken code twice (waste of CPU)
4. **ShareVideoPlayerClient** - Secondary - 3-5s delay
5. **Other optimizations** - After core reliability fixed

## Interlock with Sprint 108 (Export Reliability)

- Unified Artifact: The compiled JS stored by Sprint 106 is the exact input Sprint 108’s export pipeline processes, eliminating preview/export mismatches.
- Deterministic Transforms: Sprint 108’s AST icon replacement, media guards, and scene isolation operate over Sprint 106’s compiled JS, ensuring consistent outcomes.
- Faster Exports: With precompiled JS, export removes client-side transforms, reducing failure points and Lambda time.
- Feedback Loop: Sprint 108’s RenderWarnings can be surfaced in the editor while using Sprint 106’s precompiled artifact, giving users actionable visibility.

## The 9 Compilation Points Analysis

### Client-Side (7 locations - all will be eliminated)
1. **PreviewPanelG.tsx** - ✅ Partially done, 100-200ms per scene
2. **CodePanelG.tsx** - 300ms lag on every keystroke
3. **TemplatesPanelG.tsx** - 200ms per template preview
4. **MyProjectsPanelG.tsx** - 150ms per thumbnail
5. **ShareVideoPlayerClient.tsx** - **CRITICAL** - 500ms per scene, 3-5s total
6. **AdminVideoPlayer.tsx** - 300ms per scene
7. **ABTestResult.tsx** - 200ms per variant

### Server-Side (2 locations)
8. **render.service.ts** - Lambda export (keep partial for icon transforms)
9. **MainComposition.tsx** - Fallback compilation (eliminate)

**Total: 58 Sucrase references across 15 files → Will become 1 service**

## Impact Metrics

### Performance
- **Public Share**: 3-5s → <500ms (10x faster)
- **Editor Typing**: 300ms lag → 0ms
- **Preview Switch**: 200ms → instant
- **Memory Usage**: -10MB per session (no Sucrase in browser)

### Reliability  
- **Success Rate**: 60% → 99.9%
- **Compilation Failures**: Runtime → Build time detection
- **Race Conditions**: Common → None
- **Consistent Output**: Multiple implementations → Single truth

### Code Reduction
- **Compilation Logic**: 850 lines → 100 lines (88% reduction)
- **Dependencies**: Remove Sucrase from client bundle (-2MB)
- **Maintenance Points**: 9 → 1
