// src/scripts/log-tools/log-issues.ts

import { logIssuesTool } from '../../lib/services/mcp-tools/log-agent.js';

async function main() {
  try {
    const result = await logIssuesTool.execute({}) as { issues: Array<{ count: number; message: string; fingerprint: string }> };
    console.log('Current issues:');
    
    if (result.issues.length === 0) {
      console.log('No issues detected.');
      return;
    }
    
    result.issues.forEach((issue: { count: number; message: string; fingerprint: string }) => {
      console.log(`\n[${issue.count}x] ${issue.message}`);
      console.log(`Fingerprint: ${issue.fingerprint}`);
    });
  } catch (error) {
    console.error('Error fetching issues:', error);
    process.exit(1);
  }
}

main();
