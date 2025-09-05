/**
 * Auto-Fix Metrics Tracking
 * Tracks performance, costs, and success rates to verify improvements
 */

interface AutoFixMetrics {
  // Counters
  totalErrorsDetected: number;
  totalFixAttempts: number;
  successfulFixes: number;
  failedFixes: number;
  duplicateErrorsIgnored: number;
  crossProjectErrorsIgnored: number;
  rateLimitedAttempts: number;
  
  // Timing
  averageFixTime: number;
  fastestFix: number;
  slowestFix: number;
  
  // Cost tracking
  estimatedApiCalls: number;
  estimatedCost: number; // Based on $0.003 per 1K tokens
  
  // Session info
  sessionStartTime: number;
  lastResetTime: number;
  projectSwitches: number;
  
  // Error patterns
  errorSignatures: Map<string, {
    count: number;
    firstSeen: number;
    lastSeen: number;
    fixAttempts: number;
    resolved: boolean;
  }>;
  
  // Circuit breaker stats
  circuitBreakerTrips: number;
  consecutiveFailures: number;
  cooldownsTriggered: number;
}

class AutoFixMetricsTracker {
  private metrics: AutoFixMetrics;
  private readonly STORAGE_KEY = 'autofix-metrics';
  private readonly MAX_HISTORY_DAYS = 7;
  
  constructor() {
    this.metrics = this.loadMetrics();
    
    // Expose to window for debugging
    if (typeof window !== 'undefined') {
      (window as any).autofixMetrics = this;
    }
  }
  
  private loadMetrics(): AutoFixMetrics {
    if (typeof window === 'undefined') {
      return this.createEmptyMetrics();
    }
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert Map back from JSON
        parsed.errorSignatures = new Map(parsed.errorSignatures || []);
        return parsed;
      }
    } catch (e) {
      console.error('[AutoFix Metrics] Failed to load metrics', e);
    }
    
    return this.createEmptyMetrics();
  }
  
  private createEmptyMetrics(): AutoFixMetrics {
    return {
      totalErrorsDetected: 0,
      totalFixAttempts: 0,
      successfulFixes: 0,
      failedFixes: 0,
      duplicateErrorsIgnored: 0,
      crossProjectErrorsIgnored: 0,
      rateLimitedAttempts: 0,
      averageFixTime: 0,
      fastestFix: Infinity,
      slowestFix: 0,
      estimatedApiCalls: 0,
      estimatedCost: 0,
      sessionStartTime: Date.now(),
      lastResetTime: Date.now(),
      projectSwitches: 0,
      errorSignatures: new Map(),
      circuitBreakerTrips: 0,
      consecutiveFailures: 0,
      cooldownsTriggered: 0,
    };
  }
  
  private saveMetrics() {
    if (typeof window === 'undefined') return;
    
    try {
      const toSave = {
        ...this.metrics,
        // Convert Map to array for JSON
        errorSignatures: Array.from(this.metrics.errorSignatures.entries()),
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.error('[AutoFix Metrics] Failed to save metrics', e);
    }
  }
  
  // Track error detection
  recordErrorDetected(sceneId: string, errorMessage: string) {
    this.metrics.totalErrorsDetected++;
    
    const signature = `${sceneId}:${errorMessage}`;
    const existing = this.metrics.errorSignatures.get(signature);
    
    if (existing) {
      existing.count++;
      existing.lastSeen = Date.now();
    } else {
      this.metrics.errorSignatures.set(signature, {
        count: 1,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        fixAttempts: 0,
        resolved: false,
      });
    }
    
    this.saveMetrics();
  }
  
  // Track duplicate ignored
  recordDuplicateIgnored() {
    this.metrics.duplicateErrorsIgnored++;
    this.saveMetrics();
  }
  
  // Track cross-project error ignored
  recordCrossProjectIgnored() {
    this.metrics.crossProjectErrorsIgnored++;
    this.saveMetrics();
  }
  
  // Track rate limiting
  recordRateLimited() {
    this.metrics.rateLimitedAttempts++;
    this.saveMetrics();
  }
  
  // Track fix attempt
  recordFixAttempt(sceneId: string, errorMessage: string, startTime: number) {
    this.metrics.totalFixAttempts++;
    this.metrics.estimatedApiCalls++;
    
    // Estimate cost (rough: 1K tokens in, 1K out = $0.003)
    this.metrics.estimatedCost += 0.003;
    
    const signature = `${sceneId}:${errorMessage}`;
    const errorInfo = this.metrics.errorSignatures.get(signature);
    if (errorInfo) {
      errorInfo.fixAttempts++;
    }
    
    this.saveMetrics();
    
    // Return a function to call when fix completes
    return (success: boolean) => {
      const duration = Date.now() - startTime;
      
      if (success) {
        this.metrics.successfulFixes++;
        if (errorInfo) {
          errorInfo.resolved = true;
        }
      } else {
        this.metrics.failedFixes++;
        this.metrics.consecutiveFailures++;
      }
      
      // Update timing stats
      this.updateTimingStats(duration);
      this.saveMetrics();
    };
  }
  
  private updateTimingStats(duration: number) {
    // Update average (simple moving average)
    const totalAttempts = this.metrics.successfulFixes + this.metrics.failedFixes;
    if (totalAttempts === 1) {
      this.metrics.averageFixTime = duration;
    } else {
      this.metrics.averageFixTime = 
        (this.metrics.averageFixTime * (totalAttempts - 1) + duration) / totalAttempts;
    }
    
    // Update min/max
    this.metrics.fastestFix = Math.min(this.metrics.fastestFix, duration);
    this.metrics.slowestFix = Math.max(this.metrics.slowestFix, duration);
  }
  
  // Track project switches
  recordProjectSwitch() {
    this.metrics.projectSwitches++;
    this.metrics.consecutiveFailures = 0; // Reset on project switch
    this.saveMetrics();
  }
  
  // Track circuit breaker
  recordCircuitBreakerTrip() {
    this.metrics.circuitBreakerTrips++;
    this.saveMetrics();
  }
  
  // Track cooldown
  recordCooldownTriggered() {
    this.metrics.cooldownsTriggered++;
    this.saveMetrics();
  }
  
  // Get report
  getReport() {
    const sessionDuration = Date.now() - this.metrics.sessionStartTime;
    const successRate = this.metrics.totalFixAttempts > 0 
      ? (this.metrics.successfulFixes / this.metrics.totalFixAttempts * 100).toFixed(1)
      : 0;
    
    const uniqueErrors = this.metrics.errorSignatures.size;
    const resolvedErrors = Array.from(this.metrics.errorSignatures.values())
      .filter(e => e.resolved).length;
    
    return {
      summary: {
        sessionDuration: Math.round(sessionDuration / 1000 / 60) + ' minutes',
        totalErrors: this.metrics.totalErrorsDetected,
        uniqueErrors,
        resolvedErrors,
        successRate: successRate + '%',
        duplicatesIgnored: this.metrics.duplicateErrorsIgnored,
        crossProjectIgnored: this.metrics.crossProjectErrorsIgnored,
        rateLimited: this.metrics.rateLimitedAttempts,
        estimatedCost: '$' + this.metrics.estimatedCost.toFixed(2),
        apiCalls: this.metrics.estimatedApiCalls,
      },
      performance: {
        averageFixTime: Math.round(this.metrics.averageFixTime) + 'ms',
        fastestFix: this.metrics.fastestFix === Infinity ? 'N/A' : Math.round(this.metrics.fastestFix) + 'ms',
        slowestFix: Math.round(this.metrics.slowestFix) + 'ms',
      },
      reliability: {
        circuitBreakerTrips: this.metrics.circuitBreakerTrips,
        cooldownsTriggered: this.metrics.cooldownsTriggered,
        consecutiveFailures: this.metrics.consecutiveFailures,
        projectSwitches: this.metrics.projectSwitches,
      },
      topErrors: Array.from(this.metrics.errorSignatures.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .map(([sig, info]) => ({
          signature: sig.substring(0, 50) + '...',
          count: info.count,
          attempts: info.fixAttempts,
          resolved: info.resolved,
        })),
    };
  }
  
  // Reset metrics
  reset() {
    this.metrics = this.createEmptyMetrics();
    this.saveMetrics();
    console.log('[AutoFix Metrics] Metrics reset');
  }
  
  // Compare with baseline (before fixes)
  compareWithBaseline() {
    // Baseline estimates from logs
    const baseline = {
      errorsPerMinute: 10, // From infinite loop logs
      apiCallsPerError: 50, // Conservative estimate
      costPerError: 0.15, // 50 calls * $0.003
      successRate: 10, // Very low due to repeated failures
    };
    
    const current = {
      errorsPerMinute: this.metrics.totalErrorsDetected / 
        ((Date.now() - this.metrics.sessionStartTime) / 60000),
      apiCallsPerError: this.metrics.estimatedApiCalls / 
        Math.max(1, this.metrics.totalFixAttempts),
      costPerError: this.metrics.estimatedCost / 
        Math.max(1, this.metrics.totalFixAttempts),
      successRate: parseFloat(this.getReport().summary.successRate),
    };
    
    return {
      improvements: {
        apiCallReduction: Math.round((1 - current.apiCallsPerError / baseline.apiCallsPerError) * 100) + '%',
        costReduction: Math.round((1 - current.costPerError / baseline.costPerError) * 100) + '%',
        successRateIncrease: (current.successRate - baseline.successRate).toFixed(1) + '%',
      },
      baseline,
      current,
    };
  }
}

// Create singleton instance
export const autofixMetrics = new AutoFixMetricsTracker();

// Convenience logging function
export function logAutofixEvent(event: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${event}`;
  
  if (typeof window !== 'undefined') {
    // Store in session storage for analysis
    const logs = JSON.parse(sessionStorage.getItem('autofix-logs') || '[]');
    logs.push({ timestamp, event, data });
    
    // Keep only last 1000 entries
    if (logs.length > 1000) {
      logs.shift();
    }
    
    sessionStorage.setItem('autofix-logs', JSON.stringify(logs));
  }
  
  console.log(`[AutoFix Log] ${logEntry}`, data || '');
}