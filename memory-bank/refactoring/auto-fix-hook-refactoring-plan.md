# Auto-Fix Hook Refactoring Plan

## Current Issues (456 lines in single hook)
- **Complexity**: Single hook handling multiple responsibilities
- **Memory Risk**: Potential leaks from event listeners and refs
- **Testing**: Difficult to unit test individual parts
- **Maintainability**: Hard to debug and modify

## Proposed Architecture

### Split into 5 Specialized Hooks

#### 1. `useAutoFixSession` (Session & Metrics)
**Responsibilities:**
- Session ID management
- Database metric recording
- Session statistics tracking
- Cost tracking

**Key Functions:**
- `recordMetric()` - Save fix attempts to database
- `recordCircuitBreaker()` - Track circuit breaker events
- `resetSession()` - Reset on project switch
- `trackError()` - Count unique errors

#### 2. `useAutoFixQueue` (Queue Management)
**Responsibilities:**
- Fix queue Map management
- Deduplication logic
- Priority handling

**Key Functions:**
- `addToQueue()` - Add error with deduplication
- `removeFromQueue()` - Remove completed/failed
- `clearQueue()` - Clear on project switch
- `getNextItem()` - Get highest priority item

#### 3. `useAutoFixRateLimiter` (Rate Limiting & Circuit Breaker)
**Responsibilities:**
- Rate limiting logic
- Cooldown management
- Circuit breaker state
- Kill switch checks

**Key Functions:**
- `canAttemptFix()` - Check all rate limits
- `recordAttempt()` - Update history
- `isInCooldown()` - Check cooldown status
- `tripCircuitBreaker()` - Trip on failures
- `resetCircuitBreaker()` - Reset after timeout

#### 4. `useAutoFixExecutor` (Fix Execution)
**Responsibilities:**
- API call execution
- Retry logic
- Progressive fix strategies
- State updates

**Key Functions:**
- `executeFix()` - Main fix execution
- `generateFixPrompt()` - Create fix prompts
- `applyProgressiveStrategy()` - Strategy selection
- `updateSceneState()` - Apply fixes to state

#### 5. `useAutoFixEventHandlers` (Event Management)
**Responsibilities:**
- Event listener setup/cleanup
- Event validation
- Cross-project filtering

**Key Functions:**
- `handlePreviewError()` - Process error events
- `handleSceneDeleted()` - Clean up on deletion
- `handleSceneFixed()` - Mark as fixed
- `setupEventListeners()` - Add listeners
- `cleanupEventListeners()` - Remove on unmount

### Main Hook Orchestration

```typescript
// use-auto-fix.ts (simplified to ~100 lines)
export function useAutoFix(projectId: string, scenes: Scene[]) {
  const session = useAutoFixSession(projectId);
  const queue = useAutoFixQueue();
  const rateLimiter = useAutoFixRateLimiter();
  const executor = useAutoFixExecutor(projectId, session);
  const events = useAutoFixEventHandlers(projectId, queue, rateLimiter);

  // Orchestrate the hooks
  useEffect(() => {
    events.setupEventListeners();
    return () => events.cleanupEventListeners();
  }, [projectId]);

  // Process queue when items added
  useEffect(() => {
    if (queue.hasItems() && rateLimiter.canAttemptFix()) {
      const nextItem = queue.getNextItem();
      if (nextItem) {
        executor.executeFix(nextItem).then(success => {
          if (success) {
            queue.removeFromQueue(nextItem.sceneId);
          }
          rateLimiter.recordAttempt(success);
        });
      }
    }
  }, [queue.items]);

  return {
    queueSize: queue.size,
    isProcessing: executor.isProcessing,
    metrics: session.sessionMetrics,
    isInCooldown: rateLimiter.isInCooldown,
  };
}
```

## Benefits

### 1. **Testability**
Each hook can be tested independently with mock data

### 2. **Maintainability** 
Developers can find and fix issues in specific areas

### 3. **Reusability**
Hooks can be used in other contexts (e.g., rate limiter for other features)

### 4. **Performance**
Smaller hooks = fewer re-renders, better React DevTools debugging

### 5. **Memory Safety**
Clear separation makes it easier to track and clean up resources

## Migration Strategy

### Phase 1: Create New Hooks (Side-by-side)
1. Create new hook files without removing old one
2. Test each hook individually
3. Ensure feature parity

### Phase 2: Integration Testing
1. Create test harness using new hooks
2. Run parallel with existing hook
3. Compare outputs

### Phase 3: Gradual Migration
1. Switch to new hooks behind feature flag
2. Monitor metrics for issues
3. Remove old hook once stable

## File Structure
```
src/hooks/auto-fix/
├── use-auto-fix.ts              # Main orchestrator (~100 lines)
├── use-auto-fix-session.ts      # Session management (~80 lines)
├── use-auto-fix-queue.ts        # Queue logic (~60 lines)
├── use-auto-fix-rate-limiter.ts # Rate limiting (~70 lines)
├── use-auto-fix-executor.ts     # Execution logic (~120 lines)
├── use-auto-fix-events.ts       # Event handlers (~80 lines)
└── constants.ts                 # Shared constants (~30 lines)
```

## Implementation Priority
1. **High**: Session & Queue hooks (core functionality)
2. **Medium**: Rate limiter (safety mechanism)  
3. **Low**: Events & Executor (can refactor gradually)

## Estimated Effort
- **Development**: 2-3 days
- **Testing**: 1-2 days
- **Migration**: 1 day
- **Total**: ~1 week sprint

## Risk Mitigation
- Keep old hook until new implementation proven stable
- Add comprehensive logging during migration
- Use feature flag for gradual rollout
- Maintain kill switch functionality

## Success Metrics
- [ ] Each hook < 150 lines
- [ ] 80%+ test coverage per hook
- [ ] No memory leaks in 24hr test
- [ ] Same or better performance
- [ ] Zero auto-fix functionality regression