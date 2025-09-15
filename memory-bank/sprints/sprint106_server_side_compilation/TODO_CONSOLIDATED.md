# Sprint 106: Hybrid Compilation - Consolidated TODO

## ✅ COMPLETED
- [x] Database migration 0016 - Add js_code columns to scenes table
- [x] Create compile-scene.ts utility for server-side compilation
- [x] Update scene creation (helpers.ts) to compile and store JS
- [x] Partial PreviewPanelG integration with pre-compiled JS
- [x] Pre-compile all 42 templates at build time
- [x] Update template-operations.ts to use pre-compiled templates
- [x] Remove export statements during compilation
- [x] Create migration 0017 for templates table

## 🚧 IN PROGRESS
- [ ] Apply migration 0017 to add JS columns to templates table
- [ ] Backfill existing scenes with compiled JS

## 🎯 REVISED HIGH PRIORITY - Permissive Compilation Strategy

### 1. Unified Compilation Service - CRITICAL
- [ ] Create single compile-scene.ts service that ALL code paths use
- [ ] Implement PERMISSIVE validation (never trigger regeneration)
- [ ] Always compile server-side, but ALWAYS store (even if compilation fails)
- [ ] Generate safe fallback scenes for compilation failures
- [ ] Add compilation status tracking (success/error/fallback)

### 2. Multi-Scene Conflict Resolution - CRITICAL  
- [ ] Detect duplicate identifiers across scenes
- [ ] AUTO-FIX conflicts with intelligent namespacing (Button → Button_sceneid)
- [ ] Never reject code for conflicts - always fix automatically
- [ ] Test with real multi-scene projects that currently break
- [ ] Log conflict resolutions for monitoring

### 3. Three-Layer Validation Implementation
- [ ] Generation layer: Permissive (compile, fix, store, never regenerate)
- [ ] Runtime layer: Already works (ErrorBoundary + IIFE)
- [ ] Export layer: Strict (can auto-fix or prompt user)
- [ ] Add metrics for each layer's success rate
- [ ] Document when each layer applies

## 📋 SECONDARY PRIORITIES (After Core Compilation)

### 4. Migrate High-Impact Components First
- [ ] ShareVideoPlayerClient - HIGHEST IMPACT (3-5s → 500ms)
- [ ] PreviewPanelG - Complete migration to pre-compiled JS
- [ ] CodePanelG - Eliminate typing lag (compile on save, not onChange)
- [ ] Keep client compilation as fallback initially
- [ ] Remove client compilation only after proven stability

### 5. Build Pipeline Integration
- [ ] Add npm script for template pre-compilation
- [ ] Integrate into build process
- [ ] Add CI/CD validation
- [ ] Create production build checks

## 🔧 LOW PRIORITY (Future)

### 6. Monitoring & Validation
- [ ] Add compilation success metrics
- [ ] Create dashboard for compilation status
- [ ] Set up alerts for compilation failures
- [ ] Track performance improvements

### 7. Documentation & Cleanup
- [ ] Remove all client-side Sucrase imports
- [ ] Update developer documentation
- [ ] Create migration guide
- [ ] Archive old compilation code

## 📊 Success Metrics to Track
- [ ] Public share loads in <500ms (currently 3-5s)
- [ ] Zero typing lag in editor (currently 300ms)
- [ ] 99%+ compilation success rate (currently ~60%)
- [ ] Client bundle size reduced by 2MB
- [ ] 850 lines of code → 100 lines

## 🚫 Not Doing (Out of Scope)
- Complete rewrite of render.service.ts (needs icon transforms)
- State synchronization refactor (Sprint 107)
- Auto-fix redesign (separate concern)
- Component loading fixes (Sprint 107)

## Next Actions (Revised Based on 35-Second Reality)
1. Build unified compilation service with PERMISSIVE validation
2. Add automatic conflict resolution (never reject, always fix)
3. Implement safe fallback generation for failed compilations
4. Test with real problematic multi-scene projects
5. Migrate ShareVideoPlayerClient first (biggest user impact)
6. Monitor regeneration rate (should be ~0%)

## Critical Success Criteria
- ZERO regenerations due to compilation issues
- 95%+ scenes compile successfully (rest use fallback)
- Multi-scene conflicts 100% auto-resolved
- ShareVideoPlayerClient loads in <500ms
- No white screens (always show something)