// @ts-nocheck
// src/scripts/verify-agent-routing.js
// Test script that directly verifies agent message routing

import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

// Set up logging directory
const logDir = '/tmp/a2a-logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Create a test ID for logging
const TEST_ID = randomUUID().substring(0, 8);
const logPrefix = `[VERIFY-ROUTE-${TEST_ID}]`;

// Log both to console and file
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `${timestamp} ${logPrefix} ${message}`;
  console.log(formattedMessage, data ? JSON.stringify(data) : '');
  
  try {
    const logFile = path.join(logDir, `agent-routing-test-${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, formattedMessage + (data ? ` ${JSON.stringify(data)}` : '') + '\n');
  } catch (err) {
    console.error('Error writing to log file:', err);
  }
}

log('Starting agent routing verification test');

async function runTest() {
  try {
    // Import the TaskProcessor with dynamic import to avoid environment variable issues
    console.log(`${logPrefix} Dynamically importing TaskProcessor...`);
    const { TaskProcessor, getTaskProcessor } = await import('../server/services/a2a/taskProcessor.service.js');
    // Create a test message for the ScenePlannerAgent
    const testMessage = {
      id: `test-message-${randomUUID()}`,
      type: 'CREATE_SCENE_PLAN_REQUEST',
      sender: 'VerifyScript',
      recipient: 'ScenePlannerAgent',
      taskId: `test-task-${TEST_ID}`,
      payload: {
        taskId: `test-task-${TEST_ID}`,
        prompt: 'Create a test scene plan',
        message: {
          createdAt: new Date().toISOString(),
          id: `message-${randomUUID()}`,
          parts: [{ 
            text: 'Create a test scene plan', 
            type: 'text' 
          }]
        }
      }
    };
    
    console.log(`${logPrefix} Created test message with ID: ${testMessage.id}`);
    
    // Test routing via the TaskProcessor
    console.log(`${logPrefix} Attempting to route message to ScenePlannerAgent...`);
    const routeResult = await processor.routeMessageToAgent(testMessage);
    
    console.log(`${logPrefix} Route result: ${routeResult ? 'SUCCESS ✅' : 'FAILURE ❌'}`);
    
    return {
      success: routeResult,
      globalRegistryAgents: Object.keys(agentRegistry),
      localRegistryAgents: processor.getRegisteredAgents().map(a => a.getName()),
      message: testMessage
    };
  } catch (error) {
    console.error(`${logPrefix} ERROR: ${error.message}`, error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

// Run the test
runTest()
  .then(result => {
    console.log(`\n${logPrefix} TEST RESULTS:`);
    console.log(JSON.stringify(result, null, 2));
    
    // Exit after a delay to allow logs to flush
    setTimeout(() => process.exit(0), 500);
  })
  .catch(err => {
    console.error(`${logPrefix} FATAL ERROR:`, err);
    process.exit(1);
  });
