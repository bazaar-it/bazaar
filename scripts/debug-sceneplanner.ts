// scripts/debug-sceneplanner.ts
// A TypeScript debugging script to test ScenePlannerAgent initialization in isolation

import * as dotenv from 'dotenv';
// Load environment variables 
dotenv.config({ path: '.env.bazaar-debug' });
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

console.log('Starting ScenePlannerAgent TypeScript debug script...');
console.log('This script will help identify why ScenePlannerAgent fails to initialize');

// Print environment information
console.log('\n--- Environment Variables ---');
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`OPENAI_API_KEY available: ${!!process.env.OPENAI_API_KEY}`);
console.log(`DEFAULT_ADB_MODEL: ${process.env.DEFAULT_ADB_MODEL || '(not set)'}`);
console.log(`USE_MESSAGE_BUS: ${process.env.USE_MESSAGE_BUS}`);
console.log(`DISABLE_BACKGROUND_WORKERS: ${process.env.DISABLE_BACKGROUND_WORKERS}`);

// Create a more complete mock TaskManager that matches the interface
class MockTaskManager {
  taskSubscriptions = new Map();
  taskStreams = new Map();
  newTaskCreatedSubject = { subscribe: () => ({ unsubscribe: () => {} }) };
  
  constructor() {
    console.log('Created MockTaskManager');
  }
  
  onNewTaskCreated() {
    return { unsubscribe: () => {} };
  }
  
  registerTask() {
    return Promise.resolve('mock-task-id');
  }
  
  setStatus() {
    return Promise.resolve(true);
  }
  
  updateProgress() {
    return Promise.resolve(true);
  }
  
  getTaskById() {
    return Promise.resolve({});
  }
  
  getAgentRegistry() {
    return {};
  }
  
  listTasks() {
    return Promise.resolve([]);
  }
  
  subscribeToTask() {
    return { unsubscribe: () => {} };
  }
  
  registerPublisher() {}
  
  isTaskCancelled() {
    return Promise.resolve(false);
  }
}

// Run the test
async function runTest() {
  try {
    console.log('\n--- Trying to import ScenePlannerAgent ---');
    
    // First, verify we can import the BaseAgent (which ScenePlannerAgent extends)
    try {
      const { BaseAgent } = await import('../src/server/agents/base-agent');
      console.log('✅ Successfully imported BaseAgent');
    } catch (importError) {
      console.log('❌ Failed to import BaseAgent:');
      console.error(importError);
      console.log('\nThis could indicate path issues or missing dependencies for the agent system');
      return;
    }
    
    // Now try to import ScenePlannerAgent
    const { ScenePlannerAgent } = await import('../src/server/agents/scene-planner-agent');
    console.log('✅ Successfully imported ScenePlannerAgent class');
    
    console.log('\n--- Instantiating ScenePlannerAgent ---');
    const taskManager = new MockTaskManager();
    try {
      console.log('Creating ScenePlannerAgent instance...');
      const agent = new ScenePlannerAgent(taskManager);
      console.log('✅ Successfully created ScenePlannerAgent instance');
      console.log(`Agent name: ${agent.getName()}`);
      console.log(`Agent description: ${agent.getDescription()}`);
      
      // Check if the agent has skills
      const skills = agent.getSkills();
      console.log(`Agent has ${skills.length} skills`);
      
    } catch (error: any) {
      console.log('❌ Failed to create ScenePlannerAgent:');
      console.error(error);
      console.log('\nStack trace:');
      console.error(error.stack);
      
      // Additional diagnostics about the error
      console.log('\n--- Error Analysis ---');
      if (error.message.includes('OpenAI')) {
        console.log('Error appears to be related to OpenAI configuration');
        console.log('Check if OPENAI_API_KEY is properly set and valid');
      }
      
      if (error.message.includes('messageBus') || error.message.includes('bus')) {
        console.log('Error appears to be related to message bus configuration');
        console.log('Check if USE_MESSAGE_BUS is properly set');
      }
    }
  } catch (error: any) {
    console.log('❌ Unexpected error:');
    console.error(error);
  }
  
  console.log('\nDebug script complete');
}

// Run the test
runTest();
