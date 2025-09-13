# Sprint 106 - TODO

## 🔄 APPROACH CHANGE: Hybrid TSX/JS Storage

After analysis with team, switching from full server compilation to **hybrid approach**:
- Store both TSX (for editing) and compiled JS (for runtime) in database
- Compile once at generation time, not on every view
- No R2, no CDN, no external dependencies - simpler!

---

## Phase 1: Database Infrastructure (Day 1)

### Database Changes
- [ ] Add `js_code` TEXT column to scenes table
- [ ] Add `js_compiled_at` TIMESTAMP column
- [ ] Add `compilation_error` TEXT column for tracking failures
- [ ] Create and test migration script
- [ ] Deploy migration to dev database

### Compilation Service
- [ ] Create `src/server/utils/compile-scene.ts`
  - Use existing Sucrase setup
  - TSX → JS transformation
  - Return `{success, jsCode, error}`
- [ ] Handle edge cases (empty code, syntax errors)
- [ ] Unit tests for compilation

---

## Phase 2: Generation Integration (Day 2)

### Scene Creation Flow
- [ ] Update `src/tools/add/add.ts`:
  - After LLM generates TSX
  - Compile TSX → JS server-side
  - Save both to database
- [ ] Update `src/server/api/routers/generation.universal.ts`
- [ ] Handle compilation failures gracefully

### Scene Editing Flow  
- [ ] Update `src/tools/edit/edit.ts`:
  - Recompile when TSX changes
  - Update both TSX and JS columns
- [ ] Ensure atomicity (both succeed or both fail)

### Auto-Fix Integration
- [ ] Update auto-fix flow to recompile after fixes
- [ ] Keep JS in sync with corrected TSX

---

## Phase 3: Client Updates (Day 3-4)

### Remove Client Compilation (9 locations)
- [ ] `PreviewPanelG.tsx` - Use pre-compiled JS ⭐ CRITICAL
- [ ] `CodePanelG.tsx` - Show TSX, run JS
- [ ] `TemplatesPanelG.tsx` - Use JS directly
- [ ] `MyProjectsPanelG.tsx` - Use cached JS
- [ ] `ShareVideoPlayerClient.tsx` - Serve JS
- [ ] `AdminVideoPlayer.tsx` - Use JS
- [ ] `ABTestResult.tsx` - Use JS
- [ ] `MainComposition.tsx` - Fallback only
- [ ] `MainCompositionSimple.tsx` - Use JS

### Fallback Strategy
- [ ] Keep ONE fallback compilation path for old scenes
- [ ] Create `useSceneCode()` hook:
  ```typescript
  if (scene.jsCode) return scene.jsCode;
  else return compileOnClient(scene.tsxCode); // Fallback
  ```

---

## Phase 4: Migration (Day 5)

### Backfill Existing Scenes
- [ ] Create `scripts/backfill-scene-js.ts`
- [ ] Process in batches of 100
- [ ] Track and log failures
- [ ] Estimate: ~1000 scenes @ 10ms each = 10 seconds total

### Testing Migration
- [ ] Test on staging first
- [ ] Monitor compilation success rate
- [ ] Verify JS code runs correctly

---

## Phase 5: Cleanup & Monitoring (Day 6)

### Performance Metrics
- [ ] Track compilation time during generation
- [ ] Measure client load time improvement
- [ ] Monitor jsCode vs tsxCode sizes
- [ ] Dashboard for compilation failures

### Code Cleanup
- [ ] Remove Sucrase from package.json dependencies (keep devDependencies)
- [ ] Delete client compilation functions (~850 lines)
- [ ] Update TypeScript types
- [ ] Clean up unused imports

### Documentation
- [ ] Update architecture docs with hybrid approach
- [ ] Document why we chose hybrid over full server compilation
- [ ] Create runbook for handling compilation issues

---

## Success Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Client compilation points | 9 | 1 (fallback) | ⏳ |
| Scene load time | 500ms | 10ms | ⏳ |
| Code reduction | Baseline | -850 lines | ⏳ |
| Compilation success | N/A | 99%+ | ⏳ |

---

## Rollback Plan

If issues occur:
1. jsCode field can be ignored
2. Client fallback already handles missing JS
3. Just clear jsCode column to revert
4. No external dependencies to rollback

---

## Notes on Approach Change

### Why Hybrid Instead of Full Server Compilation?

**Original Plan Issues:**
- R2 setup complexity
- CORS configuration
- Two compilation targets (browser ESM vs Lambda Function)
- External dependency risks

**Hybrid Benefits:**
- ✅ Simpler - just database columns
- ✅ Faster - no network round trips to R2
- ✅ Safer - code stays with scene data
- ✅ Easier - one compilation format
- ✅ Cheaper - no R2 storage costs

### Technical Decision
Store compiled JS directly in database because:
- Postgres handles TEXT compression well
- JS code is ~2x size of TSX (acceptable)
- Keeps code atomic with scene
- Simplifies caching (database already cached)
- No CORS or CDN issues
