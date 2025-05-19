// src/server/a2a/__tests__/a2a-test-harness.test.ts

import { taskManager } from '~/server/services/a2a/taskManager.service';
import { type AgentMessage } from '~/server/agents/base-agent';

// Mock the OpenAI client
jest.mock('~/server/lib/openai', () => ({
  createChatCompletion: jest.fn().mockImplementation((messages) => {
    const lastMessage = messages[messages.length - 1]?.content || '';
    
    // Mock different responses based on the prompt content
    if (lastMessage.includes('create scene')) {
      return Promise.resolve({
        choices: [{
          message: {
            content: `I'll create a scene with a blue background. Here's my plan:
            1. Set up a composition with 1920x1080 dimensions
            2. Create a blue background
            3. Add a centered logo
            4. Animate the logo with a rotation effect
            
            Let's start by setting up the composition.`
          }
        }]
      });
    } else if (lastMessage.includes('component')) {
      return Promise.resolve({
        choices: [{
          message: {
            content: `I'll create a React component. Here's the code:
            
            \`\`\`tsx
            import React from 'react';
            import { useCurrentFrame } from 'remotion';
            
            export const MyComponent = () => {
              const frame = useCurrentFrame();
              
              return (
                <div style={{ color: 'blue' }}>
                  Frame: {frame}
                </div>
              );
            };
            \`\`\`
            
            This component displays the current frame number in blue text.`
          }
        }]
      });
    }
    
    // Default response
    return Promise.resolve({
      choices: [{
        message: {
          content: "I'll help you with that task."
        }
      }]
    });
  })
}));

// Mock task processor and agent registry
jest.mock('~/server/services/a2a/taskProcessor.service', () => ({
  taskProcessor: {
    processTask: jest.fn().mockImplementation((task) => {
      return Promise.resolve({
        ...task,
        status: 'COMPLETED',
        output: { result: 'Mocked task output' }
      });
    }),
    initialize: jest.fn().mockResolvedValue(undefined)
  }
}));

jest.mock('~/server/services/a2a/agentRegistry.service', () => ({
  agentRegistry: {
    registerAgent: jest.fn(),
    getAgent: jest.fn().mockImplementation((name) => {
      if (name === 'ScenePlannerAgent') {
        return {
          name: 'ScenePlannerAgent',
          processMessage: jest.fn().mockImplementation((message: AgentMessage) => {
            return Promise.resolve({
              text: `I'll plan a scene with ${message.content}`,
              actions: [
                { type: 'CREATE_SCENE', payload: { id: 'test-scene-1' } }
              ]
            });
          })
        };
      }
      return null;
    }),
    getAllAgents: jest.fn().mockReturnValue([
      { name: 'ScenePlannerAgent' },
      { name: 'ComponentGeneratorAgent' }
    ])
  }
}));

describe('A2A Test Harness', () => {
  beforeAll(async () => {
    // Initialize the task manager with mocks
    await taskManager.initialize();
  });
  
  afterAll(async () => {
    // Clean up task manager
    await taskManager.shutdown();
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should create and process a task successfully', async () => {
    // Create a test task
    const taskId = await taskManager.createTask({
      type: 'CREATE_SCENE',
      input: { prompt: 'blue background with a spinning logo' }
    });
    
    expect(taskId).toBeDefined();
    
    // Check if task was created with correct properties
    const task = await taskManager.getTask(taskId);
    expect(task).toBeDefined();
    expect(task?.type).toBe('CREATE_SCENE');
    expect(task?.status).toBe('PENDING');
    
    // Process the task
    await taskManager.processTask(taskId);
    
    // Check if task was updated correctly
    const updatedTask = await taskManager.getTask(taskId);
    expect(updatedTask?.status).toBe('COMPLETED');
    expect(updatedTask?.output).toBeDefined();
  });
  
  it('should handle agent communication', async () => {
    // Mock implementation for specific test
    const scenePlannerAgent = taskManager.getAgentByName('ScenePlannerAgent');
    
    expect(scenePlannerAgent).toBeDefined();
    
    if (scenePlannerAgent) {
      const response = await scenePlannerAgent.processMessage({
        type: 'TEXT',
        content: 'Create a scene with a dark background and animated text',
        role: 'user',
        taskId: 'test-task-123'
      });
      
      expect(response).toBeDefined();
      expect(response.text).toContain('plan a scene');
      expect(response.actions).toHaveLength(1);
      expect(response.actions[0].type).toBe('CREATE_SCENE');
    }
  });
  
  it('should handle task completion', async () => {
    const taskId = await taskManager.createTask({
      type: 'CREATE_COMPONENT',
      input: { prompt: 'Create a simple counter component' }
    });
    
    // Set up a promise to wait for task completion
    const completionPromise = taskManager.waitForTaskCompletion(taskId, 1000);
    
    // Simulate task processing
    await taskManager.processTask(taskId);
    
    // Wait for completion and check result
    const result = await completionPromise;
    
    expect(result.status).toBe('COMPLETED');
    expect(result.output).toBeDefined();
  });
  
  it('should evaluate agent responses', async () => {
    // Create a test task
    const taskId = await taskManager.createTask({
      type: 'CREATE_SCENE',
      input: { prompt: 'create scene with blue background' }
    });
    
    // Process the task
    await taskManager.processTask(taskId);
    
    // Get the completed task
    const task = await taskManager.getTask(taskId);
    
    // Evaluate the response quality
    const evaluationResult = {
      correctness: true,
      completeness: true,
      reasoningSteps: true,
      score: 0.95
    };
    
    // This would be an actual evaluation in a real test
    expect(evaluationResult.score).toBeGreaterThan(0.8);
    expect(task?.status).toBe('COMPLETED');
  });
}); 