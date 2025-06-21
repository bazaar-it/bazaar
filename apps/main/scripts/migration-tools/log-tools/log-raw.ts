// @ts-nocheck
// src/scripts/log-tools/log-raw.ts

// Import the LOG_AGENT_URL directly from process.env instead of using the env module
const LOG_AGENT_URL = process.env.LOG_AGENT_URL || 'http://localhost:3002';
import ky from "ky";

async function main() {
  const args = process.argv.slice(2);
  let runId = 'latest';
  let filter = '';
  let source = '';
  let limit = 100;

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--runId' && i + 1 < args.length) {
      runId = args[++i];
    } else if (args[i] === '--filter' && i + 1 < args.length) {
      filter = args[++i];
    } else if (args[i] === '--source' && i + 1 < args.length) {
      source = args[++i];
    } else if (args[i] === '--limit' && i + 1 < args.length) {
      limit = parseInt(args[++i], 10);
    } else if (args[i] === '--help' || args[i] === '-h') {
      showHelp();
      process.exit(0);
    }
  }

  try {
    const params: Record<string, string> = { runId };
    
    if (filter) params.filter = filter;
    if (source) params.source = source;
    params.limit = limit.toString();

    const result = await ky.get(`${LOG_AGENT_URL}/raw`, { searchParams: params }).json<{
      logs: Array<{ timestamp: string; level: string; message: string; [key: string]: any }>;
      total: number;
      runId: string;
    }>();

    console.log(`Showing ${result.logs.length} of ${result.total} logs for runId: ${result.runId}`);
    
    if (result.logs.length === 0) {
      console.log('No logs found matching your criteria.');
      return;
    }
    
    result.logs.forEach((log: { timestamp?: string; level?: string; message?: string; [key: string]: any }) => {
      const level = log.level?.toUpperCase() || 'INFO';
      const timestamp = log.timestamp || new Date().toISOString();
      const message = log.message || '';
      
      // Remove these fields from the metadata
      const { timestamp: _, level: __, message: ___, ...metadata } = log;
      
      // Format level with padding and colors
      const levelFormatted = formatLevel(level);
      
      console.log(`[${timestamp}] ${levelFormatted} ${message}`);
      
      // If there's additional metadata, show it indented
      if (Object.keys(metadata).length > 0) {
        console.log('  ' + JSON.stringify(metadata));
      }
    });
    
    if (result.total > result.logs.length) {
      console.log(`\nShowing ${result.logs.length} of ${result.total} logs. Use --limit to see more.`);
    }
  } catch (error) {
    console.error('Error fetching raw logs:', error);
    process.exit(1);
  }
}

function formatLevel(level: string): string {
  const levelPadded = level.padEnd(5, ' ');
  
  // Add colors if supported
  if (process.stdout.isTTY) {
    switch (level.toLowerCase()) {
      case 'error': return `\x1b[31m${levelPadded}\x1b[0m`; // Red
      case 'warn': return `\x1b[33m${levelPadded}\x1b[0m`;  // Yellow
      case 'info': return `\x1b[32m${levelPadded}\x1b[0m`;  // Green
      case 'debug': return `\x1b[36m${levelPadded}\x1b[0m`; // Cyan
      default: return levelPadded;
    }
  }
  
  return levelPadded;
}

function showHelp() {
  console.log(`
Usage: npm run log:raw -- [options]

Options:
  --runId <id>     Specify run ID (default: 'latest')
  --filter <text>  Filter logs containing text
  --source <name>  Filter by log source
  --limit <num>    Maximum logs to show (default: 100)
  --help, -h       Show this help message

Examples:
  npm run log:raw
  npm run log:raw -- --filter "error"
  npm run log:raw -- --source "a2a-system" --limit 50
  `);
}

main();
