# Production Monitoring Setup - Code Validation System

## 📊 Monitoring Overview

This document provides comprehensive monitoring procedures for the Sprint 98 code validation system now live in production.

## 1. Key Metrics to Monitor

### 1.1 Success Rate Metrics

**Target**: 80%+ auto-fix success rate (up from 0%)

```sql
-- Daily success rate tracking
SELECT 
  DATE(created_at) as date,
  COUNT(CASE WHEN content LIKE 'Fixing%' THEN 1 END) as fix_attempts,
  COUNT(CASE WHEN content LIKE '%fixed issues%' THEN 1 END) as successful_fixes,
  ROUND(
    COUNT(CASE WHEN content LIKE '%fixed issues%' THEN 1 END) * 100.0 / 
    NULLIF(COUNT(CASE WHEN content LIKE 'Fixing%' THEN 1 END), 0), 
    2
  ) as success_rate_percent
FROM messages 
WHERE role = 'assistant'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 30;
```

### 1.2 Attempt Count Distribution

**Critical**: No scene should exceed 3 attempts

```sql
-- Verify 3-attempt limit is enforced
SELECT 
  chat_id,
  scene_name,
  COUNT(*) as attempt_count,
  MIN(created_at) as first_attempt,
  MAX(created_at) as last_attempt
FROM messages 
WHERE content LIKE 'Fixing%'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY chat_id, scene_name
HAVING COUNT(*) > 3  -- Should return 0 rows!
ORDER BY attempt_count DESC;
```

### 1.3 Error Pattern Analysis

```sql
-- Track most common error patterns
SELECT 
  CASE 
    WHEN content LIKE '%x is not defined%' THEN 'X Variable Bug'
    WHEN content LIKE '%already declared%' THEN 'Duplicate Declarations'
    WHEN content LIKE '%spring%fps%' THEN 'Missing FPS'
    WHEN content LIKE '%undefined%' THEN 'Undefined Variables'
    WHEN content LIKE '%import%' THEN 'Missing Imports'
    ELSE 'Other'
  END as error_pattern,
  COUNT(*) as occurrence_count,
  COUNT(DISTINCT chat_id) as unique_projects
FROM messages 
WHERE content LIKE 'Fixing%'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY error_pattern
ORDER BY occurrence_count DESC;
```

## 2. Monitoring Dashboard Queries

### 2.1 Real-Time Health Check

```sql
-- Current system health
SELECT 
  'Auto-Fix Attempts (Last Hour)' as metric,
  COUNT(*) as value
FROM messages 
WHERE content LIKE 'Fixing%' 
  AND created_at >= NOW() - INTERVAL '1 hour'

UNION ALL

SELECT 
  'Successful Fixes (Last Hour)' as metric,
  COUNT(*) as value
FROM messages 
WHERE content LIKE '%fixed issues%' 
  AND created_at >= NOW() - INTERVAL '1 hour'

UNION ALL

SELECT 
  'Circuit Breaker Trips (Last Hour)' as metric,
  COUNT(*) as value
FROM messages 
WHERE content LIKE '%giving up%' 
  AND created_at >= NOW() - INTERVAL '1 hour';
```

### 2.2 Weekly Performance Summary

```sql
-- Weekly performance overview
WITH weekly_stats AS (
  SELECT 
    DATE_TRUNC('week', created_at) as week,
    COUNT(CASE WHEN content LIKE 'Fixing%' THEN 1 END) as attempts,
    COUNT(CASE WHEN content LIKE '%fixed issues%' THEN 1 END) as successes,
    COUNT(CASE WHEN content LIKE '%giving up%' THEN 1 END) as failures,
    COUNT(DISTINCT chat_id) as unique_projects
  FROM messages 
  WHERE role = 'assistant'
    AND created_at >= NOW() - INTERVAL '4 weeks'
  GROUP BY DATE_TRUNC('week', created_at)
)
SELECT 
  week,
  attempts,
  successes,
  failures,
  unique_projects,
  ROUND(successes * 100.0 / NULLIF(attempts, 0), 2) as success_rate
FROM weekly_stats
ORDER BY week DESC;
```

## 3. Alert Conditions

### 3.1 Critical Alerts (Immediate Response)

1. **Infinite Loop Detection**
   ```sql
   -- Alert if any scene has >3 attempts
   SELECT * FROM messages 
   WHERE content LIKE 'Fixing%'
   GROUP BY chat_id, scene_name
   HAVING COUNT(*) > 3;
   ```
   **Action**: Immediate investigation required

2. **Circuit Breaker Trips**
   ```sql
   -- Alert on circuit breaker activation
   SELECT COUNT(*) FROM messages 
   WHERE content LIKE '%circuit breaker%' 
     AND created_at >= NOW() - INTERVAL '1 hour'
   HAVING COUNT(*) > 0;
   ```
   **Action**: Check for systemic issues

3. **Performance Degradation**
   ```sql
   -- Alert if success rate drops below 60%
   SELECT success_rate FROM (
     SELECT ROUND(
       COUNT(CASE WHEN content LIKE '%fixed issues%' THEN 1 END) * 100.0 / 
       NULLIF(COUNT(CASE WHEN content LIKE 'Fixing%' THEN 1 END), 0), 2
     ) as success_rate
     FROM messages 
     WHERE created_at >= NOW() - INTERVAL '24 hours'
   ) stats
   WHERE success_rate < 60;
   ```

### 3.2 Warning Alerts (Monitor Closely)

1. **New Error Patterns**
   ```sql
   -- Alert on unknown error patterns
   SELECT content 
   FROM messages 
   WHERE content LIKE 'Fixing%'
     AND created_at >= NOW() - INTERVAL '1 hour'
     AND content NOT LIKE '%x is not defined%'
     AND content NOT LIKE '%already declared%' 
     AND content NOT LIKE '%fps%'
     AND content NOT LIKE '%undefined%'
     AND content NOT LIKE '%import%';
   ```

2. **High Attempt Rate**
   ```sql
   -- Alert if attempt rate increases significantly
   SELECT COUNT(*) as attempts_last_hour
   FROM messages 
   WHERE content LIKE 'Fixing%' 
     AND created_at >= NOW() - INTERVAL '1 hour'
   HAVING COUNT(*) > (
     SELECT AVG(hourly_attempts) * 2 
     FROM (
       SELECT COUNT(*) as hourly_attempts
       FROM messages 
       WHERE content LIKE 'Fixing%' 
         AND created_at >= NOW() - INTERVAL '7 days'
       GROUP BY DATE_TRUNC('hour', created_at)
     ) avg_calc
   );
   ```

## 4. Performance Monitoring

### 4.1 Response Time Tracking

```typescript
// Add to codeValidator.ts
export function validateAndFixCode(code: string): ValidationResult {
  const startTime = performance.now();
  
  // ... existing validation logic ...
  
  const duration = performance.now() - startTime;
  
  // Log performance metrics
  console.log(`[VALIDATION PERFORMANCE] Duration: ${duration.toFixed(2)}ms, Fixes: ${fixes.length}`);
  
  // Alert if validation takes too long
  if (duration > 200) {
    console.warn(`[VALIDATION PERFORMANCE] Slow validation: ${duration.toFixed(2)}ms`);
  }
  
  return result;
}
```

### 4.2 Memory Usage Monitoring

```typescript
// Add memory monitoring to main pipeline
export class UnifiedCodeProcessor {
  private logMemoryUsage(context: string) {
    const usage = process.memoryUsage();
    console.log(`[MEMORY] ${context}: ${Math.round(usage.heapUsed / 1024 / 1024)}MB heap`);
    
    if (usage.heapUsed > 500 * 1024 * 1024) { // 500MB threshold
      console.warn(`[MEMORY WARNING] High heap usage: ${Math.round(usage.heapUsed / 1024 / 1024)}MB`);
    }
  }
  
  private processAIResponse(rawOutput: string, toolName: string, userPrompt: string, functionName: string) {
    this.logMemoryUsage('Before validation');
    
    // ... validation logic ...
    
    this.logMemoryUsage('After validation');
    return result;
  }
}
```

## 5. Business Impact Tracking

### 5.1 User Experience Metrics

```sql
-- Track user experience improvements
WITH user_sessions AS (
  SELECT 
    chat_id,
    DATE(created_at) as date,
    COUNT(CASE WHEN role = 'user' THEN 1 END) as user_messages,
    COUNT(CASE WHEN role = 'assistant' AND content LIKE '%error%' THEN 1 END) as error_messages,
    COUNT(CASE WHEN role = 'assistant' AND content LIKE 'Fixing%' THEN 1 END) as fix_attempts
  FROM messages 
  WHERE created_at >= NOW() - INTERVAL '7 days'
  GROUP BY chat_id, DATE(created_at)
)
SELECT 
  date,
  COUNT(*) as total_sessions,
  AVG(error_messages::float / user_messages) as avg_error_rate,
  AVG(fix_attempts::float / user_messages) as avg_fix_rate,
  COUNT(CASE WHEN fix_attempts = 0 THEN 1 END) as sessions_without_fixes
FROM user_sessions
WHERE user_messages > 0
GROUP BY date
ORDER BY date DESC;
```

### 5.2 Code Generation Success Tracking

```sql
-- Overall code generation success rate
SELECT 
  DATE(created_at) as date,
  COUNT(CASE WHEN role = 'assistant' AND content LIKE '%Scene completed%' THEN 1 END) as successful_scenes,
  COUNT(CASE WHEN role = 'user' AND (content LIKE '%create%' OR content LIKE '%add%' OR content LIKE '%make%') THEN 1 END) as generation_requests,
  ROUND(
    COUNT(CASE WHEN role = 'assistant' AND content LIKE '%Scene completed%' THEN 1 END) * 100.0 / 
    NULLIF(COUNT(CASE WHEN role = 'user' AND (content LIKE '%create%' OR content LIKE '%add%' OR content LIKE '%make%') THEN 1 END), 0),
    2
  ) as generation_success_rate
FROM messages 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## 6. Automated Monitoring Scripts

### 6.1 Daily Health Check Script

```bash
#!/bin/bash
# daily-health-check.sh

echo "=== Code Validation System Health Check ===" 
echo "Date: $(date)"

# Check for infinite loops (should be 0)
INFINITE_LOOPS=$(psql $DATABASE_URL -t -c "
  SELECT COUNT(*) FROM (
    SELECT chat_id, scene_name, COUNT(*) as attempts
    FROM messages 
    WHERE content LIKE 'Fixing%' 
      AND created_at >= NOW() - INTERVAL '24 hours'
    GROUP BY chat_id, scene_name
    HAVING COUNT(*) > 3
  ) violations;
")

echo "Infinite loops detected: $INFINITE_LOOPS"

if [ "$INFINITE_LOOPS" -gt 0 ]; then
  echo "🚨 CRITICAL: Infinite loops detected!"
  # Send alert to monitoring system
fi

# Check success rate
SUCCESS_RATE=$(psql $DATABASE_URL -t -c "
  SELECT ROUND(
    COUNT(CASE WHEN content LIKE '%fixed issues%' THEN 1 END) * 100.0 / 
    NULLIF(COUNT(CASE WHEN content LIKE 'Fixing%' THEN 1 END), 0), 2
  )
  FROM messages 
  WHERE created_at >= NOW() - INTERVAL '24 hours';
")

echo "24h Success Rate: ${SUCCESS_RATE}%"

if [ $(echo "$SUCCESS_RATE < 60" | bc) -eq 1 ]; then
  echo "⚠️ WARNING: Success rate below target (60%)"
fi

echo "Health check complete."
```

### 6.2 Real-Time Monitoring Dashboard

```typescript
// monitoring-dashboard.ts
export class ValidationMonitor {
  private async getMetrics() {
    const [
      attempts,
      successes,
      failures,
      infiniteLoops
    ] = await Promise.all([
      this.getAttemptCount(),
      this.getSuccessCount(), 
      this.getFailureCount(),
      this.getInfiniteLoopCount()
    ]);
    
    return {
      attempts,
      successes,
      failures,
      infiniteLoops,
      successRate: attempts > 0 ? (successes / attempts) * 100 : 0,
      isHealthy: infiniteLoops === 0 && (successes / attempts) > 0.6
    };
  }
  
  async startMonitoring(intervalMs = 60000) {
    setInterval(async () => {
      const metrics = await this.getMetrics();
      
      console.log(`[MONITOR] Success Rate: ${metrics.successRate.toFixed(2)}%`);
      
      if (!metrics.isHealthy) {
        console.error('[MONITOR] UNHEALTHY STATE DETECTED');
        this.triggerAlert(metrics);
      }
    }, intervalMs);
  }
}
```

## 7. Maintenance Procedures

### 7.1 Weekly Review Checklist

- [ ] Check success rate trends
- [ ] Review new error patterns  
- [ ] Verify 3-attempt limits enforced
- [ ] Monitor performance metrics
- [ ] Check for memory leaks
- [ ] Review alert triggers

### 7.2 Monthly Deep Analysis

- [ ] Analyze error pattern evolution
- [ ] Performance trend analysis
- [ ] User experience impact assessment
- [ ] Identify optimization opportunities
- [ ] Update fix patterns if needed

### 7.3 Quarterly System Review

- [ ] Comprehensive performance audit
- [ ] Architecture review
- [ ] Test coverage assessment
- [ ] Documentation updates
- [ ] Scalability planning

## 8. Troubleshooting Runbook

### Issue: Success Rate Dropping

1. **Immediate Actions**
   - Check recent deployments
   - Review error patterns in dashboard
   - Verify 3-attempt limits still enforced

2. **Investigation**
   - Analyze new error patterns
   - Check for code generation changes
   - Review performance metrics

3. **Resolution**
   - Add new fix patterns if needed
   - Update validation logic
   - Deploy fixes with monitoring

### Issue: Performance Degradation

1. **Check Response Times**
   ```sql
   -- Look for validation performance logs
   SELECT * FROM logs 
   WHERE message LIKE '%VALIDATION PERFORMANCE%'
   ORDER BY created_at DESC LIMIT 100;
   ```

2. **Memory Analysis**
   - Check heap usage trends
   - Look for memory leak indicators
   - Review garbage collection patterns

3. **Optimization**
   - Profile slow validation cases
   - Optimize regex patterns
   - Consider caching strategies

## 9. Success Indicators

### Green (Healthy System)
- ✅ Success rate >80%
- ✅ Zero infinite loops
- ✅ Validation <100ms average
- ✅ Stable memory usage
- ✅ Few circuit breaker trips

### Yellow (Monitor Closely)  
- ⚠️ Success rate 60-80%
- ⚠️ Occasional performance spikes
- ⚠️ New error patterns emerging
- ⚠️ Memory usage trending up

### Red (Immediate Action)
- 🚨 Success rate <60%
- 🚨 Any infinite loops detected
- 🚨 Validation >200ms average
- 🚨 Circuit breaker frequently tripping
- 🚨 Memory leaks detected

This monitoring setup ensures the code validation system maintains its effectiveness and reliability in production.