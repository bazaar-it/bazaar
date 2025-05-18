// src/scripts/log-tools/log-ask.ts

import { logQueryTool } from '../../lib/services/mcp-tools/log-agent.js';

async function main() {
  const question = process.argv.slice(2).join(' ');
  if (!question) {
    console.error('Please provide a question.');
    process.exit(1);
  }

  try {
    const result = await logQueryTool.execute({ question });
    console.log('\nAnswer:');
    console.log(result.answer);
  } catch (error) {
    console.error('Error querying logs:', error);
    process.exit(1);
  }
}

main();
