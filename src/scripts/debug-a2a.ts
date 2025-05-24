// @ts-nocheck
// src/scripts/debug-a2a.ts
// A comprehensive test script for debugging agent message routing

import { randomUUID } from 'crypto';
import { TaskManager } from '~/server/services/a2a/taskManager.service';
import { ScenePlannerAgent } from '~/server/agents/scene-planner-agent';
import { CoordinatorAgent } from '~/server/agents/coordinator-agent';
import { initializeAgents } from '~/server/services/a2a/initializeAgents';
import { a2aLogger } from '~/lib/logger';
import { TaskProcessor } from '~/server/services/a2a/taskProcessor.service';

// Set to true for extra verbose logging
const VERBOSE = true;

// Create a unique test ID for tracing in the logs
const TEST_ID = `test-${randomUUID().substring(0, 8)}`;

/**
 * Log with test ID for better tracing
 */
function debugLog(message: string, data: any = {}) {
  const prefix = `[DEBUG:${TEST_ID}]`;
  console.log(`${prefix} ${message}`, data);
}

/**
 * Comprehensive debugging test for agent message routing
 */
async function testAgentMessageRouting() {
  debugLog('🚀 Starting agent message routing test');
  
  try {
    // Step 1: Initialize TaskProcessor (which initializes TaskManager)
    debugLog('Initializing TaskProcessor');
    const processor = TaskProcessor.getInstance();
    processor.initializePolling(false); // Initialize but don't start polling
    debugLog('TaskProcessor initialized');
    
    // Step 2: Get the TaskManager
    const taskManager = TaskManager.getInstance();
    debugLog('TaskManager retrieved');
    
    // Step 3: Create fresh instances of the agents for direct testing
    // This ensures we're not affected by any initialization issues
    debugLog('Creating fresh agent instances');
    const scenePlannerAgent = new ScenePlannerAgent(taskManager);
    const coordinatorAgent = new CoordinatorAgent(taskManager);
    
    debugLog('Created fresh agent instances', {
      scenePlanner: scenePlannerAgent.getName(),
      coordinator: coordinatorAgent.getName()
    });
    
    // Step 4: First test - direct message to ScenePlannerAgent
    debugLog('DIRECT TEST: Sending direct message to ScenePlannerAgent');
    
    const directTaskId = `direct-${randomUUID().substring(0, 8)}`;
    const directTestMessage = {
      id: `test-message-${randomUUID().substring(0, 8)}`,
      type: 'CREATE_SCENE_PLAN_REQUEST',
      sender: 'TestScript',
      recipient: 'ScenePlannerAgent',
      taskId: directTaskId,
      payload: {
        taskId: directTaskId,
        prompt: 'Create a short intro for a company called Banana',
        message: {
          createdAt: new Date().toISOString(),
          id: `msg-${randomUUID().substring(0, 8)}`,
          parts: [{ text: 'Create a short intro for a company called Banana', type: 'text' }]
        },
        metadata: {
          animationDesignBrief: {
            description: 'Create a short intro for a company called Banana',
            sceneName: 'TestRequest'
          }
        }
      }
    };
    
    debugLog('Calling ScenePlannerAgent.processMessage() directly', { messageId: directTestMessage.id });
    const directResponse = await scenePlannerAgent.processMessage(directTestMessage);
    
    if (directResponse) {
      debugLog('✅ SUCCESS: ScenePlannerAgent direct response received', {
        type: directResponse.type,
        recipient: directResponse.recipient,
        payloadPreview: Object.keys(directResponse.payload || {}).join(', ')
      });
    } else {
      debugLog('❌ FAILURE: ScenePlannerAgent returned null response when called directly');
    }
    
    // Step 5: Test the registered agents via TaskProcessor
    debugLog('REGISTERING: Registering agents with TaskProcessor manually');
    
    // Access private property for testing - this is normally not recommended
    // @ts-expect-error - Accessing private property for testing
    processor.registeredAgents = [scenePlannerAgent, coordinatorAgent];
    
    // Use internal routeMessageToAgent method to test routing directly
    debugLog('ROUTING TEST: Testing TaskProcessor.routeMessageToAgent');
    
    const routingTaskId = `routing-${randomUUID().substring(0, 8)}`;
    const routingTestMessage = {
      id: `routing-${randomUUID().substring(0, 8)}`,
      type: 'CREATE_SCENE_PLAN_REQUEST',
      sender: 'TestScript',
      recipient: 'ScenePlannerAgent',
      taskId: routingTaskId,
      payload: {
        taskId: routingTaskId,
        prompt: 'Create a short animation for testing direct routing',
        message: {
          createdAt: new Date().toISOString(),
          id: `msg-routing-${randomUUID().substring(0, 8)}`,
          parts: [{ text: 'Create a short animation for testing direct routing', type: 'text' }]
        },
        metadata: {
          animationDesignBrief: {
            description: 'Create a short animation for testing direct routing',
            sceneName: 'RoutingTest'
          }
        }
      }
    };
    
    // @ts-expect-error - Accessing private method for testing
    debugLog('Calling TaskProcessor.routeMessageToAgent directly');
    // @ts-expect-error - Accessing private method for testing
    const routingResult = await processor.routeMessageToAgent(routingTestMessage);
    
    if (routingResult) {
      debugLog('✅ SUCCESS: TaskProcessor.routeMessageToAgent succeeded');
    } else {
      debugLog('❌ FAILURE: TaskProcessor.routeMessageToAgent failed');
    }
    
    // Allow time for async operations to complete
    debugLog('Waiting for potential async operations to complete...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    debugLog('🏁 Agent routing test completed');
    return {
      success: true,
      directTestResult: directResponse ? 'success' : 'failure',
      routingTestResult: routingResult ? 'success' : 'failure'
    };
    
  } catch (error: any) {
    debugLog('❌ ERROR: Test failed', { error: error.message, stack: error.stack });
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
testAgentMessageRouting()
  .then(result => {
    console.log('\n=== FINAL RESULT ===');
    console.log(JSON.stringify(result, null, 2));
    console.log('====================\n');
    // Exit after allowing log buffers to flush
    setTimeout(() => process.exit(0), 1000);
  })
  .catch(error => {
    console.error('FATAL ERROR:', error);
    process.exit(1);
  });
