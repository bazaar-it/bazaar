// src/server/services/animationDesigner.service.ts
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema'; 
import {
  animationDesignBriefSchema,
  type AnimationDesignBrief,
} from '~/lib/schemas/animationDesignBrief.schema'; 
import { env } from '~/env'; 
import { db } from '~/server/db';
import { animationDesignBriefs } from '~/server/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import logger, { animationDesignerLogger, logAnimationStart, logAnimationValidation, logAnimationComplete } from '~/lib/logger';

// Define the OpenAI function schema directly rather than converting from Zod
// This ensures we have a proper schema that OpenAI can understand
const toolParametersJsonSchema = {
  type: "object",
  properties: {
    sceneId: {
      type: "string",
      description: "Unique identifier for the scene"
    },
    scenePurpose: {
      type: "string",
      description: "The purpose or description of the scene"
    },
    overallStyle: {
      type: "string",
      description: "The desired visual style for the animation"
    },
    durationInFrames: {
      type: "number",
      description: "Duration of the animation in frames"
    },
    dimensions: {
      type: "object",
      properties: {
        width: { type: "number" },
        height: { type: "number" }
      },
      required: ["width", "height"]
    },
    colorPalette: {
      type: "object",
      properties: {
        background: { type: "string" },
        primary: { type: "string" },
        secondary: { type: "string" },
        accent: { type: "string" },
        textPrimary: { type: "string" },
        textSecondary: { type: "string" },
        customColors: {
          type: "object",
          additionalProperties: { type: "string" }
        }
      },
      required: ["background"]
    },
    elements: {
      type: "array",
      items: {
        type: "object",
        properties: {
          elementId: { type: "string" },
          elementType: { type: "string", enum: ["text", "image", "video", "shape", "audio", "customComponent"] },
          name: { type: "string" },
          content: { type: "string" },
          initialLayout: {
            type: "object",
            properties: {
              x: { type: "number" },
              y: { type: "number" },
              width: { type: "number" },
              height: { type: "number" },
              opacity: { type: "number" },
              rotation: { type: "number" },
              scale: { type: "number" },
              backgroundColor: { type: "string" }
            }
          },
          animations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                animationId: { 
                  type: "string",
                  description: "Identifier for this animation definition"
                },
                animationType: { 
                  type: "string",
                  description: "Type of animation (e.g., \"fadeIn\", \"slideInLeft\", \"customProperty\", \"pulse\")"
                },
                trigger: { 
                  type: "string", 
                  enum: ["onLoad", "onClick", "onHover", "afterPrevious", "withPrevious"],
                  default: "onLoad",
                  description: "Event or condition that triggers the animation"
                },
                startAtFrame: { 
                  type: "number",
                  description: "Frame number (relative to scene start or trigger) when the animation begins"
                },
                durationInFrames: { 
                  type: "number",
                  description: "Duration of the animation in frames"
                },
                delayInFrames: { 
                  type: "number", 
                  default: 0, 
                  description: "Delay in frames before the animation starts after being triggered"
                },
                easing: { 
                  type: "string", 
                  default: "easeInOutCubic",
                  description: "Easing function for the animation" 
                },
                propertiesAnimated: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      property: { 
                        type: "string",
                        description: "CSS-like property to animate (e.g., \"opacity\", \"x\", \"backgroundColor\")"
                      },
                      from: { 
                        type: ["string", "number", "boolean"],
                        description: "Starting value of the property"
                      },
                      to: { 
                        type: ["string", "number", "boolean"],
                        description: "Ending value of the property"
                      }
                    },
                    required: ["property", "from", "to"]
                  },
                  description: "Array of properties to be animated"
                },
                pathData: {
                  type: "string",
                  description: "SVG path data for path-based animations"
                },
                repeat: {
                  type: "object",
                  properties: {
                    count: { 
                      type: ["number", "string"],
                      description: "Number of times to repeat, or \"infinite\""
                    },
                    direction: { 
                      type: "string", 
                      enum: ["normal", "reverse", "alternate"],
                      default: "normal",
                      description: "Direction of repetition"
                    }
                  },
                  required: ["count"],
                  description: "Settings for repeating the animation"
                }
              },
              required: ["animationId", "animationType", "startAtFrame", "durationInFrames"]
            }
          }
        },
        required: ["elementId", "elementType"]
      }
    },
    typography: {
      type: "object",
      properties: {
        defaultFontFamily: { type: "string" },
        heading1: { 
          type: "object",
          properties: {
            fontFamily: { type: "string" },
            fontSize: { type: "number" }
          }
        }
      }
    },
    audioTracks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          trackId: { type: "string" },
          url: { type: "string" },
          source: { type: "string" },
          volume: { type: "number", minimum: 0, maximum: 1, default: 1 },
          startAtFrame: { type: "number", default: 0 },
          endFrame: { type: "number" },
          loop: { type: "boolean", default: false }
        },
        required: ["trackId"]
      }
    },
    briefVersion: {
      type: "string",
      description: "Version of the brief schema"
    }
  },
  required: ["sceneId", "scenePurpose", "overallStyle", "durationInFrames", "dimensions", "colorPalette", "elements"]
};

// We know this schema is defined since we created it above 
// No need for a conditional check here

// Helper for validating UUIDs
function isValidUuid(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Ensures a valid UUID is provided by either using the input if valid
 * or generating a new RFC 4122 compliant UUID v4.
 * 
 * We use randomUUID() from crypto module for proper compliance with UUID standards
 * rather than a custom deterministic hash, as this ensures proper uniqueness
 * and compatibility with systems expecting standard UUIDs.
 */
function ensureValidUuid(str: string): string {
  if (isValidUuid(str)) {
    return str;
  }
  
  // Use proper RFC 4122 compliant v4 UUIDs
  return randomUUID();
}

// Save the Animation Design Brief to the database
export async function saveAnimationDesignBrief(
  projectId: string,
  sceneId: string,
  brief: AnimationDesignBrief,
  llmModel: string,
  componentJobId?: string
): Promise<string> {
  try {
    // Create a DB record for the design brief
    const result = await db.insert(animationDesignBriefs).values({
      projectId,
      sceneId: ensureValidUuid(sceneId), // Ensure valid UUID format
      designBrief: brief as any, // Cast to any for DB storage
      status: 'complete',
      llmModel,
      componentJobId: componentJobId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning({ id: animationDesignBriefs.id });
    
    if (result && result.length > 0 && result[0]) {
      return result[0].id;
    }
    throw new Error('Failed to insert Animation Design Brief, no ID returned');
  } catch (error) {
    animationDesignerLogger.error(sceneId, `Error saving Animation Design Brief to DB: ${error instanceof Error ? error.message : String(error)}`);
    throw new Error(`Failed to save Animation Design Brief: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Create an empty design brief as a fallback
function createEmptyDesignBrief(sceneId: string, dimensions: { width: number, height: number }): AnimationDesignBrief {
  const uniqueId = randomUUID(); // Use standardized UUID generation
  
  return {
    sceneId,
    scenePurpose: "Display content clearly",
    overallStyle: "Simple and clean",
    durationInFrames: 180,
    dimensions,
    colorPalette: {
      background: "#FFFFFF",
      primary: "#3498db",
      secondary: "#2ecc71",
      textPrimary: "#333333",
      accent: "#e74c3c"
    },
    audioTracks: [],
    elements: [
      {
        elementId: randomUUID(), // Use standardized UUID generation
        elementType: "text",
        name: "Default Text",
        content: "Your content here",
        initialLayout: {
          x: dimensions.width / 2,
          y: dimensions.height / 2,
          opacity: 1,
          rotation: 0,
          scale: 1
        },
        animations: [
          {
            animationId: randomUUID(), // Use standardized UUID generation
            animationType: "fadeIn",
            startAtFrame: 0,
            durationInFrames: 30,
            easing: "easeOutCubic",
            trigger: "onLoad",
            delayInFrames: 0,
            propertiesAnimated: [
              { property: "opacity", from: 0, to: 1 }
            ]
          }
        ]
      }
    ],
    briefVersion: "1.0.0"
  };
}

// Fix UUIDs in an object recursively
function fixUuidsInObject(obj: any, sceneId: string): any {
  if (!obj) return obj;
  
  if (typeof obj === 'string') {
    // Check if this is a property that should be a UUID
    if (obj.match(/id$/i) && !isValidUuid(obj)) {
      return randomUUID(); // Use standardized UUID generation
    }
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => fixUuidsInObject(item, sceneId));
  }
  
  if (typeof obj === 'object') {
    const newObj: Record<string, any> = {};
    
    for (const key in obj) {
      // Special handling for IDs
      if ((key === 'sceneId' || key === 'elementId' || key === 'animationId') && typeof obj[key] === 'string') {
        newObj[key] = isValidUuid(obj[key]) ? obj[key] : randomUUID();
      } else {
        newObj[key] = fixUuidsInObject(obj[key], sceneId);
      }
    }
    
    return newObj;
  }
  
  return obj;
}

// Helper function to create a useful fallback brief based on partial data
function createFallbackBrief(
  sceneId: string, 
  dimensions: { width: number, height: number },
  partialBrief?: Record<string, any>
): AnimationDesignBrief {
  const emptyBrief = createEmptyDesignBrief(sceneId, dimensions);
  
  // If no partial data, just return the empty brief
  if (!partialBrief) return emptyBrief;
  
  // Extract whatever useful info we can from the partial brief
  try {
    // Start with a conservative approach - only copy simple scalar properties
    const conservativeBrief: Partial<AnimationDesignBrief> = {
      ...emptyBrief,
      // Use overrides from partial brief where available
      scenePurpose: partialBrief.scenePurpose || emptyBrief.scenePurpose,
      overallStyle: partialBrief.overallStyle || emptyBrief.overallStyle,
      durationInFrames: partialBrief.durationInFrames || emptyBrief.durationInFrames,
    };
    
    // Attempt to reuse color palette if it exists and has all required fields
    if (partialBrief.colorPalette && partialBrief.colorPalette.background) {
      conservativeBrief.colorPalette = {
        ...emptyBrief.colorPalette,
        ...partialBrief.colorPalette
      };
    }
    
    // Try to salvage elements and animations with careful filtering
    if (Array.isArray(partialBrief.elements) && partialBrief.elements.length > 0) {
      // Filter elements to keep only those with required fields
      const validElements = partialBrief.elements
        .filter((el: any) => el && el.elementId && el.elementType)
        .map((el: any) => {
          // Create a basic element with required fields
          const validElement: any = {
            elementId: isValidUuid(el.elementId) ? el.elementId : randomUUID(),
            elementType: el.elementType,
            name: el.name || `Element ${el.elementType}`,
            // Ensure at least an empty animations array
            animations: []
          };
          
          // Add content if it's present
          if (el.content) validElement.content = el.content;
          
          // Add initialLayout if it has x and y coordinates
          if (el.initialLayout && typeof el.initialLayout.x !== 'undefined' && typeof el.initialLayout.y !== 'undefined') {
            validElement.initialLayout = {
              x: el.initialLayout.x,
              y: el.initialLayout.y,
              // Add optional layout properties if present
              ...(el.initialLayout.width !== undefined && { width: el.initialLayout.width }),
              ...(el.initialLayout.height !== undefined && { height: el.initialLayout.height }),
              ...(el.initialLayout.opacity !== undefined && { opacity: el.initialLayout.opacity }),
              ...(el.initialLayout.rotation !== undefined && { rotation: el.initialLayout.rotation }),
              ...(el.initialLayout.scale !== undefined && { scale: el.initialLayout.scale }),
              ...(el.initialLayout.backgroundColor !== undefined && { backgroundColor: el.initialLayout.backgroundColor }),
            };
          } else {
            // Fallback layout if missing
            validElement.initialLayout = {
              x: dimensions.width / 2,
              y: dimensions.height / 2,
              opacity: 1,
              rotation: 0,
              scale: 1
            };
          }
          
          // Try to salvage animations if they exist
          if (Array.isArray(el.animations) && el.animations.length > 0) {
            // Filter to keep only animations with required fields
            validElement.animations = el.animations
              .filter((anim: any) => {
                // Check if we have either the old format (type, startFrame, endFrame)
                // or the new format (animationId, animationType, startAtFrame, durationInFrames)
                return (
                  (anim.animationId && anim.animationType && typeof anim.startAtFrame === 'number' && typeof anim.durationInFrames === 'number') ||
                  (anim.type && typeof anim.startFrame === 'number' && typeof anim.endFrame === 'number')
                );
              })
              .map((anim: any) => {
                // Convert legacy format to new format if needed
                if (anim.type && !anim.animationId) {
                  return {
                    animationId: randomUUID(),
                    animationType: anim.type,
                    startAtFrame: anim.startFrame || 0,
                    durationInFrames: (anim.endFrame || 30) - (anim.startFrame || 0),
                    easing: anim.easing || 'easeInOutCubic'
                  };
                }
                
                // Return animation with required fields
                return {
                  animationId: anim.animationId || randomUUID(),
                  animationType: anim.animationType || anim.type || 'fadeIn',
                  startAtFrame: anim.startAtFrame || anim.startFrame || 0,
                  durationInFrames: anim.durationInFrames || 
                    ((anim.endFrame || 30) - (anim.startAtFrame || anim.startFrame || 0)),
                  // Include optional properties if available
                  ...(anim.easing && { easing: anim.easing }),
                  ...(anim.delayInFrames !== undefined && { delayInFrames: anim.delayInFrames }),
                  ...(Array.isArray(anim.propertiesAnimated) && { propertiesAnimated: anim.propertiesAnimated })
                };
              });
          }
          
          return validElement;
        });
      
      // If we have valid elements, use them
      if (validElements.length > 0) {
        conservativeBrief.elements = validElements;
      } else {
        // Otherwise fallback to empty brief's elements
        conservativeBrief.elements = emptyBrief.elements;
      }
    } else {
      // Use default empty brief elements
      conservativeBrief.elements = emptyBrief.elements;
    }
    
    animationDesignerLogger.data(sceneId, `Created fallback brief with ${conservativeBrief.elements.length} elements from partial data`);
    
    return conservativeBrief as AnimationDesignBrief;
  } catch (error) {
    // If anything goes wrong during fallback creation, return the completely empty brief
    animationDesignerLogger.error(sceneId, `Error creating fallback brief: ${error instanceof Error ? error.message : String(error)}`);
    return emptyBrief;
  }
}

// Main function to generate an Animation Design Brief
interface LlmConfig {
  model: string;
  temperature?: number;
  systemPrompt?: string;
}

const DEFAULT_ADB_SYSTEM_PROMPT = `You are an expert Animation Designer AI. Your task is to generate a detailed Animation Design Brief in JSON format based on the user's request. Adhere strictly to the provided JSON schema ('createAnimationDesignBrief' function). Be creative but ensure the output is technically sound and directly usable for animation generation. Focus on translating the user's intent into specific, actionable animation properties. Avoid generic descriptions. Ensure all required fields are present and valid according to the schema.`;

/**
 * Generates a detailed Animation Design Brief using an LLM based on input parameters.
 * Handles validation, error conditions, and database persistence.
 *
 * @param params Parameters for generating the brief.
 * @param llmConfig Optional configuration for the LLM call.
 * @returns A promise resolving to the generated brief and its database ID.
 */
export async function generateAnimationDesignBrief(
  params: AnimationBriefGenerationParams,
  llmConfig: LlmConfig = { model: env.DEFAULT_ADB_MODEL || 'o4-mini' } 
): Promise<{ brief: AnimationDesignBrief; briefId: string }> {
  const startTime = Date.now();
  const { 
    projectId,
    sceneId: inputSceneId,
    scenePurpose,
    sceneElementsDescription,
    desiredDurationInFrames,
    dimensions, 
    componentJobId 
  } = params;
  
  const sceneId = ensureValidUuid(inputSceneId);
  
  logAnimationStart(animationDesignerLogger, sceneId, "Starting Animation Design Brief generation", {
    projectId,
    durationInFrames: desiredDurationInFrames,
    dimensions
  });

  try {
    // Basic validation of inputs
    if (!projectId || !sceneId || !scenePurpose) {
      animationDesignerLogger.error(sceneId, "Missing required parameters for Animation Design Brief", {
        missingParams: {
          projectId: !projectId,
          sceneId: !sceneId,
          scenePurpose: !scenePurpose
        }
      });
      throw new Error("Missing required parameters for Animation Design Brief");
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });

    // Create a clean, descriptive prompt for the LLM
    const userPromptContent = `Create an Animation Design Brief for a scene with the following details:

Scene Purpose: ${scenePurpose}
Scene Description: ${sceneElementsDescription || 'Create a visually engaging scene'}
Duration: ${desiredDurationInFrames} frames
Dimensions: Width: ${dimensions.width}px, Height: ${dimensions.height}px

Please design a complete Animation Design Brief with appropriate elements and animations.`;

    const messagesForLLM: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: llmConfig.systemPrompt || DEFAULT_ADB_SYSTEM_PROMPT, 
      },
      {
        role: 'user',
        content: userPromptContent
      }
    ];

    animationDesignerLogger.data(sceneId, "Sending request to OpenAI", { 
      promptLength: userPromptContent.length, 
      duration: desiredDurationInFrames
    });

    // Call OpenAI with function calling
    const llmStartTime = Date.now();
    const response = await openai.chat.completions.create({
      model: llmConfig.model, // Use configured model
      temperature: 1, // Only temp=1 supported with o4-mini (overriding llmConfig)
      messages: messagesForLLM,
      tools: [{
        type: "function",
        function: {
          name: "generate_animation_design_brief",
          description: "Generate a detailed animation design brief for a scene",
          parameters: toolParametersJsonSchema
        }
      }],
      tool_choice: { type: "function", function: { name: "generate_animation_design_brief" } }
    });
    
    const llmDuration = Date.now() - llmStartTime;
    animationDesignerLogger.data(sceneId, `LLM response received in ${llmDuration}ms`, { duration: llmDuration });

    // Extract the tool call from the OpenAI response
    const toolCall = response.choices[0]?.message.tool_calls?.[0];
    
    if (!toolCall || toolCall.function.name !== "generate_animation_design_brief") {
      animationDesignerLogger.error(sceneId, "Invalid response from OpenAI", { 
        responseChoices: response.choices.length,
        toolCallPresent: !!toolCall,
        toolName: toolCall?.function.name || "undefined"
      });
      // Attempt to recover with a fallback brief
      const fallbackBrief = createFallbackBrief(sceneId, dimensions);
      const fallbackBriefId = await saveAnimationDesignBrief(projectId, sceneId, fallbackBrief, `fallback (intended: ${llmConfig.model})`, componentJobId);
      
      animationDesignerLogger.error(sceneId, "Using fallback brief due to invalid OpenAI response", { 
        briefId: fallbackBriefId 
      });
      
      return { 
        brief: fallbackBrief, 
        briefId: fallbackBriefId 
      };
    }
    
    // Parse the generated brief
    let generatedBrief: Record<string, any>;
    try {
      generatedBrief = JSON.parse(toolCall.function.arguments);
      animationDesignerLogger.data(sceneId, "Successfully parsed Animation Design Brief from LLM response", {
        briefSize: toolCall.function.arguments.length,
        elementsCount: generatedBrief.elements?.length || 0
      });
      
      // Add logging for raw arguments to help diagnose issues
      animationDesignerLogger.data(sceneId, "RAW LLM Animation Design Brief Arguments", { 
        rawArguments: toolCall.function.arguments.substring(0, 1000) + 
                     (toolCall.function.arguments.length > 1000 ? '...' : '')
      });

      // Log animation structure specifically to help diagnose issues
      if (generatedBrief.elements && generatedBrief.elements.length > 0) {
        const firstElementWithAnimations = generatedBrief.elements.find((el: any) => 
          el.animations && el.animations.length > 0
        );
        
        if (firstElementWithAnimations && firstElementWithAnimations.animations) {
          animationDesignerLogger.data(sceneId, "First element animations structure", {
            animationsCount: firstElementWithAnimations.animations.length,
            firstAnimation: JSON.stringify(firstElementWithAnimations.animations[0])
          });
        }
      }
    } catch (parseError) {
      animationDesignerLogger.error(sceneId, "Error parsing JSON from LLM response", { 
        error: parseError instanceof Error ? parseError.message : String(parseError),
        argumentsLength: toolCall.function.arguments.length
      });
      
      // Attempt to recover with a fallback brief
      const fallbackBrief = createFallbackBrief(sceneId, dimensions);
      const fallbackBriefId = await saveAnimationDesignBrief(projectId, sceneId, fallbackBrief, `fallback+parseError (intended: ${llmConfig.model})`, componentJobId); // Adjusted tag
      
      animationDesignerLogger.error(sceneId, "Using fallback brief due to JSON parse error", { 
        briefId: fallbackBriefId 
      });
      
      return { 
        brief: fallbackBrief, 
        briefId: fallbackBriefId 
      };
    }

    // Ensure the brief has the required structure
    try {
      // Add missing required fields
      if (!generatedBrief.briefVersion) {
        generatedBrief.briefVersion = '1.0.0';
      }

      // Validate and clean before returning
      logAnimationValidation(animationDesignerLogger, sceneId, "Validating Animation Design Brief schema");
      
      // Fix UUIDs in the brief
      const cleanedBrief = fixUuidsInObject(generatedBrief, sceneId);

      // Attempt to parse with the Zod schema
      const validationResult = animationDesignBriefSchema.safeParse(cleanedBrief);
      
      if (!validationResult.success) {
        // Detailed validation error logging
        const formattedErrors = validationResult.error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code
        }));
        
        // Safe access to filter with null checks
        const elementIssues = formattedErrors ? formattedErrors.filter(e => e.path.includes('elements')) : [];
        const animationIssues = formattedErrors ? formattedErrors.filter(e => e.path.includes('animations')) : [];
        const otherIssues = formattedErrors ? formattedErrors.filter(e => !e.path.includes('elements') && !e.path.includes('animations')) : [];
        
        animationDesignerLogger.error(sceneId, "Animation Design Brief validation failed", {
          errorCount: formattedErrors.length,
          elementIssues: elementIssues.length > 0 ? elementIssues : undefined,
          animationIssues: animationIssues.length > 0 ? animationIssues : undefined,
          otherIssues: otherIssues.length > 0 ? otherIssues : undefined,
          rawZodIssues: validationResult.error.issues,
          briefBeforeValidation: JSON.stringify(cleanedBrief).substring(0, 1000) + 
                               (JSON.stringify(cleanedBrief).length > 1000 ? '...' : '')
        });
        
        // Create a fallback with the partial brief to recover as much as possible
        const fallbackBrief = createFallbackBrief(sceneId, dimensions, cleanedBrief);
        const fallbackBriefId = await saveAnimationDesignBrief(projectId, sceneId, fallbackBrief, `fallback+partial (intended: ${llmConfig.model})`, componentJobId);
        
        animationDesignerLogger.error(sceneId, "Using fallback brief with partial data from LLM due to validation errors", {
          briefId: fallbackBriefId
        });
        
        return { 
          brief: fallbackBrief, 
          briefId: fallbackBriefId 
        };
      }
      
      // Successfully validated the brief
      const validBrief = validationResult.data;
      
      // Save to database
      const briefId = await saveAnimationDesignBrief(
        projectId,
        sceneId,
        validBrief,
        llmConfig.model, // Pass the actually used model name
        componentJobId
      );
      
      const totalDuration = Date.now() - startTime;
      logAnimationComplete(animationDesignerLogger, sceneId, `Animation Design Brief generated successfully in ${totalDuration}ms`, {
        duration: totalDuration,
        briefId,
        elementsCount: validBrief.elements?.length
      });
      
      return {
        brief: validBrief,
        briefId
      };
    } catch (validationError) {
      animationDesignerLogger.error(sceneId, "Error during Animation Design Brief validation/processing", {
        error: validationError instanceof Error ? validationError.message : String(validationError)
      });
      
      // Create a complete fallback brief
      const fallbackBrief = createEmptyDesignBrief(sceneId, dimensions);
      const fallbackBriefId = await saveAnimationDesignBrief(projectId, sceneId, fallbackBrief, `error-fallback (intended: ${llmConfig.model})`, componentJobId);
      
      animationDesignerLogger.error(sceneId, "Using complete fallback brief due to processing error", {
        briefId: fallbackBriefId
      });
      
      return { 
        brief: fallbackBrief, 
        briefId: fallbackBriefId 
      };
    }
  } catch (error) {
    // Handle any unexpected errors
    animationDesignerLogger.error(sceneId, "Unexpected error in Animation Design Brief generation", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Create a minimal fallback brief
    const fallbackBrief = createEmptyDesignBrief(sceneId, dimensions);
    const fallbackBriefId = await saveAnimationDesignBrief(projectId, sceneId, fallbackBrief, `error-minimal (intended: ${llmConfig.model})`, componentJobId);
    
    return { 
      brief: fallbackBrief, 
      briefId: fallbackBriefId 
    };
  }
}

export interface AnimationBriefGenerationParams {
  projectId: string; 
  sceneId: string;
  scenePurpose: string; 
  sceneElementsDescription: string; 
  desiredDurationInFrames: number;
  dimensions: { 
      width: number;
      height: number;
  };
  currentVideoContext?: string; 
  targetAudience?: string; 
  brandGuidelines?: string; 
  componentJobId?: string; 
}