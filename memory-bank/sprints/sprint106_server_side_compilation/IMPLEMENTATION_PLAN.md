# Implementation Plan: Server-Side Compilation

## Overview

Phased approach to migrate from 9 client-side compilation points to 1 server-side service.

## Phase 1: Infrastructure (Day 1-2)

### 1.1 Database Schema Update
```sql
-- Add compilation tracking columns
ALTER TABLE "bazaar-vid_scene" 
ADD COLUMN compiled_url TEXT,
ADD COLUMN compiled_hash VARCHAR(16),
ADD COLUMN compiled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN compilation_error TEXT;

CREATE INDEX idx_scene_compiled_hash ON "bazaar-vid_scene" (compiled_hash);
```

### 1.2 Create Compilation Service
```typescript
// src/server/services/compilation/compilation.service.ts
export class CompilationService {
  async compileScene(tsxCode: string): Promise<CompiledResult>
  async uploadToR2(jsCode: string, hash: string): Promise<string>
  async getOrCompile(sceneId: string): Promise<string>
}
```

### 1.3 R2 Bucket Setup
```bash
# Create bucket for compiled components
wrangler r2 bucket create bazaar-components

# Configure public access
wrangler r2 bucket update bazaar-components --public
```

### Tasks
- [ ] Run database migration
- [ ] Create CompilationService class
- [ ] Set up R2 bucket and permissions
- [ ] Add R2 client configuration
- [ ] Create compilation endpoint

## Phase 2: Integration (Day 3-4)

### 2.1 Integrate with Scene Creation
```typescript
// src/tools/add/add.ts
const scene = await createScene(tsxCode);
const compiled = await compilationService.compileScene(tsxCode);
await updateScene(scene.id, {
  compiledUrl: compiled.url,
  compiledHash: compiled.hash
});
```

### 2.2 Integrate with Scene Editing
```typescript
// src/tools/edit/edit.ts
const updated = await editScene(sceneId, newTsxCode);
const compiled = await compilationService.compileScene(newTsxCode);
await updateScene(sceneId, {
  compiledUrl: compiled.url,
  compiledHash: compiled.hash
});
```

### 2.3 Update API Route
```typescript
// src/app/api/components/[componentId]/route.ts
if (scene.compiledUrl) {
  return NextResponse.redirect(scene.compiledUrl);
}
// Fallback: compile on-demand
```

### Tasks
- [ ] Update add tool to compile
- [ ] Update edit tool to compile
- [ ] Modify API route for redirect
- [ ] Add compilation status to scene metadata
- [ ] Test end-to-end flow

## Phase 3: Client Migration (Day 5-7)

### 3.1 Update Preview Panel
```typescript
// src/app/projects/[id]/generate/workspace/panels/PreviewPanelG.tsx
// REMOVE: Sucrase import and compilation logic
// ADD: Dynamic import from compiledUrl
const SceneComponent = React.lazy(() => 
  import(scene.compiledUrl || `/api/components/${scene.id}`)
);
```

### 3.2 Update Other Panels
- [ ] CodePanelG.tsx - Remove Sucrase
- [ ] TemplatesPanelG.tsx - Use compiled URLs
- [ ] MyProjectsPanelG.tsx - Dynamic imports
- [ ] ShareVideoPlayerClient.tsx - Direct import
- [ ] AdminVideoPlayer.tsx - Simplify logic
- [ ] ABTestResult.tsx - Consistent loading

### 3.3 Add Loading States
```typescript
<React.Suspense fallback={
  <div className="flex items-center justify-center h-full">
    <div className="animate-pulse">
      <div className="text-sm text-gray-500">Compiling scene...</div>
      <div className="mt-2 h-1 bg-gray-200 rounded">
        <div className="h-1 bg-blue-500 rounded animate-progress" />
      </div>
    </div>
  </div>
}>
  <SceneComponent />
</React.Suspense>
```

### Tasks
- [ ] Remove Sucrase from PreviewPanelG
- [ ] Remove Sucrase from CodePanelG
- [ ] Remove Sucrase from TemplatesPanelG
- [ ] Remove Sucrase from MyProjectsPanelG
- [ ] Remove Sucrase from ShareVideoPlayerClient
- [ ] Remove Sucrase from AdminVideoPlayer
- [ ] Remove Sucrase from ABTestResult
- [ ] Add consistent loading states
- [ ] Test all preview paths

## Phase 4: Backfill & Migration (Day 8-9)

### 4.1 Backfill Script
```typescript
// scripts/backfill-compiled-scenes.ts
const scenes = await db.query.scenes.findMany({
  where: isNull(scenes.compiledUrl)
});

for (const scene of scenes) {
  try {
    const compiled = await compilationService.compileScene(scene.tsxCode);
    await db.update(scenes).set({
      compiledUrl: compiled.url,
      compiledHash: compiled.hash
    }).where(eq(scenes.id, scene.id));
  } catch (error) {
    console.error(`Failed to compile scene ${scene.id}:`, error);
  }
}
```

### 4.2 Feature Flag
```typescript
// Enable progressive rollout
const useServerCompilation = flags.isEnabled('server-compilation', {
  userId: user.id,
  rolloutPercentage: 10 // Start with 10% of users
});
```

### Tasks
- [ ] Create backfill script
- [ ] Run backfill in batches
- [ ] Add feature flag
- [ ] Monitor compilation metrics
- [ ] Progressive rollout (10% → 50% → 100%)

## Phase 5: Cleanup (Day 10)

### 5.1 Remove Old Code
- [ ] Delete client compilation functions
- [ ] Remove Sucrase dependency from package.json
- [ ] Clean up unused imports
- [ ] Remove namespace wrapping code
- [ ] Delete eval/new Function usage

### 5.2 Documentation
- [ ] Update developer docs
- [ ] Document new compilation flow
- [ ] Create troubleshooting guide
- [ ] Update architecture diagrams

### 5.3 Monitoring Setup
```typescript
// Track key metrics
track('compilation.success', { sceneId, duration });
track('compilation.error', { sceneId, error });
track('cache.hit', { sceneId, url });
```

### Tasks
- [ ] Remove ~850 lines of old code
- [ ] Update documentation
- [ ] Set up monitoring dashboards
- [ ] Create alerts for failures
- [ ] Celebrate! 🎉

## Success Criteria

### Functional
- ✅ All scenes compile server-side
- ✅ No client-side Sucrase usage
- ✅ Consistent behavior across all views
- ✅ Error boundaries working

### Performance
- ✅ First load: <2s compilation
- ✅ Cached load: <50ms
- ✅ 90%+ cache hit rate
- ✅ 50x faster subsequent views

### Reliability
- ✅ 95%+ compilation success rate
- ✅ 0% client compilation failures
- ✅ Graceful error handling
- ✅ No blank screens

## Risk Mitigation

### Risk: Compilation service downtime
**Mitigation**: Fallback to last compiled version, show clear error

### Risk: R2 bandwidth costs
**Mitigation**: Aggressive caching, content-addressed storage

### Risk: Migration breaks existing scenes
**Mitigation**: Feature flag, progressive rollout, easy rollback

### Risk: Compilation takes too long
**Mitigation**: Queue system, progress indicators, timeout limits

## Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Infrastructure | 2 days | 🔵 Not Started |
| Integration | 2 days | 🔵 Not Started |
| Client Migration | 3 days | 🔵 Not Started |
| Backfill | 2 days | 🔵 Not Started |
| Cleanup | 1 day | 🔵 Not Started |
| **Total** | **10 days** | **0% Complete** |

## Next Steps

1. Get approval for database schema changes
2. Set up R2 bucket with proper permissions
3. Start with Phase 1: Infrastructure
4. Test with a few scenes before full rollout
5. Monitor metrics closely during migration