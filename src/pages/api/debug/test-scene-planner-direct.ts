//src/pages/api/debug/test-scene-planner-direct.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { randomUUID } from 'crypto';
import { a2aLogger } from '~/lib/logger';
import { messageBus } from '~/server/agents/message-bus';

/**
 * Unprotected test endpoint for directly sending messages to the ScenePlannerAgent
 * This endpoint bypasses authentication for debugging purposes only
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Extract the prompt from the request body
    const { prompt, testMode = false } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    const taskId = `test-${randomUUID()}`;
    a2aLogger.info(taskId, `[DIRECT DEBUG] Test scene planner direct endpoint called with prompt: ${prompt.substring(0, 100)}...`);
    
    // Create a message directly to the ScenePlannerAgent
    const message = {
      id: `msg-${randomUUID()}`,
      type: 'CREATE_SCENE_PLAN_REQUEST',
      sender: 'TestEndpointDirect',
      recipient: 'ScenePlannerAgent',
      timestamp: new Date().toISOString(),
      payload: {
        taskId,
        projectId: 'test-project',
        userId: 'test-user',
        prompt,
        testMode,
        message: {
          id: `prompt-${randomUUID()}`,
          createdAt: new Date().toISOString(),
          parts: [{ type: 'text', text: prompt }]
        }
      }
    };
    
    // Publish the message to the message bus
    a2aLogger.info(taskId, '[DIRECT DEBUG] Publishing direct message to ScenePlannerAgent', { message: message.id });
    await messageBus.publish(message);
    
    a2aLogger.info(taskId, '[DIRECT DEBUG] Message to ScenePlannerAgent published successfully');
    
    return res.status(200).json({ 
      success: true, 
      message: 'Scene planning request sent directly to ScenePlannerAgent',
      taskId,
      messageId: message.id
    });
  } catch (error) {
    console.error('[DIRECT DEBUG] Error in test-scene-planner-direct API route:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to send direct scene planning request',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
