# Sprint 107 - TODO List

## Critical - Day 1 (Stop the Bleeding)

- [ ] **Fix Component Export** (1 hour)
  - File: `/api/components/[componentId]/route.ts`
  - Add: `export default window.__REMOTION_COMPONENT`
  - Impact: Makes remote components work (0% → 90% success)

- [ ] **Remove Import Injection** (30 min)
  - File: `/api/components/[componentId]/route.ts`  
  - Delete: Lines that add `import { useCurrentFrame } from 'remotion'`
  - Impact: Stops browser crashes (-30% failures)

- [ ] **Add Error Boundaries** (2 hours)
  - File: `MainCompositionSimple.tsx`
  - Wrap: Each scene in ErrorBoundary
  - Impact: Contains failures to single scene

## High Priority - Week 1 (Simplify Architecture)

- [ ] **Single Compilation Point** (4 hours)
  - Move compilation to server-side generation
  - Store compiled JS in database
  - Stop compiling on every load

- [ ] **Remove Regex Processing** (2 hours)
  - Delete all React import "fixes"
  - Delete createElement replacements
  - Keep only "use client" removal

- [ ] **Simplify State Management** (3 hours)
  - Remove manual refresh calls
  - Trust Zustand subscriptions
  - Database as single source of truth

- [ ] **Choose One Component Pattern** (2 hours)
  - Decide: ESM exports OR global registration
  - Update all code to use same pattern
  - Remove dual-path complexity

## Medium Priority - Week 2 (Performance)

- [ ] **Add Smart Caching** (2 hours)
  - Cache successful component loads
  - Set proper cache headers
  - Invalidate on updates

- [ ] **Parallel Processing** (3 hours)
  - Compile scenes in parallel
  - Load components in parallel
  - Use Promise.all patterns

- [ ] **Web Workers** (4 hours)
  - Move compilation to worker
  - Keep main thread responsive
  - Handle worker errors gracefully

## Testing & Validation

- [ ] **Create Reliability Tests**
  - Test component loading success rate
  - Test error boundary containment
  - Test state synchronization

- [ ] **Performance Benchmarks**
  - Measure generation time
  - Measure component load time
  - Track memory usage

- [ ] **User Testing**
  - Test with real users
  - Gather feedback on reliability
  - Monitor error rates

## Documentation

- [ ] **Update Architecture Docs**
  - Document simplified flow
  - Remove outdated patterns
  - Add reliability guidelines

- [ ] **Create Runbook**
  - Common failures and fixes
  - Debugging steps
  - Performance tuning

## Rollback Plan

- [ ] **Feature Flags**
  - Add flags for each major change
  - Allow quick rollback if needed
  - Test with small user subset first

## Success Criteria

- [ ] Component loading success > 90%
- [ ] Generation success > 95%  
- [ ] No duplicate scenes
- [ ] No video crashes from single scene
- [ ] Generation time < 60 seconds
- [ ] Component load < 200ms

## Notes

- Start with Day 1 fixes - biggest impact, lowest risk
- Each fix should be tested in isolation
- Measure success rate before and after each change
- If something makes it worse, roll back immediately
- Simple is better than clever
- Working is better than perfect