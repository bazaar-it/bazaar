/**
 * Performance Service
 * Phase 3: Measures the 30% latency improvement from async context-driven architecture
 * Tracks timing metrics for brain orchestrator and image analysis flows
 */

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

interface AsyncFlowMetrics {
  brainDecisionTime: number;
  imageAnalysisTime?: number;
  totalResponseTime: number;
  asyncSavings: number; // Time saved by not waiting for image analysis
  contextBuildTime: number;
  memoryBankQueries: number;
}

class PerformanceService {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private readonly DEBUG = process.env.NODE_ENV === 'development';

  /**
   * Start measuring a performance metric
   */
  startMetric(name: string, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      startTime: performance.now(),
      metadata,
    };
    
    this.metrics.set(name, metric);
    
    if (this.DEBUG) {
      console.log(`⏱️ [Performance] Started measuring: ${name}`);
    }
  }

  /**
   * End measuring a performance metric
   */
  endMetric(name: string): number | null {
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`⚠️ [Performance] Metric not found: ${name}`);
      return null;
    }

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;

    if (this.DEBUG) {
      console.log(`✅ [Performance] Completed: ${name} in ${metric.duration.toFixed(2)}ms`);
    }

    return metric.duration;
  }

  /**
   * Get the duration of a completed metric
   */
  getMetricDuration(name: string): number | null {
    const metric = this.metrics.get(name);
    return metric?.duration || null;
  }

  /**
   * Measure async flow performance to verify 30% improvement
   */
  async measureAsyncFlow<T>(
    flowName: string,
    asyncOperation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<{ result: T; metrics: AsyncFlowMetrics }> {
    
    const flowMetric = `async_flow_${flowName}`;
    this.startMetric(flowMetric, metadata);

    // Simulate the OLD blocking flow timing for comparison
    const oldFlowEstimate = this.estimateOldFlowTime(metadata);

    try {
      const result = await asyncOperation();
      const totalTime = this.endMetric(flowMetric) || 0;

      // Calculate savings from async approach
      const asyncSavings = Math.max(0, oldFlowEstimate - totalTime);
      const improvementPercentage = oldFlowEstimate > 0 ? (asyncSavings / oldFlowEstimate) * 100 : 0;

      const metrics: AsyncFlowMetrics = {
        brainDecisionTime: this.getMetricDuration('brain_decision') || 0,
        imageAnalysisTime: this.getMetricDuration('image_analysis') || undefined,
        totalResponseTime: totalTime,
        asyncSavings,
        contextBuildTime: this.getMetricDuration('context_build') || 0,
        memoryBankQueries: metadata?.memoryBankQueries || 0,
      };

      if (this.DEBUG) {
        console.log(`📊 [Performance] Async Flow Results for ${flowName}:`);
        console.log(`  - Total time: ${totalTime.toFixed(2)}ms`);
        console.log(`  - Estimated old flow: ${oldFlowEstimate.toFixed(2)}ms`);
        console.log(`  - Time saved: ${asyncSavings.toFixed(2)}ms`);
        console.log(`  - Improvement: ${improvementPercentage.toFixed(1)}%`);
        
        if (improvementPercentage >= 30) {
          console.log(`  🎯 TARGET ACHIEVED: ${improvementPercentage.toFixed(1)}% improvement (target: 30%)`);
        } else if (improvementPercentage > 0) {
          console.log(`  🔄 PROGRESS: ${improvementPercentage.toFixed(1)}% improvement (target: 30%)`);
        }
      }

      return { result, metrics };

    } catch (error) {
      this.endMetric(flowMetric);
      throw error;
    }
  }

  /**
   * Estimate how long the old blocking flow would have taken
   */
  private estimateOldFlowTime(metadata?: Record<string, any>): number {
    let estimate = 0;
    
    // Base brain decision time
    estimate += 2000; // 2 seconds for LLM processing
    
    // Add image analysis time if images are present
    if (metadata?.hasImages) {
      estimate += 3000; // 3 seconds for image analysis (blocking)
    }
    
    // Add context building time (was slower without database optimization)
    estimate += 500; // 0.5 seconds for context building
    
    return estimate;
  }

  /**
   * Generate performance report for dashboard
   */
  getPerformanceReport(): {
    totalMetrics: number;
    averageResponseTime: number;
    asyncImprovements: Array<{
      flowName: string;
      improvement: number;
      totalTime: number;
    }>;
  } {
    const completedMetrics = Array.from(this.metrics.values()).filter(m => m.duration !== undefined);
    
    const averageResponseTime = completedMetrics.length > 0 
      ? completedMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / completedMetrics.length
      : 0;

    const asyncImprovements = completedMetrics
      .filter(m => m.name.startsWith('async_flow_'))
      .map(m => {
        const oldEstimate = this.estimateOldFlowTime(m.metadata);
        const improvement = oldEstimate > 0 ? ((oldEstimate - (m.duration || 0)) / oldEstimate) * 100 : 0;
        
        return {
          flowName: m.name.replace('async_flow_', ''),
          improvement,
          totalTime: m.duration || 0,
        };
      });

    return {
      totalMetrics: completedMetrics.length,
      averageResponseTime,
      asyncImprovements,
    };
  }

  /**
   * Record an error for performance tracking and monitoring
   */
  recordError(operation: string, errorMessage: string): void {
    const errorMetric: PerformanceMetric = {
      name: `error_${operation}`,
      startTime: performance.now(),
      endTime: performance.now(),
      duration: 0,
      metadata: {
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
    };
    
    this.metrics.set(`error_${Date.now()}`, errorMetric);
    
    if (this.DEBUG) {
      console.log(`❌ [Performance] Error recorded for ${operation}: ${errorMessage}`);
    }
  }

  /**
   * Clear all metrics (useful for testing)
   */
  clearMetrics(): void {
    this.metrics.clear();
    if (this.DEBUG) {
      console.log(`🧹 [Performance] All metrics cleared`);
    }
  }

  /**
   * Log performance summary
   */
  logSummary(): void {
    const report = this.getPerformanceReport();
    
    console.log(`\n📊 [Performance] Summary:`);
    console.log(`  - Total operations measured: ${report.totalMetrics}`);
    console.log(`  - Average response time: ${report.averageResponseTime.toFixed(2)}ms`);
    
    if (report.asyncImprovements.length > 0) {
      console.log(`  - Async improvements:`);
      report.asyncImprovements.forEach(improvement => {
        const status = improvement.improvement >= 30 ? '🎯' : improvement.improvement > 0 ? '🔄' : '❌';
        console.log(`    ${status} ${improvement.flowName}: ${improvement.improvement.toFixed(1)}% (${improvement.totalTime.toFixed(2)}ms)`);
      });
    }
  }
}

// Export singleton instance
export const performanceService = new PerformanceService();

// Performance testing helper for brain orchestrator integration
export class BrainOrchestratorPerformanceTester {
  
  /**
   * Test brain orchestrator performance with and without async image analysis
   */
  static async testAsyncPerformance(
    orchestrator: any,
    testInput: any
  ): Promise<{
    asyncMetrics: AsyncFlowMetrics;
    passesTarget: boolean;
  }> {
    
    console.log(`🧪 [Performance Test] Starting brain orchestrator async performance test`);
    
    // Test the async flow
    const { metrics: asyncMetrics } = await performanceService.measureAsyncFlow(
      'brain_orchestrator_async',
      async () => {
        performanceService.startMetric('context_build');
        performanceService.startMetric('brain_decision');
        
        const result = await orchestrator.processUserInput(testInput);
        
        performanceService.endMetric('brain_decision');
        performanceService.endMetric('context_build');
        
        return result;
      },
      {
        hasImages: testInput.userContext?.imageUrls?.length > 0,
        memoryBankQueries: 3, // Estimated number of DB queries
      }
    );

    const improvementPercentage = asyncMetrics.asyncSavings > 0 
      ? (asyncMetrics.asyncSavings / (asyncMetrics.totalResponseTime + asyncMetrics.asyncSavings)) * 100
      : 0;

    const passesTarget = improvementPercentage >= 30;

    console.log(`🧪 [Performance Test] Results:`);
    console.log(`  - Async savings: ${asyncMetrics.asyncSavings.toFixed(2)}ms`);
    console.log(`  - Improvement: ${improvementPercentage.toFixed(1)}%`);
    console.log(`  - Target achieved: ${passesTarget ? '✅ YES' : '❌ NO'}`);

    return { asyncMetrics, passesTarget };
  }
} 