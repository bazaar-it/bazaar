//src/lib/evals/performance-runner.ts

import { EvaluationRunner, type EvalRunConfig, type DetailedEvalResult } from './runner';
import { MODEL_PACKS, listAvailablePacks } from '../../config/models.config';
import type { ModelPack } from '../../config/models.config';
import { 
  modelPackPerformanceSuite, 
  promptOptimizationSuite, 
  imageToCodePipelineSuite,
  performanceBenchmarkSuite 
} from './suites/model-pack-performance';

// 🎯 Enhanced evaluation results with performance focus
export interface PerformanceMetrics {
  // Speed metrics
  averageLatency: number;
  medianLatency: number;
  p95Latency: number;
  timeToFirstToken?: number;
  
  // Cost metrics
  totalCost: number;
  costPerToken: number;
  costPerSecond: number;
  
  // Quality metrics
  successRate: number;
  errorRate: number;
  qualityScore: number; // 1-10 based on output analysis
  
  // Code quality (for code generation tasks)
  codeMetrics?: {
    syntaxValid: boolean;
    hasRequiredPatterns: boolean;
    animationQuality: number; // 1-10
    styleQuality: number; // 1-10
    complexity: 'low' | 'medium' | 'high' | 'very-high';
  };
  
  // Image analysis quality (for vision tasks)
  visionMetrics?: {
    accurateAnalysis: boolean;
    detailLevel: number; // 1-10
    implementationReady: boolean;
    colorAccuracy: number; // 1-10
  };
}

export interface ModelPackComparison {
  modelPack: string;
  modelPackName: string;
  performance: PerformanceMetrics;
  bestUseCases: string[];
  worstUseCases: string[];
  recommendation: {
    speedRank: number; // 1 = fastest
    costRank: number;  // 1 = cheapest
    qualityRank: number; // 1 = highest quality
    overallRank: number;
    summary: string;
  };
}

export interface OptimalConfiguration {
  scenario: string;
  recommendedModelPack: string;
  reasoning: string;
  expectedMetrics: {
    speed: string; // e.g., "~2.5s"
    cost: string;  // e.g., "$0.003"
    quality: string; // e.g., "9/10"
  };
  alternatives: Array<{
    modelPack: string;
    tradeoff: string; // e.g., "20% faster, 15% lower quality"
  }>;
}

export class PerformanceEvaluationRunner extends EvaluationRunner {
  
  /**
   * 🎯 Run comprehensive model pack comparison
   */
  async runModelPackComparison(options: {
    includeImageTests?: boolean;
    maxPromptsPerSuite?: number;
    verbose?: boolean;
  } = {}): Promise<{
    comparisons: ModelPackComparison[];
    optimalConfigurations: OptimalConfiguration[];
    summary: {
      fastest: string;
      cheapest: string;
      highestQuality: string;
      bestOverall: string;
      totalCost: number;
      totalTime: number;
    };
  }> {
    
    console.log('\n🚀 Starting Comprehensive Model Pack Performance Analysis');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const allPacks = listAvailablePacks();
    console.log(`📦 Testing ${allPacks.length} model packs: ${allPacks.join(', ')}`);
    
    // Select test suites based on options
    const suites = [
      performanceBenchmarkSuite,
      ...(options.includeImageTests ? [imageToCodePipelineSuite] : [])
    ];
    
    console.log(`🧪 Running ${suites.length} test suite${suites.length > 1 ? 's' : ''}`);
    
    const allResults: DetailedEvalResult[] = [];
    const startTime = Date.now();
    
    // Run each suite with all model packs
    for (const suite of suites) {
      console.log(`\n🔬 Testing suite: ${suite.name}`);
      
      const config: EvalRunConfig = {
        suiteId: suite.id,
        modelPacks: allPacks,
        maxPrompts: options.maxPromptsPerSuite,
        verbose: options.verbose,
        comparison: true
      };
      
      const results = await this.runSuite(config);
      allResults.push(...results.results);
      
      // Show progress
      console.log(`   ✅ Completed ${results.results.length} tests`);
    }
    
    const totalTime = Date.now() - startTime;
    console.log(`\n⏱️  Total evaluation time: ${(totalTime / 1000).toFixed(1)}s`);
    
    // Analyze results per model pack
    const comparisons: ModelPackComparison[] = [];
    
    for (const packId of allPacks) {
      const packResults = allResults.filter(r => r.modelPack === packId);
      const performance = this.calculatePerformanceMetrics(packResults);
      const pack = MODEL_PACKS[packId];
      
      comparisons.push({
        modelPack: packId,
        modelPackName: pack.name,
        performance,
        bestUseCases: this.identifyBestUseCases(packResults),
        worstUseCases: this.identifyWorstUseCases(packResults),
        recommendation: this.generatePackRecommendation(packId, performance, comparisons.length)
      });
    }
    
    // Rank all packs
    this.rankModelPacks(comparisons);
    
    // Generate optimal configurations
    const optimalConfigurations = this.generateOptimalConfigurations(allResults);
    
    // Create summary
    const summary = this.generateComparisonSummary(comparisons, totalTime, allResults);
    
    // Display results
    this.displayPerformanceResults(comparisons, optimalConfigurations, summary);
    
    return {
      comparisons,
      optimalConfigurations, 
      summary
    };
  }
  
  /**
   * 🔬 Run prompt optimization testing
   */
  async runPromptOptimization(modelPack: string = 'claude-pack'): Promise<{
    results: Array<{
      service: string;
      currentPrompt: {
        performance: PerformanceMetrics;
        outputSample: string;
      };
      alternatives: Array<{
        variant: string;
        performance: PerformanceMetrics;
        improvement: string;
        outputSample: string;
      }>;
      recommendation: string;
    }>;
  }> {
    
    console.log('\n🔬 Starting Prompt Optimization Analysis');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🎯 Using model pack: ${modelPack}`);
    
    // For now, return placeholder data - this would need actual prompt variants
    return {
      results: [
        {
          service: 'brain',
          currentPrompt: {
            performance: {
              averageLatency: 2500,
              medianLatency: 2200,
              p95Latency: 4000,
              totalCost: 0.015,
              costPerToken: 0.00003,
              costPerSecond: 0.006,
              successRate: 95,
              errorRate: 5,
              qualityScore: 8.5
            },
            outputSample: 'Current brain orchestrator reasoning...'
          },
          alternatives: [],
          recommendation: 'Current prompt performs well. Consider testing with more specific context instructions.'
        }
      ]
    };
  }
  
  /**
   * 📊 Calculate performance metrics for a set of results
   */
  private calculatePerformanceMetrics(results: DetailedEvalResult[]): PerformanceMetrics {
    if (results.length === 0) {
      return {
        averageLatency: 0,
        medianLatency: 0,
        p95Latency: 0,
        totalCost: 0,
        costPerToken: 0,
        costPerSecond: 0,
        successRate: 0,
        errorRate: 100,
        qualityScore: 0
      };
    }
    
    const successfulResults = results.filter(r => r.success);
    const latencies = successfulResults.map(r => r.metrics.latency).sort((a, b) => a - b);
    const costs = results.map(r => r.metrics.cost || 0);
    
    return {
      averageLatency: Math.round(latencies.reduce((sum, l) => sum + l, 0) / latencies.length),
      medianLatency: Math.round(latencies[Math.floor(latencies.length / 2)] || 0),
      p95Latency: Math.round(latencies[Math.floor(latencies.length * 0.95)] || 0),
      totalCost: costs.reduce((sum, c) => sum + c, 0),
      costPerToken: costs.reduce((sum, c) => sum + c, 0) / Math.max(results.length, 1),
      costPerSecond: costs.reduce((sum, c) => sum + c, 0) / Math.max(latencies.reduce((sum, l) => sum + l, 0) / 1000, 1),
      successRate: (successfulResults.length / results.length) * 100,
      errorRate: ((results.length - successfulResults.length) / results.length) * 100,
      qualityScore: this.calculateQualityScore(successfulResults)
    };
  }
  
  /**
   * 🎯 Calculate quality score based on output analysis
   */
  private calculateQualityScore(results: DetailedEvalResult[]): number {
    if (results.length === 0) return 0;
    
    let totalScore = 0;
    
    for (const result of results) {
      let score = 5; // Base score
      
      // Check if tool selection was correct
      if (result.prompt.expectedBehavior?.toolCalled) {
        const expectedTool = result.prompt.expectedBehavior.toolCalled;
        const actualTools = result.toolsUsed || [];
        if (actualTools.includes(expectedTool)) {
          score += 2;
        } else {
          score -= 1;
        }
      }
      
      // Check for required mentions
      if (result.prompt.expectedBehavior?.shouldMention) {
        const mentions = result.prompt.expectedBehavior.shouldMention;
        const output = result.actualOutput.toLowerCase();
        const mentionedCount = mentions.filter(mention => 
          output.includes(mention.toLowerCase())
        ).length;
        score += (mentionedCount / mentions.length) * 2;
      }
      
      // Check complexity handling
      if (result.prompt.expectedBehavior?.complexity) {
        const complexity = result.prompt.expectedBehavior.complexity;
        if (complexity === 'very-high' && result.success) {
          score += 1; // Bonus for handling very complex tasks
        }
      }
      
      // Check code quality for code outputs
      if (result.codeOutput) {
        if (result.codeOutput.includes('window.Remotion')) score += 0.5;
        if (result.codeOutput.includes('interpolate')) score += 0.5;
        if (result.codeOutput.includes('extrapolateLeft: "clamp"')) score += 0.5;
        if (!result.codeOutput.includes('import ')) score += 0.5; // No forbidden imports
      }
      
      totalScore += Math.min(Math.max(score, 0), 10); // Clamp between 0-10
    }
    
    return Math.round((totalScore / results.length) * 10) / 10;
  }
  
  /**
   * 🏆 Identify best use cases for a model pack
   */
  private identifyBestUseCases(results: DetailedEvalResult[]): string[] {
    const useCases: string[] = [];
    
    // Find prompts where this pack performed well
    const goodResults = results.filter(r => r.success && r.metrics.latency < 3000);
    
    for (const result of goodResults) {
      if (result.prompt.name.includes('Speed:')) {
        useCases.push('Quick operations');
      }
      if (result.prompt.name.includes('Quality:')) {
        useCases.push('High-quality content generation');
      }
      if (result.prompt.name.includes('Vision:')) {
        useCases.push('Image analysis and integration');
      }
      if (result.prompt.name.includes('Cost:')) {
        useCases.push('Cost-efficient operations');
      }
      if (result.prompt.name.includes('Complex:')) {
        useCases.push('Complex reasoning tasks');
      }
      if (result.prompt.name.includes('Creativity:')) {
        useCases.push('Creative content generation');
      }
    }
    
    return [...new Set(useCases)].slice(0, 3); // Return top 3 unique use cases
  }
  
  /**
   * ❌ Identify worst use cases for a model pack
   */
  private identifyWorstUseCases(results: DetailedEvalResult[]): string[] {
    const worstCases: string[] = [];
    
    // Find prompts where this pack performed poorly
    const badResults = results.filter(r => !r.success || r.metrics.latency > 5000);
    
    for (const result of badResults) {
      if (result.prompt.name.includes('Complex:')) {
        worstCases.push('Complex reasoning tasks');
      }
      if (result.prompt.name.includes('Vision:')) {
        worstCases.push('Image analysis tasks');
      }
      if (result.prompt.name.includes('Speed:') && result.metrics.latency > 3000) {
        worstCases.push('Speed-critical operations');
      }
    }
    
    return [...new Set(worstCases)].slice(0, 3);
  }
  
  /**
   * 📊 Generate pack recommendation
   */
  private generatePackRecommendation(packId: string, performance: PerformanceMetrics, index: number) {
    let summary = '';
    
    if (performance.averageLatency < 2000) {
      summary += 'Fast execution. ';
    }
    if (performance.totalCost < 0.01) {
      summary += 'Cost-effective. ';
    }
    if (performance.qualityScore > 8) {
      summary += 'High-quality outputs. ';
    }
    if (performance.successRate > 95) {
      summary += 'Very reliable. ';
    }
    
    if (!summary) {
      summary = 'Moderate performance across metrics.';
    }
    
    return {
      speedRank: index + 1, // Will be updated in rankModelPacks
      costRank: index + 1,
      qualityRank: index + 1,
      overallRank: index + 1,
      summary: summary.trim()
    };
  }
  
  /**
   * 🏆 Rank model packs by different criteria
   */
  private rankModelPacks(comparisons: ModelPackComparison[]): void {
    // Speed ranking (faster = better rank)
    const speedSorted = [...comparisons].sort((a, b) => a.performance.averageLatency - b.performance.averageLatency);
    speedSorted.forEach((comp, index) => {
      comp.recommendation.speedRank = index + 1;
    });
    
    // Cost ranking (cheaper = better rank)
    const costSorted = [...comparisons].sort((a, b) => a.performance.totalCost - b.performance.totalCost);
    costSorted.forEach((comp, index) => {
      comp.recommendation.costRank = index + 1;
    });
    
    // Quality ranking (higher = better rank)
    const qualitySorted = [...comparisons].sort((a, b) => b.performance.qualityScore - a.performance.qualityScore);
    qualitySorted.forEach((comp, index) => {
      comp.recommendation.qualityRank = index + 1;
    });
    
    // Overall ranking (weighted score)
    const overallScored = comparisons.map(comp => ({
      ...comp,
      overallScore: (
        (7 - comp.recommendation.speedRank) * 0.3 +  // 30% weight to speed
        (7 - comp.recommendation.costRank) * 0.2 +   // 20% weight to cost
        (7 - comp.recommendation.qualityRank) * 0.4 + // 40% weight to quality
        (comp.performance.successRate / 100) * 0.1   // 10% weight to reliability
      )
    }));
    
    const overallSorted = overallScored.sort((a, b) => b.overallScore - a.overallScore);
    overallSorted.forEach((comp, index) => {
      comp.recommendation.overallRank = index + 1;
    });
  }
  
  /**
   * 🎯 Generate optimal configurations for different scenarios
   */
  private generateOptimalConfigurations(results: DetailedEvalResult[]): OptimalConfiguration[] {
    const configs: OptimalConfiguration[] = [];
    
    // Speed-critical scenario
    const speedResults = results.filter(r => r.success).sort((a, b) => a.metrics.latency - b.metrics.latency);
    if (speedResults.length > 0) {
      const fastest = speedResults[0];
      configs.push({
        scenario: 'Speed-Critical Operations',
        recommendedModelPack: fastest.modelPack,
        reasoning: `${MODEL_PACKS[fastest.modelPack].name} provides fastest response time (${fastest.metrics.latency}ms average)`,
        expectedMetrics: {
          speed: `~${(fastest.metrics.latency / 1000).toFixed(1)}s`,
          cost: `$${(fastest.metrics.cost || 0).toFixed(4)}`,
          quality: `${this.calculateQualityScore([fastest])}/10`
        },
        alternatives: speedResults.slice(1, 3).map(r => ({
          modelPack: r.modelPack,
          tradeoff: `${Math.round(((r.metrics.latency - fastest.metrics.latency) / fastest.metrics.latency) * 100)}% slower`
        }))
      });
    }
    
    // Cost-efficient scenario
    const costResults = results.filter(r => r.success && r.metrics.cost).sort((a, b) => (a.metrics.cost || 0) - (b.metrics.cost || 0));
    if (costResults.length > 0) {
      const cheapest = costResults[0];
      configs.push({
        scenario: 'Cost-Efficient Operations',
        recommendedModelPack: cheapest.modelPack,
        reasoning: `${MODEL_PACKS[cheapest.modelPack].name} provides lowest cost per operation ($${(cheapest.metrics.cost || 0).toFixed(4)})`,
        expectedMetrics: {
          speed: `~${(cheapest.metrics.latency / 1000).toFixed(1)}s`,
          cost: `$${(cheapest.metrics.cost || 0).toFixed(4)}`,
          quality: `${this.calculateQualityScore([cheapest])}/10`
        },
        alternatives: costResults.slice(1, 3).map(r => ({
          modelPack: r.modelPack,
          tradeoff: `${Math.round((((r.metrics.cost || 0) - (cheapest.metrics.cost || 0)) / (cheapest.metrics.cost || 0.001)) * 100)}% more expensive`
        }))
      });
    }
    
    // High-quality scenario
    const qualityResults = results.filter(r => r.success);
    const qualityScored = qualityResults.map(r => ({
      ...r,
      qualityScore: this.calculateQualityScore([r])
    })).sort((a, b) => b.qualityScore - a.qualityScore);
    
    if (qualityScored.length > 0) {
      const highest = qualityScored[0];
      configs.push({
        scenario: 'High-Quality Content Generation',
        recommendedModelPack: highest.modelPack,
        reasoning: `${MODEL_PACKS[highest.modelPack].name} provides highest quality outputs (${highest.qualityScore}/10 score)`,
        expectedMetrics: {
          speed: `~${(highest.metrics.latency / 1000).toFixed(1)}s`,
          cost: `$${(highest.metrics.cost || 0).toFixed(4)}`,
          quality: `${highest.qualityScore}/10`
        },
        alternatives: qualityScored.slice(1, 3).map(r => ({
          modelPack: r.modelPack,
          tradeoff: `${(highest.qualityScore - r.qualityScore).toFixed(1)} points lower quality`
        }))
      });
    }
    
    return configs;
  }
  
  /**
   * 📊 Generate comparison summary
   */
  private generateComparisonSummary(
    comparisons: ModelPackComparison[], 
    totalTime: number, 
    allResults: DetailedEvalResult[]
  ) {
    const speedWinner = comparisons.find(c => c.recommendation.speedRank === 1);
    const costWinner = comparisons.find(c => c.recommendation.costRank === 1);
    const qualityWinner = comparisons.find(c => c.recommendation.qualityRank === 1);
    const overallWinner = comparisons.find(c => c.recommendation.overallRank === 1);
    
    return {
      fastest: speedWinner?.modelPack || 'unknown',
      cheapest: costWinner?.modelPack || 'unknown',
      highestQuality: qualityWinner?.modelPack || 'unknown',
      bestOverall: overallWinner?.modelPack || 'unknown',
      totalCost: allResults.reduce((sum, r) => sum + (r.metrics.cost || 0), 0),
      totalTime
    };
  }
  
  /**
   * 📊 Display performance results
   */
  private displayPerformanceResults(
    comparisons: ModelPackComparison[],
    configs: OptimalConfiguration[],
    summary: any
  ): void {
    console.log('\n🏆 MODEL PACK PERFORMANCE COMPARISON');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Overall rankings
    console.log('\n📊 OVERALL RANKINGS:');
    const overallRanked = [...comparisons].sort((a, b) => a.recommendation.overallRank - b.recommendation.overallRank);
    overallRanked.forEach((comp, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
      console.log(`${medal} ${comp.recommendation.overallRank}. ${comp.modelPackName}`);
      console.log(`     Speed: ${comp.performance.averageLatency}ms | Cost: $${comp.performance.totalCost.toFixed(4)} | Quality: ${comp.performance.qualityScore}/10`);
      console.log(`     ${comp.recommendation.summary}`);
    });
    
    // Category winners
    console.log('\n🏅 CATEGORY WINNERS:');
    console.log(`⚡ Fastest: ${MODEL_PACKS[summary.fastest]?.name} (${summary.fastest})`);
    console.log(`💰 Cheapest: ${MODEL_PACKS[summary.cheapest]?.name} (${summary.cheapest})`);
    console.log(`🔥 Highest Quality: ${MODEL_PACKS[summary.highestQuality]?.name} (${summary.highestQuality})`);
    console.log(`🎯 Best Overall: ${MODEL_PACKS[summary.bestOverall]?.name} (${summary.bestOverall})`);
    
    // Optimal configurations
    console.log('\n🎯 OPTIMAL CONFIGURATIONS:');
    configs.forEach(config => {
      console.log(`\n📋 ${config.scenario}:`);
      console.log(`   🎯 Recommended: ${MODEL_PACKS[config.recommendedModelPack]?.name} (${config.recommendedModelPack})`);
      console.log(`   📊 Expected: ${config.expectedMetrics.speed} speed, ${config.expectedMetrics.cost} cost, ${config.expectedMetrics.quality} quality`);
      console.log(`   💡 ${config.reasoning}`);
      if (config.alternatives.length > 0) {
        console.log(`   🔄 Alternatives: ${config.alternatives.map(alt => `${MODEL_PACKS[alt.modelPack]?.name} (${alt.tradeoff})`).join(', ')}`);
      }
    });
    
    // Summary stats
    console.log('\n📈 EVALUATION SUMMARY:');
    console.log(`   Total Cost: $${summary.totalCost.toFixed(4)}`);
    console.log(`   Total Time: ${(summary.totalTime / 1000).toFixed(1)}s`);
    console.log(`   Model Packs Tested: ${comparisons.length}`);
  }
}

// Create singleton instance
export const performanceRunner = new PerformanceEvaluationRunner();