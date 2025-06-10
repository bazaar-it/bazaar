//scripts/run-performance-evals.ts

// CRITICAL: Import OpenAI shim before ANY other imports
import 'openai/shims/node';

import { performanceRunner } from '../src/lib/evals/performance-runner';
import { evaluationRunner } from '../src/lib/evals/runner';
import { enhancedEvaluationRunner } from '../src/lib/evals/enhanced-runner';
import { promptOptimizationRunner } from '../src/lib/evals/prompt-optimizer';
import { listAvailablePacks } from '../src/config/models.config';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log('🎯 Bazaar-Vid Performance Evaluation Suite');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  switch (command) {
    case 'compare-models':
      await runModelComparison(args.slice(1));
      break;
      
    case 'benchmark':
      await runPerformanceBenchmark(args.slice(1));
      break;
      
    case 'test-pipeline':
      await runPipelineTest(args.slice(1));
      break;
      
    case 'optimize-prompts':
      await runPromptOptimization(args.slice(1));
      break;
      
    case 'ab-test-prompts':
      await runPromptABTesting(args.slice(1));
      break;
      
    case 'quick-test':
      await runQuickTest(args.slice(1));
      break;
      
    case 'enhanced':
      await runEnhancedEvaluation(args.slice(1));
      break;
      
    case 'test-optimal':
      await runOptimalPackTest(args.slice(1));
      break;
      
    case 'list-packs':
      listModelPacks();
      break;
      
    default:
      showUsage();
      break;
  }
}

async function runModelComparison(args: string[]) {
  console.log('\n🚀 Starting Model Pack Comparison...');
  
  const includeImages = args.includes('--images');
  const maxPrompts = args.find(arg => arg.startsWith('--max='))?.split('=')[1];
  const verbose = args.includes('--verbose');
  
  console.log(`📊 Configuration:`);
  console.log(`   Include image tests: ${includeImages ? 'Yes' : 'No'}`);
  console.log(`   Max prompts per suite: ${maxPrompts || 'All'}`);
  console.log(`   Verbose output: ${verbose ? 'Yes' : 'No'}`);
  
  const results = await performanceRunner.runModelPackComparison({
    includeImageTests: includeImages,
    maxPromptsPerSuite: maxPrompts ? parseInt(maxPrompts) : undefined,
    verbose
  });
  
  console.log('\n✅ Model comparison complete!');
  console.log(`💡 Check the detailed analysis above for optimal configurations.`);
}

async function runPerformanceBenchmark(args: string[]) {
  console.log('\n📊 Starting Performance Benchmark...');
  
  const results = await evaluationRunner.runSuite({
    suiteId: 'performance-benchmark',
    modelPacks: args.length > 0 ? args : undefined,
    showOutputs: false,
    comparison: true,
    verbose: false,
    maxPrompts: 5 // Quick benchmark
  });
  
  console.log('\n✅ Performance benchmark complete!');
  console.log(`📊 Results: ${results.summary.totalTests} tests, ${results.summary.averageLatency}ms avg latency, $${results.summary.totalCost.toFixed(4)} total cost`);
}

async function runPipelineTest(args: string[]) {
  console.log('\n🖼️ Starting Image-to-Code Pipeline Test...');
  
  const results = await evaluationRunner.runSuite({
    suiteId: 'image-to-code-pipeline',
    modelPacks: args.length > 0 ? args : ['claude-pack', 'mixed-pack'],
    showOutputs: true,
    comparison: true,
    verbose: true,
    maxPrompts: 3
  });
  
  console.log('\n✅ Pipeline test complete!');
  console.log(`🎯 Image analysis and code generation results available above.`);
}

async function runPromptOptimization(args: string[]) {
  console.log('\n🔬 Starting Prompt Optimization...');
  
  const modelPack = args[0] || 'claude-pack';
  
  console.log(`🎯 Using model pack: ${modelPack}`);
  
  const results = await performanceRunner.runPromptOptimization(modelPack);
  
  console.log('\n✅ Prompt optimization complete!');
  console.log(`📝 Analyzed ${results.results.length} service prompts.`);
}

async function runPromptABTesting(args: string[]) {
  console.log('\n🧪 Starting Prompt A/B Testing...');
  
  const modelPack = args.find(arg => !arg.startsWith('--')) || 'claude-pack';
  const service = args.find(arg => arg.startsWith('--service='))?.split('=')[1];
  const maxVariations = args.find(arg => arg.startsWith('--max-vars='))?.split('=')[1];
  const includeBaseline = !args.includes('--no-baseline');
  const saveOutputs = !args.includes('--no-save');
  
  console.log(`📊 Configuration:`);
  console.log(`   Model Pack: ${modelPack}`);
  console.log(`   Service: ${service || 'All services'}`);
  console.log(`   Max Variations: ${maxVariations || 'All'}`);
  console.log(`   Include Baseline: ${includeBaseline ? 'Yes' : 'No'}`);
  console.log(`   Save Outputs: ${saveOutputs ? 'Yes' : 'No'}`);
  
  // Create test prompts for A/B testing
  const testPrompts = [
    {
      id: 'ab-simple-scene',
      name: 'Simple Scene Creation',
      type: 'text' as const,
      input: { text: 'create a welcome scene with fade-in animation' }
    },
    {
      id: 'ab-edit-request',
      name: 'Scene Edit Request',
      type: 'code' as const,
      input: { 
        text: 'change the text to "Hello World" and make it blue',
        context: {
          existingCode: `const { AbsoluteFill } = window.Remotion;
export default function Scene() {
  return <AbsoluteFill><div style={{color: "white"}}>Welcome</div></AbsoluteFill>;
}`,
          sceneId: 'test-scene-id',
          sceneName: 'Test Scene'
        }
      }
    },
    {
      id: 'ab-complex-request',
      name: 'Complex Scene Request',
      type: 'text' as const,
      input: { text: 'create a professional intro video for TechCorp with smooth animations and modern design' }
    }
  ];
  
  const results = await promptOptimizationRunner.runPromptOptimization({
    service,
    modelPack,
    testPrompts,
    includeBaseline,
    maxVariations: maxVariations ? parseInt(maxVariations) : undefined,
    saveOutputs
  });
  
  console.log('\n✅ Prompt A/B testing complete!');
  console.log(`📁 Results saved to: ${results.outputDirectory}`);
  console.log(`📊 Summary:`);
  console.log(`   Total tests: ${results.results.length}`);
  console.log(`   Services analyzed: ${results.analysis.servicesAnalyzed.join(', ')}`);
  console.log(`   Variations tested: ${results.analysis.variationsAnalyzed.length}`);
  console.log(`\n🏆 Winners:`);
  console.log(`   🥇 Best Overall: ${results.analysis.winners.bestOverall}`);
  console.log(`   ⚡ Fastest: ${results.analysis.winners.fastest}`);
  console.log(`   💰 Cheapest: ${results.analysis.winners.cheapest}`);
  console.log(`   🎯 Highest Quality: ${results.analysis.winners.highestQuality}`);
  
  if (results.recommendations.length > 0) {
    console.log(`\n💡 Key Recommendations:`);
    results.recommendations.slice(0, 3).forEach(rec => {
      console.log(`   • ${rec.title}: ${rec.description}`);
    });
  }
}

async function runQuickTest(args: string[]) {
  console.log('\n⚡ Running Quick Test (5 prompts, 2 model packs)...');
  
  const results = await evaluationRunner.runSuite({
    suiteId: 'bazaar-vid-pipeline',
    modelPacks: ['starter-pack-1', 'performance-pack'],
    showOutputs: false,
    comparison: true,
    verbose: false,
    maxPrompts: 5
  });
  
  console.log('\n✅ Quick test complete!');
  console.log(`⚡ ${results.summary.totalTests} tests in ${(results.summary.totalTime || 0) / 1000}s`);
  console.log(`💰 Total cost: $${results.summary.totalCost.toFixed(4)}`);
  console.log(`📊 Error rate: ${results.summary.errorRate}%`);
}

async function runEnhancedEvaluation(args: string[]) {
  console.log('\n🔬 Running Enhanced Evaluation with Output Saving...');
  
  const suiteId = args.find(arg => !arg.startsWith('--')) || 'bazaar-vid-pipeline';
  const modelPacks = args.filter(arg => !arg.startsWith('--') && arg !== suiteId);
  const maxPrompts = args.find(arg => arg.startsWith('--max='))?.split('=')[1];
  const noSave = args.includes('--no-save');
  const withContext = args.includes('--context');
  
  console.log(`📊 Configuration:`);
  console.log(`   Suite: ${suiteId}`);
  console.log(`   Model Packs: ${modelPacks.length > 0 ? modelPacks.join(', ') : 'claude-pack, optimal-pack'}`);
  console.log(`   Max prompts: ${maxPrompts || 'All'}`);
  console.log(`   Save outputs: ${!noSave ? 'Yes' : 'No'}`);
  console.log(`   Include context: ${withContext ? 'Yes' : 'No'}`);
  
  const results = await enhancedEvaluationRunner.runEnhancedEvaluation({
    suiteId,
    modelPacks: modelPacks.length > 0 ? modelPacks : ['claude-pack', 'optimal-pack'],
    saveOutputs: !noSave,
    includeContext: withContext,
    maxPrompts: maxPrompts ? parseInt(maxPrompts) : undefined
  });
  
  console.log('\n✅ Enhanced evaluation complete!');
  console.log(`📁 Outputs saved to: ${results.outputDirectory}`);
  console.log(`📊 Summary:`);
  console.log(`   Total tests: ${results.summary.totalTests}`);
  console.log(`   Successful: ${results.summary.successfulTests}`);
  console.log(`   Average latency: ${results.summary.averageLatency}ms`);
  console.log(`   Total cost: $${results.summary.totalCost.toFixed(4)}`);
  console.log(`   Tool choices: ${JSON.stringify(results.summary.toolChoices)}`);
}

async function runOptimalPackTest(args: string[]) {
  console.log('\n🎯 Testing Optimal Pack Configuration...');
  
  const results = await evaluationRunner.runSuite({
    suiteId: 'bazaar-vid-pipeline',
    modelPacks: ['optimal-pack', 'claude-pack', 'openai-pack'],
    showOutputs: true,
    comparison: true,
    verbose: true,
    maxPrompts: 10
  });
  
  console.log('\n✅ Optimal pack test complete!');
  console.log(`🎯 Optimal pack performance compared to claude-pack and openai-pack.`);
}

function listModelPacks() {
  console.log('\n📦 Available Model Packs:');
  
  const packs = listAvailablePacks();
  
  packs.forEach(packId => {
    console.log(`   • ${packId}`);
  });
  
  console.log(`\n💡 Use any of these pack IDs with the evaluation commands.`);
}

function showUsage() {
  console.log('\n📖 Usage:');
  console.log('   npm run eval <command> [options]');
  console.log('');
  console.log('🎯 Commands:');
  console.log('   compare-models [--images] [--max=N] [--verbose]');
  console.log('     Compare all model packs across speed, cost, and quality');
  console.log('     --images: Include image analysis tests');
  console.log('     --max=N: Limit to N prompts per suite');
  console.log('     --verbose: Show detailed output');
  console.log('');
  console.log('   benchmark [pack1] [pack2] ...');
  console.log('     Quick performance benchmark');
  console.log('');
  console.log('   test-pipeline [pack1] [pack2] ...');
  console.log('     Test image-to-code pipeline with real screenshots');
  console.log('');
  console.log('   optimize-prompts [pack]');
  console.log('     A/B test different system prompts');
  console.log('');
  console.log('   ab-test-prompts [pack] [options]');
  console.log('     🧪 Advanced A/B testing for prompt variations');
  console.log('     --service=name: Focus on specific service (brain, addScene, editScene)');
  console.log('     --max-vars=N: Limit number of variations to test');
  console.log('     --no-baseline: Skip baseline prompt testing');
  console.log('     --no-save: Skip saving detailed outputs');
  console.log('');
  console.log('   quick-test');
  console.log('     Fast 5-prompt test with 2 model packs');
  console.log('');
  console.log('   enhanced [suite] [pack1] [pack2] ... [options]');
  console.log('     🔬 Enhanced evaluation with output saving');
  console.log('     --max=N: Limit to N prompts');
  console.log('     --no-save: Skip saving outputs');
  console.log('     --context: Include chat history simulation');
  console.log('');
  console.log('   test-optimal');
  console.log('     Test the new optimal pack configuration');
  console.log('');
  console.log('   list-packs');
  console.log('     Show all available model packs');
  console.log('');
  console.log('💡 Examples:');
  console.log('   npm run eval compare-models --images --max=3');
  console.log('   npm run eval benchmark claude-pack openai-pack');
  console.log('   npm run eval test-pipeline');
  console.log('   npm run eval ab-test-prompts claude-pack --service=brain');
  console.log('   npm run eval enhanced --max=5 --context');
  console.log('   npm run eval test-optimal');
  console.log('   npm run eval quick-test');
  console.log('');
  console.log('🎯 Model Packs Available:');
  listAvailablePacks().forEach(pack => console.log(`   • ${pack}`));
}

// Handle errors gracefully
main().catch(error => {
  console.error('\n❌ Evaluation failed:', error.message);
  console.error('\n🔍 Error details:', error);
  process.exit(1);
});