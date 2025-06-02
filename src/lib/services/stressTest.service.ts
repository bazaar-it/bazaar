import { BrainOrchestrator } from '../../server/services/brain/orchestrator';
import { performanceService } from './performance.service';

/**
 * Phase 4: Stress Testing Service
 * Validates async architecture performance under high concurrent load
 */

export interface StressTestConfig {
  concurrentUsers: number;
  testDurationMs: number;
  scenarios: StressTestScenario[];
  rampUpTimeMs?: number;
  metricsInterval?: number;
}

export interface StressTestScenario {
  name: string;
  weight: number; // Percentage of traffic (0-100)
  operation: 'new_project' | 'edit_scene' | 'image_upload' | 'mixed_workflow';
  hasImages?: boolean;
  imageCount?: number;
  conversationLength?: number;
}

export interface StressTestMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughputPerSecond: number;
  errorRate: number;
  memoryPeakMB: number;
  scenarios: Record<string, ScenarioMetrics>;
}

export interface ScenarioMetrics {
  requests: number;
  successes: number;
  failures: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
}

export class StressTestService {
  private orchestrator: BrainOrchestrator;
  private activeTests: Map<string, StressTestSession> = new Map();
  private readonly DEBUG = process.env.NODE_ENV === 'development';

  constructor() {
    this.orchestrator = new BrainOrchestrator();
  }

  /**
   * Run comprehensive stress test suite
   */
  async runStressTest(
    testId: string,
    config: StressTestConfig
  ): Promise<StressTestMetrics> {
    console.log(`🚀 [Stress Test] Starting test: ${testId}`);
    console.log(`📊 Configuration: ${config.concurrentUsers} users, ${config.testDurationMs}ms duration`);

    const session = new StressTestSession(testId, config, this.orchestrator);
    this.activeTests.set(testId, session);

    try {
      const metrics = await session.execute();
      console.log(`✅ [Stress Test] Completed: ${testId}`);
      this.logStressTestResults(metrics);
      return metrics;
    } finally {
      this.activeTests.delete(testId);
    }
  }

  /**
   * Predefined test configurations for different scenarios
   */
  static getTestConfigs(): Record<string, StressTestConfig> {
    return {
      // Quick smoke test
      smoke: {
        concurrentUsers: 5,
        testDurationMs: 30000, // 30 seconds
        scenarios: [
          { name: 'new_project', weight: 50, operation: 'new_project' },
          { name: 'edit_scene', weight: 50, operation: 'edit_scene' }
        ]
      },

      // Phase 4 target load
      phase4_target: {
        concurrentUsers: 20,
        testDurationMs: 120000, // 2 minutes
        scenarios: [
          { name: 'new_project', weight: 40, operation: 'new_project' },
          { name: 'edit_scene', weight: 30, operation: 'edit_scene' },
          { name: 'image_upload', weight: 20, operation: 'image_upload', hasImages: true, imageCount: 2 },
          { name: 'mixed_workflow', weight: 10, operation: 'mixed_workflow', hasImages: true }
        ],
        rampUpTimeMs: 30000, // 30s ramp-up
        metricsInterval: 5000 // 5s intervals
      },

      // High load stress test
      high_load: {
        concurrentUsers: 50,
        testDurationMs: 300000, // 5 minutes
        scenarios: [
          { name: 'new_project', weight: 30, operation: 'new_project' },
          { name: 'edit_scene', weight: 40, operation: 'edit_scene' },
          { name: 'image_heavy', weight: 20, operation: 'image_upload', hasImages: true, imageCount: 5 },
          { name: 'long_conversations', weight: 10, operation: 'mixed_workflow', conversationLength: 20 }
        ],
        rampUpTimeMs: 60000, // 1 minute ramp-up
        metricsInterval: 10000 // 10s intervals
      },

      // Image processing focus
      image_stress: {
        concurrentUsers: 15,
        testDurationMs: 180000, // 3 minutes
        scenarios: [
          { name: 'single_image', weight: 40, operation: 'image_upload', hasImages: true, imageCount: 1 },
          { name: 'multi_image', weight: 40, operation: 'image_upload', hasImages: true, imageCount: 3 },
          { name: 'image_workflow', weight: 20, operation: 'mixed_workflow', hasImages: true, imageCount: 2 }
        ]
      }
    };
  }

  /**
   * Monitor active stress tests
   */
  getActiveTestMetrics(): Record<string, Partial<StressTestMetrics>> {
    const results: Record<string, Partial<StressTestMetrics>> = {};
    
    for (const [testId, session] of this.activeTests) {
      results[testId] = session.getCurrentMetrics();
    }
    
    return results;
  }

  /**
   * Stop active stress test
   */
  stopStressTest(testId: string): boolean {
    const session = this.activeTests.get(testId);
    if (session) {
      session.stop();
      this.activeTests.delete(testId);
      return true;
    }
    return false;
  }

  private logStressTestResults(metrics: StressTestMetrics): void {
    console.log(`\n📊 [Stress Test] Results Summary:`);
    console.log(`  📈 Total Requests: ${metrics.totalRequests}`);
    console.log(`  ✅ Success Rate: ${((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(1)}%`);
    console.log(`  ❌ Error Rate: ${(metrics.errorRate * 100).toFixed(1)}%`);
    console.log(`  ⏱️  Avg Response: ${metrics.averageResponseTime.toFixed(2)}ms`);
    console.log(`  🏃 P95 Response: ${metrics.p95ResponseTime.toFixed(2)}ms`);
    console.log(`  🏃‍♂️ P99 Response: ${metrics.p99ResponseTime.toFixed(2)}ms`);
    console.log(`  🚀 Throughput: ${metrics.throughputPerSecond.toFixed(1)} req/s`);
    console.log(`  💾 Peak Memory: ${metrics.memoryPeakMB.toFixed(1)} MB`);

    console.log(`\n📋 Scenario Breakdown:`);
    for (const [name, scenario] of Object.entries(metrics.scenarios)) {
      console.log(`  ${name}: ${scenario.successes}/${scenario.requests} (${scenario.avgResponseTime.toFixed(2)}ms avg)`);
    }

    // Validation against Phase 4 targets
    const targetsmet = this.validatePhase4Targets(metrics);
    console.log(`\n🎯 Phase 4 Targets: ${targetsmet ? '✅ MET' : '❌ NOT MET'}`);
  }

  private validatePhase4Targets(metrics: StressTestMetrics): boolean {
    const targets = {
      errorRate: 0.01, // <1% error rate
      avgResponseTime: 3000, // <3s average response
      memoryStability: true // No memory leaks (would need trend analysis)
    };

    const errorRateMet = metrics.errorRate <= targets.errorRate;
    const responseMet = metrics.averageResponseTime <= targets.avgResponseTime;

    if (!errorRateMet) {
      console.log(`❌ Error rate: ${(metrics.errorRate * 100).toFixed(1)}% > ${(targets.errorRate * 100)}%`);
    }
    if (!responseMet) {
      console.log(`❌ Response time: ${metrics.averageResponseTime.toFixed(2)}ms > ${targets.avgResponseTime}ms`);
    }

    return errorRateMet && responseMet;
  }
}

/**
 * Individual stress test session
 */
class StressTestSession {
  private config: StressTestConfig;
  private orchestrator: BrainOrchestrator;
  private startTime: number = 0;
  private responses: Array<{ success: boolean; responseTime: number; scenario: string; timestamp: number }> = [];
  private isRunning = false;
  private testId: string;

  constructor(testId: string, config: StressTestConfig, orchestrator: BrainOrchestrator) {
    this.testId = testId;
    this.config = config;
    this.orchestrator = orchestrator;
  }

  async execute(): Promise<StressTestMetrics> {
    this.isRunning = true;
    this.startTime = Date.now();

    // Create user simulation promises
    const userPromises: Promise<void>[] = [];
    
    for (let i = 0; i < this.config.concurrentUsers; i++) {
      const delay = this.config.rampUpTimeMs 
        ? (i / this.config.concurrentUsers) * this.config.rampUpTimeMs
        : 0;
      
      userPromises.push(this.simulateUser(i, delay));
    }

    // Monitor memory usage
    const memoryMonitor = this.startMemoryMonitoring();

    // Wait for test duration
    await Promise.race([
      Promise.all(userPromises),
      this.wait(this.config.testDurationMs)
    ]);

    this.isRunning = false;
    clearInterval(memoryMonitor.interval);

    return this.calculateMetrics(memoryMonitor.peakMemory);
  }

  private async simulateUser(userId: number, delayMs: number): Promise<void> {
    if (delayMs > 0) {
      await this.wait(delayMs);
    }

    while (this.isRunning && Date.now() - this.startTime < this.config.testDurationMs) {
      const scenario = this.selectScenario();
      await this.executeScenario(userId, scenario);
      
      // Brief pause between requests (1-3 seconds)
      await this.wait(1000 + Math.random() * 2000);
    }
  }

  private selectScenario(): StressTestScenario {
    const random = Math.random() * 100;
    let cumulative = 0;
    
    for (const scenario of this.config.scenarios) {
      cumulative += scenario.weight;
      if (random <= cumulative) {
        return scenario;
      }
    }
    
    // Fallback to first scenario if no match (shouldn't happen with proper weights)
    return this.config.scenarios[0]!;
  }

  private async executeScenario(userId: number, scenario: StressTestScenario): Promise<void> {
    const startTime = performance.now();
    
    try {
      const input = this.generateTestInput(userId, scenario);
      const result = await this.orchestrator.processUserInput(input);
      
      const responseTime = performance.now() - startTime;
      this.responses.push({
        success: result.success,
        responseTime,
        scenario: scenario.name,
        timestamp: Date.now()
      });
      
    } catch (error) {
      const responseTime = performance.now() - startTime;
      this.responses.push({
        success: false,
        responseTime,
        scenario: scenario.name,
        timestamp: Date.now()
      });
    }
  }

  private generateTestInput(userId: number, scenario: StressTestScenario): any {
    const baseInput = {
      projectId: `stress-test-${this.testId}-${userId}`,
      userId: `user-${userId}`,
      chatHistory: this.generateChatHistory(scenario.conversationLength || 3),
      onProgress: () => {} // No-op for stress testing
    };

    switch (scenario.operation) {
      case 'new_project':
        return {
          ...baseInput,
          prompt: 'Create a new video about technology trends',
          storyboardSoFar: []
        };
      
      case 'edit_scene':
        return {
          ...baseInput,
          prompt: 'Change the background color to blue',
          storyboardSoFar: [{ id: 'scene-1', name: 'Intro Scene' }],
          userContext: { sceneId: 'scene-1' }
        };
      
      case 'image_upload':
        return {
          ...baseInput,
          prompt: 'Create a scene based on these images',
          userContext: {
            imageUrls: this.generateMockImageUrls(scenario.imageCount || 1)
          }
        };
      
      case 'mixed_workflow':
        return {
          ...baseInput,
          prompt: 'Add a new scene with animation effects',
          storyboardSoFar: [
            { id: 'scene-1', name: 'Intro' },
            { id: 'scene-2', name: 'Main Content' }
          ],
          userContext: scenario.hasImages ? {
            imageUrls: this.generateMockImageUrls(scenario.imageCount || 1)
          } : {}
        };
      
      default:
        return baseInput;
    }
  }

  private generateChatHistory(length: number): Array<{ role: string; content: string }> {
    const messages = [];
    for (let i = 0; i < length; i++) {
      messages.push({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i + 1} content`
      });
    }
    return messages;
  }

  private generateMockImageUrls(count: number): string[] {
    return Array.from({ length: count }, (_, i) => 
      `https://picsum.photos/400/300?random=${Date.now()}-${i}`
    );
  }

  private startMemoryMonitoring(): { interval: NodeJS.Timeout; peakMemory: number } {
    let peakMemory = 0;
    
    const interval = setInterval(() => {
      const usage = process.memoryUsage();
      const currentMB = usage.heapUsed / 1024 / 1024;
      peakMemory = Math.max(peakMemory, currentMB);
    }, 1000);

    return { interval, peakMemory };
  }

  private calculateMetrics(peakMemoryMB: number): StressTestMetrics {
    const responseTimes = this.responses.map(r => r.responseTime).sort((a, b) => a - b);
    const successfulResponses = this.responses.filter(r => r.success);
    const testDurationSeconds = (Date.now() - this.startTime) / 1000;

    // Calculate percentiles
    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p99Index = Math.floor(responseTimes.length * 0.99);

    // Calculate scenario metrics
    const scenarioMetrics: Record<string, ScenarioMetrics> = {};
    for (const scenario of this.config.scenarios) {
      const scenarioResponses = this.responses.filter(r => r.scenario === scenario.name);
      const scenarioSuccesses = scenarioResponses.filter(r => r.success);
      const scenarioTimes = scenarioResponses.map(r => r.responseTime);

      scenarioMetrics[scenario.name] = {
        requests: scenarioResponses.length,
        successes: scenarioSuccesses.length,
        failures: scenarioResponses.length - scenarioSuccesses.length,
        avgResponseTime: scenarioTimes.length > 0 ? scenarioTimes.reduce((a, b) => a + b, 0) / scenarioTimes.length : 0,
        minResponseTime: scenarioTimes.length > 0 ? Math.min(...scenarioTimes) : 0,
        maxResponseTime: scenarioTimes.length > 0 ? Math.max(...scenarioTimes) : 0
      };
    }

    return {
      totalRequests: this.responses.length,
      successfulRequests: successfulResponses.length,
      failedRequests: this.responses.length - successfulResponses.length,
      averageResponseTime: responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
      p95ResponseTime: responseTimes.length > 0 ? responseTimes[p95Index] || 0 : 0,
      p99ResponseTime: responseTimes.length > 0 ? responseTimes[p99Index] || 0 : 0,
      throughputPerSecond: this.responses.length / testDurationSeconds,
      errorRate: (this.responses.length - successfulResponses.length) / this.responses.length,
      memoryPeakMB: peakMemoryMB,
      scenarios: scenarioMetrics
    };
  }

  getCurrentMetrics(): Partial<StressTestMetrics> {
    if (this.responses.length === 0) {
      return { totalRequests: 0 };
    }

    const successfulResponses = this.responses.filter(r => r.success);
    const avgResponseTime = this.responses.reduce((sum, r) => sum + r.responseTime, 0) / this.responses.length;

    return {
      totalRequests: this.responses.length,
      successfulRequests: successfulResponses.length,
      failedRequests: this.responses.length - successfulResponses.length,
      averageResponseTime: avgResponseTime,
      errorRate: (this.responses.length - successfulResponses.length) / this.responses.length
    };
  }

  stop(): void {
    this.isRunning = false;
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const stressTestService = new StressTestService(); 