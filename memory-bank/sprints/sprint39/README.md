# Sprint 39: Context Building Performance Optimization

## Sprint Overview

**Goal**: Reduce context building overhead by 80-90% to achieve near-instant responses for user operations.

**Problem**: Every user prompt triggers a full context rebuild taking 70+ seconds, even for simple operations like "make text yellow".

**Status**: Planning Phase

## Key Documents

### 1. [CONTEXT-OPTIMIZATION-PLAN.md](./CONTEXT-OPTIMIZATION-PLAN.md)
Comprehensive 4-week optimization strategy including:
- Operation classification system
- Tiered context building (light/standard/full)
- Database optimization strategies
- Smart caching implementation
- Full migration plan with metrics

### 2. [QUICK-WINS-IMMEDIATE.md](./QUICK-WINS-IMMEDIATE.md)
5 immediate fixes that can be implemented TODAY:
- Skip context for autofixes (30 min) - 96% improvement
- Cache preferences aggressively (1 hour) - Save 200ms/request
- Parallel database queries (2 hours) - 50% faster DB ops
- Skip context for simple edits (3 hours) - 93% improvement
- Remove duplicate queries (1 hour) - Save 200ms/request

### 3. [SCENE-NAMING-CONSISTENCY-ISSUES.md](./SCENE-NAMING-CONSISTENCY-ISSUES.md)
Critical issues with scene naming that need fixing:
- Inconsistent names: "Scene 1" vs "Scene3_mbs7rxk8"
- Scene numbering after deletion (gaps vs continuous)
- Template export name conflicts
- Comprehensive solutions and implementation plan

## The Problem in Numbers

Current performance breakdown for "make text yellow":
```
Total Time: 70 seconds
├── Context Building: 65 seconds (93%)
│   ├── Database Queries: 1-2 seconds
│   ├── Context Processing: 2-3 seconds  
│   └── Brain LLM Analysis: 60+ seconds (!)
├── Tool Execution: 3-4 seconds
└── Response: 1 second
```

## Quick Start

For immediate relief, implement these TODAY:

```typescript
// 1. Make queries parallel (30% improvement)
const [scenes, preferences, relationships] = await Promise.all([
  getScenes(projectId),
  getPreferences(projectId),
  getRelationships(projectId)
]);

// 2. Skip duplicate scene query
skipSceneQuery: true // In contextBuilder call

// 3. Simple edit detection
if (isSimpleEdit(prompt)) {
  return fastPath(input); // Skip full context
}
```

## Success Metrics

### Immediate Goals (This Week)
- [ ] Simple edits < 5 seconds (from 70s)
- [ ] Autofix < 3 seconds (from 70s)
- [ ] Add scene < 15 seconds (from 70s)

### Sprint Goals (4 Weeks)
- [ ] 85% average performance improvement
- [ ] <5% of operations take >20 seconds
- [ ] 60%+ cache hit rate
- [ ] 80% reduction in database load

## Architecture Decisions

### 1. Tiered Context System
- **Light Context**: For trivial operations (50ms target)
- **Standard Context**: For moderate operations (200ms target)
- **Full Context**: For complex analysis (500ms target)

### 2. Operation Classification
```typescript
TRIVIAL:    "make text yellow", "change duration"
MODERATE:   "add scene", "delete scene"
COMPLEX:    "rearrange timeline", "apply to all"
ANALYTICAL: "summarize video", "what scenes exist"
```

### 3. Caching Strategy
- Component-level caching (scenes, preferences separate)
- Longer TTL for stable data (preferences: 24h)
- Predictive cache warming after operations

## Implementation Schedule

### Week 1: Classification & Light Context
- Day 1-2: Operation classifier
- Day 3-4: Light context pathway  
- Day 5-7: Testing & metrics

### Week 2: Database & Caching
- Optimize queries (combine, parallelize)
- Implement smart caching
- Remove redundancies

### Week 3: Full System Integration
- Standard context implementation
- Cache warming strategies
- Performance monitoring

### Week 4: Testing & Rollout
- Load testing
- A/B testing with users
- Documentation & cleanup

## Risk Management

### Risks
1. **Under-contextualization**: Some operations might need more context
2. **Cache coherency**: Components might get out of sync  
3. **Complexity**: More code paths to maintain

### Mitigations
- Conservative classification initially
- Clear cache invalidation rules
- Feature flags for gradual rollout
- Comprehensive logging

## Next Actions

1. **NOW**: Read [QUICK-WINS-IMMEDIATE.md](./QUICK-WINS-IMMEDIATE.md)
2. **TODAY**: Implement parallel queries (Quick Win #3)
3. **TODAY**: Remove duplicate queries (Quick Win #5)
4. **TOMORROW**: Test simple edit detection
5. **THIS WEEK**: Measure improvements and iterate

## Questions to Consider

1. Should we pre-classify common prompts with a lookup table?
2. Can we use Redis for distributed caching?
3. Should context building be moved to a worker process?
4. Can we predict next operations and pre-warm caches?

## Success Criteria

This sprint is successful when:
- Users say "wow, that was fast!"
- Simple edits feel instant (<2 seconds)
- Complex operations complete in reasonable time (<20 seconds)
- System remains stable under load
- Code remains maintainable

---

Let's make Bazaar-Vid feel lightning fast! 🚀