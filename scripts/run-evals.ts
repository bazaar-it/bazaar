//scripts/run-evals.ts

import { Command } from 'commander';
import { evaluationRunner, type EvalRunConfig } from '../src/lib/evals/runner';
import { getSuite, listSuites } from '../src/lib/evals/registry';
import { listAvailablePacks } from '../src/config/models.config';
// Note: Avoid importing legacy orchestrator here; not needed for listing suites

const program = new Command();

program
  .name('run-evals')
  .description('Bazaar-Vid AI Evaluation System')
  .version('1.0.0');

// List available suites
program
  .command('list')
  .description('List all available evaluation suites')
  .action(async () => {
    console.log('📋 Available Evaluation Suites:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const suites = listSuites();
    suites.forEach((suite, index) => {
      console.log(`\n${index + 1}. 🧪 ${suite.name}`);
      console.log(`   ID: ${suite.id}`);
      console.log(`   📝 ${suite.description}`);
      console.log(`   🧬 Tests: ${suite.prompts.length}`);
      console.log(`   🤖 Model Packs: ${suite.modelPacks.join(', ')}`);
      console.log(`   ⚙️  Services: ${suite.services.join(', ')}`);
    });
    
    console.log(`\n📦 Available Model Packs: ${listAvailablePacks().join(', ')}`);
    console.log('\nUsage:');
    console.log('  npm run evals run <suite-id> [model-pack]');
    console.log('  npm run evals compare <suite-id> <model-pack-1> <model-pack-2>');
    console.log('  npm run evals outputs <suite-id> [model-pack]');
    
    // Clean up and exit
    cleanupAndExit(0);
  });

// Quick test command
program
  .command('quick')
  .description('Run a quick test with basic prompts')
  .option('-v, --verbose', 'Show detailed output')
  .action(async (options) => {
    const config: EvalRunConfig = {
      suiteId: 'basic-prompts',
      modelPacks: ['claude-pack'],
      maxPrompts: 1,
      verbose: options.verbose
    };
    
    console.log('⚡ Running quick evaluation test...\n');
    
    try {
      const result = await evaluationRunner.runSuite(config);
      displaySummary(result.summary);
      console.log('\n✅ Evaluation completed successfully!');
      
      // Clean up and exit
      cleanupAndExit(0);
    } catch (error) {
      console.error('❌ Quick test failed:', error);
      
      // Clean up and exit with error
      cleanupAndExit(1);
    }
  });

// Run suite command
program
  .command('run')
  .description('Run an evaluation suite')
  .argument('<suite-id>', 'ID of the evaluation suite')
  .argument('[model-pack]', 'Model pack to use (default: claude-pack)')
  .option('-v, --verbose', 'Show detailed output')
  .option('-l, --limit <number>', 'Limit number of prompts', parseInt)
  .action(async (suiteId: string, modelPack: string = 'claude-pack', options) => {
    const config: EvalRunConfig = {
      suiteId,
      modelPacks: [modelPack],
      verbose: options.verbose,
      maxPrompts: options.limit
    };
    
    try {
      const result = await evaluationRunner.runSuite(config);
      displaySummary(result.summary);
      console.log('\n✅ Evaluation completed successfully!');
      
      // Clean up and exit
      cleanupAndExit(0);
    } catch (error) {
      console.error('❌ Evaluation failed:', error);
      
      // Clean up and exit with error
      cleanupAndExit(1);
    }
  });

// Show outputs command
program
  .command('outputs')
  .description('Run evaluation and show actual outputs')
  .argument('<suite-id>', 'ID of the evaluation suite')
  .argument('[model-pack]', 'Model pack to use (default: claude-pack)')
  .option('-l, --limit <number>', 'Limit number of prompts', parseInt)
  .action(async (suiteId: string, modelPack: string = 'claude-pack', options) => {
    const config: EvalRunConfig = {
      suiteId,
      modelPacks: [modelPack],
      showOutputs: true,
      maxPrompts: options.limit
    };
    
    try {
      const result = await evaluationRunner.runSuite(config);
      displaySummary(result.summary);
      console.log('\n✅ Evaluation with outputs completed successfully!');
      
      // Clean up and exit
      cleanupAndExit(0);
    } catch (error) {
      console.error('❌ Evaluation failed:', error);
      
      // Clean up and exit with error
      cleanupAndExit(1);
    }
  });

// Compare model packs command
program
  .command('compare')
  .description('Compare multiple model packs on the same suite')
  .argument('<suite-id>', 'ID of the evaluation suite')
  .argument('<model-pack-1>', 'First model pack')
  .argument('<model-pack-2>', 'Second model pack')
  .argument('[model-pack-3]', 'Third model pack (optional)')
  .option('-l, --limit <number>', 'Limit number of prompts', parseInt)
  .option('-o, --outputs', 'Show detailed outputs')
  .action(async (suiteId: string, pack1: string, pack2: string, pack3: string | undefined, options: any) => {
    const modelPacks = [pack1, pack2];
    if (pack3) modelPacks.push(pack3);
    
    const config: EvalRunConfig = {
      suiteId,
      modelPacks,
      comparison: true,
      showOutputs: options.outputs,
      maxPrompts: options.limit
    };
    
    console.log(`🏆 Running model comparison: ${modelPacks.join(' vs ')}\n`);
    
    try {
      const result = await evaluationRunner.runSuite(config);
      displaySummary(result.summary);
      
      if (result.summary.modelPackPerformance) {
        displayModelComparison(result.summary.modelPackPerformance);
      }
      
      console.log('\n✅ Model comparison completed successfully!');
      
      // Clean up and exit
      cleanupAndExit(0);
    } catch (error) {
      console.error('❌ Comparison failed:', error);
      
      // Clean up and exit with error
      cleanupAndExit(1);
    }
  });

// Test image processing command
program
  .command('images')
  .description('Test image processing with the bazaar-vid-pipeline suite')
  .argument('[model-pack]', 'Model pack to use (default: claude-pack)')
  .option('-o, --outputs', 'Show detailed outputs')
  .action(async (modelPack: string = 'claude-pack', options) => {
    const config: EvalRunConfig = {
      suiteId: 'bazaar-vid-pipeline',
      modelPacks: [modelPack],
      showOutputs: options.outputs,
      maxPrompts: 3 // Focus on image tests
    };
    
    console.log('🖼️ Testing image processing capabilities...\n');
    
    try {
      const result = await evaluationRunner.runSuite(config);
      displaySummary(result.summary);
      
      // Show specific image test results
      const imageResults = result.results.filter(r => 
        r.prompt.type === 'image' || r.prompt.name.toLowerCase().includes('image')
      );
      
      if (imageResults.length > 0) {
        console.log('\n🖼️ IMAGE-SPECIFIC RESULTS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        imageResults.forEach(result => {
          console.log(`${result.success ? '✅' : '❌'} ${result.prompt.name}: ${result.metrics.latency}ms`);
          if (result.error) {
            console.log(`   Error: ${result.error}`);
          }
        });
      }
      
      console.log('\n✅ Image processing evaluation completed successfully!');
      
      // Clean up and exit
      cleanupAndExit(0);
    } catch (error) {
      console.error('❌ Image testing failed:', error);
      
      // Clean up and exit with error
      cleanupAndExit(1);
    }
  });

// Benchmark command for comprehensive testing
program
  .command('benchmark')
  .description('Run comprehensive benchmark across all model packs')
  .argument('<suite-id>', 'ID of the evaluation suite')
  .option('-l, --limit <number>', 'Limit number of prompts', parseInt)
  .action(async (suiteId: string, options) => {
    const availablePacks = listAvailablePacks();
    const config: EvalRunConfig = {
      suiteId,
      modelPacks: availablePacks,
      comparison: true,
      maxPrompts: options.limit
    };
    
    console.log(`🚀 Running comprehensive benchmark with ${availablePacks.length} model packs...\n`);
    
    try {
      const result = await evaluationRunner.runSuite(config);
      displaySummary(result.summary);
      
      if (result.summary.modelPackPerformance) {
        displayModelComparison(result.summary.modelPackPerformance);
      }
      
      console.log('\n✅ Comprehensive benchmark completed successfully!');
      
      // Clean up and exit
      cleanupAndExit(0);
    } catch (error) {
      console.error('❌ Benchmark failed:', error);
      
      // Clean up and exit with error
      cleanupAndExit(1);
    }
  });

/**
 * Clean up resources and exit the process
 * This ensures that TTL cache intervals and other timers are properly cleared
 */
function cleanupAndExit(exitCode: number = 0): void {
  console.log('\n🧹 Cleaning up resources...');
  
  // Legacy cleanup removed - new orchestrator doesn't need cleanup
  
  console.log('👋 Evaluation script exiting...\n');
  
  // Force exit after a short delay to ensure cleanup completes
  setTimeout(() => {
    process.exit(exitCode);
  }, 100);
}

function displaySummary(summary: any) {
  console.log('\n📊 EVALUATION SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🧪 Total tests: ${summary.totalTests}`);
  console.log(`⏱️  Average latency: ${summary.averageLatency}ms`);
  console.log(`💰 Total cost: $${summary.totalCost.toFixed(4)}`);
  console.log(`❌ Error rate: ${summary.errorRate}%`);
  
  if (summary.modelPackPerformance) {
    console.log(`\n🏆 Best performer: ${getBestPerformer(summary.modelPackPerformance)}`);
  }
}

function displayModelComparison(performance: Record<string, any>) {
  console.log('\n🏆 MODEL PACK COMPARISON');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const sorted = Object.entries(performance)
    .sort(([,a], [,b]) => b.successRate - a.successRate);
  
  sorted.forEach(([pack, stats], index) => {
    const medal = ['🥇', '🥈', '🥉'][index] || '🏅';
    console.log(`${medal} ${pack}:`);
    console.log(`   Success: ${stats.successRate.toFixed(1)}%`);
    console.log(`   Speed: ${stats.speed.toFixed(0)}ms avg`);
    console.log(`   Cost: $${stats.cost.toFixed(4)} total`);
    console.log(`   Errors: ${stats.errors}`);
  });
}

function getBestPerformer(performance: Record<string, any>): string {
  const scores = Object.entries(performance).map(([pack, stats]) => ({
    pack,
    score: stats.successRate + (1000 / stats.speed) + (1 / (stats.cost + 0.001))
  }));
  
  return scores.sort((a, b) => b.score - a.score)[0]?.pack || 'Unknown';
}

// Parse command line arguments
program.parse();

// If no command provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
  cleanupAndExit(0);
}
