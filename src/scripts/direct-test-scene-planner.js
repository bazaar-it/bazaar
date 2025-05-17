// src/scripts/direct-test-scene-planner.js
// A direct test for the ScenePlannerAgent

import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';

// Configure logging directory
const logDir = process.env.A2A_LOG_DIR || '/tmp/a2a-logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
  console.log(`Created log directory: ${logDir}`);
}

// Create a test ID
const TEST_ID = randomUUID().substring(0, 8);

function log(message, data = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [TEST-${TEST_ID}] ${message}`, data ? JSON.stringify(data) : '');
  
  // Also write to file for persistence
  const logEntry = {
    timestamp,
    testId: TEST_ID,
    message,
    data
  };
  
  try {
    const logFile = path.join(logDir, `direct-test-${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  } catch (err) {
    console.error('Error writing to log file:', err);
  }
}

// Create a direct message to test the ScenePlannerAgent
function createTestMessage() {
  const taskId = `test-task-${TEST_ID}`;
  return {
    id: `test-message-${randomUUID()}`,
    type: 'CREATE_SCENE_PLAN_REQUEST',
    sender: 'DirectTest',
    recipient: 'ScenePlannerAgent',
    taskId,
    payload: {
      taskId,
      prompt: 'Create a short intro animation for a tech company called banana',
      message: {
        createdAt: new Date().toISOString(),
        id: `message-${randomUUID()}`,
        parts: [{ 
          text: 'Create a short intro animation for a tech company called banana', 
          type: 'text' 
        }]
      },
      metadata: {
        animationDesignBrief: {
          description: 'Create a short intro animation for a tech company called banana',
          sceneName: 'DirectTest'
        }
      }
    }
  };
}

/**
 * Attempt to dynamically import and test the ScenePlannerAgent
 */
async function runTest() {
  log('Starting direct ScenePlannerAgent test');

  try {
    // Step 1: Import the module without validating env variables
    log('Dynamically importing required modules');
    
    // Create a mock TaskManager
    const mockTaskManager = {
      createTask: () => Promise.resolve({ id: `task-${TEST_ID}` }),
      updateTaskStatus: () => Promise.resolve(true),
      getTask: () => Promise.resolve({ id: `task-${TEST_ID}`, status: 'working' }),
      getInstance: () => mockTaskManager
    };
    
    // Set dummy environment variables to bypass validation
    process.env.AUTH_GITHUB_ID = 'dummy';
    process.env.AUTH_GITHUB_SECRET = 'dummy';
    process.env.AUTH_GOOGLE_ID = 'dummy';
    process.env.AUTH_GOOGLE_SECRET = 'dummy';
    process.env.DATABASE_URL = 'dummy';
    process.env.DATABASE_URL_NON_POOLED = 'dummy';
    process.env.OPENAI_API_KEY = 'dummy';
    process.env.R2_ENDPOINT = 'dummy';
    process.env.R2_ACCESS_KEY_ID = 'dummy';
    process.env.R2_SECRET_ACCESS_KEY = 'dummy';
    process.env.R2_BUCKET_NAME = 'dummy';
    process.env.R2_PUBLIC_URL = 'dummy';
    process.env.CRON_SECRET = 'dummy';
    
    // Import the agent directly - .ts extension is fine when using tsx to run
    const { ScenePlannerAgent } = await import('../server/agents/scene-planner-agent.ts');
    
    // Create agent instance with mock
    log('Creating ScenePlannerAgent instance');
    const agent = new ScenePlannerAgent(mockTaskManager);
    
    log(`Agent created with name: ${agent.getName()}`);
    
    // Create test message
    const message = createTestMessage();
    log('Created test message', { messageId: message.id, type: message.type });
    
    // Process the message
    log('Sending message to ScenePlannerAgent.processMessage()');
    const response = await agent.processMessage(message);
    
    if (response) {
      log('✅ RESPONSE RECEIVED FROM SCENE PLANNER AGENT', {
        type: response.type,
        sender: response.sender,
        recipient: response.recipient,
        payloadKeys: Object.keys(response.payload || {})
      });
      
      // Check if it's a scene plan response
      if (response.type === 'SCENE_PLAN_RESPONSE') {
        log('✅ CORRECT RESPONSE TYPE: SCENE_PLAN_RESPONSE');
        
        // Check payload
        if (response.payload && response.payload.scenePlans) {
          log('✅ PAYLOAD CONTAINS SCENE PLANS', { 
            sceneCount: response.payload.scenePlans.scenes?.length || 0,
            intent: response.payload.scenePlans.intent?.substring(0, 50) || 'none'
          });
        } else {
          log('❌ PAYLOAD MISSING SCENE PLANS');
        }
      } else {
        log(`❌ UNEXPECTED RESPONSE TYPE: ${response.type}`);
      }
    } else {
      log('❌ NULL RESPONSE FROM SCENE PLANNER AGENT');
    }
    
    return {
      success: !!response,
      response: response ? {
        type: response.type,
        success: response.payload?.success,
        scenePlansIncluded: !!response.payload?.scenePlans
      } : null
    };
  } catch (error) {
    log('❌ ERROR IN TEST', { error: error.message, stack: error.stack });
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
runTest()
  .then(result => {
    console.log('\n=== TEST RESULT ===');
    console.log(JSON.stringify(result, null, 2));
    console.log('\nCheck logs at: ' + logDir);
    
    // Exit after a short delay to allow logs to flush
    setTimeout(() => process.exit(0), 500);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
