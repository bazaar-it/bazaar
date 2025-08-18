/**
 * GitHub Integration Test Script
 * Tests the enhanced GitHub App with component discovery and video generation
 */

import { analyzeGitHubPR } from '~/server/services/github/pr-analyzer.service';
import { GitHubComponentSearchService } from '~/server/services/github/component-search.service';
import { ComponentIndexerService } from '~/server/services/github/component-indexer.service';
import { GitHubComponentAnalyzerTool } from '~/brain/tools/github-component-analyzer';

async function testGitHubIntegration() {
  console.log('🧪 Testing Enhanced GitHub Integration...\n');

  // Test environment variables
  console.log('1. Checking environment variables...');
  const requiredEnvs = [
    'GITHUB_WEBHOOK_SECRET',
    'GITHUB_PERSONAL_ACCESS_TOKEN'
  ];
  
  const missingEnvs = requiredEnvs.filter(env => !process.env[env]);
  if (missingEnvs.length > 0) {
    console.error('❌ Missing environment variables:', missingEnvs);
    return;
  }
  console.log('✅ Environment variables configured');

  // Test PR Analysis with Component Detection
  console.log('\n2. Testing PR analysis with component detection...');
  try {
    const testRepo = {
      owner: 'facebook',
      repo: 'react',
      prNumber: 26000, // Use a recent React PR for testing
    };
    
    console.log(`   Analyzing PR #${testRepo.prNumber} from ${testRepo.owner}/${testRepo.repo}...`);
    const analysis = await analyzeGitHubPR(testRepo);
    
    console.log(`   ✅ PR Analysis successful:`);
    console.log(`      - Title: ${analysis.title}`);
    console.log(`      - Type: ${analysis.type}`);
    console.log(`      - Files changed: ${analysis.stats.filesChanged}`);
    
    if (analysis.componentChanges) {
      console.log(`      - Components added: ${analysis.componentChanges.added.length}`);
      console.log(`      - Components modified: ${analysis.componentChanges.modified.length}`);
      console.log(`      - Components deleted: ${analysis.componentChanges.deleted.length}`);
    }
    
    if (analysis.techStack && analysis.techStack.length > 0) {
      console.log(`      - Tech stack: ${analysis.techStack.join(', ')}`);
    }
  } catch (error) {
    console.error('   ❌ PR Analysis failed:', error instanceof Error ? error.message : error);
  }

  // Test Component Discovery
  console.log('\n3. Testing component discovery...');
  try {
    const accessToken = process.env.GITHUB_PERSONAL_ACCESS_TOKEN!;
    const indexer = new ComponentIndexerService(accessToken);
    
    console.log('   Discovering components in a test repository...');
    // Use a smaller repo for faster testing
    const catalog = await indexer.discoverComponents('microsoft', 'fluentui-emoji');
    
    const totalComponents = Object.values(catalog).reduce((sum, category) => sum + category.length, 0);
    console.log(`   ✅ Component discovery successful: found ${totalComponents} components`);
    console.log(`      - Core: ${catalog.core.length}`);
    console.log(`      - Auth: ${catalog.auth.length}`);
    console.log(`      - Commerce: ${catalog.commerce.length}`);
    console.log(`      - Interactive: ${catalog.interactive.length}`);
    console.log(`      - Content: ${catalog.content.length}`);
    console.log(`      - Custom: ${catalog.custom.length}`);
  } catch (error) {
    console.error('   ❌ Component discovery failed:', error instanceof Error ? error.message : error);
  }

  // Test Component Search
  console.log('\n4. Testing component search...');
  try {
    const accessToken = process.env.GITHUB_PERSONAL_ACCESS_TOKEN!;
    const searchService = new GitHubComponentSearchService(accessToken, 'test');
    
    console.log('   Searching for "button" components...');
    const results = await searchService.searchComponent('button', {
      repositories: ['microsoft/fluentui-emoji'],
      maxResults: 5,
    });
    
    console.log(`   ✅ Component search successful: found ${results.length} matching components`);
    results.forEach((result, index) => {
      console.log(`      ${index + 1}. ${result.name} (${result.path}) - Score: ${result.score}`);
    });
  } catch (error) {
    console.error('   ❌ Component search failed:', error instanceof Error ? error.message : error);
  }

  // Test GitHub Component Analyzer
  console.log('\n5. Testing GitHub component analyzer...');
  try {
    const analyzer = new GitHubComponentAnalyzerTool();
    const accessToken = process.env.GITHUB_PERSONAL_ACCESS_TOKEN!;
    
    console.log('   Analyzing a specific component...');
    const componentContext = await analyzer.analyze(
      'test-user',
      { name: 'button', framework: 'react' },
      accessToken
    );
    
    if (componentContext) {
      console.log(`   ✅ Component analysis successful:`);
      console.log(`      - Component: ${componentContext.componentName}`);
      console.log(`      - Framework: ${componentContext.framework}`);
      console.log(`      - Repository: ${componentContext.repository}`);
      console.log(`      - File path: ${componentContext.filePath}`);
    } else {
      console.log('   ⚠️  No component found (expected for test)');
    }
  } catch (error) {
    console.error('   ❌ Component analyzer failed:', error instanceof Error ? error.message : error);
  }

  console.log('\n🎉 GitHub Integration test completed!');
  console.log('\nNext steps:');
  console.log('1. Deploy the enhanced webhook to production');
  console.log('2. Test with a real GitHub repository');
  console.log('3. Try the new commands:');
  console.log('   - @bazaar components (list components)');
  console.log('   - @bazaar search <query> (search components)');
  console.log('   - @bazaar showcase <component> (generate showcase video)');
  console.log('   - @bazaar demo <component> (generate demo video)');
}

// Run the test if this file is executed directly
if (require.main === module) {
  testGitHubIntegration().catch(console.error);
}

export { testGitHubIntegration };