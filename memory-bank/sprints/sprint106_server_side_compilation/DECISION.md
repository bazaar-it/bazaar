# Sprint 106: Architecture Decision - Hybrid Approach

## Decision Date: 2025-09-02

## Decision: Use Hybrid TSX/JS Storage Instead of Full Server Compilation

After deep analysis and team discussion, we're pivoting from the original full server compilation plan to a simpler hybrid approach.

## Original Plan (Rejected)

**Full Server Compilation with R2**:
```
TSX → Server Compile → Upload to R2 → Store URL → Client imports from CDN
```

### Why We Rejected It

1. **Two Compilation Targets**
   - Browser needs: `export default Component`
   - Lambda needs: `const Component = ...; return Component;`
   - Would require maintaining two different compilation pipelines

2. **Infrastructure Complexity**
   - R2 bucket setup and management
   - CORS configuration
   - CDN cache invalidation
   - URL versioning strategy

3. **External Dependencies**
   - Adds failure point (R2 availability)
   - Network latency for first load
   - Costs for R2 storage and bandwidth

4. **discovered Complexity**
   Looking at `render.service.ts` showed us the compilation is already complex:
   - Icon replacement (lines 183-279)
   - Avatar URL fixes
   - Export stripping for Lambda
   - Fallback component injection

## New Plan (Accepted)

**Hybrid TSX/JS Database Storage**:
```
TSX → Server Compile → Store both TSX and JS in DB → Serve JS directly
```

### Why This Is Better

1. **Simpler Architecture**
   - Just add `js_code` column to existing table
   - No external services needed
   - Code stays atomic with scene data

2. **Single Compilation Target**
   - Only compile for browser
   - Lambda still compiles separately (unchanged)
   - No format confusion

3. **Better Performance**
   - Database already cached by Postgres
   - No network round trip to R2
   - Instant access to compiled code

4. **Easier Migration**
   - Backfill is just a database update
   - Rollback is just ignoring the column
   - No infrastructure changes

5. **Cost Effective**
   - No R2 storage costs
   - No bandwidth costs
   - Database TEXT compression handles size

## Implementation Comparison

| Aspect | Full Server (R2) | Hybrid (Database) |
|--------|------------------|-------------------|
| Setup Complexity | High | Low |
| Infrastructure | R2 + CDN | None |
| Migration Risk | High | Low |
| Rollback | Complex | Trivial |
| Cost | R2 + Bandwidth | Free |
| Performance | CDN (fast) | DB Cache (fast) |
| Code Location | External | With scene |
| Compilation Formats | 2 (browser + Lambda) | 1 (browser) |

## Code Size Analysis

```typescript
// TSX (what we store now)
average: 2-3 KB per scene

// JS (what we'll add)
average: 3-5 KB per scene (1.5-2x larger)

// Total storage impact
1000 scenes × 3 KB extra = 3 MB total
// Negligible for Postgres
```

## Migration Path

### Phase 1: Add Column
```sql
ALTER TABLE scenes 
ADD COLUMN js_code TEXT,
ADD COLUMN js_compiled_at TIMESTAMP;
```

### Phase 2: Compile on Save
```typescript
// When creating/editing scenes
const tsxCode = await generateScene();
const jsCode = compileToJS(tsxCode);
await saveScene({ tsxCode, jsCode });
```

### Phase 3: Use JS in Client
```typescript
// In preview panels
if (scene.jsCode) {
  // Use pre-compiled (fast path)
  executeJS(scene.jsCode);
} else {
  // Fallback for old scenes
  const js = compileOnClient(scene.tsxCode);
  executeJS(js);
}
```

### Phase 4: Backfill
```typescript
// One-time migration
for (const scene of scenesWithoutJS) {
  scene.jsCode = compileToJS(scene.tsxCode);
  await save(scene);
}
```

## Risk Analysis

### Risks
1. **Database size growth**: ~50% more storage (acceptable)
2. **Compilation time during save**: +100-200ms (acceptable)
3. **Sync issues**: TSX and JS could diverge (mitigate with transactions)

### Mitigations
1. Monitor database size, add compression if needed
2. Compile async, don't block user
3. Always compile in same transaction as TSX save

## Decision Rationale

The hybrid approach gives us:
- ✅ 90% of the performance benefit
- ✅ 10% of the complexity
- ✅ Zero external dependencies
- ✅ Trivial rollback
- ✅ Simpler mental model

## Team Agreement

- **Developer**: "I like it" - Simpler is better
- **Analysis**: Clear benefits, minimal risks
- **Timeline**: Can implement in 6 days vs 10 days for full approach

## Final Decision

**✅ APPROVED: Hybrid TSX/JS Database Storage**

We'll store compiled JavaScript alongside TypeScript/JSX in the database, compile once at save time, and serve pre-compiled JS to clients.

## Next Steps

1. Create database migration
2. Add compilation to save flow  
3. Update clients to use JS
4. Backfill existing scenes
5. Remove client compilation code

---

*Decision made by: Team (Dev + Assistant)*  
*Date: 2025-09-02*  
*Sprint: 106*