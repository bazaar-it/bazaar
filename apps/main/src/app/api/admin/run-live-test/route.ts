import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // TODO: Add proper admin authentication check
    // For now, we'll skip auth check during development

    const { prompt, modelPack, testType, includeImage, expectedOutput } = await request.json();

    if (!prompt || !modelPack || !testType) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate unique test ID
    const testId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Start the test asynchronously
    runLiveTestAsync(testId, {
      prompt,
      modelPack,
      testType,
      includeImage,
      expectedOutput
    });

    return new Response(JSON.stringify({ 
      success: true, 
      testId,
      message: 'Live test started successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error starting live test:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to start live test',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Async function to run the test and stream results
async function runLiveTestAsync(testId: string, config: {
  prompt: string;
  modelPack: string;
  testType: string;
  includeImage?: string;
  expectedOutput?: string;
}) {
  const startTime = Date.now();
  
  // Send initial test start event
  await broadcastTestUpdate(testId, {
    id: testId,
    testName: `${config.testType}: ${config.prompt.slice(0, 50)}...`,
    status: 'running' as const,
    progress: 0,
    startTime,
    brainSteps: [],
    modelPack: config.modelPack
  });

  try {
    // Send brain reasoning step
    await broadcastBrainStep(testId, {
      id: `step-${Date.now()}`,
      timestamp: Date.now(),
      type: 'decision' as const,
      title: 'Analyzing user prompt',
      content: { prompt: config.prompt, testType: config.testType },
      reasoning: `Determining the best approach for ${config.testType} based on user input`,
      executionTime: 150
    });

    // Progress update
    await broadcastTestUpdate(testId, { progress: 25 });

    // Simulate brain orchestrator decision
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await broadcastBrainStep(testId, {
      id: `step-${Date.now()}`,
      timestamp: Date.now(),
      type: 'tool_call' as const,
      title: 'Calling appropriate service',
      content: { service: config.testType === 'scene_generation' ? 'SceneBuilder' : 'CodeGenerator' },
      toolName: config.testType === 'scene_generation' ? 'addScene' : 'generateCode',
      executionTime: 200
    });

    // Progress update
    await broadcastTestUpdate(testId, { progress: 50 });

    // Simulate LLM call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await broadcastBrainStep(testId, {
      id: `step-${Date.now()}`,
      timestamp: Date.now(),
      type: 'llm_call' as const,
      title: 'Generating content with AI model',
      content: { model: config.modelPack, tokens: 1250 },
      prompt: config.prompt,
      response: 'Generated scene/code content based on user requirements',
      executionTime: 2100,
      cost: 0.0052
    });

    // Progress update
    await broadcastTestUpdate(testId, { progress: 85 });

    // Simulate final processing
    await new Promise(resolve => setTimeout(resolve, 500));

    const finalResult = {
      code: `// Generated ${config.testType} code\n\nfunction ${config.testType.replace('_', '')}Scene() {\n  return (\n    <div className="scene">\n      {/* ${config.prompt} */}\n      <h1>AI Generated Content</h1>\n    </div>\n  );\n}`,
      success: true,
      metadata: {
        totalTime: Date.now() - startTime,
        modelUsed: config.modelPack,
        tokensUsed: 1250
      }
    };

    // Send completion
    await broadcastBrainStep(testId, {
      id: `step-${Date.now()}`,
      timestamp: Date.now(),
      type: 'result' as const,
      title: 'Test completed successfully',
      content: finalResult,
      executionTime: 100
    });

    await broadcastTestUpdate(testId, { 
      status: 'completed' as const, 
      progress: 100,
      finalResult 
    });

  } catch (error) {
    // Send error
    await broadcastBrainStep(testId, {
      id: `step-${Date.now()}`,
      timestamp: Date.now(),
      type: 'error' as const,
      title: 'Test failed',
      content: { error: error instanceof Error ? error.message : 'Unknown error' },
      executionTime: 0
    });

    await broadcastTestUpdate(testId, { 
      status: 'failed' as const, 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Helper functions to broadcast updates (in a real implementation, these would use a pub/sub system)
async function broadcastTestUpdate(testId: string, update: any) {
  // In a real implementation, this would broadcast to all connected SSE clients
  console.log(`Test Update [${testId}]:`, update);
  
  // For now, we'll just simulate the update
  // The frontend would receive this via SSE
}

async function broadcastBrainStep(testId: string, step: any) {
  // In a real implementation, this would broadcast to all connected SSE clients
  console.log(`Brain Step [${testId}]:`, step);
  
  // For now, we'll just simulate the step
  // The frontend would receive this via SSE
} 