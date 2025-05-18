import axios from 'axios';
import { program } from 'commander';
import readline from 'readline';
import { config } from './config.js';

// Command-line interface for the Log Agent
program
  .name('log-agent-cli')
  .description('CLI tool for interacting with the Log Agent')
  .version('1.0.0');

// Base URL for the Log Agent
const DEFAULT_URL = `http://localhost:${config.port}`;

// Helper for making API requests
async function makeRequest(method: string, path: string, data?: any, params?: any) {
  const url = process.env.LOG_AGENT_URL || DEFAULT_URL;
  
  try {
    const response = await axios({
      method,
      url: `${url}/${path}`,
      data,
      params,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 second timeout
    });
    
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error(`Error: ${error.response.status} - ${error.response.data?.error || 'Unknown error'}`);
    } else {
      console.error(`Error: ${error.message}`);
    }
    process.exit(1);
  }
}

// Create a new run
program
  .command('clear')
  .description('Clear logs and start a new run')
  .option('-r, --run-id <runId>', 'Specify a custom run ID')
  .option('-c, --callback <url>', 'Set a callback URL for notifications')
  .action(async (options) => {
    const data: any = {};
    
    if (options.runId) {
      data.newRunId = options.runId;
    }
    
    if (options.callback) {
      data.callback = options.callback;
    }
    
    const result = await makeRequest('post', 'control/clear', data);
    
    console.log('✅ Started new log run:');
    console.log(`   Previous Run ID: ${result.previousRunId || 'None'}`);
    console.log(`   New Run ID: ${result.newRunId}`);
    console.log(`   Timestamp: ${result.timestamp}`);
  });

// Ask a question about logs
program
  .command('ask')
  .description('Ask a question about logs')
  .argument('<query>', 'The question to ask')
  .option('-r, --run-id <runId>', 'Specify a run ID (default: latest)')
  .action(async (query, options) => {
    const data = {
      query,
      runId: options.runId || 'latest',
    };
    
    console.log('🔎 Analyzing logs...');
    
    const result = await makeRequest('post', 'qna', data);
    
    console.log('\n📊 Analysis:');
    console.log(`${result.answer}\n`);
    
    if (result.tokenUsage) {
      console.log(`Tokens used: ${result.tokenUsage.total} (prompt: ${result.tokenUsage.prompt}, completion: ${result.tokenUsage.completion})`);
    }
    
    console.log(`Run ID: ${result.runId}`);
    console.log(`Logs analyzed: ${result.logCount}`);
    console.log(`Processing time: ${result.processingTime}ms`);
  });

// View raw logs
program
  .command('logs')
  .description('View raw logs')
  .option('-r, --run-id <runId>', 'Specify a run ID (default: latest)')
  .option('-s, --source <source>', 'Filter by source')
  .option('-f, --filter <regex>', 'Filter logs by regex pattern')
  .option('-l, --limit <number>', 'Limit number of logs returned', '50')
  .option('-o, --offset <number>', 'Offset for pagination', '0')
  .action(async (options) => {
    const params = {
      runId: options.runId || 'latest',
      source: options.source,
      filter: options.filter,
      limit: options.limit,
      offset: options.offset,
    };
    
    const result = await makeRequest('get', 'raw', undefined, params);
    
    console.log(`📜 Logs for run: ${result.runId} (${result.total} total, showing ${result.logs.length})`);
    
    if (result.source !== 'all') {
      console.log(`Source: ${result.source}`);
    }
    
    if (result.filter) {
      console.log(`Filter: ${result.filter}`);
    }
    
    console.log('\n');
    
    result.logs.forEach((log: any) => {
      const timestamp = new Date(log.timestamp).toLocaleTimeString();
      const level = log.level.toUpperCase().padEnd(5);
      const source = log.source ? `[${log.source}] ` : '';
      
      console.log(`${timestamp} ${level} ${source}${log.message}`);
      
      if (log.metadata && Object.keys(log.metadata).length > 0) {
        console.log(`   ${JSON.stringify(log.metadata)}`);
      }
    });
    
    if (result.hasMore) {
      console.log(`\n... and ${result.total - result.offset - result.logs.length} more logs`);
    }
  });

// List detected issues
program
  .command('issues')
  .description('List detected issues')
  .option('-r, --run-id <runId>', 'Specify a run ID (default: latest)')
  .option('-s, --source <source>', 'Filter by source')
  .option('-l, --level <level>', 'Filter by level (error, warn, info)')
  .option('--limit <number>', 'Limit number of issues returned', '50')
  .option('--offset <number>', 'Offset for pagination', '0')
  .action(async (options) => {
    const params = {
      runId: options.runId || 'latest',
      source: options.source,
      level: options.level,
      limit: options.limit,
      offset: options.offset,
    };
    
    const result = await makeRequest('get', 'issues', undefined, params);
    
    console.log(`⚠️ Issues for run: ${result.runId} (${result.total} total, showing ${result.issues.length})`);
    
    if (result.source !== 'all') {
      console.log(`Source: ${result.source}`);
    }
    
    if (result.level !== 'all') {
      console.log(`Level: ${result.level}`);
    }
    
    console.log('\n');
    
    result.issues.forEach((issue: any, index: number) => {
      const level = issue.level.toUpperCase().padEnd(5);
      const count = `(${issue.count})`.padStart(6);
      
      console.log(`${index + 1}. ${level} ${count} ${issue.summary}`);
      console.log(`   Type: ${issue.type}`);
      console.log(`   Source: ${issue.source}`);
      console.log(`   First seen: ${new Date(issue.firstSeen).toLocaleString()}`);
      console.log(`   Last seen: ${new Date(issue.lastSeen).toLocaleString()}`);
      console.log(`   Notified: ${issue.notified ? 'Yes' : 'No'}`);
      console.log(`   Fingerprint: ${issue.fingerprint}`);
      console.log();
    });
    
    if (result.hasMore) {
      console.log(`... and ${result.total - result.offset - result.issues.length} more issues`);
    }
  });

// Get server health status
program
  .command('health')
  .description('Check Log Agent server health')
  .action(async () => {
    const result = await makeRequest('get', 'health');
    console.log(`Status: ${result.status}`);
    console.log(`Timestamp: ${result.timestamp}`);
  });

// Get metrics
program
  .command('metrics')
  .description('Get Log Agent metrics')
  .action(async () => {
    const result = await makeRequest('get', 'metrics');
    
    console.log('📊 Log Agent Metrics:');
    console.log('\nWorker Metrics:');
    console.log(`   Logs processed: ${result.worker.logsProcessed}`);
    console.log(`   Issues detected: ${result.worker.issuesDetected}`);
    console.log(`   Notifications sent: ${result.worker.notificationsSent}`);
    
    console.log('\nQueue Status:');
    console.log(`   Log queue: ${JSON.stringify(result.worker.queues.logs)}`);
    console.log(`   Issue queue: ${JSON.stringify(result.worker.queues.issues)}`);
    
    console.log('\nOpenAI Metrics:');
    console.log(`   Prompt tokens: ${result.openai.promptTokens}`);
    console.log(`   Completion tokens: ${result.openai.completionTokens}`);
    console.log(`   Total tokens: ${result.openai.promptTokens + result.openai.completionTokens}`);
  });

// Interactive mode
program
  .command('interactive')
  .alias('i')
  .description('Start interactive log analysis mode')
  .option('-r, --run-id <runId>', 'Specify a run ID (default: latest)')
  .action(async (options) => {
    const runId = options.runId || 'latest';
    
    console.log('🤖 Interactive Log Analysis Mode');
    console.log('Type your questions or commands (exit/quit to exit)');
    console.log(`Using run ID: ${runId}`);
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '> ',
    });
    
    rl.prompt();
    
    rl.on('line', async (line) => {
      const input = line.trim();
      
      if (['exit', 'quit', 'q'].includes(input.toLowerCase())) {
        rl.close();
        return;
      }
      
      try {
        const data = {
          query: input,
          runId,
        };
        
        console.log('Analyzing...');
        
        const result = await makeRequest('post', 'qna', data);
        
        console.log('\n📊 Analysis:');
        console.log(`${result.answer}\n`);
        
      } catch (error) {
        // Error already logged by makeRequest
      }
      
      rl.prompt();
    });
    
    rl.on('close', () => {
      console.log('Goodbye!');
      process.exit(0);
    });
  });

// Parse command line
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
} 