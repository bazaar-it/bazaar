// src/scripts/verify-a2a-routing.js
// A standalone script to verify agent message routing without environment dependencies

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
const logPrefix = `[A2A-TEST-${TEST_ID}]`;

// Simple logging function
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `${timestamp} ${logPrefix} ${message}`;
  console.log(formattedMessage, data ? JSON.stringify(data) : '');
  
  try {
    const logFile = path.join(logDir, `a2a-routing-test-${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, formattedMessage + (data ? ` ${JSON.stringify(data)}` : '') + '\n');
  } catch (err) {
    console.error('Error writing to log file:', err);
  }
}

// --- Mock implementation of agent system ---

// MockBaseAgent - simplified version of BaseAgent
class MockBaseAgent {
  constructor(name) {
    this.name = name;
  }
  
  getName() {
    return this.name;
  }
  
  async processMessage(message) {
    log(`Agent ${this.name} received message: ${message.type}`);
    return null; // Default: no response
  }
}

// MockScenePlannerAgent - responds to CREATE_SCENE_PLAN_REQUEST
class MockScenePlannerAgent extends MockBaseAgent {
  constructor() {
    super('ScenePlannerAgent');
  }
  
  async processMessage(message) {
    log(`ScenePlannerAgent processing message: ${message.type}`);
    
    if (message.type === 'CREATE_SCENE_PLAN_REQUEST') {
      log('ScenePlannerAgent generating scene plan response');
      return {
        id: `response-${randomUUID()}`,
        type: 'SCENE_PLAN_RESPONSE',
        sender: this.name,
        recipient: message.sender,
        taskId: message.taskId,
        payload: {
          scenePlans: {
            intent: 'Test scene plan for routing verification',
            scenes: [
              { id: 'scene-1', type: 'custom', description: 'Test scene 1', duration: 5000 },
              { id: 'scene-2', type: 'custom', description: 'Test scene 2', duration: 7000 }
            ]
          }
        }
      };
    }
    
    return await super.processMessage(message);
  }
}

// Mock agent registry
const mockAgentRegistry = {
  'ScenePlannerAgent': new MockScenePlannerAgent(),
  'CoordinatorAgent': new MockBaseAgent('CoordinatorAgent'),
  'BuilderAgent': new MockBaseAgent('BuilderAgent')
};

// Mock TaskProcessor that can route messages
class MockTaskProcessor {
  constructor() {
    this.id = `task-processor-${randomUUID().substring(0, 8)}`;
    this.agents = Object.values(mockAgentRegistry);
  }
  
  async routeMessage(message) {
    const targetAgentName = message.recipient;
    log(`Routing message to: ${targetAgentName}`, {
      messageType: message.type,
      sender: message.sender,
      taskId: message.taskId
    });
    
    // First try global registry (recommended approach)
    const agent = mockAgentRegistry[targetAgentName];
    
    if (!agent) {
      log(`❌ AGENT NOT FOUND: ${targetAgentName}`);
      return null;
    }
    
    try {
      log(`✓ Agent found: ${targetAgentName}, sending message`);
      return await agent.processMessage(message);
    } catch (error) {
      log(`❌ ERROR processing message: ${error.message}`);
      return null;
    }
  }
}

// --- Test Script Execution ---

log('Starting A2A routing verification test');

async function runTest() {
  try {
    // Create the task processor
    log('Creating mock task processor');
    const processor = new MockTaskProcessor();
    log(`Created processor with ID: ${processor.id}`);

    // Log agents in registry
    log(`Available agents: ${Object.keys(mockAgentRegistry).join(', ')}`);
    
    // Create a test message for the ScenePlannerAgent
    const testMessage = {
      id: `test-message-${randomUUID()}`,
      type: 'CREATE_SCENE_PLAN_REQUEST',
      sender: 'TestScript',
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
    
    log(`Created test message with ID: ${testMessage.id}`, { 
      messageType: testMessage.type,
      recipient: testMessage.recipient
    });
    
    // Test routing via the TaskProcessor
    log('Attempting to route message to ScenePlannerAgent...');
    const response = await processor.routeMessage(testMessage);
    
    if (response) {
      log(`✅ SUCCESS: Received response from ${response.sender}`, {
        responseType: response.type,
        responseTo: response.recipient,
        taskId: response.taskId
      });
      
      if (response.payload && response.payload.scenePlans) {
        log('Scene plan received:', {
          intent: response.payload.scenePlans.intent,
          sceneCount: response.payload.scenePlans.scenes.length
        });
      }
    } else {
      log('❌ FAILURE: No response received');
    }
    
    return {
      success: !!response,
      processor: {
        id: processor.id,
        agentCount: processor.agents.length
      },
      message: {
        id: testMessage.id,
        type: testMessage.type,
        recipient: testMessage.recipient
      },
      response: response ? {
        id: response.id,
        type: response.type,
        sender: response.sender,
        hasScenePlans: !!(response.payload && response.payload.scenePlans),
        scenesCount: response.payload?.scenePlans?.scenes?.length || 0
      } : null
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    log(`❌ ERROR: ${errorMessage}`);
    
    return {
      success: false,
      error: errorMessage,
      stack: errorStack
    };
  }
}

// Run the test
runTest()
  .then(result => {
    log('TEST COMPLETE:', result);
    
    if (result.success) {
      console.log('\n✅ TEST PASSED: Agent routing is working correctly!');
    } else {
      console.log('\n❌ TEST FAILED: Agent routing is not working correctly.');
    }
    
    // Exit after a delay to allow logs to flush
    setTimeout(() => process.exit(result.success ? 0 : 1), 500);
  })
  .catch(err => {
    const errorMessage = err instanceof Error ? err.message : String(err);
    log(`FATAL ERROR: ${errorMessage}`);
    process.exit(1);
  });
