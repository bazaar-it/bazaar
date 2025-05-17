//src/server/agents/scene-planner-agent.ts
import { randomUUID } from "crypto";
import { BaseAgent, type AgentMessage } from "./base-agent";
import { handleScenePlan } from "~/server/services/scenePlanner.service";
import { analyzeSceneContent } from "../services/sceneAnalyzer.service";
import { a2aLogger } from "~/lib/logger";
import type { AgentSkill, TaskState, TextPart, ComponentJobStatus, Message, Part, Artifact } from "~/types/a2a";
import { v4 as uuidv4 } from "uuid";
import { createTextMessage } from "~/types/a2a";
import { TaskManager } from "~/server/services/a2a/taskManager.service";
import { db } from "~/server/db";
import type { ScenePlanResponse } from "~/types/chat";

// Define scene related interfaces and types
interface Scene {
  id: string;
  description: string;
  durationInSeconds: number;
  effectType?: string;
}

interface ScenePlanWithScenes extends ScenePlanResponse {
  scenes: Scene[];
  intent: string;
  reasoning?: string;
  fps?: number;
}

interface LocalSceneAnalysis {
  valid: boolean;
  issues: string[];
}

interface EnhancedScenePlan {
  scenes: Scene[];
  totalDuration: number;
  style?: string;
  mood?: string;
  intent?: string;
  reasoning?: string;
  fps?: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __SCENE_PLANNER_AGENT_CONSTRUCTED: string | undefined;
}

/**
 * ScenePlannerAgent
 * 
 * Responsible for generating scene plans based on user input.
 * Uses the existing scene planning service to create structured scene plans.
 */
export class ScenePlannerAgent extends BaseAgent {
  constructor(taskManager: TaskManager) {
    // Initialize with OpenAI integration enabled for LLM capabilities
    super(
      "ScenePlannerAgent", 
      taskManager, 
      "Creates structured scene plans for videos", 
      true
    );
    // Log when the agent is constructed
    a2aLogger.info("agent_init", `[VERBOSE_DEBUG] ScenePlannerAgent CONSTRUCTED at ${new Date().toISOString()}`);
    // Add this to the global scope for debugging
    (globalThis as any).__SCENE_PLANNER_AGENT_CONSTRUCTED = new Date().toISOString();
    console.log(`ScenePlannerAgent constructor executed at ${new Date().toISOString()}`);
    // Set preferred LLM model - gpt-4o-mini works well for creative generation
    this.modelName = "gpt-4o-mini";
    // Use higher temperature for creative scene planning
    this.temperature = 0.7;
  }

  /**
   * Process incoming messages for the ScenePlannerAgent
   */
  async processMessage(message: AgentMessage): Promise<AgentMessage | null> {
    const taskId = message.payload?.taskId || message.id || `temp-${Date.now()}`;
    const logPrefix = `[${this.name}][${taskId}]`;
    const startTime = Date.now();
    
    // Initialize scenePlanResponse at the start
    let scenePlanResponse: ScenePlanWithScenes | null = null;
    
    // Log incoming message details
    a2aLogger.info(
      `${logPrefix} Received message`,
      {
        messageId: message.id,
        type: message.type,
        sender: message.sender,
        correlationId: message.payload?.correlationId || 'none',
        payloadKeys: message.payload ? Object.keys(message.payload).filter(k => k !== 'prompt') : [],
        hasPrompt: !!(message.payload?.prompt)
      }
    );
    
    // Log the full payload in development for debugging
    if (process.env.NODE_ENV === 'development' && message.payload) {
      a2aLogger.debug(
        `${logPrefix} Full message payload`,
        {
          ...message.payload,
          prompt: message.payload.prompt 
            ? `${message.payload.prompt.substring(0, 50)}...` 
            : 'no prompt'
        }
      );
    }
    
    // Process based on message type
    if (message.type === "CREATE_SCENE_PLAN_REQUEST") {
      a2aLogger.info(
        `${logPrefix} Processing CREATE_SCENE_PLAN_REQUEST`,
        { 
          correlationId: message.payload?.correlationId || 'none',
          sender: message.sender,
          hasPrompt: !!(message.payload?.prompt)
        }
      );
      
      try {
        // Validate required fields
        if (!message.payload?.prompt) {
          const errorMsg = "Missing required 'prompt' in payload";
          a2aLogger.error(logPrefix, errorMsg, { payload: message.payload });
          
          // Return an error message
          return this.createMessage(
            "SCENE_PLAN_ERROR",
            {
              error: errorMsg,
              success: false,
              taskId
            },
            message.sender,
            message.id
          );
        }
        
        // Update task state to show we're working on it
        a2aLogger.info(
          `${logPrefix} Updating task state to 'working'`,
          { correlationId: message.payload?.correlationId || 'none' }
        );
        
        try {
          await this.updateTaskState(
            taskId,
            "working",
            createTextMessage("ScenePlannerAgent is creating a scene plan..."),
            undefined,
            "processing" as ComponentJobStatus
          );
          console.log(`[CRITICAL_DEBUG] Successfully updated task state to 'working' for ${taskId}`);
        } catch (stateUpdateErr) {
          console.error(`[CRITICAL_ERROR] Failed to update task state for ${taskId}:`, stateUpdateErr);
          a2aLogger.error(taskId, `Failed to update task state: ${stateUpdateErr instanceof Error ? stateUpdateErr.message : 'Unknown error'}`);
          // Continue processing despite the error
        }
        
        // Extract prompt from the message with extensive validation
        let prompt = "Create a generic video scene plan"; // Default fallback
        
        if (message.payload?.prompt) {
          prompt = message.payload.prompt;
          console.log(`[CRITICAL_DEBUG] Using prompt directly from payload.prompt: ${prompt.substring(0, 50)}...`);
        } else if (message.payload?.message?.parts && Array.isArray(message.payload.message.parts)) {
          const textParts = message.payload.message.parts.filter((part: any) => part && typeof part.text === 'string');
          if (textParts.length > 0) {
            prompt = textParts[0].text;
            console.log(`[CRITICAL_DEBUG] Extracted prompt from message parts: ${prompt.substring(0, 50)}...`);
          } else {
            console.log(`[CRITICAL_DEBUG] No text parts found in message.payload.message.parts. Using default prompt.`);
          }
        } else {
          console.log(`[CRITICAL_DEBUG] Could not find prompt in message. Using default prompt.`);
        }
        
        console.log(`[CRITICAL_DEBUG] Final prompt being used: ${prompt.substring(0, 100)}...`);
        
        // Log that we're starting generation
        a2aLogger.info(taskId, `[ScenePlannerAgent] Generating scene plan for prompt: ${prompt.substring(0, 50)}...`);
        console.log(`[DEBUG_AGENT] ScenePlannerAgent generating scene plan for ${prompt.substring(0, 50)}...`);
        
        // Generate a scene plan using the internal method
        console.log(`[CRITICAL_DEBUG] Calling generateScenePlan for task ${taskId}`);
        let scenePlan: EnhancedScenePlan;
        try {
          scenePlan = await this.generateScenePlan(prompt);
          console.log(`[CRITICAL_DEBUG] Successfully generated scene plan for task ${taskId}`);
        } catch (genError) {
          console.error(`[CRITICAL_ERROR] Error in generateScenePlan:`, genError);
          throw new Error(`Scene plan generation failed: ${genError instanceof Error ? genError.message : 'Unknown error'}`);
        }
        
        // Process the scene plan
        a2aLogger.info(taskId, `[ScenePlannerAgent] Generated scene plan. Scenes: ${scenePlan.scenes.length}`, {
          intent: scenePlan.intent, 
          sceneCount: scenePlan.scenes.length
        });
        console.log(`[CRITICAL_DEBUG] Scene plan generated with ${scenePlan.scenes.length} scenes for task ${taskId}`);
        
        // 1. First analyze the scenes for potential issues
        console.log(`[CRITICAL_DEBUG] Analyzing scene content for task ${taskId}`);
        // We'll perform a basic analysis for each scene and check if any have issues
        let hasContentIssues = false;
        let contentIssues: string[] = [];

        try {
          // Process each scene with the analyzer
          for(let i = 0; i < scenePlan.scenes.length; i++) {
            const scene = scenePlan.scenes[i];
            if (!scene) continue; // Skip if scene is undefined
            
            // The actual SceneAnalysis from the service has different properties
            // but we can use it to detect potential problems
            try {
              const description = scene.description || ''; // Handle missing description
              const analysis = await analyzeSceneContent(
                description,
                i, // sceneIndex
                scenePlan.scenes.length // totalScenes
              );
              
              // If complexity is very high, flag as potential issue
              if (analysis.complexity > 0.8) {
                hasContentIssues = true;
                contentIssues.push(`Scene ${i+1} is very complex: ${description.substring(0, 50)}...`); 
              }
            } catch (sceneError) {
              console.error(`[CRITICAL_ERROR] Error analyzing scene ${i}:`, sceneError);
            }
          }
          
          console.log(`[CRITICAL_DEBUG] Content analysis completed for task ${taskId}. Issues found: ${contentIssues.length}`);
        } catch (analyzeError) {
          console.error(`[CRITICAL_ERROR] Error analyzing scene content:`, analyzeError);
          a2aLogger.error(taskId, `Error analyzing scene content: ${analyzeError instanceof Error ? analyzeError.message : 'Unknown error'}`);
          // Don't throw here, continue processing
          hasContentIssues = false;
          contentIssues = [];
        }
        
        // Log any issues found
        if (hasContentIssues && contentIssues.length > 0) {
          a2aLogger.warn(taskId, `[ScenePlannerAgent] Content issues detected in scene plan`, { issues: contentIssues });
          console.log(`[CRITICAL_DEBUG] Content issues detected in scene plan for task ${taskId}:`, contentIssues);
          // Still proceed but log the issues for human review
        }
        
        // 2. Store the scene plan in the database using the service
        console.log(`[CRITICAL_DEBUG] Calling handleScenePlan for task ${taskId}`);
        
        try {
          // Process the scene plan
          a2aLogger.info(
            `${logPrefix} Saving scene plan`,
            { 
              promptPreview: message.payload.prompt.substring(0, 50) + '...',
              sceneCount: scenePlan.scenes.length
            }
          );
          
          // Call handleScenePlan with proper typing and error handling
          try {
            const savedResponse = await handleScenePlan(
              taskId, // projectId
              message.payload.userId || 'system',
              {
                scenes: scenePlan.scenes,
                intent: scenePlan.intent || '',
                reasoning: scenePlan.reasoning || 'Generated scene plan based on user request',
                fps: scenePlan.fps || 30
              },
              `msg-${uuidv4()}`,
              db
            );
            
            // Cast the response to our extended type
            scenePlanResponse = {
              ...savedResponse,
              scenes: scenePlan.scenes,
              intent: scenePlan.intent || ''
            } as ScenePlanWithScenes;

            // Log successful scene plan creation
            a2aLogger.info(
              `${logPrefix} Successfully created scene plan`,
              { 
                sceneCount: scenePlan.scenes.length,
                totalDuration: scenePlan.totalDuration,
                processingTime: `${((Date.now() - startTime) / 1000).toFixed(2)}s`
              }
            );
            
            // Log scene details in development
            if (process.env.NODE_ENV === 'development' && scenePlan.scenes) {
              a2aLogger.debug(
                `${logPrefix} Scene plan details`,
                {
                  scenes: scenePlan.scenes.map((s: Scene) => ({
                    id: s.id,
                    description: s.description,
                    duration: s.durationInSeconds
                  }))
                }
              );
            }
          } catch (error) {
            const errorMsg = `Error in handleScenePlan: ${error instanceof Error ? error.message : 'Unknown error'}`;
            a2aLogger.error(`${logPrefix} ${errorMsg}`, { error });
            throw new Error(errorMsg);
          } 
          console.log(`[CRITICAL_DEBUG] handleScenePlan completed for task ${taskId}`);
        } catch (handleError) {
          console.error(`[CRITICAL_ERROR] Error in handleScenePlan:`, handleError);
          throw new Error(`Failed to save scene plan: ${handleError instanceof Error ? handleError.message : 'Unknown error'}`);
        }
        
        if (!scenePlanResponse) {
          console.error(`[CRITICAL_ERROR] Scene plan processing failed to return a result for task ${taskId}`);
          throw new Error('Failed to save scene plan: No result returned');
        }
        
        // 3. Mark the task as complete for this stage
        console.log(`[CRITICAL_DEBUG] Updating task state to 'completed' for ${taskId}`);
        try {
          // Create a scene plan artifact to attach to the task
          const scenePlanArtifact: Artifact = {
            id: uuidv4(),
            type: "data",
            mimeType: "application/json",
            name: "scene-plan",
            description: `Scene plan with ${scenePlan.scenes.length} scenes`,
            data: scenePlan,
            createdAt: new Date().toISOString()
          };
          
          await this.updateTaskState(
            taskId,
            "completed",
            createTextMessage(`Created scene plan with ${scenePlan.scenes.length} scenes.`),
            [scenePlanArtifact],
            "complete" as ComponentJobStatus
          );
          console.log(`[CRITICAL_DEBUG] Successfully updated task state to 'completed' for ${taskId}`);
        } catch (finalStateUpdateErr) {
          console.error(`[CRITICAL_ERROR] Failed to update final task state for ${taskId}:`, finalStateUpdateErr);
          a2aLogger.error(taskId, `Failed to update final task state: ${finalStateUpdateErr instanceof Error ? finalStateUpdateErr.message : 'Unknown error'}`);
          // Continue despite error - we don't want to fail the whole process at this point
        }
        
        // 4. Send a response message back
        console.log(`[DEBUG_AGENT] ScenePlannerAgent completed scene plan for task ${taskId} with ${scenePlan.scenes.length} scenes`);
        
        // Extract the message and patches from the response
        const responseMessage = scenePlanResponse.message || `Created scene plan with ${scenePlan.scenes.length} scenes.`;
        const scenePatchesCount = scenePlanResponse.patches?.length || 0;
        
        return this.createMessage(
          "SCENE_PLAN_RESPONSE",
          {
            message: responseMessage,
            sceneCount: scenePlan.scenes.length,
            intent: scenePlan.intent,
            patches: scenePlanResponse.patches || [],
            patchCount: scenePatchesCount,
            success: true,
            taskId
          },
          message.sender,
          message.id
        );
      } catch (error: unknown) {
        // Detailed error logging
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        const errorName = error instanceof Error ? error.constructor.name : 'UnknownError';
        
        console.error(`[CRITICAL_ERROR] ScenePlannerAgent error processing CREATE_SCENE_PLAN_REQUEST:`, errorMessage);
        if (errorStack) {
          console.error(`[CRITICAL_ERROR] Error stack:`, errorStack);
        }
        
        a2aLogger.error(taskId, `[ScenePlannerAgent] Error processing scene plan request: ${errorMessage}`, { 
          stack: errorStack,
          errorType: errorName,
          errorTime: new Date().toISOString(),
          messageType: message.type,
          messageId: message.id
        });
        
        const errorMsg = `Error creating scene plan: ${errorMessage}`;
        a2aLogger.error(
          `${logPrefix} ${errorMsg}`,
          {
            error: error instanceof Error ? {
              message: error.message,
              stack: error.stack,
              name: error.name
            } : String(error),
            processingTime: `${((Date.now() - startTime) / 1000).toFixed(2)}s`,
            taskId,
            correlationId: message.payload?.correlationId || message.id
          }
        );
        
        // Update task state to failed
        try {
          await this.updateTaskState(
            taskId,
            "failed",
            createTextMessage(`Failed to create scene plan: ${errorMessage}`),
            undefined,
            "failed" as ComponentJobStatus
          );
        } catch (updateErr) {
          console.error(`[CRITICAL_ERROR] Failed to update task state to failed for ${taskId}:`, updateErr);
        }
        
        // Return an error message to the sender
        return this.createMessage(
          "SCENE_PLAN_ERROR",
          {
            error: errorMessage,
            success: false,
            taskId,
            correlationId: message.payload?.correlationId || message.id
          },
          message.sender,
          message.id
        );
      }
    }
    
    // Default response for unhandled message types
    console.log(`[CRITICAL_DEBUG] Unhandled message type: ${message.type} from ${message.sender}`);
    
    a2aLogger.warn(
      `${logPrefix} Unhandled message type: ${message.type}`,
      { 
        messageId: message.id,
        sender: message.sender,
        correlationId: message.payload?.correlationId || 'none'
      }
    );
    
    return this.createMessage(
      "UNHANDLED_MESSAGE_TYPE",
      {
        warning: `ScenePlannerAgent received unhandled message type: ${message.type}`,
        taskId,
        correlationId: message.payload?.correlationId || message.id
      },
      message.sender,
      message.id
    );
  }

  /**
   * Create a simple text message
   * Overrides base class to ensure proper type compatibility
   */
  public createSimpleTextMessage(text: string): Message {
    return {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      parts: [
        { type: 'text', text } as TextPart
      ]
    };
  }

  /**
   * Generates a structured scene plan based on the provided prompt
   * @param prompt The user's prompt describing the desired video
   * @returns A promise that resolves to an EnhancedScenePlan or null if generation fails
   */
  private async generateScenePlan(prompt: string): Promise<EnhancedScenePlan> {
    const logPrefix = `[${this.name}][generateScenePlan]`;
    a2aLogger.info(`${logPrefix} Generating scene plan`, { promptLength: prompt.length });
    
    const systemPrompt = `You are an expert video editor creating a scene plan for a short video. 
- Ensure smooth transitions between scenes
- Vary scene types for visual interest
- Consider the overall narrative flow
- Total video length should be 15-60 seconds

Structure your response as valid JSON with:
{
  "intent": "Brief summary of what the video aims to accomplish",
  "reasoning": "Your detailed thought process for how you structured the scenes",
  "scenes": [
    {
      "id": "unique-id", // Use scene-1, scene-2, etc.
      "description": "Detailed scene description",
      "durationInSeconds": 5, // Reasonable duration between 3-10 seconds
      "effectType": "text" // Either "text" or "custom"
    }
  ],
  "fps": 30 // Standard frame rate
}`;
    
    try {
      console.log(`[CRITICAL_DEBUG] Calling generateStructuredResponse to create scene plan`);
      const response = await this.generateStructuredResponse<EnhancedScenePlan>(prompt, systemPrompt);
      console.log(`[CRITICAL_DEBUG] generateStructuredResponse completed`);
      
      // Validate the response structure
      if (!response) {
        throw new Error('LLM returned null or undefined response');
      }
      
      if (!response.scenes || !Array.isArray(response.scenes) || response.scenes.length === 0) {
        throw new Error('Invalid response format: missing or invalid scenes array');
      }
      
      // Ensure each scene has required fields
      const processedScenes = response.scenes.map((scene, index) => ({
        id: scene.id || `scene-${index + 1}`,
        description: scene.description || `Scene ${index + 1}`,
        durationInSeconds: scene.durationInSeconds || 5,
        effectType: scene.effectType || "text"
      }));
      
      // Calculate total duration
      const totalDuration = processedScenes.reduce((sum, scene) => 
        sum + (scene.durationInSeconds || 0), 0);
      
      // Return the enhanced scene plan
      return {
        scenes: processedScenes,
        totalDuration,
        intent: response.intent || 'Generated video based on prompt',
        reasoning: response.reasoning || 'Automatically structured based on user request',
        fps: response.fps || 30,
        style: response.style,
        mood: response.mood
      };
      
    } catch (error) {
      console.error(`[CRITICAL_ERROR] Error generating scene plan:`, error);
      a2aLogger.error(logPrefix, `Error generating scene plan: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : String(error),
      });
      throw error;
    }
  }
  
  /**
   * Get agent skills for this agent
   */
  protected getAgentSkills(): AgentSkill[] {
    const exampleInput = this.createSimpleTextMessage("Create a short intro animation for a tech company called 'Innovate'");
    const exampleOutput = this.createSimpleTextMessage("Scene plan created with 3 scenes: logo reveal, product showcase, and contact information");
    
    return [
      {
        id: "scene-planning",
        name: "Scene Planning",
        description: "Creates structured scene plans for videos based on user input",
        examples: [
          {
            name: "Create Tech Intro",
            description: "Create a scene plan for a tech company intro",
            input: {
              message: exampleInput
            },
            output: {
              message: exampleOutput
            }
          }
        ],
        inputModes: ["text"],
        outputModes: ["text", "data"]
      }
    ];
  }
}
