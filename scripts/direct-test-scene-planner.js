// scripts/direct-test-scene-planner.js
// Direct test script for ScenePlannerAgent that doesn't depend on the API

import { randomUUID } from 'crypto';
import { ScenePlannerAgent } from '../src/server/agents/scene-planner-agent.js';

// Set up required environment variables
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'dummy-key-for-testing';
process.env.DEFAULT_ADB_MODEL = 'gpt-3.5-turbo';
process.env.DEFAULT_MAX_TOKENS = '4000';
process.env.DISABLE_BACKGROUND_WORKERS = 'false';
process.env.USE_MESSAGE_BUS = 'true';

// Mock TaskManager class
class MockTaskManager {
  constructor() {
    this.tasks = new Map();
  }
  
  static getInstance() {
    if (!MockTaskManager.instance) {
      MockTaskManager.instance = new MockTaskManager();
    }
    return MockTaskManager.instance;
  }
  
  async createTask() {
    const taskId = `task-${randomUUID()}`;
    this.tasks.set(taskId, { status: 'created' });
    return taskId;
  }
  
  async updateTaskState(taskId, status, message) {
    console.log(`📝 Task ${taskId} updated: ${status}`);
    if (message) {
      console.log(`   Message: ${typeof message === 'object' ? JSON.stringify(message) : message}`);
    }
    
    this.tasks.set(taskId, { 
      status, 
      message,
      updatedAt: new Date()
    });
  }
  
  getSSEStream() {
    return { next: () => {} };
  }
}

// Main test function
async function testScenePlanner() {
  console.log('🚀 Starting direct ScenePlannerAgent test');
  
  try {
    // Create a mock TaskManager
    const taskManager = MockTaskManager.getInstance();
    console.log('✅ Created mock TaskManager');
    
    // Create ScenePlannerAgent
    const scenePlanner = new ScenePlannerAgent(taskManager);
    console.log(`✅ Created ScenePlannerAgent with name: ${scenePlanner.getName()}`);
    
    // Create a test message
    const taskId = await taskManager.createTask();
    const messageId = `msg-${randomUUID()}`;
    const testMessage = {
      id: messageId,
      type: 'CREATE_SCENE_PLAN_REQUEST',
      sender: 'TestScript',
      recipient: 'ScenePlannerAgent',
      correlationId: randomUUID(),
      timestamp: new Date().toISOString(),
      payload: {
        taskId,
        prompt: 'Create a short intro animation for a tech company called Bazaar that specializes in video generation',
        message: {
          id: `part-${randomUUID()}`,
          createdAt: new Date().toISOString(),
          parts: [
            { 
              text: 'Create a short intro animation for a tech company called Bazaar that specializes in video generation', 
              type: 'text' 
            }
          ]
        }
      }
    };
    
    console.log('📤 Sending test message to ScenePlannerAgent');
    console.log(`   Message ID: ${messageId}`);
    console.log(`   Task ID: ${taskId}`);
    
    // Process the message
    const response = await scenePlanner.processMessage(testMessage);
    
    if (response) {
      console.log('✅ ScenePlannerAgent responded!');
      console.log(`   Response type: ${response.type}`);
      console.log(`   Response recipient: ${response.recipient}`);
      
      // Check for scene plans in the response
      if (response.payload?.scenePlans) {
        const { scenePlans } = response.payload;
        console.log(`🎬 Generated ${scenePlans.scenes.length} scenes:`);
        
        scenePlans.scenes.forEach((scene, index) => {
          console.log(`   Scene ${index + 1}: ${scene.description.substring(0, 50)}...`);
          console.log(`      Duration: ${scene.duration}s`);
        });
        
        console.log(`   Total duration: ${scenePlans.totalDuration.toFixed(1)}s`);
        console.log(`   Intent: ${scenePlans.intent}`);
      } else {
        console.log('❌ No scene plans found in response');
      }
    } else {
      console.log('⚠️ No direct response from ScenePlannerAgent (possibly sent via message bus)');
    }
    
    console.log('✅ Test completed successfully');
    
  } catch (error) {
    console.error('❌ Test failed with error:');
    console.error(error);
  }
}

// Run the test
console.log('⏳ Initializing test...');
testScenePlanner()
  .then(() => {
    console.log('🏁 Test script finished. Exiting...');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Unhandled error in test script:');
    console.error(error);
    process.exit(1);
  });
