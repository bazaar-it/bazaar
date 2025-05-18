// scripts/debug-sceneplanner.js
// A debugging script to test ScenePlannerAgent initialization in isolation

console.log('Starting ScenePlannerAgent debug script...');
console.log('This script will help identify why ScenePlannerAgent fails to initialize');

// Print environment information
console.log('\n--- Environment Variables ---');
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`OPENAI_API_KEY available: ${!!process.env.OPENAI_API_KEY}`);
console.log(`DEFAULT_ADB_MODEL: ${process.env.DEFAULT_ADB_MODEL || '(not set)'}`);
console.log(`USE_MESSAGE_BUS: ${process.env.USE_MESSAGE_BUS}`);
console.log(`DISABLE_BACKGROUND_WORKERS: ${process.env.DISABLE_BACKGROUND_WORKERS}`);

// Run the imports and tests inside an async function
async function runTests() {
  // Import requirements
  try {
    console.log('\n--- Testing ScenePlannerAgent Import ---');
    console.log('Importing ScenePlannerAgent class...');
    const { ScenePlannerAgent } = await import('../src/server/agents/scene-planner-agent.js');
    console.log('✅ Successfully imported ScenePlannerAgent');

    // Mock task manager
    const mockTaskManager = {
      registerTask: () => Promise.resolve(true),
      setStatus: () => Promise.resolve(true),
      updateProgress: () => Promise.resolve(true),
      getTaskById: () => Promise.resolve({}),
    };

    // Try to instantiate ScenePlannerAgent
    try {
      console.log('\n--- Attempting to Instantiate ScenePlannerAgent ---');
      console.log('Creating ScenePlannerAgent instance...');
      const agent = new ScenePlannerAgent(mockTaskManager);
      console.log('✅ Successfully created ScenePlannerAgent instance');
      console.log(`Agent name: ${agent.getName()}`);
      console.log(`Agent model: ${agent.modelName}`);
      console.log(`OpenAI client available: ${!!agent.openai}`);
    } catch (err) {
      console.log('❌ Failed to create ScenePlannerAgent:');
      console.error(err);
      console.log('\nStack trace:');
      console.error(err.stack);
    }
  } catch (err) {
    console.log('❌ Failed to import ScenePlannerAgent:');
    console.error(err);
  }

  console.log('\nDebug script complete');
}

// Run the tests
runTests();
