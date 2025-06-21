// src/scripts/log-tools/log-refresh.ts

import { logClearTool } from '../../lib/services/mcp-tools/log-agent.js';

async function main() {
  try {
    const result = await logClearTool.execute({}) as { runId: string };
    console.log(`Logs cleared. New runId: ${result.runId}`);
  } catch (error) {
    console.error('Error clearing logs:', error);
    process.exit(1);
  }
}

main();
