// src/scripts/test-mcp-tools.ts

import { logQueryTool, logClearTool, logIssuesTool } from "../lib/services/mcp-tools/log-agent.js";

/**
 * Test script for Log Agent MCP Tools
 */
async function testMcpTools() {
  console.log("🧪 Testing Log Agent MCP Tools");
  console.log("===============================");
  
  try {
    // 1. Test Log Issues
    console.log("\n📋 Checking for issues with the log_issues tool:");
    const issuesResult = await logIssuesTool.execute({});
    console.log(JSON.stringify(issuesResult, null, 2));

    // 2. Test Log Query
    console.log("\n❓ Asking a question with the log_query tool:");
    const queryResult = await logQueryTool.execute({ 
      question: "What are the most recent log events in the system?" 
    });
    console.log(JSON.stringify(queryResult, null, 2));
    
    // 3. Test Log Clear (but only if explicitly enabled)
    const shouldClearLogs = process.env.CLEAR_LOGS === "true";
    if (shouldClearLogs) {
      console.log("\n🧹 Clearing logs with the log_clear tool:");
      const clearResult = await logClearTool.execute({});
      console.log(JSON.stringify(clearResult, null, 2));
    } else {
      console.log("\n⚠️ Skipping log_clear tool (set CLEAR_LOGS=true to enable)");
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the tests
testMcpTools().catch(console.error);
