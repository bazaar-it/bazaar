# Phase 4 Preparation: Watch-outs & Optimization Strategy

## 🎯 **Current Status**
**Phase 3**: ✅ Complete - User confirmed production-ready async architecture
**Next**: Phase 4 stress testing and optimization preparation

---

## ⚠️ **Critical Watch-outs Identified**

### **1. Memory Management**
**Issue**: `imageFactsCache` can grow unbounded on high-traffic projects
**Current**: In-memory Map without TTL
**Solution**: Add 10-minute TTL for cache entries
**Priority**: High - Could cause memory leaks in production

```typescript
// Proposed enhancement for imageFactsCache
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // 10 minutes = 600000ms
}

class TTLCache<K, V> extends Map<K, CacheEntry<V>> {
  set(key: K, value: V, ttl: number = 600000): this {
    this.delete(key); // Clean up any existing entry
    super.set(key, { data: value, timestamp: Date.now(), ttl });
    return this;
  }
  
  get(key: K): V | undefined {
    const entry = super.get(key);
    if (!entry) return undefined;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key);
      return undefined;
    }
    
    return entry.data;
  }
}
```

### **2. Error Tracking Integration**
**Issue**: Async errors could get swallowed without proper monitoring
**Current**: TODO placeholders in orchestrator
**Solution**: Integrate Sentry/Logtail before Phase 5
**Priority**: Medium - Essential for production debugging

**Files to enhance**:
- `src/server/services/brain/orchestrator.ts` - Add error tracking to async flows
- `src/lib/services/performance.service.ts` - Track performance anomalies

### **3. Token Count Monitoring**
**Issue**: Enhanced prompts concatenate memory + analyses, could exceed GPT-4o 128k context
**Current**: No monitoring for prompt size
**Solution**: Add token counting before LLM calls
**Priority**: Medium - Prevents silent truncation failures

```typescript
// Proposed token monitoring
import { encode } from 'gpt-tokenizer';

function validatePromptSize(prompt: string, maxTokens: number = 120000): void {
  const tokens = encode(prompt).length;
  if (tokens > maxTokens) {
    console.warn(`⚠️ Prompt size ${tokens} tokens exceeds limit ${maxTokens}`);
    // Could implement prompt truncation strategy here
  }
}
```

### **4. Type Safety Gaps**
**Issue**: `imageFactsCache.values()` returns `any[]`
**Current**: Loose typing in cache implementation  
**Solution**: Add proper generics
**Priority**: Low - Cosmetic but improves developer experience

```typescript
// Type-safe cache implementation
private imageFactsCache = new Map<string, ImageFacts>();

// Instead of
cache.values() // returns any[]

// Use
Array.from(cache.values()) as ImageFacts[] // properly typed
```

### **5. Performance Estimator Configuration**
**Issue**: Hard-coded timing estimates (2s + 3s + 0.5s) 
**Current**: Magic numbers in performance service
**Solution**: Move to environment variables
**Priority**: Low - Nice-to-have for tuning

```typescript
// Proposed env config
const PERFORMANCE_ESTIMATES = {
  OLD_CONTEXT_BUILD_TIME: parseInt(process.env.OLD_CONTEXT_BUILD_MS || '2000'),
  OLD_BRAIN_DECISION_TIME: parseInt(process.env.OLD_BRAIN_DECISION_MS || '3000'),
  OLD_IMAGE_ANALYSIS_TIME: parseInt(process.env.OLD_IMAGE_ANALYSIS_MS || '500'),
};
```

---

## 🚀 **Phase 4: Stress Testing Strategy**

### **Load Testing Framework**
**Tool**: k6 or Artillery
**Target**: 20-50 simultaneous projects
**Metrics to Monitor**:
- DB connection pool exhaustion
- Memory usage patterns
- Response time degradation
- Error rates under load

### **Test Scenarios**
1. **Concurrent New Projects**: 20 users creating projects simultaneously
2. **Mixed Workload**: 50% new projects, 50% existing project edits
3. **Image-Heavy Load**: Projects with multiple image uploads
4. **Long-Running Sessions**: 30+ prompt conversations

### **Infrastructure Monitoring**
- **Database**: Connection pool size, query performance
- **Memory**: Heap usage, garbage collection frequency
- **Network**: Request/response latency distribution
- **Errors**: Async error patterns, timeout frequencies

---

## 📋 **Phase 4.1: Data Lifecycle Management**

### **Database Cleanup Strategy**
**Target Tables**:
- `image_analysis` - 30-day retention
- `project_memory` - Based on project activity
- `conversations` - Archive after 90 days

### **Automated Cleanup Jobs**
```sql
-- Example cleanup query for old image analyses
DELETE FROM image_analysis 
WHERE created_at < NOW() - INTERVAL '30 days'
  AND project_id NOT IN (
    SELECT id FROM projects 
    WHERE updated_at > NOW() - INTERVAL '7 days'
  );
```

---

## 🔧 **Implementation Priority**

### **Before Phase 4 Launch**:
1. ✅ TTL cache implementation (prevents memory leaks)
2. ✅ Error tracking integration (essential for debugging)
3. ⚪ Token count monitoring (prevents silent failures)

### **During Phase 4**:
1. Load testing execution
2. Performance bottleneck identification
3. Infrastructure scaling validation

### **Phase 4.1 Follow-up**:
1. Data lifecycle automation
2. Monitoring dashboard creation
3. Production readiness checklist

---

## 📊 **Success Metrics for Phase 4**

- **Concurrency**: Handle 50 simultaneous users without degradation
- **Memory**: No memory leaks over 4-hour sustained load
- **Database**: Connection pool efficiency >90%
- **Errors**: <1% error rate under normal load
- **Performance**: Maintain 30% improvement under all load conditions

---

*Prepared based on Phase 3 user review feedback - Ready for Phase 4 implementation* 