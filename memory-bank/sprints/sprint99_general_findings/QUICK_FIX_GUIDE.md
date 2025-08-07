# Sprint 99: Quick Fix Implementation Guide

This guide provides copy-paste solutions for the critical performance issues identified in the analysis.

## 🚨 P0 - Critical Fixes (Do Today)

### 1. ~~Database Indexes~~ ✅ ALREADY EXIST!

**UPDATE**: Database analysis confirms all recommended indexes already exist:
- `project_user_idx` on userId
- `scene_project_idx` on projectId  
- `message_project_idx` on projectId
- `message_project_sequence_idx` on (projectId, sequence)

The performance issues may be due to:
- Large data volumes requiring query optimization
- Missing query result caching
- Inefficient query patterns (N+1 queries)

**New Priority**: Focus on query optimization and caching strategies instead.

### 2. Fix SSE Memory Leak

**File**: `/src/hooks/use-sse-generation.ts`

```typescript
// ADD cleanup to prevent EventSource accumulation
useEffect(() => {
  if (!url || !enabled) return;

  const eventSource = new EventSource(url);
  
  // ... existing event handlers ...

  // CRITICAL: Add cleanup
  return () => {
    console.log('[SSE] Cleaning up EventSource connection');
    eventSource.close();
  };
}, [url, enabled, onMessage, onError, onComplete]);
```

### 3. Memoize ChatMessage Component

**File**: `/src/components/chat/ChatMessage.tsx`

```typescript
// Wrap the export with React.memo
export const ChatMessage = React.memo(
  ({ message, isUser, isStreaming, className }: ChatMessageProps) => {
    // ... existing component implementation ...
  },
  // Custom comparison function
  (prevProps, nextProps) => {
    return (
      prevProps.message.id === nextProps.message.id &&
      prevProps.message.content === nextProps.message.content &&
      prevProps.message.status === nextProps.message.status &&
      prevProps.isStreaming === nextProps.isStreaming
    );
  }
);

ChatMessage.displayName = 'ChatMessage';
```

### 4. Fix Preview Panel Interval Leak

**File**: `/src/app/projects/[id]/generate/workspace/panels/PreviewPanelG.tsx`

```typescript
// Find the useEffect with setInterval and add cleanup
useEffect(() => {
  let intervalId: NodeJS.Timeout;
  
  if (isRendering) {
    intervalId = setInterval(() => {
      // ... existing progress update logic ...
    }, 1000);
  }
  
  // CRITICAL: Add cleanup
  return () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  };
}, [isRendering]);
```

## 🏃 P1 - High Priority (This Week)

### 1. Code Split Workspace Panels

**File**: `/src/app/projects/[id]/generate/workspace/WorkspaceContentAreaG.tsx`

```typescript
import { lazy, Suspense } from 'react';

// Replace direct imports with lazy loading
const ChatPanelG = lazy(() => import('./panels/ChatPanelG'));
const PreviewPanelG = lazy(() => import('./panels/PreviewPanelG'));
const CodePanelG = lazy(() => import('./panels/CodePanelG'));
const MyProjectsPanelG = lazy(() => import('./panels/MyProjectsPanelG'));
const TemplatesPanelG = lazy(() => import('./panels/TemplatesPanelG'));

// Add loading component
const PanelLoader = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
  </div>
);

// Wrap panel renders with Suspense
const renderPanelContent = useCallback((panel: OpenPanelG | null | undefined) => {
  if (!panel) return null;
  
  return (
    <Suspense fallback={<PanelLoader />}>
      {/* existing switch statement */}
    </Suspense>
  );
}, [projectId, chatId]);
```

### 2. Debounce Preview Compilation

**File**: `/src/app/projects/[id]/generate/workspace/panels/PreviewPanelG.tsx`

```typescript
import { useMemo } from 'react';
import debounce from 'lodash/debounce';

// Add debounced compilation
const debouncedHandleSceneUpdate = useMemo(
  () => debounce((newScenes: any[]) => {
    // Move existing handleSceneUpdate logic here
    setScenes(newScenes);
    // ... rest of compilation logic
  }, 500), // 500ms delay
  []
);

// Update the subscription to use debounced version
useEffect(() => {
  const unsubscribe = useVideoState.subscribe(
    (state) => state.projects[projectId]?.scenes || [],
    debouncedHandleSceneUpdate
  );
  
  return () => {
    unsubscribe();
    debouncedHandleSceneUpdate.cancel(); // Cancel pending calls
  };
}, [projectId, debouncedHandleSceneUpdate]);
```

### 3. Optimize Message Rendering

**File**: `/src/app/projects/[id]/generate/workspace/panels/ChatPanelG.tsx`

```typescript
// Memoize filtered messages
const componentMessages = useMemo(() => {
  return messages
    .filter(msg => msg.kind !== 'scene-plan')
    .map(msg => ({
      id: msg.id,
      content: msg.content,
      isUser: msg.role === 'user',
      timestamp: msg.createdAt,
      status: msg.status,
      kind: msg.kind,
      imageUrls: msg.imageUrls,
    }));
}, [messages]);

// Memoize message list rendering
const MessageList = React.memo(() => (
  <div className="space-y-6">
    {componentMessages.map((message, index) => (
      <ChatMessage
        key={message.id}
        message={message}
        isUser={message.isUser}
        isStreaming={streamingMessageId === message.id}
      />
    ))}
  </div>
));
```

## 🎯 Quick Performance Wins

### 1. Add Loading States to Heavy Operations

```typescript
// Generic loading wrapper
const withLoading = (fn: Function) => {
  return async (...args: any[]) => {
    setIsLoading(true);
    try {
      return await fn(...args);
    } finally {
      setIsLoading(false);
    }
  };
};
```

### 2. Implement Request Debouncing

```typescript
// Generic debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

### 3. Add Performance Monitoring

```typescript
// Add to main layout or app wrapper
useEffect(() => {
  // Log performance metrics
  if ('performance' in window) {
    window.addEventListener('load', () => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      console.log('Page Load Metrics:', {
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
        loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
        domInteractive: perfData.domInteractive - perfData.fetchStart,
        timeToFirstByte: perfData.responseStart - perfData.requestStart,
      });
    });
  }
}, []);
```

## 🔍 Verification Steps

After implementing each fix:

1. **Database Indexes**:
   ```sql
   EXPLAIN ANALYZE SELECT * FROM projects WHERE userId = 'test-user-id';
   -- Should show "Index Scan" instead of "Seq Scan"
   ```

2. **Memory Leaks**:
   - Open Chrome DevTools > Memory
   - Take heap snapshot
   - Use app for 5 minutes
   - Take another snapshot
   - Compare: memory should be stable

3. **Component Re-renders**:
   - Install React DevTools Profiler
   - Record while using chat
   - ChatMessage should not re-render unnecessarily

4. **Bundle Size**:
   ```bash
   npm run build
   # Check .next/analyze/client.html for bundle visualization
   ```

## ⚡ Emergency Rollback

If any fix causes issues:

```bash
# For database indexes (won't cause issues but just in case)
DROP INDEX CONCURRENTLY idx_projects_userId;
DROP INDEX CONCURRENTLY idx_scenes_projectId;
DROP INDEX CONCURRENTLY idx_messages_projectId;

# For code changes
git revert HEAD  # Revert last commit
git push origin dev  # Push revert
```

---

**Remember**: Test each fix in development first, then deploy to production one at a time to isolate any issues.