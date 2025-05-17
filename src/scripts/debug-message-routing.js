// src/scripts/debug-message-routing.js
// A comprehensive test script for debugging agent message routing

import { randomUUID } from 'crypto';
import { TaskManager } from '../server/services/a2a/taskManager.service.js';
import { ScenePlannerAgent } from '../server/agents/scene-planner-agent.js';
import { CoordinatorAgent } from '../server/agents/coordinator-agent.js';
import { initializeAgents } from '../server/services/a2a/initializeAgents.js';
import { a2aLogger } from '../lib/logger.js';

// Set to true for extra verbose logging
const VERBOSE = true;

// Create a unique test ID for tracing in the logs
const TEST_ID = `test-${randomUUID().substring(0, 8)}`;

/**
 * Log with test ID for better tracing
 */
function debugLog(message, data = {}) {
  const prefix = `[DEBUG:${TEST_ID}]`;
  console.log(`${prefix} ${message}`, data);
}

/**
 * Comprehensive debugging test for agent message routing
 */
async function testAgentMessageRouting() {
  debugLog('🚀 Starting agent message routing test');
  
  try {
    // Step 1: Initialize TaskManager
    debugLog('Initializing TaskManager');
    const taskManager = TaskManager.getInstance();
    debugLog('TaskManager initialized');
    
    // Step 2: Initialize all agents via the centralized method
    debugLog('Initializing all agents via initializeAgents()');
    const allAgents = initializeAgents(taskManager);
    debugLog(`${allAgents.length} agents initialized`, { agentNames: allAgents.map(a => a.getName()).join(', ') });
    
    // Step 3: Get specific agents from the initialized set
    const scenePlannerAgent = allAgents.find(a => a.getName() === 'ScenePlannerAgent');
    const coordinatorAgent = allAgents.find(a => a.getName() === 'CoordinatorAgent');
    
    if (!scenePlannerAgent) {
      throw new Error('ScenePlannerAgent not found in initialized agents!');
    }
    
    if (!coordinatorAgent) {
      throw new Error('CoordinatorAgent not found in initialized agents!');
    }
    
    debugLog('Found required agents', {
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
    
    // Step 5: Second test - routing via CoordinatorAgent
    debugLog('ROUTING TEST: Testing message routing from CoordinatorAgent to ScenePlannerAgent');
    
    const routingTaskId = `routing-${randomUUID().substring(0, 8)}`;
    const routingTestMessage = {
      id: `routing-${randomUUID().substring(0, 8)}`,
      type: 'CREATE_VIDEO_REQUEST',
      sender: 'TestScript',
      recipient: 'CoordinatorAgent',
      taskId: routingTaskId,
      payload: {
        taskId: routingTaskId,
        prompt: 'Create a short animation for testing agent routing',
        message: {
          createdAt: new Date().toISOString(),
          id: `msg-routing-${randomUUID().substring(0, 8)}`,
          parts: [{ text: 'Create a short animation for testing agent routing', type: 'text' }]
        },
        metadata: {
          animationDesignBrief: {
            description: 'Create a short animation for testing agent routing',
            sceneName: 'RoutingTest'
          }
        }
      }
    };
    
    debugLog('Sending message to CoordinatorAgent', { messageId: routingTestMessage.id });
    const coordinatorResponse = await coordinatorAgent.processMessage(routingTestMessage);
    
    if (coordinatorResponse) {
      debugLog('✅ CoordinatorAgent responded', {
        type: coordinatorResponse.type,
        recipient: coordinatorResponse.recipient
      });
    } else {
      debugLog('⚠️ CoordinatorAgent returned null response (this might be expected if it only routes)');
    }
    
    // Allow time for async routing to complete
    debugLog('Waiting for potential async operations to complete...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    debugLog('🏁 Agent routing test completed');
    return {
      success: true,
      directTestResult: directResponse ? 'success' : 'failure',
      routingTestCompleted: true
    };
    
  } catch (error) {
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
